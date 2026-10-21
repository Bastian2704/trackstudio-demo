<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Enums\AudioContentType;
use App\Models\Song;
use App\Models\User;
use App\Models\Version;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-24 — Firma de subida: POST /api/v1/songs/{song}/versions
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-13.md §3 y §4 (#6–#17). El almacenamiento es
| un doble: aquí se prueba nuestro código, no S3 (C4 vive en S3AudioStorageTest).
|
*/

it('firma la subida y responde 201 con la versión pendiente', function () {
    $llamadas = falsearAlmacenamientoDeAudio();
    $song = Song::factory()->create();
    $claims = claimsDeToken('productor');
    impersonarToken($claims);

    $response = $this->postJson("/api/v1/songs/{$song->id}/versions", datosDeVersion());

    $response->assertCreated()
        ->assertJsonPath('data.song_id', $song->id)
        ->assertJsonPath('data.version_number', 1)
        ->assertJsonPath('data.content_type', 'audio/wav')
        ->assertJsonPath('data.size_bytes', 48211200)
        ->assertJsonPath('data.upload_status', 'pendiente')
        ->assertJsonPath('upload.url', 'https://bucket-de-prueba.s3.amazonaws.com/')
        ->assertJsonPath('upload.fields.Policy', 'politica-de-prueba')
        ->assertJsonPath('upload.fields.X-Amz-Signature', 'firma-de-prueba');

    expect(array_keys($response->json('data')))->toEqualCanonicalizing(CAMPOS_DE_VERSION)
        ->and(Str::isUuid($response->json('data.id')))->toBeTrue()
        ->and($response->json('data.created_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($response->json('upload.expires_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($llamadas)->toHaveCount(1);

    $productor = User::query()->where('auth0_sub', $claims['sub'])->sole();

    $this->assertDatabaseHas('versions', [
        'id' => $response->json('data.id'),
        'song_id' => $song->id,
        'version_number' => 1,
        'content_type' => 'audio/wav',
        'size_bytes' => 48211200,
        'upload_status' => 'pendiente',
        'uploaded_by' => $productor->id,
        'etag' => null,
        'verified_at' => null,
        'duration_ms' => null,
    ]);
});

it('construye el key de D7.3 con la extensión del tipo', function (string $contentType, string $extension) {
    $llamadas = falsearAlmacenamientoDeAudio();
    $song = Song::factory()->create();
    $production = $song->production;
    impersonarToken(claimsDeToken('productor'));

    $response = $this->postJson("/api/v1/songs/{$song->id}/versions", datosDeVersion([
        'content_type' => $contentType,
        'size_bytes' => 3145728,
    ]));

    $response->assertCreated();
    $expectedKey = "{$production->artist_id}/{$production->id}/{$song->id}/v1.{$extension}";

    expect($llamadas)->toHaveCount(1)
        ->and($llamadas[0]['key'])->toBe($expectedKey)
        ->and($llamadas[0]['content_type'])->toBe(AudioContentType::from($contentType))
        ->and($llamadas[0]['size_bytes'])->toBe(3145728)
        ->and(Version::query()->findOrFail($response->json('data.id'))->s3_key)->toBe($expectedKey);
})->with([
    'WAV' => ['audio/wav', 'wav'],
    'MP3' => ['audio/mpeg', 'mp3'],
]);

it('numera de forma secuencial contando borradas y fallidas', function () {
    $llamadas = falsearAlmacenamientoDeAudio();
    $song = Song::factory()->create();
    $otherSong = Song::factory()->create();
    Version::factory()->for($song)->verificada()->create(['version_number' => 1]);
    Version::factory()->for($song)->create(['version_number' => 2])->delete();
    Version::factory()->for($song)->fallida()->create(['version_number' => 3]);

    foreach (range(1, 6) as $number) {
        Version::factory()->for($otherSong)->create(['version_number' => $number]);
    }

    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/songs/{$song->id}/versions", datosDeVersion())
        ->assertCreated()
        ->assertJsonPath('data.version_number', 4);

    expect($llamadas[0]['key'])->toEndWith('/v4.wav');
});

it('bloquea la canción al reservar el número', function () {
    falsearAlmacenamientoDeAudio();
    $song = Song::factory()->create();
    impersonarToken(claimsDeToken('productor'));

    /** @var list<string> $consultas */
    $consultas = [];
    DB::listen(function (QueryExecuted $query) use (&$consultas): void {
        $consultas[] = $query->sql;
    });

    $this->postJson("/api/v1/songs/{$song->id}/versions", datosDeVersion())->assertCreated();

    $bloqueos = array_filter(
        $consultas,
        fn (string $sql): bool => (bool) preg_match('/from "songs".* for update$/i', $sql),
    );

    expect($bloqueos)->not->toBeEmpty();
});

it('no deja una fila pendiente si la firma falla', function () {
    $llamadas = falsearAlmacenamientoDeAudio(new RuntimeException('firma rota'));
    $song = Song::factory()->create();
    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/songs/{$song->id}/versions", datosDeVersion())
        ->assertStatus(500)
        ->assertJsonPath('code', 'INTERNAL_ERROR');

    // La llamada ocurrió: la ausencia de fila prueba el rollback, no un corto previo.
    expect($llamadas)->toHaveCount(1)
        ->and(Version::withTrashed()->count())->toBe(0);
});

it('valida el tipo de contenido', function (array $changes, ?string $remove) {
    $llamadas = falsearAlmacenamientoDeAudio();
    $song = Song::factory()->create();
    impersonarToken(claimsDeToken('productor'));
    $payload = datosDeVersion($changes);

    if ($remove !== null) {
        unset($payload[$remove]);
    }

    $response = $this->postJson("/api/v1/songs/{$song->id}/versions", $payload);

    $response->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($response->json('errors')))->toBe(['content_type'])
        ->and(Version::withTrashed()->count())->toBe(0)
        ->and($llamadas)->toHaveCount(0);
})->with('tipos de contenido invalidos');

it('valida el tamaño declarado', function (array $changes, ?string $remove) {
    $llamadas = falsearAlmacenamientoDeAudio();
    $song = Song::factory()->create();
    impersonarToken(claimsDeToken('productor'));
    $payload = datosDeVersion($changes);

    if ($remove !== null) {
        unset($payload[$remove]);
    }

    $response = $this->postJson("/api/v1/songs/{$song->id}/versions", $payload);

    $response->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($response->json('errors')))->toBe(['size_bytes'])
        ->and(Version::withTrashed()->count())->toBe(0)
        ->and($llamadas)->toHaveCount(0);
})->with('tamaños invalidos');

it('acepta los límites del tamaño', function (int $sizeBytes) {
    $llamadas = falsearAlmacenamientoDeAudio();
    $song = Song::factory()->create();
    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/songs/{$song->id}/versions", datosDeVersion(['size_bytes' => $sizeBytes]))
        ->assertCreated()
        ->assertJsonPath('data.size_bytes', $sizeBytes);

    expect($llamadas[0]['size_bytes'])->toBe($sizeBytes);
})->with([
    'un byte' => [1],
    'exactamente 500 MB' => [524288000],
]);

it('ignora los campos que el cliente no controla', function () {
    $llamadas = falsearAlmacenamientoDeAudio();
    $song = Song::factory()->create();
    $intruso = User::factory()->create();
    $claims = claimsDeToken('productor');
    impersonarToken($claims);

    $response = $this->postJson("/api/v1/songs/{$song->id}/versions", datosDeVersion([
        'version_number' => 99,
        's3_key' => 'otra/ruta/elegida.wav',
        'upload_status' => 'verificada',
        'etag' => 'd41d8cd98f00b204e9800998ecf8427e',
        'uploaded_by' => $intruso->id,
    ]));

    $response->assertCreated();
    $version = Version::query()->findOrFail($response->json('data.id'));
    $productor = User::query()->where('auth0_sub', $claims['sub'])->sole();

    expect($version->version_number)->toBe(1)
        ->and($version->upload_status->value)->toBe('pendiente')
        ->and($version->etag)->toBeNull()
        ->and($version->s3_key)->toBe($llamadas[0]['key'])
        ->and($version->s3_key)->toEndWith("/{$song->id}/v1.wav")
        ->and($version->uploaded_by)->toBe($productor->id);
});

it('rechaza la subida si el artista está inactivo', function () {
    $llamadas = falsearAlmacenamientoDeAudio();
    $song = Song::factory()->create();
    $song->production->artist()->update(['status' => ArtistStatus::Inactivo]);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->postJson("/api/v1/songs/{$song->id}/versions", datosDeVersion());

    $response->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonPath('errors.song.0', 'No se pueden subir versiones a una canción de un artista inactivo.');

    expect(array_keys($response->json('errors')))->toBe(['song'])
        ->and(Version::withTrashed()->count())->toBe(0)
        ->and($llamadas)->toHaveCount(0);
});

it('responde 404 si la canción no está disponible', function (mixed $songReference) {
    exigirRuta('POST', 'api/v1/songs/{song}/versions');
    $llamadas = falsearAlmacenamientoDeAudio();
    impersonarToken(claimsDeToken('productor'));
    $songId = is_callable($songReference) ? $songReference() : $songReference;

    $this->postJson("/api/v1/songs/{$songId}/versions", datosDeVersion())
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expect(Version::withTrashed()->count())->toBe(0)
        ->and($llamadas)->toHaveCount(0);
})->with('canciones no disponibles para subir');

it('rechaza sin identidad o sin rol productor', function (?string $role, int $status, string $code) {
    $llamadas = falsearAlmacenamientoDeAudio();
    $song = Song::factory()->create();

    if ($role !== null) {
        impersonarToken(claimsDeToken($role));
    }

    $this->postJson("/api/v1/songs/{$song->id}/versions", datosDeVersion())
        ->assertStatus($status)
        ->assertJsonPath('code', $code);

    expect(Version::withTrashed()->count())->toBe(0)
        ->and($llamadas)->toHaveCount(0);
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'rol artista' => ['artista', 403, 'FORBIDDEN'],
    'rol desconocido' => ['desconocido', 403, 'FORBIDDEN'],
]);
