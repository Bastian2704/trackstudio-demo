<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Version;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Salida de GET /api/v1/dashboard.
 *
 * @property array<string, mixed> $resource
 */
final class DashboardResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'artists' => $this->resource['artists'],
            'productions' => $this->resource['productions'],
            'songs' => $this->resource['songs'],
            'versions' => $this->resource['versions'],
            'recent_versions' => $this->resource['recent_versions']->map(fn (Version $version): array => [
                'id' => $version->id,
                'version_number' => $version->version_number,
                'label' => $version->label,
                'verified_at' => $version->verified_at?->toIso8601String(),
                'song' => ['id' => $version->song->id, 'name' => $version->song->name],
                'production' => ['id' => $version->song->production->id, 'name' => $version->song->production->name],
                'artist' => ['id' => $version->song->production->artist->id, 'name' => $version->song->production->artist->name],
            ])->all(),
        ];
    }
}
