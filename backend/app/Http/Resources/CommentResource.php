<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\Role;
use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property Comment $resource */
final class CommentResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'version_id' => $this->resource->version_id,
            'author_id' => $this->resource->author_id,
            'body' => $this->resource->body,
            'timestamp_ms' => $this->resource->timestamp_ms,
            'created_at' => $this->resource->created_at?->toIso8601String(),
            'author' => $this->whenLoaded('author', fn (): array => [
                'role' => $this->resource->author->artist === null ? Role::Productor->value : Role::Artista->value,
                'name' => $this->resource->author->artist?->name,
            ]),
            'is_mine' => $this->whenLoaded(
                'author',
                fn (): bool => $this->resource->author->auth0_sub === (string) $request->user()?->getAuthIdentifier(),
            ),
        ];
    }
}
