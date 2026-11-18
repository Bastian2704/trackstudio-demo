<?php

declare(strict_types=1);

use App\Models\Production;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-31 — Revocar: DELETE /api/v1/productions/{production}/access/{access}
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-20.md §3.5 y §4 (#13–#15, #30). La fila nunca se
| borra (D6.5). El RBAC está en ProductionAccessStoreTest.
|
*/

const INSTANTE_DE_REVOCACION = '2026-11-21 09:30:00';

function revocadoEn(string $acceso): ?CarbonImmutable
{
    $valor = DB::table('production_access')->where('id', $acceso)->value('revoked_at');

    return $valor === null ? null : CarbonImmutable::parse($valor);
}

it('revoca sin borrar la fila', function () {
    $produccion = Production::factory()->create();
    $acceso = crearAcceso($produccion, ['granted_at' => CarbonImmutable::parse(INSTANTE_DE_REVOCACION)->subDay()]);
    $this->travelTo(CarbonImmutable::parse(INSTANTE_DE_REVOCACION));
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson("/api/v1/productions/{$produccion->id}/access/{$acceso}")
        ->assertNoContent();

    expect(DB::table('production_access')->where('id', $acceso)->exists())->toBeTrue()
        ->and(revocadoEn($acceso)?->equalTo(now()))->toBeTrue();
});

it('revocar dos veces es idempotente', function () {
    $produccion = Production::factory()->create();
    $acceso = crearAcceso($produccion, ['granted_at' => CarbonImmutable::parse(INSTANTE_DE_REVOCACION)->subDay()]);
    $this->travelTo(CarbonImmutable::parse(INSTANTE_DE_REVOCACION));
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson("/api/v1/productions/{$produccion->id}/access/{$acceso}")->assertNoContent();

    $this->travel(2)->hours();

    $this->deleteJson("/api/v1/productions/{$produccion->id}/access/{$acceso}")->assertNoContent();

    expect(revocadoEn($acceso)?->equalTo(CarbonImmutable::parse(INSTANTE_DE_REVOCACION)))->toBeTrue();
});

it('no sobrescribe una revocación concurrente', function () {
    $produccion = Production::factory()->create();
    $acceso = crearAcceso($produccion, ['granted_at' => CarbonImmutable::parse(INSTANTE_DE_REVOCACION)->subDay()]);
    $otraRevocacion = CarbonImmutable::parse(INSTANTE_DE_REVOCACION)->subMinute();
    $this->travelTo(CarbonImmutable::parse(INSTANTE_DE_REVOCACION));
    impersonarToken(claimsDeToken('productor'));
    Log::spy();

    // Otro DELETE revoca justo antes de que este escriba.
    $adelantada = false;
    DB::beforeExecuting(function (string $sql) use (&$adelantada, $acceso, $otraRevocacion): void {
        if ($adelantada || ! str_starts_with($sql, 'update "production_access"')) {
            return;
        }

        $adelantada = true;
        DB::table('production_access')->where('id', $acceso)->update(['revoked_at' => $otraRevocacion]);
    });

    $this->deleteJson("/api/v1/productions/{$produccion->id}/access/{$acceso}")
        ->assertNoContent();

    expect($adelantada)->toBeTrue()
        ->and(revocadoEn($acceso)?->equalTo($otraRevocacion))->toBeTrue();

    Log::shouldNotHaveReceived('info', ['production_access.revoked', Mockery::any()]);
});

it('responde 404 con un acceso de otra producción o inexistente', function (Closure $acceso) {
    exigirRuta('DELETE', 'api/v1/productions/{production}/access/{access}');
    $produccion = Production::factory()->create();
    $ajena = Production::factory()->create();
    $accesoAjeno = crearAcceso($ajena);
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson("/api/v1/productions/{$produccion->id}/access/{$acceso($accesoAjeno)}")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expect(revocadoEn($accesoAjeno))->toBeNull();
})->with([
    'de otra producción' => [fn (string $ajeno): string => $ajeno],
    'inexistente' => [fn (string $ajeno): string => (string) Str::uuid()],
]);
