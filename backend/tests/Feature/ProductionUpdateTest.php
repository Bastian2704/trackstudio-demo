<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Artist;
use App\Models\Production;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-19 — Edición de producción: PUT /api/v1/productions/{production}
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-08.md §3 y §4 (#16–#22).
|
*/

/** Comprueba que los campos de dominio no cambiaron respecto al estado previo. */
function expectProduccionIntacta(Production $before): void
{
    $after = Production::withTrashed()->findOrFail($before->id);

    expect($after->only(['artist_id', 'name', 'format', 'deleted_at']))
        ->toBe($before->only(['artist_id', 'name', 'format', 'deleted_at']));
}

it('edita nombre y formato sin cambiar de artista', function () {
    $production = Production::factory()->create([
        'name' => 'Demos',
        'format' => 'sencillo',
    ]);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->putJson(
        "/api/v1/productions/{$production->id}",
        datosDeEdicionDeProduccion(),
    );

    $response->assertOk()
        ->assertJsonPath('data.id', $production->id)
        ->assertJsonPath('data.artist_id', $production->artist_id)
        ->assertJsonPath('data.name', 'Sesiones remasterizadas')
        ->assertJsonPath('data.format', 'ep');

    expect(array_keys($response->json('data')))->toEqualCanonicalizing(CAMPOS_DE_PRODUCCION);

    $production->refresh();
    expect($production->name)->toBe('Sesiones remasterizadas')
        ->and($production->format->value)->toBe('ep');
});

it('permite editar una producción cuyo artista pasó a inactivo', function () {
    $production = Production::factory()->create();
    $production->artist()->update(['status' => ArtistStatus::Inactivo]);
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/productions/{$production->id}", datosDeEdicionDeProduccion())
        ->assertOk();
});

it('permite conservar el propio nombre incluso con otro casing', function (string $name) {
    $production = Production::factory()->create(['name' => 'Demos']);
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/productions/{$production->id}", datosDeEdicionDeProduccion([
        'name' => $name,
    ]))->assertOk();
})->with([
    'mismo nombre' => ['Demos'],
    'otro casing y espacios' => ['  DEMOS  '],
]);

it('rechaza el nombre de otra producción vigente del mismo artista', function () {
    $artist = Artist::factory()->create();
    $production = Production::factory()->create(['artist_id' => $artist->id, 'name' => 'Demos']);
    Production::factory()->create(['artist_id' => $artist->id, 'name' => 'Sesiones']);
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/productions/{$production->id}", datosDeEdicionDeProduccion([
        'name' => 'SESIONES',
    ]))
        ->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonPath('errors.name.0', 'Ya existe una producción con ese nombre para este artista.');

    expectProduccionIntacta($production);
});

it('valida nombre y formato sin modificar la producción', function (array $changes, string $field, ?string $remove) {
    $production = Production::factory()->create();
    impersonarToken(claimsDeToken('productor'));
    $payload = datosDeEdicionDeProduccion($changes);

    if ($remove !== null && $remove !== 'artist_id') {
        unset($payload[$remove]);
    }

    $response = $this->putJson("/api/v1/productions/{$production->id}", $payload);

    $response->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($response->json('errors')))->toBe([$field]);
    expectProduccionIntacta($production);
})->with('datos de produccion invalidos');

it('ignora la reasignación y los campos controlados por el servidor', function () {
    $production = Production::factory()->create();
    $otherArtist = Artist::factory()->create();
    $originalArtistId = $production->artist_id;
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/productions/{$production->id}", datosDeEdicionDeProduccion([
        'artist_id' => $otherArtist->id,
        'id' => fake()->uuid(),
        'deleted_at' => now()->toIso8601String(),
    ]))->assertOk();

    $production->refresh();
    expect($production->artist_id)->toBe($originalArtistId)
        ->and($production->deleted_at)->toBeNull();
});

it('responde 404 RESOURCE_NOT_FOUND al editar una producción no disponible', function (mixed $productionReference) {
    exigirRuta('PUT', 'api/v1/productions/{production}');
    impersonarToken(claimsDeToken('productor'));
    $productionId = is_callable($productionReference) ? $productionReference() : $productionReference;

    $this->putJson("/api/v1/productions/{$productionId}", datosDeEdicionDeProduccion())
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
})->with('producciones inexistentes');

it('rechaza la edición sin identidad productora y conserva la fila', function (?string $role, int $status, string $code) {
    $production = Production::factory()->create();

    if ($role !== null) {
        impersonarToken(claimsDeToken($role));
    }

    $this->putJson("/api/v1/productions/{$production->id}", datosDeEdicionDeProduccion())
        ->assertStatus($status)
        ->assertJsonPath('code', $code);

    expectProduccionIntacta($production);
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'rol artista' => ['artista', 403, 'FORBIDDEN'],
    'rol desconocido' => ['desconocido', 403, 'FORBIDDEN'],
]);
