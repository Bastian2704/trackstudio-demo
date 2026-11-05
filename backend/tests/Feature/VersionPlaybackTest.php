<?php

declare(strict_types=1);

use App\Models\Version;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-27 — URL firmada de lectura: GET /api/v1/versions/{version}/playback-url
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-16.md §3 y §4 (#1–#6). La firma es un doble de
| AudioStorageContract: aquí se prueba nuestro código; la firma real vive en
| S3AudioStorageTest y la frontera con el bucket en S3AudioStorageBucketTest (C4).
|
*/

const INSTANTE_DE_REPRODUCCION = '2026-11-04 15:05:00';

/** Versión verificada, con el reloj fijo en INSTANTE_DE_REPRODUCCION. */
function versionVerificada(): Version
{
    test()->travelTo(CarbonImmutable::parse(INSTANTE_DE_REPRODUCCION));

    return Version::factory()->verificada()->create();
}

it('devuelve una URL firmada de una versión verificada', function () {
    $version = versionVerificada();
    $firmadas = falsearLecturaDeAudio();
    impersonarToken(claimsDeToken('productor'));

    $response = $this->getJson("/api/v1/versions/{$version->id}/playback-url");

    $response->assertOk()
        ->assertJsonPath('data.url', "https://bucket-de-prueba.s3.amazonaws.com/{$version->s3_key}?X-Amz-Signature=firma-de-prueba")
        ->assertJsonPath('data.expires_at', '2026-11-04T15:20:00+00:00');

    expect(array_keys($response->json()))->toBe(['data'])
        ->and(array_keys($response->json('data')))->toEqualCanonicalizing(['url', 'expires_at'])
        ->and($firmadas->getArrayCopy())->toBe([$version->s3_key]);
});

it('firma una URL nueva en cada petición sin persistirla', function () {
    $version = versionVerificada();
    $antes = $version->refresh()->getAttributes();
    $firmadas = falsearLecturaDeAudio();
    impersonarToken(claimsDeToken('productor'));

    $this->getJson("/api/v1/versions/{$version->id}/playback-url")->assertOk();
    $this->travel(1)->minutes();
    $this->getJson("/api/v1/versions/{$version->id}/playback-url")->assertOk();

    expect($firmadas->getArrayCopy())->toBe([$version->s3_key, $version->s3_key])
        ->and($version->refresh()->getAttributes())->toBe($antes);
});

it('prohíbe guardar la respuesta', function () {
    $version = versionVerificada();
    falsearLecturaDeAudio();
    impersonarToken(claimsDeToken('productor'));

    $cacheControl = (string) $this->getJson("/api/v1/versions/{$version->id}/playback-url")
        ->assertOk()
        ->headers->get('Cache-Control');

    expect($cacheControl)->toContain('no-store');
});

it('responde 404 si la versión no está verificada', function (Closure $crear, string $estado) {
    exigirRuta('GET', 'api/v1/versions/{version}/playback-url');
    test()->travelTo(CarbonImmutable::parse(INSTANTE_DE_REPRODUCCION));
    /** @var Version $version */
    $version = $crear();
    $firmadas = falsearLecturaDeAudio();
    impersonarToken(claimsDeToken('productor'));

    $this->getJson("/api/v1/versions/{$version->id}/playback-url")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expect($firmadas)->toHaveCount(0)
        ->and($version->refresh()->upload_status->value)->toBe($estado);
})->with([
    'pendiente reciente' => [fn (): Version => Version::factory()->create(), 'pendiente'],
    'pendiente caducada' => [fn (): Version => Version::factory()->create(['created_at' => now()->subHours(2)]), 'pendiente'],
    'fallida' => [fn (): Version => Version::factory()->fallida()->create(), 'fallida'],
]);

it('responde 404 si la versión no está disponible', function (mixed $versionReference) {
    exigirRuta('GET', 'api/v1/versions/{version}/playback-url');
    $firmadas = falsearLecturaDeAudio();
    impersonarToken(claimsDeToken('productor'));
    $versionId = is_callable($versionReference) ? $versionReference() : $versionReference;

    $this->getJson("/api/v1/versions/{$versionId}/playback-url")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expect($firmadas)->toHaveCount(0);
})->with('versiones no disponibles para reproducir');

it('rechaza sin identidad o sin rol productor', function (?string $role, int $status, string $code) {
    $version = versionVerificada();
    $firmadas = falsearLecturaDeAudio();

    if ($role !== null) {
        impersonarToken(claimsDeToken($role));
    }

    $this->getJson("/api/v1/versions/{$version->id}/playback-url")
        ->assertStatus($status)
        ->assertJsonPath('code', $code);

    expect($firmadas)->toHaveCount(0);
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'rol artista' => ['artista', 403, 'FORBIDDEN'],
    'rol desconocido' => ['desconocido', 403, 'FORBIDDEN'],
]);
