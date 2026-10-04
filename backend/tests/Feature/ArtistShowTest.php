<?php

declare(strict_types=1);

use App\Models\Artist;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-16 — Consulta de un artista: GET /api/v1/artists/{artist}
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-05.md §3 y §4 (#14–#16). Solo productor en
| HU-05; «el artista ve su propio perfil» (D8.1) queda para su HU.
|
*/

it('muestra el artista al productor sin datos de invitación ni vínculos internos', function () {
    // La factory sí emite token de invitación: así el test ve si el Resource lo filtra.
    $artista = Artist::factory()->create(datosDeArtista());
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->getJson("/api/v1/artists/{$artista->id}");

    $respuesta->assertOk()
        ->assertJsonPath('data.id', $artista->id)
        ->assertJsonPath('data.name', 'Luna Rivera')
        ->assertJsonPath('data.email', 'luna.rivera@ejemplo.test')
        ->assertJsonPath('data.status', 'invitado');

    expect(array_keys($respuesta->json('data')))->toEqualCanonicalizing(CAMPOS_DE_ARTISTA)
        ->and($respuesta->json('data.created_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($respuesta->getContent())->not->toContain((string) $artista->invitation_token)
        ->and($respuesta->getContent())->not->toContain($artista->created_by);
});

it('responde 404 RESOURCE_NOT_FOUND cuando el artista no existe', function (string $id) {
    exigirRuta('GET', 'api/v1/artists/{artist}');
    impersonarToken(claimsDeToken('productor'));

    $this->getJson("/api/v1/artists/{$id}")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
})->with('artistas inexistentes');

it('rechaza con 401 UNAUTHENTICATED cuando falta el token', function () {
    $artista = Artist::factory()->create();

    $this->getJson("/api/v1/artists/{$artista->id}")
        ->assertUnauthorized()
        ->assertJsonPath('code', 'UNAUTHENTICATED');
});

it('rechaza con 403 FORBIDDEN a un artista', function () {
    $artista = Artist::factory()->create();
    impersonarToken(claimsDeToken('artista'));

    $this->getJson("/api/v1/artists/{$artista->id}")
        ->assertForbidden()
        ->assertJsonPath('code', 'FORBIDDEN');
});
