<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Artist;
use App\Models\Production;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-19 — Alta de producciones: POST /api/v1/productions
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-08.md §3 y §4 (#2–#12).
|
*/

it('registra una producción y responde 201 con su representación', function () {
    $artist = Artist::factory()->create(['status' => ArtistStatus::Activo]);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->postJson('/api/v1/productions', datosDeProduccion($artist->id));

    $response->assertCreated()
        ->assertJsonPath('data.artist_id', $artist->id)
        ->assertJsonPath('data.name', 'Sesiones del álbum')
        ->assertJsonPath('data.format', 'album');

    expect(array_keys($response->json('data')))->toEqualCanonicalizing(CAMPOS_DE_PRODUCCION)
        ->and(Str::isUuid($response->json('data.id')))->toBeTrue()
        ->and($response->json('data.created_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($response->json('data.updated_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET);

    $this->assertDatabaseHas('productions', [
        'id' => $response->json('data.id'),
        'artist_id' => $artist->id,
        'name' => 'Sesiones del álbum',
        'format' => 'album',
    ]);
});

it('permite crear una producción para artistas habilitados', function (ArtistStatus $status) {
    $artist = Artist::factory()->create(['status' => $status]);
    impersonarToken(claimsDeToken('productor'));

    $this->postJson('/api/v1/productions', datosDeProduccion($artist->id))
        ->assertCreated();
})->with([
    'artista invitado' => [ArtistStatus::Invitado],
    'artista activo' => [ArtistStatus::Activo],
]);

it('rechaza un artista inactivo', function () {
    $artist = Artist::factory()->create(['status' => ArtistStatus::Inactivo]);
    impersonarToken(claimsDeToken('productor'));

    $this->postJson('/api/v1/productions', datosDeProduccion($artist->id))
        ->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonPath('errors.artist_id.0', 'No se puede registrar una producción para un artista inactivo.');

    expect(Production::query()->count())->toBe(0);
});

it('valida que el artista asociado exista y esté vigente', function (mixed $artistReference) {
    $fallbackArtist = Artist::factory()->create();
    impersonarToken(claimsDeToken('productor'));

    $resolvedArtistId = is_callable($artistReference) ? $artistReference() : $artistReference;
    $payload = datosDeProduccion($fallbackArtist->id);

    if ($resolvedArtistId === null) {
        unset($payload['artist_id']);
    } else {
        $payload['artist_id'] = $resolvedArtistId;
    }

    $this->postJson('/api/v1/productions', $payload)
        ->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonPath('errors.artist_id.0', fn (mixed $message): bool => is_string($message) && $message !== '');

    expect(Production::query()->count())->toBe(0);
})->with('artistas no disponibles para una produccion');

it('valida nombre y formato sin crear la producción', function (array $changes, string $field, ?string $remove) {
    $artist = Artist::factory()->create();
    impersonarToken(claimsDeToken('productor'));
    $payload = datosDeProduccion($artist->id, $changes);

    if ($remove !== null) {
        unset($payload[$remove]);
    }

    $response = $this->postJson('/api/v1/productions', $payload);

    $response->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($response->json('errors')))->toBe([$field])
        ->and(Production::query()->count())->toBe(0);
})->with('datos de produccion invalidos');

it('acepta y conserva cada formato aprobado', function (string $format) {
    $artist = Artist::factory()->create();
    impersonarToken(claimsDeToken('productor'));

    $response = $this->postJson('/api/v1/productions', datosDeProduccion($artist->id, ['format' => $format]));

    $response->assertCreated()
        ->assertJsonPath('data.format', $format);

    expect(Production::query()->findOrFail($response->json('data.id'))->format->value)->toBe($format);
})->with('formatos de produccion');

it('protege la unicidad del nombre dentro del mismo artista sin distinguir mayúsculas', function () {
    $artist = Artist::factory()->create();
    Production::factory()->create(['artist_id' => $artist->id, 'name' => 'Sesiones del álbum']);
    impersonarToken(claimsDeToken('productor'));

    $this->postJson('/api/v1/productions', datosDeProduccion($artist->id, ['name' => '  SESIONES DEL ÁLBUM  ']))
        ->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonPath('errors.name.0', 'Ya existe una producción con ese nombre para este artista.');

    expect(Production::query()->count())->toBe(1);
});

it('permite el mismo nombre para artistas distintos', function () {
    $firstArtist = Artist::factory()->create();
    $secondArtist = Artist::factory()->create();
    Production::factory()->create(['artist_id' => $firstArtist->id, 'name' => 'Demos']);
    impersonarToken(claimsDeToken('productor'));

    $this->postJson('/api/v1/productions', datosDeProduccion($secondArtist->id, ['name' => 'Demos']))
        ->assertCreated();

    expect(Production::query()->where('name', 'Demos')->count())->toBe(2);
});

it('permite reutilizar el nombre de una producción borrada', function () {
    $artist = Artist::factory()->create();
    Production::factory()->create(['artist_id' => $artist->id, 'name' => 'Demos'])->delete();
    impersonarToken(claimsDeToken('productor'));

    $this->postJson('/api/v1/productions', datosDeProduccion($artist->id, ['name' => 'DEMOS']))
        ->assertCreated();

    expect(Production::withTrashed()->count())->toBe(2)
        ->and(Production::query()->count())->toBe(1);
});

it('ignora identificador, borrado y fechas controlados por el servidor', function () {
    $artist = Artist::factory()->create();
    $clientId = (string) Str::uuid();
    impersonarToken(claimsDeToken('productor'));

    $response = $this->postJson('/api/v1/productions', datosDeProduccion($artist->id, [
        'id' => $clientId,
        'created_at' => '2000-01-01T00:00:00+00:00',
        'updated_at' => '2000-01-01T00:00:00+00:00',
        'deleted_at' => now()->toIso8601String(),
    ]));

    $response->assertCreated();
    $production = Production::query()->findOrFail($response->json('data.id'));

    expect($production->id)->not->toBe($clientId)
        ->and($production->deleted_at)->toBeNull()
        ->and($production->created_at?->year)->not->toBe(2000)
        ->and($production->updated_at?->year)->not->toBe(2000);
});

it('rechaza el alta sin identidad productora', function (?string $role, int $status, string $code) {
    $artist = Artist::factory()->create();

    if ($role !== null) {
        impersonarToken(claimsDeToken($role));
    }

    $this->postJson('/api/v1/productions', datosDeProduccion($artist->id))
        ->assertStatus($status)
        ->assertJsonPath('code', $code);

    expect(Production::query()->count())->toBe(0);
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'rol artista' => ['artista', 403, 'FORBIDDEN'],
    'rol desconocido' => ['desconocido', 403, 'FORBIDDEN'],
]);
