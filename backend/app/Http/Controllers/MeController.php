<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

final class MeController
{
    public function __invoke(Request $request): UserResource
    {
        return new UserResource($request->user());
    }
}
