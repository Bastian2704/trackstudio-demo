<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Exceptions;

/*
|--------------------------------------------------------------------------
| TS-44 — Health check para UptimeRobot (D9.3)
|--------------------------------------------------------------------------
|
| `/api/v1/health` es un reporte de estado, no un error: queda EXENTO de
| D3.1 (ver D9.3). Misma forma en 200 y en 503 para que el monitor lea
| `"status":"ok"` como keyword y un humano lea `checks.database`.
|
*/

const MENSAJE_INTERNO = 'SQLSTATE[08006] host secreto-interno.railway.internal';

function simularBaseDeDatosCaida(): void
{
    DB::shouldReceive('select')
        ->with('SELECT 1')
        ->andThrow(new RuntimeException(MENSAJE_INTERNO));
}

it('responde 200 ok con la base de datos disponible', function () {
    $this->getJson('/api/v1/health')
        ->assertOk()
        ->assertJsonPath('status', 'ok')
        ->assertJsonPath('checks.database', true);
});

it('no exige autenticación', function () {
    // Sin header Authorization: UptimeRobot y Railway no mandan token.
    $this->getJson('/api/v1/health')->assertOk();
});

it('expone exactamente status, checks y timestamp', function () {
    $respuesta = $this->getJson('/api/v1/health');

    // Sin `environment`: repo público y ruta sin autenticación.
    expect(array_keys($respuesta->json()))
        ->toEqualCanonicalizing(['status', 'checks', 'timestamp']);
});

it('emite el timestamp en ISO 8601 con offset', function () {
    $timestamp = $this->getJson('/api/v1/health')->json('timestamp');

    expect($timestamp)->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/');
});

it('responde 503 degraded cuando la base de datos no responde', function () {
    Exceptions::fake();
    simularBaseDeDatosCaida();

    $respuesta = $this->getJson('/api/v1/health');

    $respuesta->assertStatus(503)
        ->assertJsonPath('status', 'degraded')
        ->assertJsonPath('checks.database', false);

    // Misma forma que en 200: el monitor no necesita ramas.
    expect(array_keys($respuesta->json()))
        ->toEqualCanonicalizing(['status', 'checks', 'timestamp']);
});

it('no filtra el mensaje interno del fallo de base de datos', function () {
    Exceptions::fake();
    simularBaseDeDatosCaida();

    $this->getJson('/api/v1/health')
        ->assertStatus(503)
        ->assertDontSee('secreto-interno', false)
        ->assertDontSee('SQLSTATE', false);
});

it('no usa el formato de error de D3.1 (exención documentada en D9.3)', function () {
    Exceptions::fake();
    simularBaseDeDatosCaida();

    $respuesta = $this->getJson('/api/v1/health');

    expect($respuesta->headers->get('Content-Type'))->not->toContain('application/problem+json');
    expect($respuesta->json())->not->toHaveKeys(['type', 'title', 'code', 'trace_id']);
});

it('reporta el fallo de base de datos para que llegue a Sentry', function () {
    Exceptions::fake();
    simularBaseDeDatosCaida();

    $this->getJson('/api/v1/health')->assertStatus(503);

    Exceptions::assertReported(
        fn (RuntimeException $e) => $e->getMessage() === MENSAJE_INTERNO,
    );
});
