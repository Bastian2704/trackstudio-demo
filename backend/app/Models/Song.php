<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SongStatus;
use Database\Factories\SongFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $position
 * @property SongStatus $status
 */
#[Fillable([
    'production_id',
    'name',
    'position',
    'status',
])]
class Song extends Model
{
    /** @use HasFactory<SongFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'status' => SongStatus::class,
        ];
    }

    /** @return BelongsTo<Production, $this> */
    public function production(): BelongsTo
    {
        return $this->belongsTo(Production::class);
    }

    /** @return HasMany<Version, $this> */
    public function versions(): HasMany
    {
        return $this->hasMany(Version::class);
    }
}
