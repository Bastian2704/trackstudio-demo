<?php

declare(strict_types=1);

use App\Auth\UserRepository;
use Auth0\Laravel\Entities\CredentialEntity;
use GuzzleHttp\Psr7\Response;
use Illuminate\Http\Request;
use Illuminate\Routing\Route as DefinicionDeRuta;
use Illuminate\Support\Facades\Route;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;
use Sentry\ClientBuilder;
use Sentry\Event;
use Sentry\SentrySdk;
use Sentry\State\HubInterface;
use Sentry\Transport\Result;
use Sentry\Transport\ResultStatus;
use Sentry\Transport\TransportInterface;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Feature y Unit extienden el TestCase de Laravel: los tests de Unit de este
| proyecto necesitan el contenedor (leen `config()`), así que también arrancan
| la aplicación. Ver `backend/docs/nomenclatura.md` §8 para qué va en cada
| carpeta. `RefreshDatabase` no se activa aquí de forma global: lo declara
| con `uses()` cada archivo que toca la base de datos.
|
*/

pest()->extend(TestCase::class)->in('Feature', 'Unit');

/*
|--------------------------------------------------------------------------
| Helpers de HU-03 (docs/specs/backend/HU-03.md §4)
|--------------------------------------------------------------------------
|
| Hay dos formas de autenticar un request en la suite, y no son equivalentes:
|
| - `impersonarToken()` se salta el guard. Sirve para probar lo que hacemos
|   DESPUÉS de validar (rol, Resource).
| - `firmarJwt()` + `configurarSdkDePrueba()` pasan por el guard real con un
|   JWT RS256 de verdad. Sirven para probar que NUESTRA configuración del SDK
|   rechaza lo que debe.
|
*/

const DOMINIO_DE_PRUEBA = 'tenant-de-prueba.auth0.test';
const AUDIENCE_DE_PRUEBA = 'https://api.trackstudio.test';
const RUTA_PROTEGIDA_DE_PRUEBA = '/api/v1/__test/protegida';

/**
 * Impersona un access token de Auth0 que YA pasó la validación criptográfica.
 *
 * El usuario se construye pasando los claims por `UserRepository::fromAccessToken()`,
 * que es donde vive la extracción del rol: lo que se salta es el guard, no
 * nuestro código.
 *
 * @param  array<string, mixed>  $claims
 */
function impersonarToken(array $claims): void
{
    $usuario = (new UserRepository)->fromAccessToken($claims);

    auth('auth0-api')->setImpersonating(
        new CredentialEntity(user: $usuario, accessTokenDecoded: $claims),
    );
}

/**
 * Claims mínimos de un access token, con el rol en el claim namespaced que diga
 * la configuración. El namespace se LEE de `config('auth0.roles_claim')`, nunca
 * se escribe literal en un test: si el test copiara el literal, dejaría de
 * detectar que el código lo tiene incrustado (HU-03 §3.2).
 *
 * @param  array<string, mixed>  $extra
 * @return array<string, mixed>
 */
function claimsDeToken(?string $rol = null, array $extra = []): array
{
    $claimDeRoles = config('auth0.roles_claim');

    // Si esto falla, falta la clave de config, no el test.
    expect($claimDeRoles)->toBeString()->not->toBeEmpty();

    return array_merge(
        ['sub' => 'auth0|65f1a2b3c4d5e6f7a8b9c0d1'],
        $rol === null ? [] : [$claimDeRoles => [$rol]],
        $extra,
    );
}

/**
 * Los claims de `claimsDeToken()` más los que el guard verifica: `iss`, `aud`,
 * `iat` y `exp`, todos válidos para la config de `configurarSdkDePrueba()`.
 * Cada test de rechazo sobreescribe exactamente UNO vía `$extra`.
 *
 * @param  array<string, mixed>  $extra
 * @return array<string, mixed>
 */
function claimsDeTokenFirmado(?string $rol = null, array $extra = []): array
{
    return claimsDeToken($rol, array_merge([
        'iss' => 'https://'.DOMINIO_DE_PRUEBA.'/',
        'aud' => [AUDIENCE_DE_PRUEBA],
        'iat' => time() - 60,
        'exp' => time() + 3600,
        'azp' => 'cliente-spa-de-prueba',
    ], $extra));
}

