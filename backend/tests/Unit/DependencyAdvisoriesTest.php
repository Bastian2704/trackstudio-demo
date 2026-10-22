<?php

declare(strict_types=1);

use Composer\InstalledVersions;

/*
|--------------------------------------------------------------------------
| TS-77 — Dependencias sin los avisos de composer audit (2026-10-22)
|--------------------------------------------------------------------------
|
| Mínimos corregidos de cada aviso. Si un `composer update` futuro baja una
| de estas versiones, o el lock vuelve a una vulnerable, la suite queda en rojo.
|
*/

it('instala el paquete en una versión corregida', function (string $package, string $minimum) {
    expect(version_compare((string) InstalledVersions::getVersion($package), $minimum, '>='))->toBeTrue();
})->with([
    'symfony/http-foundation >= 8.1.7 (CVE-2026-108082, ReDoS en Cache-Control)' => ['symfony/http-foundation', '8.1.7'],
    'laravel/framework >= 13.30.0 (CVE-2026-102279, XSS en la página de debug)' => ['laravel/framework', '13.30.0'],
    'league/commonmark >= 2.10.2 (GHSA-97jj-33gv-5xf9, GHSA-3q6v-r5mr-hxv8)' => ['league/commonmark', '2.10.2'],
]);
