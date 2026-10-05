<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Artist;
use App\Models\User;
use Auth0\Laravel\Users\StatelessUserContract;

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
}
