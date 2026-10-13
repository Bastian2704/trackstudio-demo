<?php

declare(strict_types=1);

use Illuminate\Routing\Route;

/*
|--------------------------------------------------------------------------
| TS-15 — Inventario de protección de rutas API
|--------------------------------------------------------------------------
|
| Una ruta nueva no puede quedar protegida «por convención». Este inventario
| obliga a clasificarla como pública, autenticada o autorizada en la spec.
|
*/

it('clasifica y protege todas las rutas de la API', function () {
    $inventario = collect(app('router')->getRoutes()->getRoutes())
        ->filter(fn (Route $ruta): bool => str_starts_with($ruta->uri(), 'api/v1/'))
        ->mapWithKeys(function (Route $ruta): array {
            $metodos = array_values(array_diff($ruta->methods(), ['HEAD']));
            $clave = implode('|', $metodos).' '.$ruta->uri();

            $controles = collect($ruta->gatherMiddleware())
                ->filter(fn (mixed $middleware): bool => is_string($middleware)
                    && (str_starts_with($middleware, 'auth:') || str_starts_with($middleware, 'can:')))
                ->values()
                ->all();

            return [$clave => $controles];
        })
        ->sortKeys()
        ->all();

    // TS-16..TS-21: artistas, producciones y canciones, solo productor vía sus Policies.
    expect($inventario)->toBe([
        'DELETE api/v1/productions/{production}' => ['auth:auth0-api', 'can:delete,production'],
        'DELETE api/v1/songs/{song}' => ['auth:auth0-api', 'can:delete,song'],
        'GET api/v1/artists' => ['auth:auth0-api', 'can:viewAny,App\\Models\\Artist'],
        'GET api/v1/artists/{artist}' => ['auth:auth0-api', 'can:view,artist'],
        'GET api/v1/health' => [],
        'GET api/v1/me' => ['auth:auth0-api'],
        'GET api/v1/productions/{production}' => ['auth:auth0-api', 'can:view,production'],
        'GET api/v1/songs/{song}' => ['auth:auth0-api', 'can:view,song'],
        'POST api/v1/artists' => ['auth:auth0-api', 'can:create,App\\Models\\Artist'],
        'POST api/v1/productions' => ['auth:auth0-api', 'can:create,App\\Models\\Production'],
        'POST api/v1/productions/{production}/songs' => ['auth:auth0-api', 'can:create,App\\Models\\Song'],
        'POST api/v1/rbac-check' => ['auth:auth0-api', 'can:perform-producer-action'],
        'PUT api/v1/artists/{artist}' => ['auth:auth0-api', 'can:update,artist'],
        'PUT api/v1/artists/{artist}/status' => ['auth:auth0-api', 'can:changeStatus,artist'],
        'PUT api/v1/productions/{production}' => ['auth:auth0-api', 'can:update,production'],
        'PUT api/v1/songs/{song}' => ['auth:auth0-api', 'can:update,song'],
    ]);
});

it('restringe a UUID las rutas parametrizadas de producciones', function (string $method) {
    $route = collect(app('router')->getRoutes()->getRoutes())->first(
        fn (Route $candidate): bool => $candidate->uri() === 'api/v1/productions/{production}'
            && in_array($method, $candidate->methods(), true),
    );

    expect($route)->not->toBeNull()
        ->and($route->wheres)->toHaveKey('production');
})->with([
    'consulta' => ['GET'],
    'edición' => ['PUT'],
    'borrado' => ['DELETE'],
]);

it('restringe a UUID las rutas parametrizadas de canciones', function (string $method, string $uri, string $parameter) {
    $route = collect(app('router')->getRoutes()->getRoutes())->first(
        fn (Route $candidate): bool => $candidate->uri() === $uri
            && in_array($method, $candidate->methods(), true),
    );

    expect($route)->not->toBeNull()
        ->and($route->wheres)->toHaveKey($parameter);
})->with([
    'alta' => ['POST', 'api/v1/productions/{production}/songs', 'production'],
    'consulta' => ['GET', 'api/v1/songs/{song}', 'song'],
    'edición' => ['PUT', 'api/v1/songs/{song}', 'song'],
    'borrado' => ['DELETE', 'api/v1/songs/{song}', 'song'],
]);
