<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ArtistStatus;
use App\Models\Production;
use App\Models\Song;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class SongService
{
    /**
     * @param  array{name: string}  $datos
     */
    public function createSong(Production $production, array $datos): Song
    {
        if ($production->artist?->status === ArtistStatus::Inactivo) {
            throw ValidationException::withMessages([
                'production' => 'No se pueden añadir canciones a una producción de un artista inactivo.',
            ]);
        }

        $position = (int) Song::query()
            ->where('production_id', $production->getKey())
            ->max('position') + 1;

        $song = Song::query()->create([
            'production_id' => (string) $production->getKey(),
            'name' => $datos['name'],
            'position' => $position,
        ]);

        return $song->refresh();
    }

    /**
     * @param  array{name: string, status: string}  $datos
     */
    public function updateSong(Song $song, array $datos): Song
    {
        $song->update([
            'name' => $datos['name'],
            'status' => $datos['status'],
        ]);

        return $song->refresh();
    }

    public function deleteSong(Song $song): void
    {
        DB::transaction(function () use ($song): void {
            $song->delete();

            Song::query()
                ->where('production_id', $song->production_id)
                ->where('position', '>', $song->position)
                ->decrement('position');
        });
    }
}
