<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\CommentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $version_id
 * @property string $author_id
 * @property string $body
 * @property int $timestamp_ms
 */
#[Fillable(['version_id', 'author_id', 'body', 'timestamp_ms'])]
class Comment extends Model
{
    /** @use HasFactory<CommentFactory> */
    use HasFactory;

    use HasUuids;

    public const UPDATED_AT = null;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['timestamp_ms' => 'integer'];
    }

    /**
     * Un comentario cuya versión está borrada queda oculto con ella y responde 404.
     *
     * @param  mixed  $value
     * @param  string|null  $field
     */
    public function resolveRouteBinding($value, $field = null): ?self
    {
        return $this->newQuery()
            ->whereHas('version')
            ->where($field ?? $this->getRouteKeyName(), $value)
            ->first();
    }

    public function isAuthoredBy(string $auth0Sub): bool
    {
        return $this->author->auth0_sub === $auth0Sub;
    }

    /** @return BelongsTo<Version, $this> */
    public function version(): BelongsTo
    {
        return $this->belongsTo(Version::class);
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
