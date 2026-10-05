<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreArtistRequest;
use App\Http\Requests\UpdateArtistRequest;
use App\Http\Resources\ArtistResource;
use App\Models\Artist;
use App\Services\ArtistService;
use Auth0\Laravel\Users\StatelessUserContract;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;

final class ArtistController extends Controller
{
    public function __construct(private ArtistService $artists) {}

    public function store(StoreArtistRequest $request): JsonResponse
    {
        $productor = $request->user();

        if (! $productor instanceof StatelessUserContract) {
            throw new AuthenticationException;
        }

        $artista = $this->artists->registerArtist(
            $productor,
            $request->validated()
        );

        return (new ArtistResource($artista))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Artist $artist): ArtistResource
    {
        return new ArtistResource($artist);
    }

    public function update(
        UpdateArtistRequest $request,
        Artist $artist
    ): ArtistResource {
        return new ArtistResource(
            $this->artists->updateArtist(
                $artist,
                $request->validated()
            )
        );
    }
}
