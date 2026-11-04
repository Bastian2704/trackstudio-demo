<?php

declare(strict_types=1);

use App\Models\Production;
use App\Models\Song;
use App\Models\Version;
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
    'texto numérico' => [['size_bytes' => '48211200'], null],
    'booleano' => [['size_bytes' => true], null],
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

/*
|--------------------------------------------------------------------------
| TS-25 — Datasets de la confirmación, el historial y la firma ampliada
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-14.md §4 (#12, #13, #15 y #24).
|
*/

dataset('etags invalidos', [
    'sin ETag' => [[], 'etag'],
    'ETag que no es texto' => [['etag' => 123], null],
    '31 hexadecimales' => [['etag' => str_repeat('a', 31)], null],
    '33 hexadecimales' => [['etag' => str_repeat('a', 33)], null],
    'caracteres no hexadecimales' => [['etag' => str_repeat('z', 32)], null],
    'ETag multipart' => [['etag' => '"'.str_repeat('a', 32).'-2"'], null],
]);

dataset('duraciones invalidas', [
    'sin duración' => [[], 'duration_ms'],
    'cero' => [['duration_ms' => 0], null],
    'negativa' => [['duration_ms' => -1], null],
    'decimal' => [['duration_ms' => 1.5], null],
    'texto numérico' => [['duration_ms' => '213450'], null],
    'booleano' => [['duration_ms' => true], null],
    'mayor que integer de PostgreSQL' => [['duration_ms' => 2147483648], null],
]);

/*
 * El closure se resuelve dentro del test, con RefreshDatabase ya activo.
 */
dataset('versiones no disponibles para confirmar', [
    'UUID inexistente' => [fn (): string => (string) Str::uuid()],
    'versión borrada' => [function (): string {
        $version = Version::factory()->create();
        $version->delete();

        return $version->id;
    }],
    'id que no es UUID' => ['no-es-un-uuid'],
    'versión de una canción borrada por la cascada' => [function (): string {
        $version = Version::factory()->create();
        $version->song->versions()->delete();
        $version->song->delete();

        return $version->id;
    }],
]);

dataset('etiquetas y descripciones invalidas', [
    'etiqueta de 101 caracteres' => [['label' => str_repeat('a', 101)], 'label'],
    'etiqueta que no es texto' => [['label' => 123], 'label'],
    'descripción de 1001 caracteres' => [['description' => str_repeat('a', 1001)], 'description'],
    'descripción que no es texto' => [['description' => 123], 'description'],
]);
