<?php

declare(strict_types=1);

use App\Enums\ProductionFormat;

/*
|--------------------------------------------------------------------------
| TS-20 — Matriz de máximos por formato
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-09.md §3.1 y §4 (#10). Los valores se afirman
| con literales para detectar cualquier drift de la matriz.
|
*/

it('define el máximo de canciones de cada formato', function (ProductionFormat $format, ?int $max) {
    expect($format->maxSongs())->toBe($max);
})->with([
    'sencillo' => [ProductionFormat::Sencillo, 1],
    'EP' => [ProductionFormat::Ep, 6],
    'álbum sin máximo' => [ProductionFormat::Album, null],
]);

it('cubre todos los formatos del enum', function () {
    expect(ProductionFormat::cases())->toHaveCount(3);
});
