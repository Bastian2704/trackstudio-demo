<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ConfirmVersionRequest;
use App\Http\Requests\StoreVersionRequest;
use App\Http\Resources\VersionResource;
use App\Models\Song;
use App\Models\Version;
use App\Services\VersionService;
use Auth0\Laravel\Users\StatelessUserContract;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class VersionController extends Controller
{
    public function __construct(private VersionService $versions) {}

    public function index(Song $song): AnonymousResourceCollection
    {
        return VersionResource::collection($this->versions->listVerifiedVersions($song));
    }

    public function confirm(
        ConfirmVersionRequest $request,
        Version $version
    ): VersionResource {
        return new VersionResource(
            $this->versions->confirmVersion($version, $request->validated())
        );
    }

    public function playbackUrl(Version $version): JsonResponse
    {
        $playback = $this->versions->presignPlayback($version);

        return response()->json([
            'data' => [
                'url' => $playback['url'],
                'expires_at' => $playback['expires_at']->toIso8601String(),
            ],
        ])->header('Cache-Control', 'no-store, private');
    }

    public function store(
        StoreVersionRequest $request,
        Song $song
    ): JsonResponse {
        /** @var StatelessUserContract $productor */
        $productor = $request->user();

        $result = $this->versions->addVersion(
            $productor,
            $song,
            $request->validated()
        );

        return (new VersionResource($result['version']))
            ->additional([
                'upload' => [
                    'url' => $result['upload']['url'],
                    'fields' => $result['upload']['fields'],
                    'expires_at' => $result['upload']['expires_at']->toIso8601String(),
                ],
            ])
            ->response()
            ->setStatusCode(201);
    }
}
