<?php

declare(strict_types=1);

use App\Models\Production;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-31 — Historial de accesos: GET /api/v1/productions/{production}/access
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-20.md §3.4 y §4 (#12). El RBAC de esta ruta
| está en ProductionAccessStoreTest («protege las rutas del productor»).
|
*/

it('lista el historial de la producción en orden de otorgamiento descendente', function () {
    $this->travelTo(CarbonImmutable::parse('2026-11-20 15:00:00'));
    $produccion = Production::factory()->create();

    // Insertadas sin orden monótono: el orden por inserción no coincide con el esperado.
    $intermedia = crearAcceso($produccion, ['granted_at' => now()->subDays(5), 'revoked_at' => now()->subDays(4)]);
    $vigente = crearAcceso($produccion, ['granted_at' => now()->subDay()]);
    $antigua = crearAcceso($produccion, ['granted_at' => now()->subDays(10), 'revoked_at' => now()->subDays(9)]);

    $ajena = Production::factory()->create();
    crearAcceso($ajena);

    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->getJson("/api/v1/productions/{$produccion->id}/access");

    $respuesta->assertOk();

    expect(array_column($respuesta->json('data'), 'id'))->toBe([$vigente, $intermedia, $antigua])
        ->and(array_column($respuesta->json('data'), 'is_active'))->toBe([true, false, false])
        ->and(array_keys($respuesta->json('data.0')))->toEqualCanonicalizing(CAMPOS_DE_ACCESO)
        ->and($respuesta->json('data.1.revoked_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET);
});

it('devuelve una lista vacía si la producción no tiene accesos', function () {
    $produccion = Production::factory()->create();
    impersonarToken(claimsDeToken('productor'));

    $this->getJson("/api/v1/productions/{$produccion->id}/access")
        ->assertOk()
        ->assertExactJson(['data' => []]);
});
