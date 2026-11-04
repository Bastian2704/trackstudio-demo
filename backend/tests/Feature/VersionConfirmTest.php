<?php

declare(strict_types=1);

use App\Models\Version;
use Carbon\CarbonImmutable;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-25 — Confirmación y verificación: POST /api/v1/versions/{version}/confirm
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-14.md §3.3–§3.6 y §4 (#1–#16). HeadObject es un
| doble de HashVerifierContract: aquí se prueba nuestro código; la frontera
| real vive en S3HashVerifierTest (C4).
|
*/

const INSTANTE_DE_FIRMA = '2026-11-03 14:03:11';

/** Versión pendiente firmada en INSTANTE_DE_FIRMA, con el reloj ya en ese instante. */
function versionPendiente(): Version
{
    test()->travelTo(CarbonImmutable::parse(INSTANTE_DE_FIRMA));

    return Version::factory()->create(['size_bytes' => 48211200]);
}

it('verifica la versión cuando el ETag coincide', function () {
    $version = versionPendiente();
    $this->travel(2)->minutes();
    $consultas = falsearVerificadorDeHash(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 48211201]);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->postJson("/api/v1/versions/{$version->id}/confirm", datosDeConfirmacion());

    $response->assertOk()
        ->assertJsonPath('data.id', $version->id)
        ->assertJsonPath('data.upload_status', 'verificada')
        ->assertJsonPath('data.duration_ms', 213450)
        ->assertJsonPath('data.size_bytes', 48211201)
        ->assertJsonPath('data.verified_at', '2026-11-03T14:05:11+00:00');

    expect(array_keys($response->json('data')))->toEqualCanonicalizing(CAMPOS_DE_VERSION)
        ->and($consultas->getArrayCopy())->toBe([$version->s3_key]);

    $this->assertDatabaseHas('versions', [
        'id' => $version->id,
        'upload_status' => 'verificada',
        'etag' => ETAG_DE_PRUEBA,
        'size_bytes' => 48211201,
        'duration_ms' => 213450,
    ]);
});

it('acepta el ETag con o sin comillas y en mayúsculas', function (string $etag) {
    $version = versionPendiente();
    falsearVerificadorDeHash(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 48211200]);
    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/versions/{$version->id}/confirm", datosDeConfirmacion(['etag' => $etag]))
        ->assertOk()
        ->assertJsonPath('data.upload_status', 'verificada');

    expect($version->refresh()->etag)->toBe(ETAG_DE_PRUEBA);
})->with([
    'con comillas' => ['"'.ETAG_DE_PRUEBA.'"'],
    'sin comillas' => [ETAG_DE_PRUEBA],
    'en mayúsculas' => [strtoupper(ETAG_DE_PRUEBA)],
]);

it('marca fallida y responde AUDIO_HASH_MISMATCH si el ETag no coincide', function () {
    $version = versionPendiente();
    falsearVerificadorDeHash(['etag' => 'd41d8cd98f00b204e9800998ecf8427e', 'size_bytes' => 48211200]);
    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/versions/{$version->id}/confirm", datosDeConfirmacion())
        ->assertUnprocessable()
        ->assertJsonPath('code', 'AUDIO_HASH_MISMATCH')
        ->assertJsonPath('detail', 'El archivo almacenado no coincide con la subida. Sube el archivo de nuevo.');

    // Persistir y luego fallar (§3.4): el cambio sobrevive a la respuesta de error.
    $this->assertDatabaseHas('versions', [
        'id' => $version->id,
        'upload_status' => 'fallida',
        'etag' => null,
        'verified_at' => null,
        'duration_ms' => null,
    ]);
});

it('deja la versión pendiente si el objeto no está disponible', function () {
    $version = versionPendiente();
    $consultas = falsearVerificadorDeHash(null);
    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/versions/{$version->id}/confirm", datosDeConfirmacion())
        ->assertUnprocessable()
        ->assertJsonPath('code', 'AUDIO_HASH_MISMATCH')
        ->assertJsonPath('detail', 'No se encontró el archivo subido. Inténtalo de nuevo en unos segundos.');

    expect($consultas)->toHaveCount(1)
        ->and($version->refresh()->upload_status->value)->toBe('pendiente');
});

