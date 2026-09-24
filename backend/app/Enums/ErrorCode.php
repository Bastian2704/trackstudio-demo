<?php

declare(strict_types=1);

namespace App\Enums;

enum ErrorCode: string
{
    private const TYPE_BASE_URL = 'https://trackstudio.site/errors';

    case ValidationError = 'VALIDATION_ERROR';
    case Unauthenticated = 'UNAUTHENTICATED';
    case Forbidden = 'FORBIDDEN';
    case ResourceNotFound = 'RESOURCE_NOT_FOUND';
    case UnsupportedMediaType = 'UNSUPPORTED_MEDIA_TYPE';
    case PayloadTooLarge = 'PAYLOAD_TOO_LARGE';
    case AudioHashMismatch = 'AUDIO_HASH_MISMATCH';
    case PresignedUrlExpired = 'PRESIGNED_URL_EXPIRED';
    case RateLimited = 'RATE_LIMITED';
    case InternalError = 'INTERNAL_ERROR';

    public function status(): int
    {
        return match ($this) {
            self::Unauthenticated => 401,
            self::Forbidden => 403,
            self::PresignedUrlExpired => 410,
            self::PayloadTooLarge => 413,
            self::UnsupportedMediaType => 415,
            self::ValidationError,
            self::AudioHashMismatch => 422,
            self::RateLimited => 429,
            self::ResourceNotFound => 404,
            self::InternalError => 500,
        };
    }

    public function title(): string
    {
        return match ($this) {
            self::ValidationError => 'Los datos proporcionados no son válidos',
            self::Unauthenticated => 'Autenticación requerida',
            self::Forbidden => 'Acceso denegado',
            self::ResourceNotFound => 'Recurso no encontrado',
            self::UnsupportedMediaType => 'Formato de audio no soportado',
            self::PayloadTooLarge => 'Archivo demasiado grande',
            self::AudioHashMismatch => 'No se pudo verificar la integridad del audio',
            self::PresignedUrlExpired => 'La URL de carga ha expirado',
            self::RateLimited => 'Demasiadas solicitudes',
            self::InternalError => 'Error interno del servidor',
        };
    }

    public function type(): string
    {
        $slug = str_replace('_', '-', strtolower($this->value));

        return self::TYPE_BASE_URL.'/'.$slug;
    }
}
