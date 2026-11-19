<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Role;
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
        return $user->getAttribute('role') === Role::Productor;
    }
}
