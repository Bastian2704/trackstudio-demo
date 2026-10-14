<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreSongRequest;
use App\Http\Requests\UpdateSongRequest;
use App\Http\Resources\SongResource;
use App\Models\Production;
use App\Models\Song;
use App\Services\SongService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

final class SongController extends Controller
{
    public function __construct(private SongService $songs) {}

    public function store(StoreSongRequest $request, Production $production): JsonResponse
    {
        $song = $this->songs->createSong($production, $request->validated());

        return (new SongResource($song))->response()->setStatusCode(201);
    }

    public function show(Song $song): SongResource
    {
        return new SongResource($song);
    }

    public function update(UpdateSongRequest $request, Song $song): SongResource
    {
        return new SongResource($this->songs->updateSong($song, $request->validated()));
    }

    public function destroy(Song $song): Response
    {
        $this->songs->deleteSong($song);

        return response()->noContent();
    }
}
