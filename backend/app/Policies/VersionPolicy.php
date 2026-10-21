<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Role;
use Auth0\Laravel\Users\StatelessUserContract;

final class VersionPolicy
{
    public function create(StatelessUserContract $user): bool
    {
        return $this->isProducer($user);
    }

    private function isProducer(StatelessUserContract $user): bool
    {
        return $user->getAttribute('role') === Role::Productor;
    }
}
