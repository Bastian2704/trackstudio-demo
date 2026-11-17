<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ArtistStatus;
use App\Models\Artist;
use App\Models\User;
use Auth0\Laravel\Users\StatelessUserContract;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;

final class InvitationService
{
    public function accept(StatelessUserContract $usuario, string $token): Artist
    {
        $hash = hash('sha256', $token);

        // Inexistente, caducado o borrado dan el mismo 404 no se revela qué tokens existieron.
        $artist = Artist::query()
            ->where('invitation_token', $hash)
            ->where('invitation_expires_at', '>', CarbonImmutable::now())
            ->firstOrFail();

        $user = User::firstOrCreate(['auth0_sub' => $usuario->getAuthIdentifier()]);

        if (Artist::withTrashed()->where('user_id', $user->id)->exists()) {
            throw ValidationException::withMessages([
                'token' => 'Tu cuenta ya está vinculada a otro artista.',
            ]);
        }

        // Un solo UPDATE condicionado al hash por si otra aceptación consumió el token
        $actualizadas = Artist::query()
            ->whereKey($artist->id)
            ->where('invitation_token', $hash)
            ->update([
                'user_id' => $user->id,
                'invitation_token' => null,
                'invitation_expires_at' => null,
                'status' => $artist->status === ArtistStatus::Inactivo
                    ? ArtistStatus::Inactivo
                    : ArtistStatus::Activo,
            ]);

        if ($actualizadas === 0) {
            throw (new ModelNotFoundException)->setModel(Artist::class);
        }

        return $artist->refresh();
    }
}
