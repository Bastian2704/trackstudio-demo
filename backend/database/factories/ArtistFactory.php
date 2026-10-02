<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ArtistStatus;
use App\Models\Artist;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Artist>
 */
class ArtistFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'status' => ArtistStatus::Invitado,
            'user_id' => null,
            'invitation_token' => Str::random(64),
            'invited_at' => now(),
            'invitation_expires_at' => now()->addDays(7),
            'created_by' => User::factory(),
        ];
    }
}
