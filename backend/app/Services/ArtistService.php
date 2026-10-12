<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ArtistStatus;
use App\Models\Artist;
use App\Models\User;
use Auth0\Laravel\Users\StatelessUserContract;
use Illuminate\Support\Facades\Log;

final class ArtistService
{
    /**
     * @param  array{name: string, email: string}  $datos
     */
    public function registerArtist(
        StatelessUserContract $productor,
        array $datos
    ): Artist {
        $sub = $productor->getAuthIdentifier();

        $usuario = User::firstOrCreate([
            'auth0_sub' => $sub,
        ]);

        $artista = Artist::create([
            'name' => $datos['name'],
            'email' => $datos['email'],
            'created_by' => $usuario->id,
        ]);

        return $artista->refresh();
    }

    /**
     * @param  array{name: string, email: string}  $datos
     */
    public function updateArtist(Artist $artista, array $datos): Artist
    {
        $artista->update([
            'name' => $datos['name'],
            'email' => $datos['email'],
        ]);

        return $artista;
    }

    public function changeStatus(StatelessUserContract $productor, Artist $artista, bool $activo): Artist
    {
        $anterior = $artista->status;

        $destino = match (true) {
            ! $activo => ArtistStatus::Inactivo,
            $artista->user_id === null => ArtistStatus::Invitado,
            default => ArtistStatus::Activo,
        };

        if ($destino === $anterior) {
            return $artista;
        }

        $artista->update(['status' => $destino]);

        Log::info('artist.status_changed', [
            'artist_id' => $artista->id,
            'from' => $anterior->value,
            'to' => $destino->value,
            'changed_by' => $productor->getAuthIdentifier(),
        ]);

        return $artista;
    }
}
