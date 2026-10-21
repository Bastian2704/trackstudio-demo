<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreVersionRequest;
use App\Http\Resources\VersionResource;
use App\Models\Song;
use App\Services\VersionService;
use Auth0\Laravel\Users\StatelessUserContract;
use Illuminate\Http\JsonResponse;

final class VersionController extends Controller
{
    public function __construct(private VersionService $versions) {}

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
