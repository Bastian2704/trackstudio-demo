<?php

declare(strict_types=1);

namespace App\Storage;

use App\Contracts\AudioStorageContract;
use App\Enums\AudioContentType;
use Aws\S3\PostObjectV4;
use Aws\S3\S3Client;
use Carbon\CarbonImmutable;

final class S3AudioStorage implements AudioStorageContract
{
    private const EXPIRATION_MINUTES = 15;

    public function __construct(private S3Client $client) {}

    /**
     * @return array{url: string, fields: array<string, string>, expires_at: CarbonImmutable}
     */
    public function presignUpload(
        string $key,
        AudioContentType $contentType,
        int $sizeBytes,
    ): array {
        $bucket = config('filesystems.disks.s3.bucket');

        $expiresAt = CarbonImmutable::now()->addMinutes(self::EXPIRATION_MINUTES);

        $formInputs = [
            'key' => $key,
            'Content-Type' => $contentType->value,
        ];

        $conditions = [
            ['bucket' => $bucket],
            ['eq', '$key', $key],
            ['eq', '$Content-Type', $contentType->value],
            ['content-length-range', $sizeBytes, $sizeBytes],
        ];

        $postObject = new PostObjectV4(
            $this->client,
            $bucket,
            $formInputs,
            $conditions,
            $expiresAt->getTimestamp(),
        );

        return [
            'url' => $postObject->getFormAttributes()['action'],
            'fields' => $postObject->getFormInputs(),
            'expires_at' => $expiresAt,
        ];
    }
}
