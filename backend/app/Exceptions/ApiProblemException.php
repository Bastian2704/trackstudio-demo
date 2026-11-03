<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Enums\ErrorCode;
use RuntimeException;

/**
 * Error de dominio con un código del catálogo. Lo traduce
 * bootstrap/app.php con el mismo formato que el resto.
 */
final class ApiProblemException extends RuntimeException
{
    public function __construct(
        public readonly ErrorCode $errorCode,
        string $detail,
    ) {
        parent::__construct($detail);
    }
}
