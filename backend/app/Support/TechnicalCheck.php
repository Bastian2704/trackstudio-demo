<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\ChangeCategory;
use App\Models\Version;

/**
 * Chequeo técnico derivado al leer que compara el análisis con los umbrales de
 * D7.10 y nunca se guarda.
 */
final class TechnicalCheck
{
    public const THRESHOLDS = [
        'integrated_lufs_target' => -14,
        'integrated_lufs_tolerance' => 1,
        'true_peak_max_dbtp' => -1,
        'clip_events_min' => 1,
        'silence_min_ms' => 2000,
    ];

    /**
     * Solo para versiones con análisis. El volumen y el pico se revisan solo en
     * un master.
     *
     * @return array{integrated_lufs: string, true_peak: string, clipping: string, silence: string}
     */
    public static function evaluate(Version $version): array
    {
        /** @var array{integrated_lufs: float|int|null, true_peak_dbtp: float|int|null, clip_events: int, silences: list<array{start_ms: int, end_ms: int}>} $analysis */
        $analysis = $version->analysis;
        $isMaster = $version->change_category === ChangeCategory::Master;
        $lufs = $analysis['integrated_lufs'];
        $peak = $analysis['true_peak_dbtp'];
        $t = self::THRESHOLDS;

        return [
            'integrated_lufs' => match (true) {
                ! $isMaster || $lufs === null => 'not_applicable',
                abs($lufs - $t['integrated_lufs_target']) > $t['integrated_lufs_tolerance'] => 'warning',
                default => 'ok',
            },
            'true_peak' => match (true) {
                ! $isMaster || $peak === null => 'not_applicable',
                $peak > $t['true_peak_max_dbtp'] => 'warning',
                default => 'ok',
            },
            'clipping' => $analysis['clip_events'] >= $t['clip_events_min'] ? 'warning' : 'ok',
            'silence' => self::hasInnerSilence($analysis['silences'], (int) $version->duration_ms) ? 'warning' : 'ok',
        ];
    }

    /**
     * Sin contar el inicio ni el final porque el silencio es normal.
     *
     * @param  list<array{start_ms: int, end_ms: int}>  $silences
     */
    private static function hasInnerSilence(array $silences, int $durationMs): bool
    {
        foreach ($silences as $silence) {
            if ($silence['start_ms'] > 0
                && $silence['end_ms'] < $durationMs
                && self::THRESHOLDS['silence_min_ms'] <= $silence['end_ms'] - $silence['start_ms']) {
                return true;
            }
        }

        return false;
    }
}
