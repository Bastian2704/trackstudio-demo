<?php

declare(strict_types=1);

use App\Models\Production;
use App\Models\Song;
use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| TS-24 — Datasets de la firma de subida de versiones
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-13.md §4 (#11, #12 y #16).
|
*/

/*
 * `$quitar` permite probar ausencia real sin duplicar el payload válido.
 */
dataset('tipos de contenido invalidos', [
    'sin tipo' => [[], 'content_type'],
    'tipo que no es texto' => [['content_type' => 123], null],
    'variante de WAV sin normalizar' => [['content_type' => 'audio/x-wav'], null],
    'tipo con otro casing' => [['content_type' => 'AUDIO/WAV'], null],
    'FLAC' => [['content_type' => 'audio/flac'], null],
    'vídeo' => [['content_type' => 'video/mp4'], null],
]);

dataset('tamaños invalidos', [
    'sin tamaño' => [[], 'size_bytes'],
    'cero bytes' => [['size_bytes' => 0], null],
    'negativo' => [['size_bytes' => -1], null],
    'un byte más de 500 MB' => [['size_bytes' => 524288001], null],
    'texto' => [['size_bytes' => 'abc'], null],
    'decimal' => [['size_bytes' => 1.5], null],
]);

/*
 * El closure se resuelve dentro del test, con RefreshDatabase ya activo.
 */
dataset('canciones no disponibles para subir', [
    'UUID inexistente' => [fn (): string => (string) Str::uuid()],
    'canción borrada' => [function (): string {
        $song = Song::factory()->create();
        $song->delete();

        return $song->id;
    }],
    'id que no es UUID' => ['no-es-un-uuid'],
    'canción vigente de una producción borrada' => [function (): string {
        $production = Production::factory()->create();
        $song = Song::factory()->create(['production_id' => $production->id]);
        $production->delete();

        return $song->id;
    }],
]);
