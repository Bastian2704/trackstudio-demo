<?php

declare(strict_types=1);

use App\Models\Production;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-19 — Consulta de producción: GET /api/v1/productions/{production}
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-08.md §3 y §4 (#13–#15).
|
*/

it('muestra una producción al productor con la representación exacta', function () {
    $production = Production::factory()->create([
        'name' => 'Sesiones del álbum',
        'format' => 'album',
    ]);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->getJson("/api/v1/productions/{$production->id}");

    $response->assertOk()
        ->assertJsonPath('data.id', $production->id)
        ->assertJsonPath('data.artist_id', $production->artist_id)
        ->assertJsonPath('data.name', 'Sesiones del álbum')
        ->assertJsonPath('data.format', 'album');

    expect(array_keys($response->json('data')))->toEqualCanonicalizing(CAMPOS_DE_PRODUCCION)
        ->and($response->json('data.created_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($response->json('data.updated_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($response->getContent())->not->toContain('deleted_at')
        ->and($response->getContent())->not->toContain('artist.name');
});

it('responde 404 RESOURCE_NOT_FOUND cuando la producción no está disponible', function (mixed $productionReference) {
    exigirRuta('GET', 'api/v1/productions/{production}');
    impersonarToken(claimsDeToken('productor'));
    $productionId = is_callable($productionReference) ? $productionReference() : $productionReference;

    $this->getJson("/api/v1/productions/{$productionId}")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
})->with('producciones inexistentes');

it('rechaza la consulta sin identidad productora', function (?string $role, int $status, string $code) {
    $production = Production::factory()->create();

    if ($role !== null) {
        impersonarToken(claimsDeToken($role));
    }

    $this->getJson("/api/v1/productions/{$production->id}")
        ->assertStatus($status)
        ->assertJsonPath('code', $code);
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'rol artista' => ['artista', 403, 'FORBIDDEN'],
    'rol desconocido' => ['desconocido', 403, 'FORBIDDEN'],
]);
