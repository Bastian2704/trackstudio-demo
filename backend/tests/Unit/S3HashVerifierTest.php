<?php

declare(strict_types=1);

use App\Contracts\HashVerifierContract;
use App\Storage\S3HashVerifier;
use Aws\CommandInterface;
use Aws\MockHandler;
use Aws\Result;
use Aws\S3\Exception\S3Exception;
use Aws\S3\S3Client;
use GuzzleHttp\Psr7\Response;

/*
|--------------------------------------------------------------------------
| TS-25 — Frontera con S3: HeadObject para verificar el ETag (C4)
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-14.md §3.5 y §4 (#25–#28). #25–#27 usan el SDK
| real con MockHandler (sin red). #28 consulta el bucket real de TS-42 en solo
| lectura y se salta si faltan sus variables.
|
*/

const BUCKET_DEL_VERIFICADOR = 'bucket-del-verificador';
const KEY_DEL_VERIFICADOR = '9d3a-artista/9d3c-produccion/9d3d-cancion/v1.wav';

/**
 * Cliente S3 real cuyas respuestas salen de `$handler`. Sin reintentos, para
 * que un 500 llegue tal cual al verificador.
 */
function clienteS3Simulado(MockHandler $handler): S3Client
{
    return new S3Client([
        'version' => 'latest',
        'region' => 'us-east-1',
        'credentials' => ['key' => 'AKIAPRUEBA0000000000', 'secret' => 'secreto-de-prueba'],
        'retries' => 0,
        'handler' => $handler,
    ]);
}

it('devuelve el ETag sin comillas y el tamaño del objeto', function () {
    /** @var CommandInterface|null $comando */
    $comando = null;
    $handler = new MockHandler;
    $handler->append(function (CommandInterface $command) use (&$comando): Result {
        $comando = $command;

        return new Result(['ETag' => '"'.strtoupper(ETAG_DE_PRUEBA).'"', 'ContentLength' => 123]);
    });

    $objeto = (new S3HashVerifier(clienteS3Simulado($handler), BUCKET_DEL_VERIFICADOR))->inspect(KEY_DEL_VERIFICADOR);

    expect($objeto)->toBe(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 123])
        ->and($comando?->getName())->toBe('HeadObject')
        ->and($comando['Bucket'])->toBe(BUCKET_DEL_VERIFICADOR)
        ->and($comando['Key'])->toBe(KEY_DEL_VERIFICADOR);
});

it('devuelve null si S3 responde 403 o 404', function (int $status) {
    $handler = new MockHandler;
    $handler->append(fn (CommandInterface $command): S3Exception => new S3Exception(
        "HeadObject {$status}",
        $command,
        ['response' => new Response($status)],
    ));

    expect((new S3HashVerifier(clienteS3Simulado($handler), BUCKET_DEL_VERIFICADOR))->inspect(KEY_DEL_VERIFICADOR))
        ->toBeNull();
})->with([
    'sin ListBucket, objeto inexistente' => [403],
    'objeto inexistente' => [404],
]);

it('relanza cualquier otro error de S3', function () {
    $handler = new MockHandler;
    $handler->append(fn (CommandInterface $command): S3Exception => new S3Exception(
        'HeadObject 500',
        $command,
        ['response' => new Response(500)],
    ));

    expect(fn () => (new S3HashVerifier(clienteS3Simulado($handler), BUCKET_DEL_VERIFICADOR))->inspect(KEY_DEL_VERIFICADOR))
        ->toThrow(S3Exception::class);
});

it('enlaza el contrato con la implementación de S3', function () {
    config(['filesystems.disks.s3' => array_merge(config('filesystems.disks.s3'), [
        'key' => 'AKIAPRUEBA0000000000',
        'secret' => 'secreto-de-prueba',
        'region' => 'us-east-1',
        'bucket' => BUCKET_DEL_VERIFICADOR,
    ])]);

    expect(app(HashVerifierContract::class))->toBeInstanceOf(S3HashVerifier::class);
});

it('consulta el bucket real', function () {
    $verifier = app(HashVerifierContract::class);

    expect($verifier->inspect((string) env('S3_TEST_OBJECT_KEY')))
        ->toMatchArray(['etag' => strtolower(trim((string) env('S3_TEST_OBJECT_ETAG'), '"'))])
        ->and($verifier->inspect('no-existe/'.bin2hex(random_bytes(8)).'.wav'))
        ->toBeNull();
})->skip(
    fn () => ! env('S3_TEST_OBJECT_KEY') || ! env('S3_TEST_OBJECT_ETAG'),
    'Definir S3_TEST_OBJECT_KEY y S3_TEST_OBJECT_ETAG de un objeto del bucket de TS-42 (HU-14 §4, test 28).',
);
