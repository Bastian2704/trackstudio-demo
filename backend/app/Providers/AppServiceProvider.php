<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\AudioStorageContract;
use App\Policies\RbacPolicy;
use App\Storage\S3AudioStorage;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(AudioStorageContract::class, S3AudioStorage::class);
    }

    public function boot(): void
    {
        Gate::define(
            'perform-producer-action',
            [RbacPolicy::class, 'performProducerAction'],
        );
    }
}
