<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Production;
use App\Models\Song;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-21 — Edición de canción: PUT /api/v1/songs/{song}
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-10.md §3 y §4 (#16–#23).
|
*/

/** Comprueba que los campos de dominio no cambiaron respecto al estado previo. */
function expectCancionIntacta(Song $before): void
{
    $after = Song::withTrashed()->findOrFail($before->id);

    expect($after->only(['production_id', 'name', 'position', 'status', 'deleted_at']))
        ->toBe($before->only(['production_id', 'name', 'position', 'status', 'deleted_at']));
}

it('edita nombre y estado', function () {
    $song = Song::factory()->create(['name' => 'Intro', 'position' => 2, 'status' => 'por_hacer']);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->putJson("/api/v1/songs/{$song->id}", datosDeEdicionDeCancion());

    $response->assertOk()
        ->assertJsonPath('data.id', $song->id)
        ->assertJsonPath('data.production_id', $song->production_id)
        ->assertJsonPath('data.name', 'Intro (versión final)')
        ->assertJsonPath('data.position', 2)
        ->assertJsonPath('data.status', 'en_progreso');

    expect(array_keys($response->json('data')))->toEqualCanonicalizing(CAMPOS_DE_CANCION);

    $song->refresh();
    expect($song->name)->toBe('Intro (versión final)')
        ->and($song->status->value)->toBe('en_progreso')
        ->and($song->position)->toBe(2);
});

it('acepta los tres estados', function (string $status) {
    // Parte de un estado distinto para que el cambio sea observable.
    $song = Song::factory()->create(['status' => $status === 'por_hacer' ? 'finalizada' : 'por_hacer']);
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/songs/{$song->id}", datosDeEdicionDeCancion(['status' => $status]))
        ->assertOk()
        ->assertJsonPath('data.status', $status);

    expect(Song::query()->findOrFail($song->id)->status->value)->toBe($status);
})->with('estados de cancion');

it('valida nombre y estado', function (array $changes, string $field, ?string $remove) {
    $song = Song::factory()->create();
    impersonarToken(claimsDeToken('productor'));
    $payload = datosDeEdicionDeCancion($changes);

    if ($remove !== null) {
        unset($payload[$remove]);
    }

    $response = $this->putJson("/api/v1/songs/{$song->id}", $payload);

    $response->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($response->json('errors')))->toBe([$field]);
    expectCancionIntacta($song);
})->with('datos de edicion de cancion invalidos');

it('permite conservar el propio nombre', function (string $name) {
    $song = Song::factory()->create(['name' => 'Intro']);
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/songs/{$song->id}", datosDeEdicionDeCancion(['name' => $name]))
        ->assertOk();
})->with([
    'mismo nombre' => ['Intro'],
    'otro casing y espacios' => ['  INTRO  '],
]);

it('rechaza un nombre duplicado dentro de la producción', function () {
    $production = Production::factory()->create();
    $song = Song::factory()->create(['production_id' => $production->id, 'name' => 'Intro', 'position' => 1]);
    Song::factory()->create(['production_id' => $production->id, 'name' => 'Outro', 'position' => 2]);
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/songs/{$song->id}", datosDeEdicionDeCancion(['name' => 'OUTRO']))
        ->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonPath('errors.name.0', 'Ya existe una canción con ese nombre en esta producción.');

    expectCancionIntacta($song);
});

it('permite editar en una producción de artista inactivo', function () {
    $song = Song::factory()->create();
    Production::query()->findOrFail($song->production_id)->artist()->update(['status' => ArtistStatus::Inactivo]);
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/songs/{$song->id}", datosDeEdicionDeCancion())
        ->assertOk();
});

it('ignora campos controlados', function () {
    $song = Song::factory()->create(['position' => 1]);
    $otherProduction = Production::factory()->create();
    $originalProductionId = $song->production_id;
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/songs/{$song->id}", datosDeEdicionDeCancion([
        'production_id' => $otherProduction->id,
        'position' => 9,
        'id' => fake()->uuid(),
        'deleted_at' => now()->toIso8601String(),
    ]))->assertOk();

    $song->refresh();
    expect($song->production_id)->toBe($originalProductionId)
        ->and($song->position)->toBe(1)
        ->and($song->deleted_at)->toBeNull();
});

it('responde 404 al editar una canción no disponible', function (mixed $songReference) {
    exigirRuta('PUT', 'api/v1/songs/{song}');
    impersonarToken(claimsDeToken('productor'));
    $songId = is_callable($songReference) ? $songReference() : $songReference;

    $this->putJson("/api/v1/songs/{$songId}", datosDeEdicionDeCancion())
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
})->with('canciones inexistentes');

it('rechaza la edición sin identidad productora y conserva la fila', function (?string $role, int $status, string $code) {
    $song = Song::factory()->create();

    if ($role !== null) {
        impersonarToken(claimsDeToken($role));
    }

    $this->putJson("/api/v1/songs/{$song->id}", datosDeEdicionDeCancion())
        ->assertStatus($status)
        ->assertJsonPath('code', $code);

    expectCancionIntacta($song);
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'rol artista' => ['artista', 403, 'FORBIDDEN'],
    'rol desconocido' => ['desconocido', 403, 'FORBIDDEN'],
]);
