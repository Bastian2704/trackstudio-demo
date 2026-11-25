<?php

declare(strict_types=1);

use App\Models\Song;
use App\Models\Version;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-91 — Análisis técnico en la confirmación y en el historial
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/TS-91.md §3.2–§3.4 y §4 (#2–#11). HeadObject es un
| doble de HashVerifierContract (HU-14): aquí solo cambia el cuerpo.
|
*/

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse('2026-11-24 10:00:00'));
    impersonarToken(claimsDeToken('productor'));
});

/** Confirma una versión pendiente recién firmada con el cuerpo dado. */
function confirmarConAnalisis(Version $version, array $cuerpo): TestResponse
{
    return test()->postJson("/api/v1/versions/{$version->id}/confirm", $cuerpo);
}

/** El ETag coincide: si la confirmación llega a S3, la versión queda verificada. */
function headObjectQueCoincide(): ArrayObject
{
    return falsearVerificadorDeHash(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 48211200]);
}

/** El valor crudo de la columna, sin pasar por el cast del modelo. */
function analisisGuardado(Version $version): mixed
{
    $crudo = DB::table('versions')->where('id', $version->id)->value('analysis');

    return $crudo === null ? null : json_decode($crudo, true);
}

function expectRechazoDelAnalisis(TestResponse $response, Version $version, ArrayObject $consultas): void
{
    $response->assertStatus(422)->assertJsonPath('code', 'VALIDATION_ERROR');

    $claves = array_keys($response->json('errors') ?? []);

    expect(array_filter($claves, fn (string $clave): bool => str_starts_with($clave, 'analysis')))->not->toBeEmpty()
        ->and($consultas)->toHaveCount(0)
        ->and($version->refresh()->upload_status->value)->toBe('pendiente')
        ->and(analisisGuardado($version))->toBeNull();
}

// #2
it('guarda el análisis al verificar', function () {
    $version = Version::factory()->create();
    headObjectQueCoincide();
    $analisis = datosDeAnalisis();

    $response = confirmarConAnalisis($version, datosDeConfirmacion(['analysis' => $analisis]));

    $response->assertOk()->assertJsonPath('data.upload_status', 'verificada');

    expect(analisisGuardado($version))->toEqual($analisis)
        ->and($response->json('data.analysis'))->toEqual(Arr::except($analisis, 'series'))
        ->and($response->json('data.analysis'))->not->toHaveKey('series');
});

// #3
it('verifica sin análisis', function (array $cuerpo) {
    $version = Version::factory()->create();
    headObjectQueCoincide();

    $response = confirmarConAnalisis($version, $cuerpo);

    $response->assertOk()->assertJsonPath('data.upload_status', 'verificada');

    expect(array_keys($response->json('data')))->toEqualCanonicalizing(CAMPOS_DE_VERSION)
        ->and($response->json('data.analysis'))->toBeNull()
        ->and($response->json('data.technical_check'))->toBeNull();

    $this->assertDatabaseHas('versions', ['id' => $version->id, 'analysis' => null]);
})->with([
    'ausente' => [fn () => datosDeConfirmacion()],
    'nulo' => [fn () => datosDeConfirmacion(['analysis' => null])],
]);

// #4
it('no guarda el análisis si la versión no queda verificada', function (?array $objeto, string $estado) {
    $version = Version::factory()->create();
    falsearVerificadorDeHash($objeto);

    confirmarConAnalisis($version, datosDeConfirmacion(['analysis' => datosDeAnalisis()]))
        ->assertStatus(422)
        ->assertJsonPath('code', 'AUDIO_HASH_MISMATCH');

    $this->assertDatabaseHas('versions', ['id' => $version->id, 'upload_status' => $estado, 'analysis' => null]);
})->with([
    'ETag distinto' => [['etag' => 'd41d8cd98f00b204e9800998ecf8427e', 'size_bytes' => 48211200], 'fallida'],
    'objeto no disponible' => [null, 'pendiente'],
]);

// #5
it('una segunda confirmación no reemplaza el análisis', function () {
    $version = Version::factory()->create();
    headObjectQueCoincide();
    $primero = datosDeAnalisis();

    confirmarConAnalisis($version, datosDeConfirmacion(['analysis' => $primero]))->assertOk();
    confirmarConAnalisis($version, datosDeConfirmacion([
        'analysis' => datosDeAnalisis(cambios: ['integrated_lufs' => -14.0]),
    ]))->assertOk();

    expect(analisisGuardado($version))->toEqual($primero);
});