/**
 * Par de claves RSA de prueba, generado una vez por nombre y por proceso.
 * `principal` es la que se publica en el JWKS; cualquier otro nombre da una
 * clave que el SDK no conoce.
 *
 * @return array{privada: OpenSSLAsymmetricKey, jwk: array<string, mixed>}
 */
function claveDePrueba(string $nombre = 'principal'): array
{
    /** @var array<string, array{privada: OpenSSLAsymmetricKey, jwk: array<string, mixed>}> $claves */
    static $claves = [];

    if (isset($claves[$nombre])) {
        return $claves[$nombre];
    }

    $privada = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    expect($privada)->toBeInstanceOf(OpenSSLAsymmetricKey::class);

    // El JWKS de Auth0 publica cada clave con su certificado (`x5c`) además de
    // `n`/`e`. Se emiten los dos para no depender de cuál lea el SDK.
    $solicitud = openssl_csr_new(['commonName' => $nombre], $privada, ['digest_alg' => 'sha256']);
    $certificado = openssl_csr_sign($solicitud, null, $privada, 1, ['digest_alg' => 'sha256']);
    openssl_x509_export($certificado, $pem);

    $rsa = openssl_pkey_get_details($privada)['rsa'];

    return $claves[$nombre] = [
        'privada' => $privada,
        'jwk' => [
            'kty' => 'RSA',
            'use' => 'sig',
            'alg' => 'RS256',
            'kid' => "clave-de-prueba-{$nombre}",
            'n' => base64Url($rsa['n']),
            'e' => base64Url($rsa['e']),
            'x5c' => [preg_replace('/-----[A-Z ]+-----|\s/', '', $pem)],
        ],
    ];
}

function base64Url(string $binario): string
{
    return rtrim(strtr(base64_encode($binario), '+/', '-_'), '=');
}

/**
 * Firma un JWT RS256. La cabecera anuncia SIEMPRE el `kid` de la clave
 * publicada; `$firmadoCon` decide con qué clave se firma de verdad. Firmar con
 * otra produce un token que dice ser nuestro y cuya firma no verifica.
 *
 * @param  array<string, mixed>  $claims
 */
function firmarJwt(array $claims, string $firmadoCon = 'principal'): string
{
    $cabecera = ['alg' => 'RS256', 'typ' => 'JWT', 'kid' => claveDePrueba()['jwk']['kid']];

    $contenido = base64Url(json_encode($cabecera, JSON_THROW_ON_ERROR))
        .'.'.base64Url(json_encode($claims, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));

    openssl_sign($contenido, $firma, claveDePrueba($firmadoCon)['privada'], OPENSSL_ALGO_SHA256);

    return $contenido.'.'.base64Url($firma);
}

/**
 * Apunta el SDK de Auth0 a un tenant de prueba y le entrega el JWKS sin red:
 * cualquier petición HTTP que haga el SDK recibe la clave pública `principal`.
 *
 * El guard arma su `SdkConfiguration` con `auth0.guards.default` más la sección
 * que nombre su clave `configuration`, y pasa `httpClient` tal cual al SDK.
 * Confirmado contra `auth0/login` 7 instalado (HU-03 §6, 2026-09-30).
 *
 * @param  array<string, mixed>  $sobreescribir  claves de `auth0.guards.default`
 */
function configurarSdkDePrueba(array $sobreescribir = []): void
{
    $jwks = json_encode(['keys' => [claveDePrueba()['jwk']]], JSON_THROW_ON_ERROR);

    $cliente = new class($jwks) implements ClientInterface
    {
        public function __construct(private string $jwks) {}

        public function sendRequest(RequestInterface $request): ResponseInterface
        {
            return new Response(200, ['Content-Type' => 'application/json'], $this->jwks);
        }
    };

    config(['auth0.guards.default' => array_merge([
        'strategy' => 'api',
        'domain' => DOMINIO_DE_PRUEBA,
        'audience' => [AUDIENCE_DE_PRUEBA],
        'httpClient' => $cliente,
    ], $sobreescribir)]);
}

/**
 * Ruta desechable detrás del guard. Devuelve el rol del usuario del request
 * para que un test pueda afirmar que llegó hasta nuestro repositorio.
 */
function registrarRutaProtegida(): void
{
    Route::middleware(['api', 'auth:auth0-api'])
        ->get(RUTA_PROTEGIDA_DE_PRUEBA, fn (Request $request) => ['rol' => $request->user()?->role]);
}