it('deja la versión pendiente si S3 falla', function () {
    $version = versionPendiente();
    $consultas = falsearVerificadorDeHash(null, new RuntimeException('S3 caído'));
    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/versions/{$version->id}/confirm", datosDeConfirmacion())
        ->assertStatus(500)
        ->assertJsonPath('code', 'INTERNAL_ERROR');

    expect($consultas)->toHaveCount(1)
        ->and($version->refresh()->upload_status->value)->toBe('pendiente');
});

it('confirmar dos veces es idempotente', function () {
    $version = versionPendiente();
    $consultas = falsearVerificadorDeHash(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 48211200]);
    impersonarToken(claimsDeToken('productor'));

    $primera = $this->postJson("/api/v1/versions/{$version->id}/confirm", datosDeConfirmacion())->assertOk();
    $this->travel(3)->minutes();
    $segunda = $this->postJson("/api/v1/versions/{$version->id}/confirm", datosDeConfirmacion(['duration_ms' => 1]))->assertOk();

    expect($consultas)->toHaveCount(1)
        ->and($segunda->json('data'))->toBe($primera->json('data'))
        ->and($version->refresh()->duration_ms)->toBe(213450)
        ->and($version->verified_at->toIso8601String())->toBe('2026-11-03T14:03:11+00:00');
});

it('rechaza confirmar una versión fallida', function () {
    test()->travelTo(CarbonImmutable::parse(INSTANTE_DE_FIRMA));
    $version = Version::factory()->fallida()->create();
    $consultas = falsearVerificadorDeHash(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 48211200]);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->postJson("/api/v1/versions/{$version->id}/confirm", datosDeConfirmacion());

    $response->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonPath('errors.version.0', 'Esta subida ya no se puede confirmar. Sube el archivo de nuevo.');

    expect(array_keys($response->json('errors')))->toBe(['version'])
        ->and($consultas)->toHaveCount(0)
        ->and($version->refresh()->upload_status->value)->toBe('fallida');
});

it('caduca la pendiente a los 20 minutos', function (int $minutes) {
    $version = versionPendiente();
    $this->travel($minutes)->minutes();
    $consultas = falsearVerificadorDeHash(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 48211200]);
    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/versions/{$version->id}/confirm", datosDeConfirmacion())
        ->assertStatus(410)
        ->assertJsonPath('code', 'PRESIGNED_URL_EXPIRED')
        ->assertJsonPath('detail', 'La subida caducó antes de confirmarse. Sube el archivo de nuevo.');

    expect($consultas)->toHaveCount(0)
        ->and($version->refresh()->upload_status->value)->toBe('fallida');
})->with([
    'exactamente 20 minutos' => [20],
    'dos horas' => [120],
]);

it('confirma una pendiente de 19 minutos', function () {
    $version = versionPendiente();
    $this->travel(19)->minutes();
    falsearVerificadorDeHash(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 48211200]);
    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/versions/{$version->id}/confirm", datosDeConfirmacion())
        ->assertOk()
        ->assertJsonPath('data.upload_status', 'verificada');
});

it('bloquea la versión al confirmar', function () {
    $version = versionPendiente();
    falsearVerificadorDeHash(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 48211200]);
    impersonarToken(claimsDeToken('productor'));

    /** @var list<string> $consultas */
    $consultas = [];
    DB::listen(function (QueryExecuted $query) use (&$consultas): void {
        $consultas[] = $query->sql;
    });

    $this->postJson("/api/v1/versions/{$version->id}/confirm", datosDeConfirmacion())->assertOk();

    $bloqueos = array_filter(
        $consultas,
        fn (string $sql): bool => (bool) preg_match('/from "versions".* for update$/i', $sql),
    );

    expect($bloqueos)->not->toBeEmpty();
});

