<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| TS-28 — Datasets de la creación de comentarios
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-17.md §3.4 y §4 (#6). `$quitar` prueba la
| ausencia real sin duplicar el payload válido; `$campo` es la única clave
| que debe aparecer en `errors`.
|
*/

dataset('datos de comentario invalidos', [
    'sin texto' => [[], 'body', 'body'],
    'texto vacío' => [['body' => ''], null, 'body'],
    'texto solo con espacios' => [['body' => '   '], null, 'body'],
    'texto que no es texto' => [['body' => 123], null, 'body'],
    'texto de 2001 caracteres' => [['body' => str_repeat('a', 2001)], null, 'body'],
    'sin marca' => [[], 'timestamp_ms', 'timestamp_ms'],
    'marca negativa' => [['timestamp_ms' => -1], null, 'timestamp_ms'],
    'marca decimal' => [['timestamp_ms' => 1.5], null, 'timestamp_ms'],
    'marca en texto numérico' => [['timestamp_ms' => '1500'], null, 'timestamp_ms'],
    'marca booleana' => [['timestamp_ms' => true], null, 'timestamp_ms'],
]);
