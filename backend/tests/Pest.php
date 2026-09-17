<?php

declare(strict_types=1);

use App\Auth\UserRepository;
use Auth0\Laravel\Entities\CredentialEntity;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Feature y Unit extienden el TestCase de Laravel: los tests de Unit de este
| proyecto necesitan el contenedor (leen `config()`), así que también arrancan
| la aplicación. Ver `backend/docs/nomenclatura.md` §8 para qué va en cada
| carpeta. `RefreshDatabase` sigue apagado: en Sprint 1 ninguna de las tres
| tareas de HU-03 toca la base de datos.
|
*/

pest()->extend(TestCase::class)->in('Feature', 'Unit');

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Impersona un access token de Auth0 que YA pasó la validación criptográfica.
 *
 * Lo que se salta es la frontera externa —firma, JWKS, `iss`, `aud`, expiración—,
 * que no es nuestra para probar y que se verificó fuera de la suite contra un token
 * real en jwt.io (T-23). Lo que NO se salta es nuestro código: el usuario se
 * construye pasando los claims por `UserRepository::fromAccessToken()`, que es
 * donde vive la extracción del rol (compuerta C4 de la metodología).
 *
 * @param  array<string, mixed>  $claims
 */
function impersonarToken(array $claims): void
{
    $usuario = (new UserRepository)->fromAccessToken($claims);

    auth('auth0-api')->setImpersonating(
        new CredentialEntity(user: $usuario, accessTokenDecoded: $claims),
    );
}

/**
 * Claims mínimos de un access token, con el rol en el claim namespaced que diga
 * la configuración. El namespace se LEE de `config('auth0.roles_claim')`, nunca
 * se escribe literal en un test: si el test copiara el literal, dejaría de
 * detectar que el código lo tiene incrustado (HU-03 §3.2).
 *
 * @param  array<string, mixed>  $extra
 * @return array<string, mixed>
 */
function claimsDeToken(?string $rol = null, array $extra = []): array
{
    $claimDeRoles = config('auth0.roles_claim');

    // Si esto falla, falta la clave de config, no el test.
    expect($claimDeRoles)->toBeString()->not->toBeEmpty();

    return array_merge(
        ['sub' => 'auth0|65f1a2b3c4d5e6f7a8b9c0d1'],
        $rol === null ? [] : [$claimDeRoles => [$rol]],
        $extra,
    );
}
