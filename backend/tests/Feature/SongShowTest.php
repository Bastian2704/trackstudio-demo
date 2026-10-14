<?php

declare(strict_types=1);

use App\Models\Song;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-21 — Consulta de canción: GET /api/v1/songs/{song}
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-10.md §3 y §4 (#13–#15).
|
*/

it('muestra una canción al productor', function () {
    $song = Song::factory()->create([
        'name' => 'Intro',
        'position' => 1,
        'status' => 'en_progreso',
    ]);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->getJson("/api/v1/songs/{$song->id}");

    $response->assertOk()
        ->assertJsonPath('data.id', $song->id)
        ->assertJsonPath('data.production_id', $song->production_id)
        ->assertJsonPath('data.name', 'Intro')
        ->assertJsonPath('data.position', 1)
        ->assertJsonPath('data.status', 'en_progreso');

    expect(array_keys($response->json('data')))->toEqualCanonicalizing(CAMPOS_DE_CANCION)
        ->and($response->json('data.created_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($response->json('data.updated_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($response->getContent())->not->toContain('deleted_at');
});

it('responde 404 para una canción no disponible', function (mixed $songReference) {
    exigirRuta('GET', 'api/v1/songs/{song}');
    impersonarToken(claimsDeToken('productor'));
    $songId = is_callable($songReference) ? $songReference() : $songReference;

    $this->getJson("/api/v1/songs/{$songId}")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
})->with('canciones inexistentes');

it('rechaza sin identidad o sin rol productor', function (?string $role, int $status, string $code) {
    $song = Song::factory()->create();

    if ($role !== null) {
        impersonarToken(claimsDeToken($role));
    }

    $this->getJson("/api/v1/songs/{$song->id}")
        ->assertStatus($status)
        ->assertJsonPath('code', $code);
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'rol artista' => ['artista', 403, 'FORBIDDEN'],
    'rol desconocido' => ['desconocido', 403, 'FORBIDDEN'],
]);
