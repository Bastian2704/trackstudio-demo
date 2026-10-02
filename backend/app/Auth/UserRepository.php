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
     * @param  array<string, mixed>  $user  Claims del access token, ya validados por el guard
     */
    public function fromAccessToken(array $user): Authenticatable
    {
        $claim = config('auth0.roles_claim');
        $roles = $user[$claim] ?? null;

        $role = null;

        if (is_array($roles) && isset($roles[0]) && is_string($roles[0])) {
            $role = Role::tryFrom($roles[0]);
        }

        $authUser = new StatelessUser($user);
        $authUser->setAttribute('role', $role);

        return $authUser;
    }

    /**
     * @param  array<string, mixed>  $user  Claims de sesión (no se usan: la API es stateless y no tiene sesión)
     */
    public function fromSession(array $user): ?Authenticatable
    {
        return null;
    }
}
