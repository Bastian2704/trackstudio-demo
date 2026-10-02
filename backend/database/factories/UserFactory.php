<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'auth0_sub' => 'auth0|'.fake()->unique()->uuid(),
            'email' => fake()->unique()->safeEmail(),
        ];
    }

    public function withoutEmail(): static
    {
        return $this->state(fn (): array => [
            'email' => null,
        ]);
    }
}
