<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Production;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-19 — Borrado de producción: DELETE /api/v1/productions/{production}
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-08.md §3 y §4 (#23–#25).
|
*/

it('elimina lógicamente la producción y responde 204 sin cuerpo', function () {
    $production = Production::factory()->create();
    $artistId = $production->artist_id;
    impersonarToken(claimsDeToken('productor'));

    $response = $this->deleteJson("/api/v1/productions/{$production->id}");

    $response->assertNoContent();
    expect($response->getContent())->toBe('')
        ->and(Production::query()->find($production->id))->toBeNull()
        ->and(Production::withTrashed()->find($production->id)?->deleted_at)->not->toBeNull()
        ->and($production->artist()->withTrashed()->whereKey($artistId)->exists())->toBeTrue();
});

it('permite eliminar una producción cuyo artista pasó a inactivo', function () {
    $production = Production::factory()->create();
    $production->artist()->update(['status' => ArtistStatus::Inactivo]);
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson("/api/v1/productions/{$production->id}")
        ->assertNoContent();

    expect(Production::withTrashed()->findOrFail($production->id)->deleted_at)->not->toBeNull();
});

it('responde 404 RESOURCE_NOT_FOUND al eliminar una producción no disponible', function (mixed $productionReference) {
    exigirRuta('DELETE', 'api/v1/productions/{production}');
    impersonarToken(claimsDeToken('productor'));
    $productionId = is_callable($productionReference) ? $productionReference() : $productionReference;

    $this->deleteJson("/api/v1/productions/{$productionId}")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
})->with('producciones inexistentes');

it('rechaza el borrado sin identidad productora y conserva la fila', function (?string $role, int $status, string $code) {
    $production = Production::factory()->create();

    if ($role !== null) {
        impersonarToken(claimsDeToken($role));
    }

    $this->deleteJson("/api/v1/productions/{$production->id}")
        ->assertStatus($status)
        ->assertJsonPath('code', $code);

    expect(Production::query()->whereKey($production->id)->exists())->toBeTrue();
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'rol artista' => ['artista', 403, 'FORBIDDEN'],
    'rol desconocido' => ['desconocido', 403, 'FORBIDDEN'],
]);
