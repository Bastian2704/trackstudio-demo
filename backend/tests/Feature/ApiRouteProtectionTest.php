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

    // TS-16 (docs/specs/backend/HU-05.md §3.1): artistas, solo productor vía ArtistPolicy.
    expect($inventario)->toBe([
        'GET api/v1/artists/{artist}' => ['auth:auth0-api', 'can:view,artist'],
        'GET api/v1/health' => [],
        'GET api/v1/me' => ['auth:auth0-api'],
        'POST api/v1/artists' => ['auth:auth0-api', 'can:create,App\\Models\\Artist'],
        'POST api/v1/rbac-check' => ['auth:auth0-api', 'can:perform-producer-action'],
        'PUT api/v1/artists/{artist}' => ['auth:auth0-api', 'can:update,artist'],
    ]);
});
