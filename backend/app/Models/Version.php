<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AudioContentType;
use App\Enums\UploadStatus;
use Database\Factories\VersionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $version_number
 * @property AudioContentType $content_type
 * @property UploadStatus $upload_status
 * @property string $s3_key
 * @property ?string $etag
 * @property string $uploaded_by
 */
#[Fillable([
    'song_id',
    'version_number',
    's3_key',
    'content_type',
    'size_bytes',
    'upload_status',
    'uploaded_by',
    'etag',
    'verified_at',
    'duration_ms',
])]
class Version extends Model
{
    public const MAX_SIZE_BYTES = 524288000;

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
            'verified_at' => 'datetime',
            'duration_ms' => 'integer',
        ];
    }

    /** @return BelongsTo<Song, $this> */
    public function song(): BelongsTo
    {
        return $this->belongsTo(Song::class);
    }
}
