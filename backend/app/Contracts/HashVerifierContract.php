<?php

declare(strict_types=1);

namespace App\Contracts;

interface HashVerifierContract
{
    /**
     * Consulta HeadObject sobre la key.
     *
     * @return array{etag: string, size_bytes: int}|null null si S3 responde 403 o 404
     */
    public function inspect(string $key): ?array;
}
