<?php

declare(strict_types=1);

namespace App\Providers;

use App\Policies\RbacPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::define(
            'perform-producer-action',
            [RbacPolicy::class, 'performProducerAction'],
        );
    }
}
