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

/*
|--------------------------------------------------------------------------
| TS-20 — Cambio de formato con canciones vigentes
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-09.md §3.3 y §4 (#6–#9).
|
*/

it('permite cambiar a un formato que admite las canciones vigentes', function (string $from, int $existing, string $to) {
    $production = Production::factory()->create(['format' => $from]);
    crearCanciones($production, $existing);
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/productions/{$production->id}", datosDeEdicionDeProduccion(['format' => $to]))
        ->assertOk()
        ->assertJsonPath('data.format', $to);

    expect($production->refresh()->format->value)->toBe($to);
})->with([
    'EP con 1 a sencillo' => ['ep', 1, 'sencillo'],
    'álbum con 6 a EP' => ['album', 6, 'ep'],
    'sencillo con 1 a álbum' => ['sencillo', 1, 'album'],
    'EP con 6 a álbum' => ['ep', 6, 'album'],
]);

it('rechaza cambiar a un formato que no admite las canciones vigentes', function (string $from, int $existing, string $to, string $message) {
    $production = Production::factory()->create(['format' => $from]);
    crearCanciones($production, $existing);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->putJson("/api/v1/productions/{$production->id}", datosDeEdicionDeProduccion(['format' => $to]));

    $response->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonPath('errors.format.0', $message);

    expect(array_keys($response->json('errors')))->toBe(['format']);
    expectProduccionIntacta($production);
})->with([
    'EP con 2 a sencillo' => ['ep', 2, 'sencillo', 'La producción tiene 2 canciones y un sencillo admite como máximo 1.'],
    'álbum con 7 a EP' => ['album', 7, 'ep', 'La producción tiene 7 canciones y un EP admite como máximo 6.'],
    'álbum con 7 a sencillo' => ['album', 7, 'sencillo', 'La producción tiene 7 canciones y un sencillo admite como máximo 1.'],
]);

it('no cuenta las canciones borradas al cambiar de formato', function () {
    $production = Production::factory()->create(['format' => 'ep']);
    crearCanciones($production, 2)->last()?->delete();
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/productions/{$production->id}", datosDeEdicionDeProduccion(['format' => 'sencillo']))
        ->assertOk()
        ->assertJsonPath('data.format', 'sencillo');
});

it('permite editar el nombre sin cambiar el formato aunque supere el máximo', function () {
    // Dato heredado de S2, cuando el alta de canciones no tenía límite (HU-09 §3.4, decisión 2).
    $production = Production::factory()->create(['format' => 'sencillo']);
    crearCanciones($production, 3);
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/productions/{$production->id}", datosDeEdicionDeProduccion(['format' => 'sencillo']))
        ->assertOk()
        ->assertJsonPath('data.name', 'Sesiones remasterizadas');

    expect($production->refresh()->name)->toBe('Sesiones remasterizadas');
});
