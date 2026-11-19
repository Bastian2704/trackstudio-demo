<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Role;
use App\Models\Production;
use App\Models\Song;
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

    public function viewAny(StatelessUserContract $user, Song $song): bool
    {
        return $this->isProducer($user) || $this->artistCanRead($user, $song->production_id);
    }

    public function play(
        StatelessUserContract $user,
        Version $version
    ): bool {
        return $this->isProducer($user)
            || $this->artistCanRead($user, $version->song->production_id);
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
