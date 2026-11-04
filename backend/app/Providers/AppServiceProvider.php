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

        // HeadObject corre dentro de un lockForUpdate (HU-14 §3.4): sin timeout,
        // un S3 lento retiene la transacción y la conexión a PostgreSQL.
        $this->app->singleton(S3Client::class, function (): S3Client {
            $config = config('filesystems.disks.s3');

            return new S3Client([
                'version' => 'latest',
                'region' => $config['region'],
                'credentials' => [
                    'key' => $config['key'],
                    'secret' => $config['secret'],
                ],
                'http' => ['connect_timeout' => 3, 'timeout' => 5],
            ]);
        });

        $this->app->bind(HashVerifierContract::class, fn (): S3HashVerifier => new S3HashVerifier(
            $this->app->make(S3Client::class),
            config('filesystems.disks.s3.bucket'),
        ));
    }

    public function boot(): void
    {
        Gate::define(
            'perform-producer-action',
            [RbacPolicy::class, 'performProducerAction'],
        );
    }
}
