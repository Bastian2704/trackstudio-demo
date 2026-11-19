<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Artist;
use App\Models\Production;
use App\Models\User;

dataset('sin acceso efectivo', [
    'otra producción del mismo artista sin acceso' => [function (): Production {
        $conAcceso = artistaConAcceso();

        return Production::factory()->create(['artist_id' => $conAcceso->artist_id]);
    }],
    'producción de otro artista con su acceso vigente' => [function (): Production {
        artistaConAcceso();
        $otro = Artist::factory()->create([
            'user_id' => User::factory()->create(['auth0_sub' => 'auth0|otro-artista'])->id,
            'status' => ArtistStatus::Activo,
        ]);
        $ajena = Production::factory()->create(['artist_id' => $otro->id]);
        crearAcceso($ajena);

        return $ajena;
    }],
    'acceso revocado' => [fn (): Production => artistaConAcceso(acceso: [
        'granted_at' => now()->subDay(),
        'revoked_at' => now(),
    ])],
    'artista inactivo' => [fn (): Production => artistaConAcceso(['status' => ArtistStatus::Inactivo])],
    'artista borrado' => [function (): Production {
        $production = artistaConAcceso();
        $production->artist()->firstOrFail()->delete();

        return $production;
    }],
    'artista sin cuenta enlazada' => [function (): Production {
        // El usuario del token existe (ya entró una vez), pero la invitación no
        // se aceptó: su artista sigue con `user_id` nulo.
        User::query()->firstOrCreate(['auth0_sub' => claimsDeToken()['sub']]);

        return artistaConAcceso(['user_id' => null]);
    }],
]);
