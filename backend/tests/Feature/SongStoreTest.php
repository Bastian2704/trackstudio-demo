<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Production;
use App\Models\Song;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-21 — Alta de canciones: POST /api/v1/productions/{production}/songs
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-10.md §3 y §4 (#4–#12).
|
*/

it('registra una canción y responde 201', function () {
    $production = Production::factory()->create();
    impersonarToken(claimsDeToken('productor'));

    $response = $this->postJson("/api/v1/productions/{$production->id}/songs", datosDeCancion());

    $response->assertCreated()
        ->assertJsonPath('data.production_id', $production->id)
        ->assertJsonPath('data.name', 'Intro')
        ->assertJsonPath('data.position', 1)
        ->assertJsonPath('data.status', 'por_hacer');

    expect(array_keys($response->json('data')))->toEqualCanonicalizing(CAMPOS_DE_CANCION)
        ->and(Str::isUuid($response->json('data.id')))->toBeTrue()
        ->and($response->json('data.created_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($response->json('data.updated_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET);

    $this->assertDatabaseHas('songs', [
        'id' => $response->json('data.id'),
        'production_id' => $production->id,
        'name' => 'Intro',
        'position' => 1,
        'status' => 'por_hacer',
    ]);
});

it('asigna la siguiente posición entre las vigentes', function () {
    $production = Production::factory()->create();
    $otherProduction = Production::factory()->create();
    Song::factory()->create(['production_id' => $production->id, 'name' => 'Uno', 'position' => 1]);
    Song::factory()->create(['production_id' => $production->id, 'name' => 'Dos', 'position' => 2]);
    Song::factory()->create(['production_id' => $production->id, 'name' => 'Tres', 'position' => 3])->delete();

    foreach (range(1, 5) as $position) {
        Song::factory()->create(['production_id' => $otherProduction->id, 'name' => "Ajena {$position}", 'position' => $position]);
    }

    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/productions/{$production->id}/songs", datosDeCancion())
        ->assertCreated()
        ->assertJsonPath('data.position', 3);
});

it('permite crear para artistas habilitados', function (ArtistStatus $status) {
    $production = Production::factory()->create();
    $production->artist()->update(['status' => $status]);
    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/productions/{$production->id}/songs", datosDeCancion())
        ->assertCreated();
})->with([
    'artista invitado' => [ArtistStatus::Invitado],
    'artista activo' => [ArtistStatus::Activo],
]);

it('rechaza una producción de un artista inactivo', function () {
    $production = Production::factory()->create();
    $production->artist()->update(['status' => ArtistStatus::Inactivo]);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->postJson("/api/v1/productions/{$production->id}/songs", datosDeCancion());

    $response->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonPath('errors.production.0', 'No se pueden añadir canciones a una producción de un artista inactivo.');

    expect(array_keys($response->json('errors')))->toBe(['production'])
        ->and(Song::query()->count())->toBe(0);
});

it('valida el nombre', function (array $changes, string $field, ?string $remove) {
    $production = Production::factory()->create();
    impersonarToken(claimsDeToken('productor'));
    $payload = datosDeCancion($changes);

    if ($remove !== null) {
        unset($payload[$remove]);
    }

    $response = $this->postJson("/api/v1/productions/{$production->id}/songs", $payload);

    $response->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($response->json('errors')))->toBe([$field])
        ->and(Song::query()->count())->toBe(0);
})->with('nombres de cancion invalidos');

it('protege la unicidad del nombre dentro de la producción', function () {
    $production = Production::factory()->create();
    $otherProduction = Production::factory()->create();
    Song::factory()->create(['production_id' => $production->id, 'name' => 'Intro', 'position' => 1]);
    Song::factory()->create(['production_id' => $production->id, 'name' => 'Outro', 'position' => 2])->delete();
    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/productions/{$production->id}/songs", datosDeCancion(['name' => '  INTRO  ']))
        ->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonPath('errors.name.0', 'Ya existe una canción con ese nombre en esta producción.');

    expect(Song::query()->where('production_id', $production->id)->count())->toBe(1);

    $this->postJson("/api/v1/productions/{$otherProduction->id}/songs", datosDeCancion(['name' => 'Intro']))
        ->assertCreated();

    $this->postJson("/api/v1/productions/{$production->id}/songs", datosDeCancion(['name' => 'OUTRO']))
        ->assertCreated();

    expect(Song::query()->count())->toBe(3)
        ->and(Song::withTrashed()->count())->toBe(4);
});

it('ignora campos controlados por el servidor', function () {
    $production = Production::factory()->create();
    $otherProduction = Production::factory()->create();
    $clientId = (string) Str::uuid();
    impersonarToken(claimsDeToken('productor'));

    $response = $this->postJson("/api/v1/productions/{$production->id}/songs", datosDeCancion([
        'id' => $clientId,
        'production_id' => $otherProduction->id,
        'position' => 7,
        'status' => 'finalizada',
        'deleted_at' => now()->toIso8601String(),
    ]));

    $response->assertCreated();
    $song = Song::query()->findOrFail($response->json('data.id'));

    expect($song->id)->not->toBe($clientId)
        ->and($song->production_id)->toBe($production->id)
        ->and($song->position)->toBe(1)
        ->and($song->status->value)->toBe('por_hacer')
        ->and($song->deleted_at)->toBeNull();
});

it('responde 404 si la producción no está disponible', function (mixed $productionReference) {
    exigirRuta('POST', 'api/v1/productions/{production}/songs');
    impersonarToken(claimsDeToken('productor'));
    $productionId = is_callable($productionReference) ? $productionReference() : $productionReference;

    $this->postJson("/api/v1/productions/{$productionId}/songs", datosDeCancion())
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expect(Song::query()->count())->toBe(0);
})->with('producciones inexistentes');

it('rechaza sin identidad o sin rol productor', function (?string $role, int $status, string $code) {
    $production = Production::factory()->create();

    if ($role !== null) {
        impersonarToken(claimsDeToken($role));
    }

    $this->postJson("/api/v1/productions/{$production->id}/songs", datosDeCancion())
        ->assertStatus($status)
        ->assertJsonPath('code', $code);

    expect(Song::query()->count())->toBe(0);
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'rol artista' => ['artista', 403, 'FORBIDDEN'],
    'rol desconocido' => ['desconocido', 403, 'FORBIDDEN'],
]);
