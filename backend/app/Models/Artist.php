<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ArtistStatus;
use Database\Factories\ArtistFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property ArtistStatus $status
 */
#[Fillable([
    'name',
    'email',
    'status',
    'user_id',
    'invitation_token',
    'invited_at',
    'invitation_expires_at',
    'created_by',
])]

class Artist extends Model
{
    /** @use HasFactory<ArtistFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ArtistStatus::class,
            'invited_at' => 'immutable_datetime',
            'invitation_expires_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
