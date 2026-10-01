<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Monolog\Formatter\LineFormatter;
use Monolog\Handler\TestHandler;
use Sentry\Laravel\Http\SetRequestMiddleware;
use Sentry\SentrySdk;
use Sentry\Serializer\PayloadSerializer;

/*
|--------------------------------------------------------------------------
| HU-03 — El token no sale hacia los logs ni hacia Sentry (ts-03.11)
|--------------------------------------------------------------------------
|
| El único camino por el que un token podría filtrarse es el reporte de una
| excepción ocurrida durante un request autenticado. Se provoca una y se
| inspeccionan las dos salidas: el canal de log y el evento de Sentry.
|
| El cliente de Sentry es el de la aplicación, con su configuración REAL (ver
| `capturarEventosDeSentry()`): lo que se prueba es esa configuración.
|
| Spec: docs/specs/backend/HU-03.md §3.5 y §4 (test 26).
|
*/

it('no escribe el token en los logs ni en el evento de Sentry', function () {
    configurarSdkDePrueba();

    // `SetRequestMiddleware` es el que entrega el request a Sentry. El SDK solo lo
    // registra si al arrancar hay DSN, y en la suite no lo hay: sin él, el evento
    // sale sin cabeceras y el test no podría ver una fuga aunque la hubiera.
    Route::middleware([SetRequestMiddleware::class, 'api', 'auth:auth0-api'])->get('/api/v1/__test/falla-autenticada', function () {
        throw new RuntimeException('fallo dentro de una ruta autenticada');
    });

    config([
        'app.debug' => false,
        'logging.default' => 'en-memoria',
        'logging.channels.en-memoria' => ['driver' => 'monolog', 'handler' => TestHandler::class],
    ]);

    $eventos = capturarEventosDeSentry();

    $token = firmarJwt(claimsDeTokenFirmado('productor'));

    $this->getJson('/api/v1/__test/falla-autenticada', ['Authorization' => "Bearer {$token}"])
        ->assertStatus(500)
        ->assertJsonPath('code', 'INTERNAL_ERROR');

    // Ancla: el evento es el de la excepción de la ruta. Sin el guard cableado
    // la petición también termina en 500, pero por otra excepción, y el token
    // tampoco aparecería: el test nacería verde sin probar nada.
    expect($eventos)->toHaveCount(1);
    expect($eventos[0]->getExceptions()[0]->getValue())->toBe('fallo dentro de una ruta autenticada');

    $manejador = Log::channel('en-memoria')->getLogger()->getHandlers()[0];
    $formato = new LineFormatter(includeStacktraces: true);

    $registros = implode("\n", array_map($formato->format(...), $manejador->getRecords()));

    // Segunda ancla: la excepción sí se registró. Un log vacío tampoco
    // contendría el token.
    expect($registros)->toContain('fallo dentro de una ruta autenticada');

    $evento = (new PayloadSerializer(SentrySdk::getCurrentHub()->getClient()->getOptions()))->serialize($eventos[0]);

    // Tercera ancla: el evento sí lleva las cabeceras del request. Sin ellas, que
    // el token no aparezca no probaría nada.
    expect($eventos[0]->getRequest()['headers'] ?? [])->toHaveKey('authorization');

    // La aserción de RNF-02. Se busca el token entero y también su firma
    // suelta, por si algún formateador parte la cabecera.
    $firma = explode('.', $token)[2];

    expect($registros)->not->toContain($token)->not->toContain($firma);
    expect($evento)->not->toContain($token)->not->toContain($firma);
});
