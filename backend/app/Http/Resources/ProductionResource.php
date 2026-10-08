<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Production;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property Production $resource
 */
final class ProductionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'artist_id' => $this->resource->artist_id,
            'name' => $this->resource->name,
            'format' => $this->resource->format->value,
            'created_at' => $this->resource->created_at?->toIso8601String(),
            'updated_at' => $this->resource->updated_at?->toIso8601String(),
        ];
    }
}
