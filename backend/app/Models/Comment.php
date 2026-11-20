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

    /** Sin edición (ERD §3.6, I5): la tabla no tiene updated_at. */
    public const UPDATED_AT = null;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['timestamp_ms' => 'integer'];
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
