<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| HU-03 — Endpoint de humo GET /api/v1/me (D4.2)
|--------------------------------------------------------------------------
|
| Prueba la cadena completa: token -> claim -> rol -> API Resource -> JSON.
| En Sprint 1 este endpoint NO toca la base de datos: la tabla `users` nace en
| HU-04 (spec §3.4).
|
| El rol se afirma con el literal que viaja por el cable (`"artista"`), no con
| el enum: es el mismo string que ya consume `useRole.ts` en el frontend.
|
*/

it('devuelve la identidad del token con su rol', function () {
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->getJson('/api/v1/me');

    $respuesta->assertOk();

    // Exacto: cada campo de más es un dato que el cliente no pidió y que hay
    // que mantener para siempre (D4.2 filtra, no vuelca).
    $respuesta->assertExactJson([
        'data' => [
            'sub' => 'auth0|65f1a2b3c4d5e6f7a8b9c0d1',
            'role' => 'productor',
        ],
    ]);
});

it('refleja el rol artista cuando el token es de un artista', function () {
    impersonarToken(claimsDeToken('artista'));

    // Ancla del test anterior: prueba que el rol sale del token y no está quemado.
    $this->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.role', 'artista');
});

it('devuelve el rol en null cuando el token no trae el claim', function () {
    impersonarToken(claimsDeToken(null));

    // Autenticado sí, autorizado no. Quien decide el 403 es la Policy de HU-04.
    $this->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.role', null);
});

it('responde sin tocar la base de datos', function () {
    impersonarToken(claimsDeToken('productor'));

    $consultas = 0;
    DB::listen(function () use (&$consultas) {
        $consultas++;
    });

    // ts-03.11: la identidad sale del token y no se guarda en ningún sitio. El
    // 200 va primero para que el cero no se cumpla por una ruta que no existe.
    $this->getJson('/api/v1/me')->assertOk();

    expect($consultas)->toBe(0);
});

it('exige token para responder', function () {
    // El mismo 401 de TokenGuardTest, pero sobre la ruta real: prueba que a /me
    // no se le olvidó el middleware.
    $this->getJson('/api/v1/me')
        ->assertUnauthorized()
        ->assertJsonPath('code', 'UNAUTHENTICATED');
});

it('no expone los claims internos del token', function () {
    impersonarToken(claimsDeToken('artista', [
        'iss' => 'https://trackstudio.us.auth0.com/',
        'aud' => 'https://api.trackstudio.site',
        'exp' => 1789000000,
        'iat' => 1788996400,
        'azp' => 'cliente-spa-de-prueba',
        'scope' => 'openid profile email',
        'email' => 'ana@milenium.test',
    ]));

    $cuerpo = json_encode($this->getJson('/api/v1/me')->json());

    // Aserción de RNF-02: describen la configuración interna de auth y no le
    // sirven de nada al cliente. Si el Resource vuelca `getAttributes()`, salen todos.
    expect($cuerpo)->not->toContain('trackstudio.us.auth0.com')
        ->not->toContain('cliente-spa-de-prueba')
        ->not->toContain('openid profile email')
        ->not->toContain('ana@milenium.test');
});
