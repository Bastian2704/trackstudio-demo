<?php

declare(strict_types=1);

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| TS-27 — Manejador de excepciones centralizado (D3.1)
|--------------------------------------------------------------------------
|
| Estos tests NO usan endpoints de negocio: registran rutas desechables, porque
| lo que se prueba es el manejador, no un recurso. La forma del error es el
| contrato con el frontend, así que se afirma con LITERALES y no con el enum
| `ErrorCode`: si el test importara el enum, un valor mal escrito ahí dejaría
| verdes los tests y rompería el contrato en silencio.
|
| Spec: docs/specs/backend/HU-03.md §3.1 y §4.
|
*/

beforeEach(function () {
    Route::middleware('api')->group(function () {
        Route::get('/api/v1/__test/error-interno', function () {
            throw new RuntimeException('la contraseña de la base de datos es hunter2');
        });

        Route::post('/api/v1/__test/validacion', function (Request $request) {
            $request->validate(['nombre' => 'required|string']);
        });

        Route::get('/api/v1/__test/sin-permiso', function () {
            throw new AuthorizationException;
        });
    });

    // Fuera del grupo `api` a propósito: es el control del test 10.
    Route::get('/__test/web-error', function () {
        throw new RuntimeException('esto no es la API');
    });
});

it('devuelve el cuerpo completo de D3.1 ante un recurso inexistente', function () {
    $respuesta = $this->getJson('/api/v1/no-existe');

    $respuesta->assertNotFound();

    // El conjunto EXACTO de claves: sobra una y falta el contrato, falta una y
    // el frontend lee `undefined`. `errors` no está porque solo vive en los 422.
    expect(array_keys($respuesta->json()))
        ->toEqualCanonicalizing(['type', 'title', 'status', 'code', 'detail', 'instance', 'trace_id']);

    $respuesta->assertJsonPath('code', 'RESOURCE_NOT_FOUND')
        ->assertJsonPath('status', 404);
});

it('deriva el type del code contra el dominio del proyecto', function () {
    $this->getJson('/api/v1/no-existe')
        ->assertJsonPath('type', 'https://trackstudio.site/errors/resource-not-found');
});

it('refleja en instance la ruta pedida', function () {
    $this->getJson('/api/v1/primera-ruta')->assertJsonPath('instance', '/api/v1/primera-ruta');
    $this->getJson('/api/v1/segunda-ruta')->assertJsonPath('instance', '/api/v1/segunda-ruta');
});

it('acompaña cada error con un trace_id con forma de ULID', function () {
    $primero = $this->getJson('/api/v1/no-existe')->json('trace_id');
    $segundo = $this->getJson('/api/v1/no-existe')->json('trace_id');

    // Crockford base32, 26 caracteres. Sin I, L, O ni U.
    expect($primero)->toBeString();
    expect($primero)->toMatch('/^[0-9A-HJKMNP-TV-Z]{26}$/');

    // Y uno por respuesta: un trace_id constante no correlaciona nada en Sentry.
    expect($segundo)->not->toBe($primero);
});

it('no filtra el mensaje interno de un 500 cuando debug está apagado', function () {
    config(['app.debug' => false]);

    $respuesta = $this->getJson('/api/v1/__test/error-interno');

    $respuesta->assertStatus(500)->assertJsonPath('code', 'INTERNAL_ERROR');

    // La aserción de RNF-02: el mensaje real no puede aparecer en NINGÚN campo.
    expect(json_encode($respuesta->json()))->not->toContain('hunter2');
});

it('sí expone el mensaje cuando debug está encendido', function () {
    config(['app.debug' => true]);

    // Ancla del test anterior: prueba que aquel se pone rojo por el flag y no
    // porque el mensaje nunca salga por ningún camino.
    $detalle = $this->getJson('/api/v1/__test/error-interno')
        ->assertStatus(500)
        ->json('detail');

    expect((string) $detalle)->toContain('hunter2');
});

it('conserva la forma nativa de Laravel en los errores de validación', function () {
    $respuesta = $this->postJson('/api/v1/__test/validacion', []);

    $respuesta->assertStatus(422)
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonPath('type', 'https://trackstudio.site/errors/validation-error');

    // `campo => [mensajes]`, tal cual la emite Laravel (D3.1). Aplanarla rompería
    // al frontend, que pinta los mensajes bajo cada input.
    expect($respuesta->json('errors'))->toHaveKey('nombre')
        ->and($respuesta->json('errors.nombre'))->toBeArray()
        ->and($respuesta->json('errors.nombre.0'))->toBeString();
});

it('traduce una excepción de autorización a 403 FORBIDDEN', function () {
    $this->getJson('/api/v1/__test/sin-permiso')
        ->assertForbidden()
        ->assertJsonPath('code', 'FORBIDDEN')
        ->assertJsonPath('type', 'https://trackstudio.site/errors/forbidden');
});

it('deja pasar las respuestas que no son de API', function () {
    config(['app.debug' => false]);

    // Guardarraíl: el manejador es de la API, no del mundo. Nace en verde a
    // propósito (ver HU-03 §4); su valor es ponerse rojo si alguien aplica el
    // formato a todo request.
    $respuesta = $this->get('/__test/web-error');

    expect($respuesta->headers->get('Content-Type'))->toContain('text/html');
    expect($respuesta->getContent())->not->toContain('INTERNAL_ERROR');
});
