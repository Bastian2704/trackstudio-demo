<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Role;
use App\Models\Comment;
use App\Models\Version;
use Auth0\Laravel\Users\StatelessUserContract;

final class CommentPolicy
{
    /**
     * Hoy solo el productor. La parte B de HU-21 añade aquí el artista con
     * acceso vigente a la producción de $version, sin tocar la ruta.
     */
    public function create(StatelessUserContract $user, Version $version): bool
    {
        return $this->isProducer($user);
    }

    /**
     * Listar los comentarios de $version (HU-18). Mismo criterio y misma
     * firma que create: la parte B de HU-21 suma el artista en los dos.
     */
    public function viewAny(StatelessUserContract $user, Version $version): bool
    {
        return $this->isProducer($user);
    }

    /** Cada usuario borra solo los comentarios que escribió. */
    public function delete(StatelessUserContract $user, Comment $comment): bool
    {
        return $this->isProducer($user)
            && $comment->isAuthoredBy((string) $user->getAuthIdentifier());
    }

    private function isProducer(StatelessUserContract $user): bool
    {
        return $user->getAttribute('role') === Role::Productor;
    }
}
