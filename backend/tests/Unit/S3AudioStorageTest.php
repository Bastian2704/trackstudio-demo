<?php

declare(strict_types=1);

use App\Contracts\AudioStorageContract;
use App\Enums\AudioContentType;
use App\Storage\S3AudioStorage;
use Carbon\CarbonImmutable;

/*
|--------------------------------------------------------------------------
| TS-24 — Frontera con S3: firma de la presigned POST (C4)
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-13.md §3.6 y §4 (#19–#20). Usa el SDK real
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
