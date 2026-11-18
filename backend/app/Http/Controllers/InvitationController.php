<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\ArtistResource;
use App\Services\InvitationService;
use Auth0\Laravel\Users\StatelessUserContract;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;

final class InvitationController extends Controller
{
    public function __construct(private InvitationService $invitations) {}

    public function accept(Request $request, string $token): ArtistResource
    {
        $usuario = $request->user();

        if (! $usuario instanceof StatelessUserContract) {
            throw new AuthenticationException;
        }

        return new ArtistResource($this->invitations->accept($usuario, $token));
    }
}
