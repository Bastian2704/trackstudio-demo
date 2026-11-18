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

    public function viewAny(StatelessUserContract $user): bool
    {
        $role = $user->getAttribute('role');

        return $role === Role::Productor || $role === Role::Artista;
    }

    public function view(
        StatelessUserContract $user,
        Production $production
    ): bool {
        return $this->isProducer($user) || $this->artistCanRead($user, $production->id);
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

    private function artistCanRead(StatelessUserContract $user, string $productionId): bool
    {
        return $user->getAttribute('role') === Role::Artista
            && Production::query()->whereKey($productionId)->accessibleBy((string) $user->getAuthIdentifier())->exists();
    }

    private function isProducer(StatelessUserContract $user): bool
    {
        return $user->getAttribute('role') === Role::Productor;
    }
}
