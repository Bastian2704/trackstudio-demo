<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Artist;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-18 — Cambio de estado: PUT /api/v1/artists/{artist}/status
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-07.md §3 y §4 (#1–#8). El cliente solo envía
| `active`; el estado destino lo deriva el servidor de `user_id` (§3.4).
|
*/

/**
 * Artista con el estado pedido; `conCuenta` decide si `user_id` está enlazado.
 */
function artistaEnEstado(ArtistStatus $estado, bool $conCuenta = false): Artist
{
    return Artist::factory()->create(datosDeArtista([
        'status' => $estado,
        'user_id' => $conCuenta ? User::factory()->create()->id : null,
    ]));
}

/**
 * La fila no cambió en nada que esta HU pueda tocar, `updated_at` incluido.
 */
function expectEstadoIntacto(Artist $antes): void
{
    $despues = Artist::withTrashed()->findOrFail($antes->id);

    expect($despues->only(['name', 'email', 'status', 'user_id', 'updated_at']))
        ->toEqual($antes->only(['name', 'email', 'status', 'user_id', 'updated_at']));
}

function expectSinAuditoria(): void
{
    Log::shouldNotHaveReceived('info', ['artist.status_changed', Mockery::any()]);
}

beforeEach(function () {
    Log::spy();
});

it('desactiva un artista', function (ArtistStatus $estado, bool $conCuenta) {
    $artista = artistaEnEstado($estado, $conCuenta);
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->putJson("/api/v1/artists/{$artista->id}/status", ['active' => false]);

    $respuesta->assertOk()
        ->assertJsonPath('data.id', $artista->id)
        ->assertJsonPath('data.status', 'inactivo');

    expect(array_keys($respuesta->json('data')))->toEqualCanonicalizing(CAMPOS_DE_ARTISTA)
        ->and($artista->refresh()->status)->toBe(ArtistStatus::Inactivo);
})->with([
    'desde invitado' => [ArtistStatus::Invitado, false],
    'desde activo' => [ArtistStatus::Activo, true],
]);

it('reactiva según la cuenta enlazada', function (bool $conCuenta, ArtistStatus $esperado) {
    $artista = artistaEnEstado(ArtistStatus::Inactivo, $conCuenta);
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/artists/{$artista->id}/status", ['active' => true])
        ->assertOk()
        ->assertJsonPath('data.status', $esperado->value);

    expect($artista->refresh()->status)->toBe($esperado);
})->with([
    'sin cuenta vuelve a invitado' => [false, ArtistStatus::Invitado],
    'con cuenta vuelve a activo' => [true, ArtistStatus::Activo],
]);

it('es idempotente: sin cambio no escribe ni audita', function (ArtistStatus $estado, bool $conCuenta, bool $activo) {
    $artista = artistaEnEstado($estado, $conCuenta);
    impersonarToken(claimsDeToken('productor'));
    $this->travel(5)->minutes();

    $this->putJson("/api/v1/artists/{$artista->id}/status", ['active' => $activo])
        ->assertOk()
        ->assertJsonPath('data.status', $estado->value);

    expectEstadoIntacto($artista);
    expectSinAuditoria();
})->with([
    'inactivo y desactivar' => [ArtistStatus::Inactivo, false, false],
    'invitado y reactivar' => [ArtistStatus::Invitado, false, true],
    'activo y reactivar' => [ArtistStatus::Activo, true, true],
]);

it('registra la auditoría del cambio', function () {
    $artista = artistaEnEstado(ArtistStatus::Activo, conCuenta: true);
    $claims = claimsDeToken('productor');
    impersonarToken($claims);

    $this->putJson("/api/v1/artists/{$artista->id}/status", ['active' => false])
        ->assertOk();

    Log::shouldHaveReceived('info')
        ->with('artist.status_changed', [
            'artist_id' => $artista->id,
            'from' => 'activo',
            'to' => 'inactivo',
            'changed_by' => $claims['sub'],
        ])
        ->once();
});

it('no toca otros campos ni confía en el status del cliente', function (ArtistStatus $estado, bool $conCuenta, bool $activo, string $statusDelCliente, ArtistStatus $esperado) {
    $artista = artistaEnEstado($estado, $conCuenta);
    $otroUsuario = User::factory()->create();
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/artists/{$artista->id}/status", [
        'active' => $activo,
        'status' => $statusDelCliente,
        'name' => 'Otro Nombre',
        'email' => 'otro@ejemplo.test',
        'user_id' => $otroUsuario->id,
    ])->assertOk();

    $despues = $artista->fresh();

    expect($despues->status)->toBe($esperado)
        ->and($despues->only(['name', 'email', 'user_id']))
        ->toBe($artista->only(['name', 'email', 'user_id']));
})->with([
    'desactivar pidiendo activo' => [ArtistStatus::Activo, true, false, 'activo', ArtistStatus::Inactivo],
    'reactivar sin cuenta pidiendo activo' => [ArtistStatus::Inactivo, false, true, 'activo', ArtistStatus::Invitado],
]);

it('valida active con 422 VALIDATION_ERROR sin modificar la fila', function (array $cuerpo) {
    $artista = artistaEnEstado(ArtistStatus::Activo, conCuenta: true);
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->putJson("/api/v1/artists/{$artista->id}/status", $cuerpo);

    $respuesta->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($respuesta->json('errors')))->toBe(['active']);
    expectEstadoIntacto($artista);
    expectSinAuditoria();
})->with([
    'ausente' => [[]],
    'texto' => [['active' => 'tal vez']],
    'lista' => [['active' => []]],
]);

it('responde 404 RESOURCE_NOT_FOUND cuando el artista no existe', function (string $id) {
    exigirRuta('PUT', 'api/v1/artists/{artist}/status');
    impersonarToken(claimsDeToken('productor'));

    $this->putJson("/api/v1/artists/{$id}/status", ['active' => false])
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
})->with('artistas inexistentes');

it('rechaza sin identidad o sin rol productor sin modificar la fila', function (?string $rol, int $http, string $code) {
    exigirRuta('PUT', 'api/v1/artists/{artist}/status');
    $artista = artistaEnEstado(ArtistStatus::Activo, conCuenta: true);

    if ($rol !== null) {
        impersonarToken(claimsDeToken($rol));
    }

    $this->putJson("/api/v1/artists/{$artista->id}/status", ['active' => false])
        ->assertStatus($http)
        ->assertJsonPath('code', $code);

    expectEstadoIntacto($artista);
    expectSinAuditoria();
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'rol artista' => ['artista', 403, 'FORBIDDEN'],
    'rol desconocido' => ['desconocido', 403, 'FORBIDDEN'],
]);
