<?php

declare(strict_types=1);

use App\Contracts\AudioStorageContract;
use Illuminate\Support\Facades\Http;

/*
|--------------------------------------------------------------------------
| TS-27 — Frontera real con S3: lectura con URL firmada (C4)
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-16.md §4 (#10). Archivo aparte porque
| S3AudioStorageTest cambia las credenciales por unas ficticias. Solo lectura
| (un byte), sobre el objeto de HU-14 #28; se salta sin sus variables.
|
*/

it('lee el objeto real con la URL firmada y no sin ella', function () {
    $descarga = app(AudioStorageContract::class)->presignDownload((string) env('S3_TEST_OBJECT_KEY'));
    $sinFirma = strtok($descarga['url'], '?');

    $conFirma = Http::withHeaders(['Range' => 'bytes=0-0'])->get($descarga['url']);
    $publica = Http::withHeaders(['Range' => 'bytes=0-0'])->get($sinFirma);

    expect($conFirma->status())->toBe(206)
        ->and(strtolower(trim((string) $conFirma->header('ETag'), '"')))
        ->toBe(strtolower(trim((string) env('S3_TEST_OBJECT_ETAG'), '"')))
        ->and($publica->status())->toBe(403);
})->skip(
    fn () => ! env('S3_TEST_OBJECT_KEY') || ! env('S3_TEST_OBJECT_ETAG'),
    'Definir S3_TEST_OBJECT_KEY y S3_TEST_OBJECT_ETAG de un objeto del bucket de TS-42 (HU-16 §4, test 10).',
);
