<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ArtistStatus;
use App\Models\Artist;
use App\Models\Production;
use Illuminate\Validation\ValidationException;

final class ProductionService
{
    /**
     * @param  array{artist_id: string, name: string, format: string}  $datos
     */
    public function createProduction(array $datos): Production
    {
        $artist = Artist::query()->findOrFail($datos['artist_id']);
        if ($artist->status === ArtistStatus::Inactivo) {
            throw ValidationException::withMessages(['artist_id' => 'No se puede registrar una producción para un artista inactivo.']);
        }

        $production = Production::query()->create([
            'artist_id' => (string) $artist->getKey(),
            'name' => $datos['name'],
            'format' => $datos['format'],
        ]);

        return $production->refresh();
    }

    /**
     * @param  array{name: string, format: string}  $datos
     */
    public function updateProduction(Production $production, array $datos): Production
    {
        $production->update([
            'name' => $datos['name'],
            'format' => $datos['format'],
        ]);

        return $production->refresh();
    }

    public function deleteProduction(Production $production): void
    {
        $production->delete();
    }
}