// #6
it('rechaza un análisis con forma inválida', function (mixed $analisis) {
    $version = Version::factory()->create();
    $consultas = headObjectQueCoincide();

    $response = confirmarConAnalisis($version, datosDeConfirmacion(['analysis' => $analisis]));

    expectRechazoDelAnalisis($response, $version, $consultas);
})->with([
    'lista en vez de objeto' => [fn () => [datosDeAnalisis()]],
    'cadena' => ['análisis'],
    'sin schema_version' => [fn () => Arr::except(datosDeAnalisis(), 'schema_version')],
    'schema_version 2' => [fn () => datosDeAnalisis(cambios: ['schema_version' => 2])],
    'schema_version como cadena' => [fn () => datosDeAnalisis(cambios: ['schema_version' => '1'])],
    'clave desconocida en analysis' => [fn () => datosDeAnalisis(cambios: ['extra' => 1])],
    'clave desconocida en series' => [fn () => datosDeAnalisis(cambios: ['series.extra' => array_fill(0, 214, -20.0)])],
    'clave desconocida en un silencio' => [fn () => datosDeAnalisis(cambios: ['silences.0.extra' => 1])],
    'sin series' => [fn () => Arr::except(datosDeAnalisis(), 'series')],
    'sin una serie' => [fn () => Arr::except(datosDeAnalisis(), 'series.high')],
    // Sin la clave, TechnicalCheck fallaría al leer el historial (review C3, M23).
    'sin integrated_lufs' => [fn () => Arr::except(datosDeAnalisis(), 'integrated_lufs')],
    'sin true_peak_dbtp' => [fn () => Arr::except(datosDeAnalisis(), 'true_peak_dbtp')],
    'sin clip_events' => [fn () => Arr::except(datosDeAnalisis(), 'clip_events')],
    'sin silences' => [fn () => Arr::except(datosDeAnalisis(), 'silences')],
]);

// #7
it('rechaza valores fuera de rango', function (array $cambios) {
    $version = Version::factory()->create();
    $consultas = headObjectQueCoincide();

    $response = confirmarConAnalisis($version, datosDeConfirmacion(['analysis' => datosDeAnalisis(cambios: $cambios)]));

    expectRechazoDelAnalisis($response, $version, $consultas);
})->with([
    'volumen bajo el umbral absoluto' => [['integrated_lufs' => -70.1]],
    'volumen sobre +20' => [['integrated_lufs' => 20.1]],
    'volumen como cadena' => [['integrated_lufs' => '-9']],
    'volumen booleano' => [['integrated_lufs' => true]],
    'pico bajo −120' => [['true_peak_dbtp' => -120.1]],
    'pico sobre +20' => [['true_peak_dbtp' => 20.1]],
    'muestras saturadas negativas' => [['clipped_samples' => -1]],
    'muestras saturadas decimales' => [['clipped_samples' => 1.5]],
    'eventos negativos' => [['clip_events' => -1]],
    'más eventos que muestras' => [['clip_events' => 2, 'clipped_samples' => 5]],
]);

// #8
it('rechaza silencios inválidos', function (array $silencios) {
    $version = Version::factory()->create();
    $consultas = headObjectQueCoincide();

    $response = confirmarConAnalisis($version, datosDeConfirmacion([
        'analysis' => datosDeAnalisis(cambios: ['silences' => $silencios]),
    ]));

    expectRechazoDelAnalisis($response, $version, $consultas);
})->with([
    'inicio negativo' => [[['start_ms' => -1, 'end_ms' => 1500]]],
    'fin después de la duración' => [[['start_ms' => 210000, 'end_ms' => 213451]]],
    'inicio después del fin' => [[['start_ms' => 6000, 'end_ms' => 5000]]],
    'tramo de 999 ms' => [[['start_ms' => 5000, 'end_ms' => 5999]]],
    'desordenados' => [[['start_ms' => 20000, 'end_ms' => 22000], ['start_ms' => 5000, 'end_ms' => 7000]]],
    'solapados' => [[['start_ms' => 5000, 'end_ms' => 8000], ['start_ms' => 7000, 'end_ms' => 9000]]],
    'que se tocan' => [[['start_ms' => 5000, 'end_ms' => 7000], ['start_ms' => 7000, 'end_ms' => 9000]]],
    'inicio decimal' => [[['start_ms' => 5000.5, 'end_ms' => 7000]]],
]);

