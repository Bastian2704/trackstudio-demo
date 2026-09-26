<?php

declare(strict_types=1);

use Illuminate\Testing\TestResponse;

/*
|--------------------------------------------------------------------------
| TS-40 — Política CORS del backend (D8.3)
|--------------------------------------------------------------------------
|
| Se prueban preflights (OPTIONS): los resuelve el middleware global
| `HandleCors` antes del ruteo, así que no hace falta registrar rutas.
| El origen permitido se fija por config para no depender del `.env`; el
| resto de la política se lee tal cual de `config/cors.php`, que es lo que
| se quiere comprobar. Métodos y headers se afirman con LITERALES de D8.3.
|
*/

const ORIGEN_PERMITIDO = 'http://localhost:5173';

beforeEach(function () {
    config(['cors.allowed_origins' => [ORIGEN_PERMITIDO]]);
});

/**
 * Envía un preflight CORS como lo haría el navegador.
 */
function enviarPreflight(string $uri, string $origen = ORIGEN_PERMITIDO): TestResponse
{
    return test()->withHeaders([
        'Origin' => $origen,
        'Access-Control-Request-Method' => 'DELETE',
        'Access-Control-Request-Headers' => 'X-Header-No-Permitido',
    ])->options($uri);
}

/**
 * Convierte un header de lista separada por comas en un arreglo normalizado.
 *
 * @return list<string>
 */
function listaDeHeader(TestResponse $respuesta, string $header): array
{
    $valores = array_map(
        fn (string $valor): string => strtolower(trim($valor)),
        explode(',', (string) $respuesta->headers->get($header)),
    );
    sort($valores);

    return $valores;
}

it('devuelve Access-Control-Allow-Origin con el origen permitido', function () {
    enviarPreflight('/api/v1/me')
        ->assertHeader('Access-Control-Allow-Origin', ORIGEN_PERMITIDO);
});

it('no autoriza en Access-Control-Allow-Origin a un origen no permitido', function () {
    // Con un solo origen configurado, HandleCors lo devuelve fijo; lo que
    // importa es que el origen ajeno nunca se refleje en la respuesta.
    $respuesta = enviarPreflight('/api/v1/me', 'https://sitio-ajeno.example');

    expect($respuesta->headers->get('Access-Control-Allow-Origin'))
        ->not->toBe('https://sitio-ajeno.example')
        ->not->toBe('*');
});

it('permite solo los métodos definidos en D8.3', function () {
    $metodos = listaDeHeader(enviarPreflight('/api/v1/me'), 'Access-Control-Allow-Methods');

    expect($metodos)->toBe(['delete', 'get', 'options', 'patch', 'post', 'put']);
});

it('permite solo los headers definidos en D8.3', function () {
    $headers = listaDeHeader(enviarPreflight('/api/v1/me'), 'Access-Control-Allow-Headers');

    expect($headers)->toBe(['accept', 'authorization', 'content-type', 'x-requested-with']);
});

it('cachea el preflight durante 600 segundos', function () {
    enviarPreflight('/api/v1/me')
        ->assertHeader('Access-Control-Max-Age', '600');
});

it('no permite credenciales cross-origin', function () {
    enviarPreflight('/api/v1/me')
        ->assertHeaderMissing('Access-Control-Allow-Credentials');
});

it('no aplica CORS a la ruta de Sanctum', function () {
    enviarPreflight('/sanctum/csrf-cookie')
        ->assertHeaderMissing('Access-Control-Allow-Origin');
});
