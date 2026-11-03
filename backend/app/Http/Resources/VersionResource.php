<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Version;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property Version $resource
 */
final class VersionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'song_id' => $this->resource->song_id,
            'version_number' => $this->resource->version_number,
            'label' => $this->resource->label,
            'description' => $this->resource->description,
            'content_type' => $this->resource->content_type->value,
            'size_bytes' => $this->resource->size_bytes,
            'duration_ms' => $this->resource->duration_ms,
            'upload_status' => $this->resource->upload_status->value,
            'verified_at' => $this->resource->verified_at?->toIso8601String(),
            'created_at' => $this->resource->created_at?->toIso8601String(),
            'updated_at' => $this->resource->updated_at?->toIso8601String(),
        ];
    }
}
