<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductionRequest;
use App\Http\Requests\UpdateProductionRequest;
use App\Http\Resources\ProductionResource;
use App\Models\Production;
use App\Services\ProductionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

final class ProductionController extends Controller
{
    public function __construct(private ProductionService $productions) {}

    public function store(StoreProductionRequest $request): JsonResponse
    {
        $production = $this->productions->createProduction(
            $request->validated(),
        );

        return (new ProductionResource($production))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Production $production): ProductionResource
    {
        return new ProductionResource($production);
    }

    public function update(UpdateProductionRequest $request, Production $production): ProductionResource
    {
        $production = $this->productions->updateProduction(
            $production,
            $request->validated(),
        );

        return new ProductionResource($production);
    }

    public function destroy(Production $production): Response
    {
        $this->productions->deleteProduction($production);

        return response()->noContent();
    }
}
