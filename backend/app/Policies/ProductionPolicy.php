<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Role;
use App\Models\Production;
use Auth0\Laravel\Users\StatelessUserContract;

final class ProductionPolicy
{
    public function create(StatelessUserContract $user): bool
    {
        return $this->isProducer($user);
    }

    public function view(
        StatelessUserContract $user,
        Production $production
    ): bool {
        return $this->isProducer($user);
    }

    public function update(
        StatelessUserContract $user,
        Production $production
    ): bool {
        return $this->isProducer($user);
    }

    public function delete(
        StatelessUserContract $user,
        Production $production
    ): bool {
        return $this->isProducer($user);
    }

    private function isProducer(StatelessUserContract $user): bool
    {
        return $user->getAttribute('role') === Role::Productor;
    }
}
