<?php

declare(strict_types=1);

use App\Enums\ErrorCode;

/*
|--------------------------------------------------------------------------
| TS-27 — Catálogo de códigos de error (D3.1)
|--------------------------------------------------------------------------
|
| El enum es una unidad del contrato: aunque algunos códigos se cableen en
| historias posteriores, todos deben existir desde TS-27. Los valores, status
| y type se afirman con literales para detectar cualquier drift del catálogo.
|
| Spec: docs/specs/backend/HU-03.md §3.1 y §4.
|
*/

it('mantiene cada código del catálogo D3.1 con su status y type', function (
    string $value,
    int $status,
    string $type,
) {
    $code = ErrorCode::tryFrom($value);

    expect($code)->toBeInstanceOf(ErrorCode::class);

    // La expectativa anterior deja el dataset en rojo cuando falta el caso;
    // esta guarda solo evita desreferenciar null y ocultar la causa real.
    if (! $code instanceof ErrorCode) {
        return;
    }

    expect($code->value)->toBe($value)
        ->and($code->status())->toBe($status)
        ->and($code->type())->toBe($type)
        ->and($code->title())->toBeString()->not->toBeEmpty();
})->with([
    'error de validación' => [
        'VALIDATION_ERROR',
        422,
        'https://trackstudio.site/errors/validation-error',
    ],
    'no autenticado' => [
        'UNAUTHENTICATED',
        401,
        'https://trackstudio.site/errors/unauthenticated',
    ],
    'sin permiso' => [
        'FORBIDDEN',
        403,
        'https://trackstudio.site/errors/forbidden',
    ],
    'recurso no encontrado' => [
        'RESOURCE_NOT_FOUND',
        404,
        'https://trackstudio.site/errors/resource-not-found',
    ],
    'media type no soportado' => [
        'UNSUPPORTED_MEDIA_TYPE',
        415,
        'https://trackstudio.site/errors/unsupported-media-type',
    ],
    'payload demasiado grande' => [
        'PAYLOAD_TOO_LARGE',
        413,
        'https://trackstudio.site/errors/payload-too-large',
    ],
    'hash de audio distinto' => [
        'AUDIO_HASH_MISMATCH',
        422,
        'https://trackstudio.site/errors/audio-hash-mismatch',
    ],
    'URL prefirmada expirada' => [
        'PRESIGNED_URL_EXPIRED',
        410,
        'https://trackstudio.site/errors/presigned-url-expired',
    ],
    'límite de peticiones' => [
        'RATE_LIMITED',
        429,
        'https://trackstudio.site/errors/rate-limited',
    ],
    'error interno' => [
        'INTERNAL_ERROR',
        500,
        'https://trackstudio.site/errors/internal-error',
    ],
]);
