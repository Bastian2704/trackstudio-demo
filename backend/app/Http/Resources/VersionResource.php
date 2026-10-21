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
            'size_bytes' => $this->resource->size_bytes,
            'content_type' => $this->resource->content_type->value,
            'upload_status' => $this->resource->upload_status->value,
            'created_at' => $this->resource->created_at?->toIso8601String(),
            'updated_at' => $this->resource->updated_at?->toIso8601String(),
        ];
    }
}
