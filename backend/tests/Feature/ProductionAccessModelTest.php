<?php

declare(strict_types=1);

use App\Models\Production;
use App\Models\ProductionAccess;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-31 — Esquema de production_access (ERD §3.7)
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-20.md §3.1 y §4 (#23). Las inserciones que
| deben fallar van en DB::transaction: el savepoint evita que PostgreSQL
| aborte la transacción de RefreshDatabase.
|
*/

// Sin la tabla, un INSERT que «debe fallar» falla por otra razón y nace verde (C2).
beforeEach(function () {
    expect(Schema::hasTable('production_access'))->toBeTrue('Falta la migración de production_access.');
});

it('tiene exactamente las columnas del ERD', function () {
    expect(Schema::getColumnListing('production_access'))->toEqualCanonicalizing([
        'id', 'production_id', 'artist_id', 'granted_by', 'granted_at', 'revoked_at',
    ]);
});

it('crea los índices con los nombres del ERD', function () {
    $indices = collect(DB::select("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'production_access'"))
        ->pluck('indexdef', 'indexname');

    expect($indices->keys()->all())->toContain(
        'production_access_production_id_index',
        'production_access_artist_id_index',
        'production_access_granted_by_index',
        'production_access_active_unique',
    )
        ->and($indices['production_access_active_unique'] ?? '')->toContain('UNIQUE')
        ->and($indices['production_access_active_unique'] ?? '')->toContain('revoked_at IS NULL');
});

it('admite un solo acceso vigente por artista y producción', function () {
    $produccion = Production::factory()->create();
    crearAcceso($produccion);

    expect(fn () => DB::transaction(fn () => crearAcceso($produccion)))
        ->toThrow(QueryException::class);
});

it('admite un acceso nuevo tras revocar el anterior', function () {
    $produccion = Production::factory()->create();
    crearAcceso($produccion, ['granted_at' => now()->subDay(), 'revoked_at' => now()->subHour()]);

    crearAcceso($produccion);

    expect(DB::table('production_access')->where('production_id', $produccion->id)->count())->toBe(2);
});

it('rechaza una revocación anterior al otorgamiento', function () {
    $produccion = Production::factory()->create();

    expect(fn () => DB::transaction(fn () => crearAcceso($produccion, [
        'granted_at' => now(),
        'revoked_at' => now()->subMinute(),
    ])))->toThrow(QueryException::class);
});

it('expone las relaciones y los casts del modelo', function () {
    $produccion = Production::factory()->create();
    $id = crearAcceso($produccion);

    $acceso = ProductionAccess::query()->findOrFail($id);

    expect($acceso->production?->is($produccion))->toBeTrue()
        ->and($acceso->artist?->id)->toBe($produccion->artist_id)
        ->and($acceso->grantor?->id)->toBe(DB::table('production_access')->where('id', $id)->value('granted_by'))
        ->and($acceso->granted_at)->toBeInstanceOf(DateTimeImmutable::class)
        ->and($acceso->revoked_at)->toBeNull()
        ->and($produccion->accesses()->pluck('id')->all())->toBe([$id])
        ->and($produccion->artist()->firstOrFail()->accesses()->pluck('id')->all())->toBe([$id]);
});
