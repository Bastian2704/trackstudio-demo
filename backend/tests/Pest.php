<?php

declare(strict_types=1);

use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Feature y Unit extienden el TestCase de Laravel. Ver
| `backend/docs/nomenclatura.md` §8 para qué va en cada carpeta.
| `RefreshDatabase` sigue apagado: TS-27 no toca la base de datos.
|
*/

pest()->extend(TestCase::class)->in('Feature', 'Unit');
