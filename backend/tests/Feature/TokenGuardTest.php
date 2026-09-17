<?php

declare(strict_types=1);

use App\Auth\UserRepository;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| TS-28 — El guard de Auth0 sobre las rutas de la API
|--------------------------------------------------------------------------
|
| Dos cosas que la prueba unitaria del repositorio no puede afirmar: que sin
| token la respuesta tiene la forma de D3.1, y que el repositorio que extrae el
| rol es el que el guard usa de verdad.
|
| Spec: docs/specs/backend/HU-03.md §3.2 y §3.3.
|
*/

beforeEach(function () {
    // Ruta desechable: TS-28 se prueba contra el guard, no contra el endpoint de
    // TS-29. Si usara /api/v1/me, estos tests fallarían por una ruta que falta y
    // no por el guard, que es lo que afirman.
    Route::middleware(['api', 'auth:auth0-api'])
        ->get('/api/v1/__test/protegida', fn () => ['ok' => true]);
});

it('rechaza con 401 UNAUTHENTICATED la petición sin token', function () {
    $respuesta = $this->getJson('/api/v1/__test/protegida');

    $respuesta->assertUnauthorized();

    // El status 401 lo da Laravel solo. Lo que hay que construir es el CUERPO:
    // el 401 por defecto del SDK no tiene esta forma (handoff de backend §8.4),
    // y el frontend hace lógica sobre `code`, nunca sobre el mensaje.
    $respuesta->assertJsonPath('code', 'UNAUTHENTICATED')
        ->assertJsonPath('type', 'https://trackstudio.site/errors/unauthenticated')
        ->assertJsonPath('status', 401);
});

it('rechaza con 401 UNAUTHENTICATED un Authorization header con basura', function () {
    $this->getJson('/api/v1/__test/protegida', ['Authorization' => 'Bearer no-soy-un-jwt'])
        ->assertUnauthorized()
        ->assertJsonPath('code', 'UNAUTHENTICATED');
});

it('usa nuestro repositorio como proveedor de usuarios del guard auth0-api', function () {
    $proveedor = config('auth.guards.auth0-api.provider');

    // Sin este cableado, la extracción del rol existe pero nunca se ejecuta: el
    // guard serviría el usuario por defecto del SDK, sin rol, y todas las
    // Policies de HU-04 negarían a todo el mundo con un 403 inexplicable.
    expect($proveedor)->toBeString()
        ->and(config("auth.providers.{$proveedor}.repository"))->toBe(UserRepository::class);
});
