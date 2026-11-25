<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class ConfirmVersionRequest extends FormRequest
{
    /** Tope del análisis de 20 min. Por encima, la versión queda «sin análisis». */
    private const MAX_ANALYSIS_SEGMENTS = 1200;

    private const SERIES = ['loudness', 'low', 'mid', 'high'];

    public function authorize(): bool
    {
        return true;
    }

    /**
     * El ETag puede llegar con las comillas de la cabecera de S3. Solo se admite
     * el de un objeto de una sola parte. El tope de
     * duration_ms es el máximo de integer en PostgreSQL.
     *
     * El análisis es opcional y el servidor no lo recalcula: valida forma y
     * rangos. `array:` con la lista rechaza claves desconocidas, que
     * acabarían en el jsonb.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $rules = [
            'etag' => [
                'bail',
                'required',
                'string',
                'regex:/^"?[0-9a-fA-F]{32}"?$/',
            ],
            'duration_ms' => [
                'bail',
                'required',
                'integer:strict',
                'min:1',
                'max:2147483647',
            ],
            'analysis' => [
                'nullable',
                'array:schema_version,integrated_lufs,true_peak_dbtp,clipped_samples,clip_events,silences,series',
            ],
        ];

        // Sin análisis (ausente o null) las reglas anidadas no aplican.
        if (! is_array($this->input('analysis'))) {
            return $rules;
        }

        $rules += [
            'analysis.schema_version' => ['required', 'integer:strict', 'in:1'],
            'analysis.integrated_lufs' => ['present', 'nullable', 'numeric:strict', 'between:-70,20'],
            'analysis.true_peak_dbtp' => ['present', 'nullable', 'numeric:strict', 'between:-120,20'],
            'analysis.clipped_samples' => ['required', 'integer:strict', 'min:0'],
            'analysis.clip_events' => ['required', 'integer:strict', 'min:0'],
            'analysis.silences' => ['present', 'list'],
            'analysis.silences.*' => ['array:start_ms,end_ms'],
            'analysis.silences.*.start_ms' => ['required', 'integer:strict', 'min:0'],
            'analysis.silences.*.end_ms' => ['required', 'integer:strict'],
            'analysis.series' => ['required', 'array:'.implode(',', self::SERIES)],
        ];

        foreach (self::SERIES as $serie) {
            $rules["analysis.series.$serie"] = ['bail', 'required', 'list', $this->seriesRule()];
        }

        return $rules;
    }

    /** @return array<int, Closure(Validator): void> */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $analysis = $this->input('analysis');

                if (! is_array($analysis)) {
                    return;
                }

                $clipped = $analysis['clipped_samples'] ?? null;
                $events = $analysis['clip_events'] ?? null;

                // Cada evento son 3 o más muestras seguidas a fondo de escala.
                if (is_int($clipped) && is_int($events) && $events * 3 > $clipped) {
                    $validator->errors()->add('analysis.clip_events', 'Hay más eventos de saturación que muestras saturadas.');
                }

                $silences = $analysis['silences'] ?? null;

                if (is_array($silences) && ! $this->silencesAreValid($silences)) {
                    $validator->errors()->add('analysis.silences', 'Los tramos de silencio no son válidos.');
                }
            },
        ];
    }

    /**
     * Una sola pasada por la lista.
     *
     * @return Closure(string, mixed, Closure(string): mixed): void
     */
    private function seriesRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            /** @var list<mixed> $value */
            $count = count($value);
            $duration = $this->input('duration_ms');

            if ($count > self::MAX_ANALYSIS_SEGMENTS
                || (is_int($duration) && $count !== (int) ceil($duration / 1000))) {
                $fail('La serie no tiene un valor por cada segundo del audio.');

                return;
            }

            foreach ($value as $level) {
                if ($level !== null && ((! is_int($level) && ! is_float($level)) || $level < -120 || $level > 20)) {
                    $fail('La serie tiene valores fuera de rango.');

                    return;
                }
            }
        };
    }

    /**
     * Tramos de 1 s o más dentro de la duración, ordenados y sin solaparse ni
     * tocarse. Los tipos ya los revisan las reglas; aquí solo se descartan.
     *
     * @param  array<mixed>  $silences
     */
    private function silencesAreValid(array $silences): bool
    {
        $duration = $this->input('duration_ms');
        $previousEnd = null;

        foreach ($silences as $silence) {
            $start = is_array($silence) ? ($silence['start_ms'] ?? null) : null;
            $end = is_array($silence) ? ($silence['end_ms'] ?? null) : null;

            if (! is_int($start) || ! is_int($end)) {
                return true;
            }

            if ($end - $start < 1000
                || (is_int($duration) && $end > $duration)
                || ($previousEnd !== null && $start <= $previousEnd)) {
                return false;
            }

            $previousEnd = $end;
        }

        return true;
    }
}
