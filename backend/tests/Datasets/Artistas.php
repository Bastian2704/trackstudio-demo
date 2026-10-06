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

/*
 * Enmienda §3.8 (#26): mensaje exacto en español de cada regla. Los casos de
 * duplicado chocan con el artista «Luna Rivera» que crea el test; el resto usa
 * datos que no chocan con él.
 */
dataset('mensajes de validación en español', [
    'sin nombre' => [['email' => 'sol.vega@ejemplo.test'], 'name', 'El campo nombre es obligatorio.'],
    'nombre que no es texto' => [['name' => ['Sol Vega'], 'email' => 'sol.vega@ejemplo.test'], 'name', 'El campo nombre debe ser texto.'],
    'nombre de más de 255 caracteres' => [['name' => str_repeat('a', 256), 'email' => 'sol.vega@ejemplo.test'], 'name', 'El campo nombre no debe superar los 255 caracteres.'],
    'sin email' => [['name' => 'Sol Vega'], 'email', 'El campo email es obligatorio.'],
    'email con formato inválido' => [['name' => 'Sol Vega', 'email' => 'sol-vega'], 'email', 'El campo email debe ser un email válido.'],
    'email de más de 255 caracteres' => [['name' => 'Sol Vega', 'email' => str_repeat('a', 245).'@ejemplo.test'], 'email', 'El campo email no debe superar los 255 caracteres.'],
    'nombre duplicado' => [['name' => 'LUNA RIVERA', 'email' => 'sol.vega@ejemplo.test'], 'name', 'Ya existe un artista con ese nombre.'],
    'email duplicado' => [['name' => 'Sol Vega', 'email' => 'Luna.Rivera@Ejemplo.test'], 'email', 'Ya existe un artista con ese email.'],
]);
