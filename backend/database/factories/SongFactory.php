<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\SongStatus;
use App\Models\Production;
use App\Models\Song;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Song>
 */
class SongFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'production_id' => Production::factory(),
            'name' => fake('es_ES')->unique()->words(2, true),
            'position' => 1,
            'status' => SongStatus::PorHacer,
        ];
    }
}
