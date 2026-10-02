<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['auth0_sub', 'email'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory;

    use HasUuids;
    use Notifiable;

    /** @return HasOne<Artist, $this> */
    public function artist(): HasOne
    {
        return $this->hasOne(Artist::class);
    }

    /** @return HasMany<Artist, $this> */
    public function createdArtists(): HasMany
    {
        return $this->hasMany(Artist::class, 'created_by');
    }
}
