<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Comment;
use App\Models\User;
use App\Models\Version;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Comment> */
class CommentFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'version_id' => Version::factory()->verificada(),
            'author_id' => User::factory(),
            'body' => fake()->sentence(),
            'timestamp_ms' => fake()->numberBetween(0, 1000),
        ];
    }
}
