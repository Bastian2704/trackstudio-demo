<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Role;
use App\Models\Production;
use App\Models\Song;
use Auth0\Laravel\Users\StatelessUserContract;

final class SongPolicy
{
    public function create(StatelessUserContract $user): bool
    {
        return $this->isProducer($user);
    }

    public function viewAny(StatelessUserContract $user, Production $production): bool
    {
        return $this->isProducer($user) || $this->artistCanRead($user, $production->id);
    }

    public function view(
        StatelessUserContract $user,
        Song $song
    ): bool {
        return $this->isProducer($user) || $this->artistCanRead($user, $song->production_id);
    }

    public function update(
        StatelessUserContract $user,
        Song $song
    ): bool {
        return $this->isProducer($user);
    }

    public function delete(
        StatelessUserContract $user,
        Song $song
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
