<?php

declare(strict_types=1);

use App\Models\Version;
use App\Support\TechnicalCheck;

/*
|--------------------------------------------------------------------------
| TS-91 — Chequeo técnico derivado al leer (D7.10)
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/TS-91.md §3.4 y §4 (#13–#18). Sin base de datos:
| TechnicalCheck recibe la versión ya cargada.
|
*/

/**
 * Versión en memoria, con el análisis por defecto de datosDeAnalisis() (las
 * cuatro advertencias en un master) y los cambios dados.
 *
 * @param  array<string, mixed>  $cambios
 */
function versionConAnalisis(?string $categoria = 'master', array $cambios = [], int $durationMs = 213450): Version
{
    return (new Version)->forceFill([
        'change_category' => $categoria,
        'duration_ms' => $durationMs,
        'analysis' => datosDeAnalisis($durationMs, $cambios),
    ]);
}

// #13
it('revisa el volumen integrado de un master', function (float $lufs, string $estado) {
    expect(TechnicalCheck::evaluate(versionConAnalisis('master', ['integrated_lufs' => $lufs]))['integrated_lufs'])
        ->toBe($estado);
})->with([
    'en el objetivo' => [-14.0, 'ok'],
    'límite superior' => [-13.0, 'ok'],
    'límite inferior' => [-15.0, 'ok'],
    'demasiado alto' => [-12.9, 'warning'],
    'demasiado bajo' => [-15.1, 'warning'],
]);

// #14
it('revisa el pico real de un master', function (float $pico, string $estado) {
    expect(TechnicalCheck::evaluate(versionConAnalisis('master', ['true_peak_dbtp' => $pico]))['true_peak'])
        ->toBe($estado);
})->with([
    'en el límite' => [-1.0, 'ok'],
    'con margen' => [-3.0, 'ok'],
    'sobre el límite' => [-0.9, 'warning'],
    'sobre 0 dBTP' => [0.4, 'warning'],
]);

// #15
it('no revisa volumen ni pico fuera del master', function (?string $categoria) {
    $checks = TechnicalCheck::evaluate(versionConAnalisis($categoria, [
        'integrated_lufs' => -8.0,
        'true_peak_dbtp' => 1.0,
    ]));

    expect($checks['integrated_lufs'])->toBe('not_applicable')
        ->and($checks['true_peak'])->toBe('not_applicable');
})->with([
    'mezcla' => ['mezcla'],
    'voz' => ['voz'],
    'sin categoría' => [null],
]);

it('no revisa volumen ni pico nulos en un master', function () {
    $checks = TechnicalCheck::evaluate(versionConAnalisis('master', [
        'integrated_lufs' => null,
        'true_peak_dbtp' => null,
    ]));

    expect($checks['integrated_lufs'])->toBe('not_applicable')
        ->and($checks['true_peak'])->toBe('not_applicable');
});

// #16
it('revisa la saturación en cualquier categoría', function (?string $categoria, int $eventos, string $estado) {
    $version = versionConAnalisis($categoria, ['clip_events' => $eventos, 'clipped_samples' => 12]);

    expect(TechnicalCheck::evaluate($version)['clipping'])->toBe($estado);
})->with([
    'master sin eventos' => ['master', 0, 'ok'],
    'master con un evento' => ['master', 1, 'warning'],
    'sin categoría con un evento' => [null, 1, 'warning'],
    'mezcla con un evento' => ['mezcla', 1, 'warning'],
]);

it('la saturación cuenta eventos, no muestras', function () {
    $version = versionConAnalisis(null, ['clip_events' => 0, 'clipped_samples' => 2]);

    expect(TechnicalCheck::evaluate($version)['clipping'])->toBe('ok');
});

// #17
it('advierte de un silencio de 2 s fuera del inicio y del final', function (array $silencios, string $estado) {
    $version = versionConAnalisis(null, ['silences' => $silencios]);

    expect(TechnicalCheck::evaluate($version)['silence'])->toBe($estado);
})->with([
    '2000 ms en medio' => [[['start_ms' => 60000, 'end_ms' => 62000]], 'warning'],
    '1999 ms en medio' => [[['start_ms' => 60000, 'end_ms' => 61999]], 'ok'],
    '10 s al inicio' => [[['start_ms' => 0, 'end_ms' => 10000]], 'ok'],
    '10 s al final' => [[['start_ms' => 203450, 'end_ms' => 213450]], 'ok'],
    'bordes y uno en medio' => [[
        ['start_ms' => 0, 'end_ms' => 10000],
        ['start_ms' => 60000, 'end_ms' => 62000],
        ['start_ms' => 203450, 'end_ms' => 213450],
    ], 'warning'],
    'ninguno' => [[], 'ok'],
]);

it('devuelve los cuatro chequeos', function () {
    expect(TechnicalCheck::evaluate(versionConAnalisis()))->toBe([
        'integrated_lufs' => 'warning',
        'true_peak' => 'warning',
        'clipping' => 'warning',
        'silence' => 'warning',
    ]);
});

// #18
it('expone los umbrales de D7.10', function () {
    expect(TechnicalCheck::THRESHOLDS)->toBe([
        'integrated_lufs_target' => -14,
        'integrated_lufs_tolerance' => 1,
        'true_peak_max_dbtp' => -1,
        'clip_events_min' => 1,
        'silence_min_ms' => 2000,
    ]);
});
