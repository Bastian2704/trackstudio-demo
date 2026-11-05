<?php

declare(strict_types=1);

use App\Contracts\AudioStorageContract;
use App\Enums\AudioContentType;
use App\Storage\S3AudioStorage;
use Aws\CommandInterface;
use Aws\S3\S3Client;
use Carbon\CarbonImmutable;

/*
|--------------------------------------------------------------------------
| TS-24 — Frontera con S3: firma de la presigned POST (C4)
| TS-27 — Firma de la URL de lectura (GetObject)
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-13.md §3.6 y §4 (#19–#20); HU-16.md §3.4 y §4
| (#8–#9). La lectura contra el bucket real vive en S3AudioStorageBucketTest. Usa el SDK real
| con credenciales ficticias: firmar es local, así que no hay red. Lo que se
| prueba es la política que S3 impondrá (D7.6, D7.7), no un mock.
|
*/

const BUCKET_DE_PRUEBA = 'bucket-de-prueba';
const SECRETO_DE_PRUEBA = 'secreto-de-prueba-que-no-debe-salir';

beforeEach(function () {
    config(['filesystems.disks.s3' => array_merge(config('filesystems.disks.s3'), [
        'key' => 'AKIAPRUEBA0000000000',
        'secret' => SECRETO_DE_PRUEBA,
        'region' => 'us-east-1',
        'bucket' => BUCKET_DE_PRUEBA,
    ])]);
});

it('firma una política POST de 15 minutos con las condiciones de D7.7', function () {
    CarbonImmutable::setTestNow('2026-10-20 14:03:11');
    $key = '9d3a-artista/9d3c-produccion/9d3d-cancion/v1.wav';

    $upload = app(S3AudioStorage::class)->presignUpload($key, AudioContentType::Wav, 48211200);

    $policy = json_decode(base64_decode($upload['fields']['Policy'], true), true, flags: JSON_THROW_ON_ERROR);
    $expiration = CarbonImmutable::parse($policy['expiration']);

    expect($upload['url'])->toStartWith('https://')->toContain(BUCKET_DE_PRUEBA)
        ->and($upload['fields']['key'])->toBe($key)
        ->and($upload['fields']['Content-Type'])->toBe('audio/wav')
        ->and($upload['fields'])->toHaveKey('X-Amz-Signature')
        ->and($upload['expires_at'])->toBeInstanceOf(CarbonImmutable::class)
        ->and($upload['expires_at']->getTimestamp())->toBe($expiration->getTimestamp())
        ->and(abs($expiration->getTimestamp() - CarbonImmutable::now()->addMinutes(15)->getTimestamp()))->toBeLessThanOrEqual(5)
        ->and($policy['conditions'])->toContain(['bucket' => BUCKET_DE_PRUEBA])
        ->and($policy['conditions'])->toContain(['eq', '$key', $key])
        ->and($policy['conditions'])->toContain(['eq', '$Content-Type', 'audio/wav'])
        ->and($policy['conditions'])->toContain(['content-length-range', 48211200, 48211200])
        ->and(json_encode($upload, JSON_THROW_ON_ERROR))->not->toContain(SECRETO_DE_PRUEBA);
});

it('enlaza el contrato con la implementación de S3', function () {
    expect(app(AudioStorageContract::class))->toBeInstanceOf(S3AudioStorage::class);
});

/**
 * S3Client real (firma local, sin red) que anota cada comando que firma.
 *
 * @return S3Client&object{firmados: list<CommandInterface>}
 */
function clienteS3QueAnotaFirmas(): S3Client
{
    $config = [
        // Una clase anónima no tiene el nombre del que el SDK deduce el servicio.
        'service' => 's3',
        'version' => 'latest',
        'region' => 'us-east-1',
        'credentials' => ['key' => 'AKIAPRUEBA0000000000', 'secret' => SECRETO_DE_PRUEBA],
    ];

    return new class($config) extends S3Client
    {
        /** @var list<CommandInterface> */
        public array $firmados = [];

        public function createPresignedRequest(CommandInterface $command, $expires, array $options = [])
        {
            $this->firmados[] = $command;

            return parent::createPresignedRequest($command, $expires, $options);
        }
    };
}

/** @return array<string, string> */
function consultaDeUrl(string $url): array
{
    parse_str((string) parse_url($url, PHP_URL_QUERY), $consulta);

    /** @var array<string, string> $consulta */
    return $consulta;
}

it('firma un GetObject de 15 minutos para la key', function () {
    CarbonImmutable::setTestNow('2026-11-04 15:05:00');
    $key = '9d3a-artista/9d3c-produccion/9d3d-cancion/v3.wav';
    $cliente = clienteS3QueAnotaFirmas();

    $descarga = (new S3AudioStorage($cliente))->presignDownload($key);

    $consulta = consultaDeUrl($descarga['url']);

    expect($cliente->firmados)->toHaveCount(1)
        ->and($cliente->firmados[0]->getName())->toBe('GetObject')
        ->and($cliente->firmados[0]['Bucket'])->toBe(BUCKET_DE_PRUEBA)
        ->and($cliente->firmados[0]['Key'])->toBe($key)
        ->and(parse_url($descarga['url'], PHP_URL_SCHEME))->toBe('https')
        ->and((string) parse_url($descarga['url'], PHP_URL_HOST))->toStartWith(BUCKET_DE_PRUEBA.'.')
        ->and(parse_url($descarga['url'], PHP_URL_PATH))->toBe('/'.$key)
        ->and($consulta['X-Amz-Expires'] ?? null)->toBe('900')
        ->and($consulta['X-Amz-Date'] ?? null)->toBe('20261104T150500Z')
        ->and($consulta)->toHaveKey('X-Amz-Signature')
        ->and($descarga['expires_at'])->toBeInstanceOf(CarbonImmutable::class)
        ->and($descarga['expires_at']->toIso8601String())->toBe('2026-11-04T15:20:00+00:00')
        ->and($descarga['url'])->not->toContain(SECRETO_DE_PRUEBA);
});

it('dos firmas en momentos distintos dan URLs distintas', function () {
    CarbonImmutable::setTestNow('2026-11-04 15:05:00');
    $storage = new S3AudioStorage(clienteS3QueAnotaFirmas());
    $key = '9d3a-artista/9d3c-produccion/9d3d-cancion/v3.wav';

    $primera = $storage->presignDownload($key)['url'];
    CarbonImmutable::setTestNow('2026-11-04 15:05:01');
    $segunda = $storage->presignDownload($key)['url'];

    expect($segunda)->not->toBe($primera)
        ->and(consultaDeUrl($primera)['X-Amz-Expires'] ?? null)->toBe('900')
        ->and(consultaDeUrl($segunda)['X-Amz-Expires'] ?? null)->toBe('900');
});
