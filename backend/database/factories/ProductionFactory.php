<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ProductionFormat;
use App\Models\Artist;
use App\Models\Production;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Production>
 */
class ProductionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'artist_id' => Artist::factory(),
            'name' => fake('es_ES')->unique()->words(3, true),
            'format' => fake()->randomElement(ProductionFormat::cases()),
        ];
    }

    public function sencillo(): static
    {
        return $this->state(fn (): array => [
            'format' => ProductionFormat::Sencillo,
        ]);
    }

    public function ep(): static
    {
        return $this->state(fn (): array => [
            'format' => ProductionFormat::Ep,
        ]);
    }

    public function album(): static
    {
        return $this->state(fn (): array => [
            'format' => ProductionFormat::Album,
        ]);
    }
}
