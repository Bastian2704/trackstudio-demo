<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Artist;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-16 — Edición de artistas: PUT /api/v1/artists/{artist}
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-05.md §3 y §4 (#17–#23). Semántica PUT: el
| cuerpo trae `name` y `email` completos; nada más es editable aquí.
|
*/

/**
 * Comprueba que la fila no cambió respecto a su estado antes del request.
 */
function expectArtistaIntacto(Artist $antes): void
{
    $despues = Artist::withTrashed()->findOrFail($antes->id);

    expect($despues->only(['name', 'email', 'status', 'user_id', 'created_by', 'invitation_token']))
        ->toBe($antes->only(['name', 'email', 'status', 'user_id', 'created_by', 'invitation_token']));
}

it('edita nombre y email y responde 200 con su representación', function () {
    $artista = Artist::factory()->create(datosDeArtista());
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->putJson("/api/v1/artists/{$artista->id}", [
        'name' => 'Luna Rivera Duarte',
        'email' => 'contacto@lunarivera.test',
    ]);

    $respuesta->assertOk()
        ->assertJsonPath('data.id', $artista->id)
        ->assertJsonPath('data.name', 'Luna Rivera Duarte')
        ->assertJsonPath('data.email', 'contacto@lunarivera.test');

    expect(array_keys($respuesta->json('data')))->toEqualCanonicalizing(CAMPOS_DE_ARTISTA);

    $artista->refresh();

    expect($artista->name)->toBe('Luna Rivera Duarte')
        ->and($artista->email)->toBe('contacto@lunarivera.test');
});

it('permite conservar el propio nombre y email', function (array $datos) {
    $artista = Artist::factory()->create(datosDeArtista());
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/artists/{$artista->id}", $datos)
        ->assertOk();
})->with([
    'mismos valores' => [['name' => 'Luna Rivera', 'email' => 'luna.rivera@ejemplo.test']],
    'mismos valores con otro casing' => [['name' => 'LUNA RIVERA', 'email' => 'Luna.Rivera@Ejemplo.TEST']],
]);

it('rechaza nombre o email de otro artista sin modificar la fila', function (array $datos, string $campo) {
    $artista = Artist::factory()->create(datosDeArtista());
    Artist::factory()->create(['name' => 'Mar Salinas', 'email' => 'mar.salinas@ejemplo.test']);
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->putJson("/api/v1/artists/{$artista->id}", $datos);

    $respuesta->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($respuesta->json('errors')))->toBe([$campo]);
    expectArtistaIntacto($artista);
})->with([
    'nombre ajeno' => [['name' => 'MAR SALINAS', 'email' => 'luna.rivera@ejemplo.test'], 'name'],
    'email ajeno' => [['name' => 'Luna Rivera', 'email' => 'Mar.Salinas@Ejemplo.Test'], 'email'],
]);

it('rechaza datos inválidos con 422 VALIDATION_ERROR sin modificar la fila', function (array $datos, string $campo) {
    $artista = Artist::factory()->create(datosDeArtista());
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->putJson("/api/v1/artists/{$artista->id}", $datos);

    $respuesta->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($respuesta->json('errors')))->toBe([$campo]);
    expectArtistaIntacto($artista);
})->with('datos de artista inválidos');

it('no modifica estado, creador, vínculo ni invitación', function () {
    $artista = Artist::factory()->create(datosDeArtista());
    $otroUsuario = User::factory()->create();
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/artists/{$artista->id}", datosDeArtista([
        'status' => ArtistStatus::Inactivo->value,
        'created_by' => $otroUsuario->id,
        'user_id' => $otroUsuario->id,
        'invitation_token' => 'token-elegido-por-el-cliente',
    ]))->assertOk();

    expectArtistaIntacto($artista);
});

it('responde 404 RESOURCE_NOT_FOUND cuando el artista no existe', function (string $id) {
    exigirRuta('PUT', 'api/v1/artists/{artist}');
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/artists/{$id}", datosDeArtista())
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
})->with('artistas inexistentes');

it('rechaza con 401 UNAUTHENTICATED cuando falta el token', function () {
    $artista = Artist::factory()->create(datosDeArtista());

    $this->putJson("/api/v1/artists/{$artista->id}", datosDeArtista(['name' => 'Otro Nombre']))
        ->assertUnauthorized()
        ->assertJsonPath('code', 'UNAUTHENTICATED');

    expectArtistaIntacto($artista);
});

it('rechaza con 403 FORBIDDEN a un artista sin modificar la fila', function () {
    $artista = Artist::factory()->create(datosDeArtista());
    impersonarToken(claimsDeToken('artista'));

    $this->putJson("/api/v1/artists/{$artista->id}", datosDeArtista(['name' => 'Otro Nombre']))
        ->assertForbidden()
        ->assertJsonPath('code', 'FORBIDDEN');

    expectArtistaIntacto($artista);
});
