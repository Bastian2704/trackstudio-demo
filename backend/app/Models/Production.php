<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ProductionFormat;
use Database\Factories\ProductionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property ProductionFormat $format
 */
#[Fillable([
    'artist_id',
    'name',
    'format',
])]

class Production extends Model
{
    /** @use HasFactory<ProductionFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'format' => ProductionFormat::class,
        ];
    }

    /** @return BelongsTo<Artist, $this> */
    public function artist(): BelongsTo
    {
        return $this->belongsTo(Artist::class);
    }
}
