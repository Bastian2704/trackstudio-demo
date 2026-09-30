<?php

declare(strict_types=1);
use Illuminate\Testing\TestResponse;

/*
|--------------------------------------------------------------------------
| HU-03 — Verificación del JWT por el guard real (ts-03.02)
|--------------------------------------------------------------------------
|
| Sin impersonar: cada petición lleva `Authorization: Bearer <jwt>` y atraviesa
| el guard `auth0-api` completo. Los JWT se firman aquí con una clave RS256 de
| prueba y el JWKS se le entrega al SDK sin red.
|
| La verificación la hace el SDK, pero que rechace una audience ajena depende de
| NUESTRA configuración. `impersonarToken()` no ejercita nada de esto.
|
| Cada test de rechazo cambia exactamente una cosa respecto del token válido del
| primer test, que es su ancla: si ese no da 200, los 401 no prueban nada.
|
| Spec: docs/specs/backend/HU-03.md §3.3 y §4 (tests 20-24).
|
*/

beforeEach(function () {
    registrarRutaProtegida();
    configurarSdkDePrueba();
});

/**
 * @param  array<string, mixed>  $claims
 */
function pedirRutaProtegidaCon(array $claims, string $firmadoCon = 'principal'): TestResponse
{
    return test()->getJson(RUTA_PROTEGIDA_DE_PRUEBA, [
        'Authorization' => 'Bearer '.firmarJwt($claims, $firmadoCon),
    ]);
}

it('acepta un token bien firmado y entrega el rol del claim', function () {
    // El rol viaja hasta la ruta solo si el guard construyó el usuario con
    // nuestro repositorio: es la prueba de comportamiento del test de cableado.
    pedirRutaProtegidaCon(claimsDeTokenFirmado('productor'))
        ->assertOk()
        ->assertExactJson(['rol' => 'productor']);
});

describe('rechaza con 401 UNAUTHENTICATED', function () {
    it('un token con firma inválida', function () {
        pedirRutaProtegidaCon(claimsDeTokenFirmado('productor'), firmadoCon: 'ajena')
            ->assertUnauthorized()
            ->assertJsonPath('code', 'UNAUTHENTICATED')
            ->assertJsonPath('type', 'https://trackstudio.site/errors/unauthenticated');
    });

    it('un token expirado', function () {
        // Una hora atrás: muy por fuera de la tolerancia de reloj del SDK.
        pedirRutaProtegidaCon(claimsDeTokenFirmado('productor', ['exp' => time() - 3600]))
            ->assertUnauthorized()
            ->assertJsonPath('code', 'UNAUTHENTICATED')
            ->assertJsonPath('type', 'https://trackstudio.site/errors/unauthenticated');
    });

    it('un token de otra audience', function () {
        pedirRutaProtegidaCon(claimsDeTokenFirmado('productor', ['aud' => ['https://api.de-otro.test']]))
            ->assertUnauthorized()
            ->assertJsonPath('code', 'UNAUTHENTICATED')
            ->assertJsonPath('type', 'https://trackstudio.site/errors/unauthenticated');
    });

    it('un token de otro issuer', function () {
        pedirRutaProtegidaCon(claimsDeTokenFirmado('productor', ['iss' => 'https://otro-tenant.auth0.test/']))
            ->assertUnauthorized()
            ->assertJsonPath('code', 'UNAUTHENTICATED')
            ->assertJsonPath('type', 'https://trackstudio.site/errors/unauthenticated');
    });

    it('sin decir cuál de las comprobaciones falló', function () {
        $porExpirado = pedirRutaProtegidaCon(claimsDeTokenFirmado('productor', ['exp' => time() - 3600]));
        $porAudience = pedirRutaProtegidaCon(claimsDeTokenFirmado('productor', ['aud' => ['https://api.de-otro.test']]));

        // §3.3: el `detail` es el mismo texto para todos los rechazos. Un mensaje
        // distinto por motivo le dice a quien prueba tokens qué le falta arreglar.
        expect($porExpirado->assertUnauthorized()->json('detail'))
            ->toBe($porAudience->assertUnauthorized()->json('detail'));
    });
});

it('acepta un access token real de Auth0', function () {
    // C4: el único test de la suite que cruza la frontera real. Usa el `.env`
    // de verdad y la red (JWKS del tenant), por eso no corre en CI. Se rearranca
    // la aplicación para descartar la config de prueba del `beforeEach`.
    $this->refreshApplication();

    $token = (string) env('AUTH0_TEST_ACCESS_TOKEN');

    $claims = json_decode(
        base64_decode(strtr(explode('.', $token)[1] ?? '', '-_', '+/')),
        associative: true,
    );

    $rolDelClaim = $claims[config('auth0.roles_claim')][0] ?? null;

    // Sin rol en el token, el 200 no distinguiría nuestro repositorio del que
    // trae el SDK por defecto.
    expect($rolDelClaim)->toBeString();

    $this->getJson('/api/v1/me', ['Authorization' => "Bearer {$token}"])
        ->assertOk()
        ->assertJsonPath('data.role', $rolDelClaim);
})->skip(
    fn () => ! env('AUTH0_TEST_ACCESS_TOKEN'),
    'Definir AUTH0_TEST_ACCESS_TOKEN con un access token recién emitido (HU-03 §4, test 24).',
);
