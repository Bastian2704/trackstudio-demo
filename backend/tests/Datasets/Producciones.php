<?php

declare(strict_types=1);

use App\Models\Artist;
use App\Models\Production;
use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| TS-19 — Datasets compartidos por el CRUD de producciones
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-08.md §4.
|
*/

dataset('formatos de produccion', [
    'sencillo' => ['sencillo'],
    'EP' => ['ep'],
    'álbum' => ['album'],
]);

/*
 * `$quitar` permite probar ausencia real sin duplicar el payload válido.
 */
dataset('datos de produccion invalidos', [
    'sin nombre' => [[], 'name', 'name'],
    'nombre vacío' => [['name' => ''], 'name', null],
    'nombre solo con espacios' => [['name' => '   '], 'name', null],
    'nombre que no es texto' => [['name' => ['Sesiones']], 'name', null],
    'nombre de más de 255 caracteres' => [['name' => str_repeat('a', 256)], 'name', null],
    'sin formato' => [[], 'format', 'format'],
    'formato desconocido' => [['format' => 'mixtape'], 'format', null],
]);

/*
 * El closure se resuelve dentro del test, con RefreshDatabase ya activo.
 * `null` representa que la clave `artist_id` debe estar ausente.
 */
dataset('artistas no disponibles para una produccion', [
    'sin artista' => [null],
    'id que no es UUID' => ['no-es-un-uuid'],
    'UUID inexistente' => [fn (): string => (string) Str::uuid()],
    'artista borrado' => [function (): string {
        $artist = Artist::factory()->create();
        $artist->delete();

        return $artist->id;
    }],
]);

dataset('producciones inexistentes', [
    'UUID inexistente' => [fn (): string => (string) Str::uuid()],
    'producción borrada' => [function (): string {
        $production = Production::factory()->create();
        $production->delete();

        return $production->id;
    }],
    'id que no es UUID' => ['no-es-un-uuid'],
]);
