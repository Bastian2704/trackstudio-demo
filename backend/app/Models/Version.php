<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AudioContentType;
use App\Enums\ChangeCategory;
use App\Enums\UploadStatus;
use Database\Factories\VersionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $version_number
 * @property AudioContentType $content_type
 * @property UploadStatus $upload_status
 * @property string $s3_key
 * @property ?string $etag
 * @property string $uploaded_by
 * @property int $size_bytes
 * @property ?string $label
 * @property ?string $description
 * @property ?ChangeCategory $change_category
 * @property ?array<string, mixed> $analysis
 * @property ?int $duration_ms
 * @property ?Carbon $verified_at
 */
#[Fillable([
    'song_id',
    'version_number',
    's3_key',
    'content_type',
    'size_bytes',
    'upload_status',
    'uploaded_by',
    'label',
    'description',
    'change_category',
    'etag',
    'verified_at',
    'duration_ms',
    'analysis',
])]
class Version extends Model
{
    public const MAX_SIZE_BYTES = 524288000;

    /** Una pendiente sin confirmar caduca a los 15 min de la firma (D7.6) más 5 de margen (HU-14 §3.6). */
    public const ABANDON_AFTER_MINUTES = 20;

    /** @use HasFactory<VersionFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'version_number' => 'integer',
            'content_type' => AudioContentType::class,
            'size_bytes' => 'integer',
            'upload_status' => UploadStatus::class,
            'change_category' => ChangeCategory::class,
            'analysis' => 'array',
            'verified_at' => 'datetime',
            'duration_ms' => 'integer',
        ];
    }

    /** @return BelongsTo<Song, $this> */
    public function song(): BelongsTo
    {
        return $this->belongsTo(Song::class);
    }

    /** @return HasMany<Comment, $this> */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }
}
