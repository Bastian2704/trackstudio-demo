<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\Role;
use Auth0\Laravel\Users\StatelessUserContract;

final class RbacPolicy
{
    public function performProducerAction(StatelessUserContract $user): bool
    {
        return $user->getAttribute('role') === Role::Productor;
    }
}
