<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\Role;
use Auth0\Laravel\Users\StatelessUser;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property StatelessUser $resource
 */
final class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $role = $this->resource->getAttribute('role');

        return [
            'sub' => $this->resource->getAuthIdentifier(),
            'role' => $role instanceof Role ? $role->value : null,        ];
    }
}
