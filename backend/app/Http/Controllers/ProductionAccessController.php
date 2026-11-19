<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductionAccessRequest;
use App\Http\Resources\ProductionAccessResource;
use App\Models\Artist;
use App\Models\Production;
use App\Models\ProductionAccess;
use App\Services\ProductionAccessService;
use Auth0\Laravel\Users\StatelessUserContract;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class ProductionAccessController extends Controller
{
    public function __construct(private ProductionAccessService $accesses) {}

    public function store(StoreProductionAccessRequest $request, Production $production): JsonResponse
    {
        $productor = $request->user();

        if (! $productor instanceof StatelessUserContract) {
            throw new AuthenticationException;
        }

        $access = $this->accesses->grant(
            $productor,
            $production,
            Artist::findOrFail($request->validated('artist_id')),
        );

        return (new ProductionAccessResource($access))
            ->response()
            ->setStatusCode(201);
    }

    public function index(Production $production): AnonymousResourceCollection
    {
        return ProductionAccessResource::collection($this->accesses->history($production));
    }

    public function destroy(Production $production, ProductionAccess $access): Response
    {
        $this->accesses->revoke($access);

        return response()->noContent();
    }
}
