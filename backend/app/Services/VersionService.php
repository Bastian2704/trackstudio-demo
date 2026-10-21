<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\AudioStorageContract;
use App\Enums\ArtistStatus;
use App\Enums\AudioContentType;
use App\Enums\UploadStatus;
use App\Models\Song;
use App\Models\User;
use App\Models\Version;
use Auth0\Laravel\Users\StatelessUserContract;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class VersionService
{
    public function __construct(
        private AudioStorageContract $storage
    ) {}

    /**
     * @param  array{content_type: string, size_bytes: int}  $datos
     * @return array{version: Version, upload: array{url: string, fields: array<string, string>, expires_at: CarbonImmutable}}
     */
    public function addVersion(
        StatelessUserContract $productor,
        Song $song,
        array $datos
    ): array {
        $production = $song->production()->firstOrFail();

        if ($production->artist?->status === ArtistStatus::Inactivo) {
            throw ValidationException::withMessages([
                'song' => 'No se pueden subir versiones a una canción de un artista inactivo.',
            ]);
        }

        $contentType = AudioContentType::from($datos['content_type']);

        $usuario = User::firstOrCreate([
            'auth0_sub' => $productor->getAuthIdentifier(),
        ]);

        return DB::transaction(function () use (
            $song,
            $production,
            $contentType,
            $datos,
            $usuario
        ): array {
            Song::query()
                ->whereKey($song->getKey())
                ->lockForUpdate()
                ->first();

            $number = (int) Version::withTrashed()
                ->where('song_id', $song->getKey())
                ->max('version_number') + 1;

            $key = "{$production->artist_id}/{$production->id}/{$song->id}/v{$number}.{$contentType->extension()}";

            $version = Version::query()->create([
                'song_id' => $song->getKey(),
                'version_number' => $number,
                's3_key' => $key,
                'content_type' => $contentType,
                'size_bytes' => $datos['size_bytes'],
                'upload_status' => UploadStatus::Pendiente,
                'uploaded_by' => $usuario->id,
            ]);

            $upload = $this->storage->presignUpload(
                $key,
                $contentType,
                $datos['size_bytes']
            );

            return [
                'version' => $version->refresh(),
                'upload' => $upload,
            ];
        });
    }
}
