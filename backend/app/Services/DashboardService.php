<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ArtistStatus;
use App\Enums\ProductionFormat;
use App\Enums\SongStatus;
use App\Enums\UploadStatus;
use App\Models\Artist;
use App\Models\Production;
use App\Models\Song;
use App\Models\Version;
use BackedEnum;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/*
 * TODO: Agregar filas faltantes.
 */
final class DashboardService
{
    private const RECENT_VERSIONS_LIMIT = 5;

    /**
     * @return array{
     *     artists: array{total: int, by_status: array<string, int>},
     *     productions: array{total: int, by_format: array<string, int>},
     *     songs: array{total: int, by_status: array<string, int>, without_verified_version: int},
     *     versions: array{verified: int, total_size_bytes: int, total_duration_ms: int},
     *     recent_versions: Collection<int, Version>
     * }
     */
    public function summary(): array
    {
        $artistsByStatus = $this->countBy(Artist::query(), 'status', ArtistStatus::cases());
        $productionsByFormat = $this->countBy(Production::query(), 'format', ProductionFormat::cases());
        $songsByStatus = $this->countBy(Song::query(), 'status', SongStatus::cases());

        $verified = Version::query()
            ->where('upload_status', UploadStatus::Verificada)
            ->toBase()
            ->selectRaw('count(*) as verified, coalesce(sum(size_bytes), 0) as size, coalesce(sum(duration_ms), 0) as duration')
            ->first();

        return [
            'artists' => ['total' => array_sum($artistsByStatus), 'by_status' => $artistsByStatus],
            'productions' => ['total' => array_sum($productionsByFormat), 'by_format' => $productionsByFormat],
            'songs' => [
                'total' => array_sum($songsByStatus),
                'by_status' => $songsByStatus,
                'without_verified_version' => Song::query()
                    ->whereDoesntHave('versions', fn (Builder $query) => $query->where('upload_status', UploadStatus::Verificada))
                    ->count(),
            ],
            'versions' => [
                'verified' => (int) $verified?->verified,
                'total_size_bytes' => (int) $verified?->size,
                'total_duration_ms' => (int) $verified?->duration,
            ],
            'recent_versions' => Version::query()
                ->where('upload_status', UploadStatus::Verificada)
                ->with('song.production.artist')
                ->orderByDesc('verified_at')
                ->orderByDesc('id')
                ->limit(self::RECENT_VERSIONS_LIMIT)
                ->get(),
        ];
    }

    /**
     * Conteo por columna con una clave por caso del enum, aunque valga 0.
     *
     * @param  Builder<covariant \Illuminate\Database\Eloquent\Model>  $query
     * @param  list<BackedEnum>  $cases
     * @return array<string, int>
     */
    private function countBy(Builder $query, string $column, array $cases): array
    {
        $counts = $query->toBase()
            ->selectRaw("{$column}, count(*) as total")
            ->groupBy($column)
            ->pluck('total', $column);

        $result = [];
        foreach ($cases as $case) {
            $result[(string) $case->value] = (int) ($counts[$case->value] ?? 0);
        }

        return $result;
    }
}
