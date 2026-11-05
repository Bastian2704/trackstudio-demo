<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\AudioStorageContract;
use App\Contracts\HashVerifierContract;
use App\Enums\ArtistStatus;
use App\Enums\AudioContentType;
use App\Enums\ErrorCode;
use App\Enums\UploadStatus;
use App\Exceptions\ApiProblemException;
use App\Models\Song;
use App\Models\User;
use App\Models\Version;
use Auth0\Laravel\Users\StatelessUserContract;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class VersionService
{
    public function __construct(
        private AudioStorageContract $storage,
        private HashVerifierContract $verifier
    ) {}

    /**
     * @param  array{content_type: string, size_bytes: int, label?: ?string, description?: ?string}  $datos
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
                'label' => $datos['label'] ?? null,
                'description' => $datos['description'] ?? null,
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

    /**
     * Confirma la subida y la verifica contra S3 (HU-14 §3.4, D7.4).
     *
     * Los pasos a `fallida` se guardan dentro de la transacción y su error se
     * lanza después del commit: un throw dentro de la closure los revertiría.
     *
     * @param  array{etag: string, duration_ms: int}  $datos
     */
    public function confirmVersion(Version $version, array $datos): Version
    {
        $etag = strtolower(trim($datos['etag'], '"'));

        /** @var array{0: Version, 1: ?ApiProblemException} $resultado */
        $resultado = DB::transaction(function () use ($version, $etag, $datos): array {
            $locked = Version::query()
                ->whereKey($version->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->upload_status === UploadStatus::Verificada) {
                return [$locked, null];
            }

            if ($locked->upload_status === UploadStatus::Fallida) {
                throw ValidationException::withMessages([
                    'version' => 'Esta subida ya no se puede confirmar. Sube el archivo de nuevo.',
                ]);
            }

            if ($locked->created_at?->lte($this->abandonCutoff())) {
                $locked->update(['upload_status' => UploadStatus::Fallida]);

                return [$locked, new ApiProblemException(
                    ErrorCode::PresignedUrlExpired,
                    'La subida caducó antes de confirmarse. Sube el archivo de nuevo.',
                )];
            }

            $object = $this->verifier->inspect($locked->s3_key);

            if ($object === null) {
                return [$locked, new ApiProblemException(
                    ErrorCode::AudioHashMismatch,
                    'No se encontró el archivo subido. Inténtalo de nuevo en unos segundos.',
                )];
            }

            if ($object['etag'] !== $etag) {
                $locked->update(['upload_status' => UploadStatus::Fallida]);

                return [$locked, new ApiProblemException(
                    ErrorCode::AudioHashMismatch,
                    'El archivo almacenado no coincide con la subida. Sube el archivo de nuevo.',
                )];
            }

            $locked->update([
                'upload_status' => UploadStatus::Verificada,
                'etag' => $object['etag'],
                'verified_at' => now(),
                'size_bytes' => $object['size_bytes'],
                'duration_ms' => $datos['duration_ms'],
            ]);

            return [$locked, null];
        });

        [$confirmed, $problem] = $resultado;

        if ($problem !== null) {
            throw $problem;
        }

        return $confirmed;
    }

    /**
     * Historial: solo verificadas, de la más reciente a la más antigua. Antes
     * pasa a `fallida` las pendientes caducadas de la canción (HU-14 §3.6-§3.7).
     *
     * @return LengthAwarePaginator<int, Version>
     */
    public function listVerifiedVersions(Song $song): LengthAwarePaginator
    {
        $song->production()->firstOrFail();

        // ponytail: abandono perezoso; una canción que nadie abre deja sus pendientes caducadas en la BD. Job programado sobre la misma constante si hace falta.
        Version::query()
            ->where('song_id', $song->getKey())
            ->where('upload_status', UploadStatus::Pendiente->value)
            ->where('created_at', '<=', $this->abandonCutoff())
            ->update(['upload_status' => UploadStatus::Fallida->value]);

        return $song->versions()
            ->where('upload_status', UploadStatus::Verificada->value)
            ->orderByDesc('version_number')
            ->paginate();
    }

    /**
     * URL firmada de lectura de una versión verificada (HU-16 §3.3).
     *
     * @return array{url: string, expires_at: CarbonImmutable}
     */
    public function presignPlayback(Version $version): array
    {
        abort_unless($version->upload_status === UploadStatus::Verificada, 404);

        return $this->storage->presignDownload($version->s3_key);
    }

    private function abandonCutoff(): CarbonImmutable
    {
        return CarbonImmutable::now()->subMinutes(Version::ABANDON_AFTER_MINUTES);
    }
}
