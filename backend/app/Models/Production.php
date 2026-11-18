<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ArtistStatus;
use App\Enums\ProductionFormat;
use Database\Factories\ProductionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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

    /** @return HasMany<Song, $this> */
    public function songs(): HasMany
    {
        return $this->hasMany(Song::class);
    }

    /** @return HasMany<ProductionAccess, $this> */
    public function accesses(): HasMany
    {
        return $this->hasMany(ProductionAccess::class);
    }

    /**
     * Acceso efectivo del artista con única definición de la
     * cadena `sub` -> `users` -> `artists` -> acceso sin
     * revocar.
     *
     * @param  Builder<Production>  $query
     */
    public function scopeAccessibleBy(Builder $query, string $auth0Sub): void
    {
        $query->whereHas('accesses', fn (Builder $acceso) => $acceso
            ->whereNull('revoked_at')
            ->whereHas('artist', fn (Builder $artista) => $artista
                ->where('status', '!=', ArtistStatus::Inactivo->value)
                ->whereHas('user', fn (Builder $usuario) => $usuario->where('auth0_sub', $auth0Sub))));
    }
}
