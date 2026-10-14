<?php

declare(strict_types=1);

use App\Models\Song;
use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| TS-21 — Datasets compartidos por el CRUD de canciones
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-10.md §4.
|
*/

dataset('estados de cancion', [
    'por hacer' => ['por_hacer'],
    'en progreso' => ['en_progreso'],
    'finalizada' => ['finalizada'],
]);

/*
 * `$quitar` permite probar ausencia real sin duplicar el payload válido.
 */
$nombresInvalidos = [
    'sin nombre' => [[], 'name', 'name'],
    'nombre vacío' => [['name' => ''], 'name', null],
    'nombre solo con espacios' => [['name' => '   '], 'name', null],
    'nombre que no es texto' => [['name' => ['Intro']], 'name', null],
    'nombre de más de 255 caracteres' => [['name' => str_repeat('a', 256)], 'name', null],
];

dataset('nombres de cancion invalidos', $nombresInvalidos);

dataset('datos de edicion de cancion invalidos', array_merge($nombresInvalidos, [
    'sin estado' => [[], 'status', 'status'],
    'estado desconocido' => [['status' => 'archivada'], 'status', null],
    'estado con otro casing' => [['status' => 'FINALIZADA'], 'status', null],
]));

/*
 * El closure se resuelve dentro del test, con RefreshDatabase ya activo.
 */
dataset('canciones inexistentes', [
    'UUID inexistente' => [fn (): string => (string) Str::uuid()],
    'canción borrada' => [function (): string {
        $song = Song::factory()->create();
        $song->delete();

        return $song->id;
    }],
    'id que no es UUID' => ['no-es-un-uuid'],
]);
