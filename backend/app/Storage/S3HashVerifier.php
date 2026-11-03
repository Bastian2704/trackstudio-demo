<?php

declare(strict_types=1);

namespace App\Storage;

use App\Contracts\HashVerifierContract;
use Aws\S3\Exception\S3Exception;
use Aws\S3\S3Client;

final class S3HashVerifier implements HashVerifierContract
{
    public function __construct(
        private S3Client $client,
        private string $bucket,
    ) {}

    /**
     * Sin ListBucket, S3 responde 403 a una key inexistente: 403 y 404
     * significan lo mismo, así que se decide por
     * el estado HTTP y no por el código de error de AWS.
     *
     * @return array{etag: string, size_bytes: int}|null
     */
    public function inspect(string $key): ?array
    {
        try {
            $result = $this->client->headObject([
                'Bucket' => $this->bucket,
                'Key' => $key,
            ]);
        } catch (S3Exception $exception) {
            if (in_array($exception->getStatusCode(), [403, 404], true)) {
                return null;
            }

            throw $exception;
        }

        return [
            'etag' => strtolower(trim((string) $result['ETag'], '"')),
            'size_bytes' => (int) $result['ContentLength'],
        ];
    }
}
