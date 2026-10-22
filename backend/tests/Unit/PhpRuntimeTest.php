<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| TS-77 — Runtime de PHP sin PHP2Shell (D2.1)
|--------------------------------------------------------------------------
|
| CVE-2026-109618 y CVE-2026-109619 se corrigen en 8.4.27. setup-php no
| admite versión de parche en el workflow, así que este test es el que fija
| el mínimo en Sail y en CI: cualquier 8.4 anterior a 8.4.27 deja la suite en
| rojo. El techo < 8.5 mantiene el hotfix dentro de la rama 8.4 (TS-77).
|
*/

it('corre sobre PHP 8.4.27 o superior dentro de la rama 8.4', function () {
    expect(PHP_VERSION_ID)
        ->toBeGreaterThanOrEqual(80427)
        ->toBeLessThan(80500);
});

it('pinnea config.platform.php de composer.json a un parche corregido de 8.4', function () {
    $composer = json_decode(
        (string) file_get_contents(dirname(__DIR__, 2).'/composer.json'),
        true,
        flags: JSON_THROW_ON_ERROR,
    );

    $platform = $composer['config']['platform']['php'] ?? '0';

    expect(version_compare($platform, '8.4.27', '>='))->toBeTrue()
        ->and(version_compare($platform, '8.5.0', '<'))->toBeTrue();
});
