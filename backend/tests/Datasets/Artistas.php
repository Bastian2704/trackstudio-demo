<?php

declare(strict_types=1);

use App\Models\Artist;
use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| TS-16 — Datasets compartidos por el alta, la consulta y la edición
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-05.md §4 (#7, #15, #20 y #22).
|
*/

/*
 * Cada caso rompe exactamente un campo; el segundo valor es el único campo
 * que debe aparecer en `errors`.
 */
dataset('datos de artista inválidos', [
    'sin nombre' => [['email' => 'luna.rivera@ejemplo.test'], 'name'],
    'nombre vacío' => [['name' => '', 'email' => 'luna.rivera@ejemplo.test'], 'name'],
    'nombre solo con espacios' => [['name' => '   ', 'email' => 'luna.rivera@ejemplo.test'], 'name'],
    'nombre que no es texto' => [['name' => ['Luna Rivera'], 'email' => 'luna.rivera@ejemplo.test'], 'name'],
    'nombre de más de 255 caracteres' => [['name' => str_repeat('a', 256), 'email' => 'luna.rivera@ejemplo.test'], 'name'],
    'sin email' => [['name' => 'Luna Rivera'], 'email'],
    'email vacío' => [['name' => 'Luna Rivera', 'email' => ''], 'email'],
    'email con formato inválido' => [['name' => 'Luna Rivera', 'email' => 'luna-rivera'], 'email'],
    // 258 caracteres con formato RFC aceptable: solo `max:255` puede rechazarlo.
    'email de más de 255 caracteres' => [['name' => 'Luna Rivera', 'email' => str_repeat('a', 245).'@ejemplo.test'], 'email'],
]);

/*
 * Ids que deben terminar en 404 RESOURCE_NOT_FOUND. Los closures se resuelven
 * dentro del test, con la base de datos ya preparada.
 */
dataset('artistas inexistentes', [
    'uuid inexistente' => [fn (): string => (string) Str::uuid()],
    'artista borrado' => [function (): string {
        $artista = Artist::factory()->create();
        $artista->delete();

        return $artista->id;
    }],
    'id que no es uuid' => ['no-es-un-uuid'],
]);