// #9
it('rechaza series inválidas', function (int $durationMs, array $cambios) {
    $version = Version::factory()->create();
    $consultas = headObjectQueCoincide();

    $response = confirmarConAnalisis($version, datosDeConfirmacion([
        'duration_ms' => $durationMs,
        'analysis' => datosDeAnalisis($durationMs, $cambios),
    ]));

    expectRechazoDelAnalisis($response, $version, $consultas);
})->with([
    'valor sobre +20' => [213450, ['series.loudness.3' => 20.1]],
    'valor bajo −120' => [213450, ['series.low.3' => -120.1]],
    'valor como cadena' => [213450, ['series.mid.3' => '-18']],
    'valor booleano' => [213450, ['series.high.3' => true]],
    'un tramo de menos' => [213450, [
        'series.loudness' => array_fill(0, 213, -14.0),
        'series.low' => array_fill(0, 213, -14.0),
        'series.mid' => array_fill(0, 213, -14.0),
        'series.high' => array_fill(0, 213, -14.0),
    ]],
    'un tramo de más' => [213450, [
        'series.loudness' => array_fill(0, 215, -14.0),
        'series.low' => array_fill(0, 215, -14.0),
        'series.mid' => array_fill(0, 215, -14.0),
        'series.high' => array_fill(0, 215, -14.0),
    ]],
    'longitudes distintas' => [213450, ['series.high' => array_fill(0, 215, -14.0)]],
    'más de 20 min' => [1201000, []],
]);

// #10
it('acepta los límites', function (int $durationMs, array $cambios) {
    $version = Version::factory()->create();
    headObjectQueCoincide();
    $analisis = datosDeAnalisis($durationMs, $cambios);

    confirmarConAnalisis($version, datosDeConfirmacion(['duration_ms' => $durationMs, 'analysis' => $analisis]))
        ->assertOk()
        ->assertJsonPath('data.upload_status', 'verificada');

    expect(analisisGuardado($version))->toEqual($analisis);
})->with([
    'volumen en −70' => [213450, ['integrated_lufs' => -70]],
    'volumen en +20' => [213450, ['integrated_lufs' => 20]],
    'volumen nulo' => [213450, ['integrated_lufs' => null]],
    'pico en −120' => [213450, ['true_peak_dbtp' => -120]],
    'pico en +20' => [213450, ['true_peak_dbtp' => 20]],
    'pico nulo' => [213450, ['true_peak_dbtp' => null]],
    'eventos × 3 = muestras' => [213450, ['clip_events' => 4, 'clipped_samples' => 12]],
    'sin saturación' => [213450, ['clip_events' => 0, 'clipped_samples' => 0]],
    'sin silencios' => [213450, ['silences' => []]],
    'silencios en los bordes' => [213450, ['silences' => [
        ['start_ms' => 0, 'end_ms' => 1000],
        ['start_ms' => 212450, 'end_ms' => 213450],
    ]]],
    'tramos nulos y en los extremos' => [213450, [
        'series.loudness.0' => null,
        'series.low.1' => -120,
        'series.mid.2' => 20,
        'series.high.3' => null,
    ]],
    'exactamente 20 min' => [1200000, []],
]);

// #11
it('el historial devuelve el resumen y el chequeo', function () {
    $song = Song::factory()->create();
    $analisis = datosDeAnalisis();
    $conAnalisis = Version::factory()->for($song)->verificada()->create([
        'version_number' => 1,
        'duration_ms' => 213450,
        'change_category' => 'master',
        'description' => 'Master para streaming.',
        'analysis' => $analisis,
    ]);
    $sinAnalisis = Version::factory()->for($song)->verificada()->create(['version_number' => 2]);

    $response = $this->getJson("/api/v1/songs/{$song->id}/versions");

    $response->assertOk();

    [$segunda, $primera] = $response->json('data');

    foreach ($response->json('data') as $version) {
        expect(array_keys($version))->toEqualCanonicalizing(CAMPOS_DE_VERSION);
    }

    expect($primera['id'])->toBe($conAnalisis->id)
        ->and($primera['analysis'])->toEqual(Arr::except($analisis, 'series'))
        ->and($primera['technical_check'])->toEqual([
            'checks' => [
                'integrated_lufs' => 'warning',
                'true_peak' => 'warning',
                'clipping' => 'warning',
                'silence' => 'warning',
            ],
            'thresholds' => [
                'integrated_lufs_target' => -14,
                'integrated_lufs_tolerance' => 1,
                'true_peak_max_dbtp' => -1,
                'clip_events_min' => 1,
                'silence_min_ms' => 2000,
            ],
        ])
        ->and($segunda['id'])->toBe($sinAnalisis->id)
        ->and($segunda['analysis'])->toBeNull()
        ->and($segunda['technical_check'])->toBeNull();
});
