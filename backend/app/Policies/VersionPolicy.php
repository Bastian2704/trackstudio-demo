<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Role;
use App\Models\Version;
use Auth0\Laravel\Users\StatelessUserContract;

final class VersionPolicy
{
    public function create(StatelessUserContract $user): bool
    {
        return $this->isProducer($user);
    }

    public function confirm(
        StatelessUserContract $user,
        Version $version
    ): bool {
        return $this->isProducer($user);
    }

    public function viewAny(StatelessUserContract $user): bool
    {
        return $this->isProducer($user);
    }

    private function isProducer(StatelessUserContract $user): bool
    {
        return $user->getAttribute('role') === Role::Productor;
    }

    public function play(
        StatelessUserContract $user,
        Version $version
    ): bool {
        return $this->isProducer($user);
    }
}
