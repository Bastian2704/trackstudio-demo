<?php

declare(strict_types=1);

use App\Auth\UserRepository;
use App\Enums\Role;

/*
|--------------------------------------------------------------------------
| TS-28 — Extracción del rol desde el claim del JWT (D4.8)
|--------------------------------------------------------------------------
|
| La extracción del rol es una función pura de los claims, así que se prueba
| directamente sobre `UserRepository::fromAccessToken()` y no a través de HTTP:
| meter un endpoint de por medio solo añadiría ruido a la causa de un fallo.
| La validación del JWT en sí NO se prueba aquí — la hace el SDK y ya está
| verificada contra un token real (T-23).
|
| Aquí sí se usa el enum `Role`: es el contrato interno, no el que sale por el
| cable. El valor que viaja al frontend se afirma con literales en MeEndpointTest.
|
| Spec: docs/specs/backend/HU-03.md §3.2.
|
*/

it('extrae el rol artista del claim del token', function () {
    $usuario = (new UserRepository)->fromAccessToken(claimsDeToken('artista'));

    // El enum, no el string: castear en la frontera es lo que impide que un rol
    // inventado en Auth0 circule como dato válido por dentro de la aplicación.
    expect($usuario->role)->toBe(Role::Artista);
});

it('extrae el rol productor del claim del token', function () {
    $usuario = (new UserRepository)->fromAccessToken(claimsDeToken('productor'));

    expect($usuario->role)->toBe(Role::Productor);
});

it('lee el namespace del claim desde una única clave de config', function () {
    config(['auth0.roles_claim' => 'https://otro-namespace.test/roles']);

    // `claimsDeToken()` construye el claim leyendo esa misma config, así que si
    // el repositorio tiene el namespace incrustado, no lo encuentra y el rol
    // queda en null. Es el test anti-drift del handoff de backend §8.8.
    $usuario = (new UserRepository)->fromAccessToken(claimsDeToken('productor'));

    expect($usuario->role)->toBe(Role::Productor);
});

it('deja el rol en null cuando el token no trae el claim', function () {
    $usuario = (new UserRepository)->fromAccessToken(claimsDeToken(null));

    // Un token válido sin rol es un usuario autenticado sin permisos: eso es un
    // 403 que decide la Policy de HU-04, no una excepción aquí.
    expect($usuario->role)->toBeNull();
});

it('ignora un valor de rol que no está en el enum', function () {
    $usuario = (new UserRepository)->fromAccessToken(claimsDeToken('admin'));

    // `admin` no existe en Track Studio (D4.8: solo productor y artista). Si
    // alguien lo crea en Auth0, no puede colarse como rol del backend.
    expect($usuario->role)->toBeNull();
});

it('conserva el sub del token como identificador del usuario', function () {
    $claims = claimsDeToken('artista');

    $usuario = (new UserRepository)->fromAccessToken($claims);

    // El `sub` es la clave con la que HU-04 resolverá la fila local (`auth0_sub`).
    expect($usuario->getAuthIdentifier())->toBe($claims['sub']);
});
