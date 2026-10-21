<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AudioContentType;
use App\Enums\UploadStatus;
use App\Models\Song;
use App\Models\User;
use App\Models\Version;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Version>
 */
class VersionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'song_id' => Song::factory(),
            'version_number' => 1,
            's3_key' => fake()->unique()->uuid().'/v1.wav',
            'content_type' => AudioContentType::Wav,
            'size_bytes' => fake()->numberBetween(1, Version::MAX_SIZE_BYTES),
            'upload_status' => UploadStatus::Pendiente,
            'uploaded_by' => User::factory(),
        ];
    }

    public function verificada(): static
    {
        return $this->state(fn (): array => [
            'upload_status' => UploadStatus::Verificada,
            'etag' => fake()->md5(),
            'verified_at' => now(),
            'duration_ms' => fake()->numberBetween(1000, 600000),
        ]);
    }

    public function fallida(): static
    {
        return $this->state(fn (): array => [
            'upload_status' => UploadStatus::Fallida,
        ]);
    }
}
