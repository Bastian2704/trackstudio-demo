<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Role;
use App\Models\Artist;
use Auth0\Laravel\Users\StatelessUserContract;

final class ArtistPolicy
{
    public function create(StatelessUserContract $user): bool
    {
        return $this->isProducer($user);
    }

    public function view(
        StatelessUserContract $user,
        Artist $artist
    ): bool {
        return $this->isProducer($user);
    }

    public function viewAny(
        StatelessUserContract $user
    ): bool {
        return $this->isProducer($user);
    }

    public function update(
        StatelessUserContract $user,
        Artist $artist
    ): bool {
        return $this->isProducer($user);
    }

    private function isProducer(StatelessUserContract $user): bool
    {
        return $user->getAttribute('role') === Role::Productor;
    }
}
