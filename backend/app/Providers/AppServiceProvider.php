<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\AudioStorageContract;
use App\Contracts\HashVerifierContract;
use App\Policies\RbacPolicy;
use App\Storage\S3AudioStorage;
use App\Storage\S3HashVerifier;
use Aws\S3\S3Client;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(AudioStorageContract::class, S3AudioStorage::class);

        $this->app->bind(HashVerifierContract::class, function (): S3HashVerifier {
            $config = config('filesystems.disks.s3');

            return new S3HashVerifier(
                new S3Client([
                    'version' => 'latest',
                    'region' => $config['region'],
                    'credentials' => [
                        'key' => $config['key'],
                        'secret' => $config['secret'],
                    ],
                ]),
                $config['bucket'],
            );
        });
    }

    public function boot(): void
    {
        Gate::define(
            'perform-producer-action',
            [RbacPolicy::class, 'performProducerAction'],
        );
    }
}