it('no deja verificada una versión sin evidencia', function () {
    $version = versionPendiente();
    falsearVerificadorDeHash(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 48211200]);
    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/versions/{$version->id}/confirm", datosDeConfirmacion())->assertOk();

    $fila = DB::table('versions')->where('id', $version->id)->sole();

    expect($fila->upload_status)->toBe('verificada')
        ->and($fila->etag)->not->toBeNull()
        ->and($fila->verified_at)->not->toBeNull()
        ->and($fila->duration_ms)->not->toBeNull();

    // El CHECK de HU-13 sigue siendo la última barrera.
    expect(fn () => DB::table('versions')->where('id', $version->id)->update(['duration_ms' => null]))
        ->toThrow(QueryException::class);
});

it('valida el ETag', function (array $changes, ?string $remove) {
    $version = versionPendiente();
    $consultas = falsearVerificadorDeHash(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 48211200]);
    impersonarToken(claimsDeToken('productor'));
    $payload = datosDeConfirmacion($changes);

    if ($remove !== null) {
        unset($payload[$remove]);
    }

    $response = $this->postJson("/api/v1/versions/{$version->id}/confirm", $payload);

    $response->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($response->json('errors')))->toBe(['etag'])
        ->and($consultas)->toHaveCount(0)
        ->and($version->refresh()->upload_status->value)->toBe('pendiente');
})->with('etags invalidos');

it('valida la duración', function (array $changes, ?string $remove) {
    $version = versionPendiente();
    $consultas = falsearVerificadorDeHash(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 48211200]);
    impersonarToken(claimsDeToken('productor'));
    $payload = datosDeConfirmacion($changes);

    if ($remove !== null) {
        unset($payload[$remove]);
    }

    $response = $this->postJson("/api/v1/versions/{$version->id}/confirm", $payload);

    $response->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($response->json('errors')))->toBe(['duration_ms'])
        ->and($consultas)->toHaveCount(0)
        ->and($version->refresh()->upload_status->value)->toBe('pendiente');
})->with('duraciones invalidas');

it('ignora los campos que el cliente no controla', function () {
    $version = versionPendiente();
    $originalKey = $version->s3_key;
    $consultas = falsearVerificadorDeHash(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 48211200]);
    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/versions/{$version->id}/confirm", datosDeConfirmacion([
        'version_number' => 99,
        's3_key' => 'otra/ruta/elegida.wav',
        'size_bytes' => 1,
        'upload_status' => 'fallida',
        'verified_at' => '2020-01-01T00:00:00+00:00',
    ]))->assertOk();

    $version->refresh();

    expect($consultas->getArrayCopy())->toBe([$originalKey])
        ->and($version->version_number)->toBe(1)
        ->and($version->s3_key)->toBe($originalKey)
        ->and($version->size_bytes)->toBe(48211200)
        ->and($version->upload_status->value)->toBe('verificada')
        ->and($version->verified_at->toIso8601String())->toBe('2026-11-03T14:03:11+00:00');
});

it('responde 404 si la versión no está disponible', function (mixed $versionReference) {
    exigirRuta('POST', 'api/v1/versions/{version}/confirm');
    $consultas = falsearVerificadorDeHash(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 48211200]);
    impersonarToken(claimsDeToken('productor'));
    $versionId = is_callable($versionReference) ? $versionReference() : $versionReference;

    $this->postJson("/api/v1/versions/{$versionId}/confirm", datosDeConfirmacion())
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expect($consultas)->toHaveCount(0);
})->with('versiones no disponibles para confirmar');

it('rechaza sin identidad o sin rol productor', function (?string $role, int $status, string $code) {
    $version = versionPendiente();
    $consultas = falsearVerificadorDeHash(['etag' => ETAG_DE_PRUEBA, 'size_bytes' => 48211200]);

    if ($role !== null) {
        impersonarToken(claimsDeToken($role));
    }

    $this->postJson("/api/v1/versions/{$version->id}/confirm", datosDeConfirmacion())
        ->assertStatus($status)
        ->assertJsonPath('code', $code);

    expect($consultas)->toHaveCount(0)
        ->and($version->refresh()->upload_status->value)->toBe('pendiente');
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'rol artista' => ['artista', 403, 'FORBIDDEN'],
    'rol desconocido' => ['desconocido', 403, 'FORBIDDEN'],
]);
