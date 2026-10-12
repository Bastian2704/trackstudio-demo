<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Artist;
use App\Models\Production;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property Artist $resource
 */
final class ArtistResource extends JsonResource
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
            'name' => $this->resource->name,
            'email' => $this->resource->email,
            'status' => $this->resource->status->value,
            'created_at' => $this->resource->created_at?->toIso8601String(),
            'updated_at' => $this->resource->updated_at?->toIso8601String(),
            'productions' => $this->whenLoaded('productions', fn () => $this->resource->productions->map(fn (Production $production): array => ['id' => $production->id,
                'name' => $production->name,
                'format' => $production->format->value,
            ])->all()),
        ];
    }
}
