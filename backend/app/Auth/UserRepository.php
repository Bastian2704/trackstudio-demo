<?php

declare(strict_types=1);

namespace App\Auth;

use App\Enums\Role;
use Auth0\Laravel\UserRepositoryAbstract;
use Auth0\Laravel\UserRepositoryContract;
use Auth0\Laravel\Users\StatelessUser;
use Illuminate\Contracts\Auth\Authenticatable;

final class UserRepository extends UserRepositoryAbstract implements UserRepositoryContract
{
    /**
     * @param  array<string, mixed>  $user  Access token claims, already validated by the guard
     */
    public function fromAccessToken(array $user): Authenticatable
    {
        $claim = config('auth0.roles_claim');
        $roles = $user[$claim] ?? null;

        $role = null;

        if (is_array($roles) && isset($roles[0]) && is_string($roles[0])) {
            $role = Role::tryFrom($roles[0]);
        }

        $usuario = new StatelessUser($user);
        $usuario->setAttribute('role', $role);

        return $usuario;
    }

    /**
     * @param  array<string, mixed>  $user  Session claims
     */
    public function fromSession(array $user): ?Authenticatable
    {
        return null;
    }
}