/**
 * Sustituye la red de Sentry por una lista en memoria y la devuelve.
 *
 * El cliente es el de la APLICACIÓN, con su configuración real; solo cambian el
 * transporte y un DSN ficticio, sin el cual el SDK no prepara eventos. Así los
 * tests inspeccionan el `Event` final que saldría en producción, no un mock.
 * El hub anterior se restaura solo al terminar el test.
 *
 * @return ArrayObject<int, Event>
 */
function capturarEventosDeSentry(): ArrayObject
{
    /** @var ArrayObject<int, Event> $eventos */
    $eventos = new ArrayObject;

    $transporte = new class($eventos) implements TransportInterface
    {
        /** @param ArrayObject<int, Event> $eventos */
        public function __construct(private ArrayObject $eventos) {}

        public function send(Event $event): Result
        {
            $this->eventos->append($event);

            return new Result(ResultStatus::success(), $event);
        }

        public function close(?int $timeout = null): Result
        {
            return new Result(ResultStatus::success());
        }
    };

    config(['sentry.dsn' => 'https://public@example.com/1']);

    $hubAnterior = SentrySdk::getCurrentHub();

    app()->extend(ClientBuilder::class, fn (ClientBuilder $constructor) => $constructor->setTransport($transporte));
    app()->forgetInstance(HubInterface::class);
    app(HubInterface::class);

    // `beforeApplicationDestroyed()` es protegido: se invoca desde dentro del test.
    (fn () => $this->beforeApplicationDestroyed(fn () => SentrySdk::setCurrentHub($hubAnterior)))
        ->call(test()->target);

    return $eventos;
}

/*
|--------------------------------------------------------------------------
| Helpers de HU-05 (docs/specs/backend/HU-05.md §4)
|--------------------------------------------------------------------------
*/

/** Claves exactas de `ArtistResource` (spec §3.5). Ni una más: D4.2 filtra, no vuelca. */
const CAMPOS_DE_ARTISTA = ['id', 'name', 'email', 'status', 'created_at', 'updated_at'];

/** ISO 8601 con offset explícito (D3.2), p. ej. `2026-10-05T14:03:11+00:00`. */
const FORMATO_ISO_8601_CON_OFFSET = '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/';

/**
 * Cuerpo válido de alta/edición de artista. Cada test cambia solo lo que prueba.
 *
 * @param  array<string, mixed>  $cambios
 * @return array<string, mixed>
 */
function datosDeArtista(array $cambios = []): array
{
    return array_merge([
        'name' => 'Luna Rivera',
        'email' => 'luna.rivera@ejemplo.test',
    ], $cambios);
}

/**
 * Un 404 por ruta inexistente y un 404 del route model binding tienen el mismo
 * cuerpo D3.1. Sin esta precondición, los tests de «no encontrado» nacerían
 * verdes antes de que exista la ruta (compuerta C2).
 */
function exigirRuta(string $metodo, string $uri): void
{
    $registrada = collect(app('router')->getRoutes()->getRoutes())->contains(
        fn (DefinicionDeRuta $ruta): bool => $ruta->uri() === $uri && in_array($metodo, $ruta->methods(), true),
    );

    expect($registrada)->toBeTrue("La ruta {$metodo} {$uri} no está registrada.");
}

/*
|--------------------------------------------------------------------------
| Helpers de HU-08 (docs/specs/backend/HU-08.md §4)
|--------------------------------------------------------------------------
*/

/** Claves exactas de `ProductionResource` (spec §3.7). */
const CAMPOS_DE_PRODUCCION = ['id', 'artist_id', 'name', 'format', 'created_at', 'updated_at'];

/**
 * Cuerpo válido de alta de producción. Cada test cambia solo lo que prueba.
 *
 * @param  array<string, mixed>  $cambios
 * @return array<string, mixed>
 */
function datosDeProduccion(string $artistId, array $cambios = []): array
{
    return array_merge([
        'artist_id' => $artistId,
        'name' => 'Sesiones del álbum',
        'format' => 'album',
    ], $cambios);
}

/**
 * Cuerpo PUT válido. `artist_id` no forma parte del contrato editable.
 *
 * @param  array<string, mixed>  $cambios
 * @return array<string, mixed>
 */
function datosDeEdicionDeProduccion(array $cambios = []): array
{
    return array_merge([
        'name' => 'Sesiones remasterizadas',
        'format' => 'ep',
    ], $cambios);
}
