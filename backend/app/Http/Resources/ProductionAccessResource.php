<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ProductionAccess;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property ProductionAccess $resource
 */
final class ProductionAccessResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'production_id' => $this->resource->production_id,
            'artist_id' => $this->resource->artist_id,
            'granted_at' => $this->resource->granted_at->toIso8601String(),
            'revoked_at' => $this->resource->revoked_at?->toIso8601String(),
            'is_active' => $this->resource->revoked_at === null,
        ];
    }
}
