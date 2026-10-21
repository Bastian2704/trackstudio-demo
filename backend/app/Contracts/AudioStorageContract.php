<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Enums\AudioContentType;
use Carbon\CarbonImmutable;

interface AudioStorageContract
{
    /**
     * @return array{url: string, fields: array<string, string>, expires_at: CarbonImmutable}
     */
    public function presignUpload(string $key, AudioContentType $contentType, int $sizeBytes): array;
}
