<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Artist;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-31 — Aceptar invitación: POST /api/v1/invitations/{token}/accept
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-20.md §3.6 y §4 (#16–#21). En la base solo vive
| el SHA-256 del token (§3.1); el test guarda el hash y envía el token en claro.
|
*/

const INSTANTE_DE_ACEPTACION = '2026-11-22 18:00:00';

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse(INSTANTE_DE_ACEPTACION));
});

/**
 * Artista invitado con un token en claro cuyo hash queda guardado.
 *
 * @param  array<string, mixed>  $cambios
 * @return array{0: Artist, 1: string}
 */
function artistaInvitado(array $cambios = []): array
{
    $token = Str::random(64);

    $artista = Artist::factory()->create(array_merge([
        'status' => ArtistStatus::Invitado,
        'user_id' => null,
        'invitation_token' => hash('sha256', $token),
        'invited_at' => now()->subDays(2),
        'invitation_expires_at' => now()->addDays(5),
    ], $cambios));

    return [$artista, $token];
}

function aceptar(string $token): TestResponse
{
    return test()->postJson("/api/v1/invitations/{$token}/accept");
}

/** Los campos que `accept` puede tocar no cambiaron. */
function expectInvitacionIntacta(Artist $antes): void
{
    $despues = Artist::withTrashed()->findOrFail($antes->id);

    expect($despues->only(['user_id', 'status', 'invitation_token', 'invited_at', 'invitation_expires_at']))
        ->toEqual($antes->only(['user_id', 'status', 'invitation_token', 'invited_at', 'invitation_expires_at']));
}

it('enlaza la cuenta y consume el token', function () {
    [$artista, $token] = artistaInvitado();
    $invitadoEn = $artista->invited_at;
    impersonarToken(claimsDeToken('artista'));

    $respuesta = aceptar($token);

    $respuesta->assertOk()
        ->assertJsonPath('data.id', $artista->id)
        ->assertJsonPath('data.status', 'activo');

    expect(array_keys($respuesta->json('data')))->toEqualCanonicalizing(CAMPOS_DE_ARTISTA);

    $artista->refresh();

    expect(usuarioDelToken())->not->toBeNull()
        ->and($artista->user_id)->toBe(usuarioDelToken()?->id)
        ->and($artista->invitation_token)->toBeNull()
        ->and($artista->invitation_expires_at)->toBeNull()
        ->and($artista->invited_at?->equalTo($invitadoEn))->toBeTrue()
        ->and($artista->status)->toBe(ArtistStatus::Activo);
});

it('el token es de un solo uso', function () {
    [, $token] = artistaInvitado();
    impersonarToken(claimsDeToken('artista'));

    aceptar($token)->assertOk();

    aceptar($token)
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
});

it('responde 404 sin tocar al artista si el token no vale', function (Closure $preparar) {
    exigirRuta('POST', 'api/v1/invitations/{token}/accept');
    [$artista, $token] = artistaInvitado();
    $enviado = $preparar($artista, $token);
    impersonarToken(claimsDeToken('artista'));

    aceptar($enviado)
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expectInvitacionIntacta($artista);
})->with([
    'inexistente' => [fn (Artist $a, string $t): string => Str::random(64)],
    'caducado' => [function (Artist $a, string $t): string {
        $a->update(['invitation_expires_at' => now()->subSecond()]);
        $a->refresh();

        return $t;
    }],
    'artista borrado' => [function (Artist $a, string $t): string {
        $a->delete();
        $a->refresh();

        return $t;
    }],
    'el hash en vez del token' => [fn (Artist $a, string $t): string => (string) $a->invitation_token],
]);

it('no reactiva a un artista inactivo', function () {
    [$artista, $token] = artistaInvitado(['status' => ArtistStatus::Inactivo]);
    impersonarToken(claimsDeToken('artista'));

    aceptar($token)
        ->assertOk()
        ->assertJsonPath('data.status', 'inactivo');

    $artista->refresh();

    expect($artista->user_id)->toBe(usuarioDelToken()?->id)
        ->and($artista->status)->toBe(ArtistStatus::Inactivo);
});

it('rechaza una cuenta ya vinculada a otro artista', function () {
    $usuario = User::factory()->create(['auth0_sub' => claimsDeToken()['sub']]);
    Artist::factory()->create([
        'status' => ArtistStatus::Activo,
        'user_id' => $usuario->id,
        'invitation_token' => null,
    ]);
    [$artista, $token] = artistaInvitado();
    impersonarToken(claimsDeToken('artista'));

    $respuesta = aceptar($token);

    $respuesta->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonPath('errors.token.0', 'Tu cuenta ya está vinculada a otro artista.');

    expectInvitacionIntacta($artista);
});

it('solo el rol artista acepta', function (?string $rol, int $http, string $code) {
    exigirRuta('POST', 'api/v1/invitations/{token}/accept');
    [$artista, $token] = artistaInvitado();

    if ($rol !== null) {
        impersonarToken(claimsDeToken($rol === 'sin rol' ? null : $rol));
    }

    aceptar($token)
        ->assertStatus($http)
        ->assertJsonPath('code', $code);

    expectInvitacionIntacta($artista);
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'productor' => ['productor', 403, 'FORBIDDEN'],
    'sin rol' => ['sin rol', 403, 'FORBIDDEN'],
]);
