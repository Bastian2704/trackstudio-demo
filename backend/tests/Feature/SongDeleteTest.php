<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Production;
use App\Models\Song;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-21 — Borrado de canción: DELETE /api/v1/songs/{song}
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-10.md §3 y §4 (#24–#27).
|
*/

it('elimina lógicamente y responde 204 sin cuerpo', function () {
    $song = Song::factory()->create(['position' => 1]);
    $production = Production::query()->findOrFail($song->production_id);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->deleteJson("/api/v1/songs/{$song->id}");

    $response->assertNoContent();
    expect($response->getContent())->toBe('')
        ->and(Song::query()->find($song->id))->toBeNull()
        ->and(Song::withTrashed()->find($song->id)?->deleted_at)->not->toBeNull()
        ->and(Production::query()->findOrFail($production->id)->only(['name', 'format', 'deleted_at']))
        ->toBe($production->only(['name', 'format', 'deleted_at']));
});

it('compacta las posiciones de las vigentes', function () {
    $production = Production::factory()->create();
    $otherProduction = Production::factory()->create();

    $songs = collect(['Uno', 'Dos', 'Tres', 'Cuatro'])->mapWithKeys(fn (string $name, int $index): array => [
        $name => Song::factory()->create(['production_id' => $production->id, 'name' => $name, 'position' => $index + 1]),
    ]);

    // Borrada antes: comparte posición con una vigente y no debe moverse.
    $previouslyDeleted = Song::factory()->create(['production_id' => $production->id, 'name' => 'Descartada', 'position' => 3]);
    $previouslyDeleted->delete();

    $foreign = collect(range(1, 3))->map(fn (int $position): Song => Song::factory()->create([
        'production_id' => $otherProduction->id,
        'name' => "Ajena {$position}",
        'position' => $position,
    ]));

    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson("/api/v1/songs/{$songs['Dos']->id}")
        ->assertNoContent();

    expect(Song::query()->where('production_id', $production->id)->orderBy('position')->pluck('position', 'name')->all())
        ->toBe(['Uno' => 1, 'Tres' => 2, 'Cuatro' => 3])
        ->and(Song::withTrashed()->findOrFail($previouslyDeleted->id)->position)->toBe(3)
        ->and(Song::query()->whereIn('id', $foreign->pluck('id'))->orderBy('position')->pluck('position')->all())
        ->toBe([1, 2, 3]);
});

it('permite eliminar en una producción de artista inactivo', function () {
    $song = Song::factory()->create();
    Production::query()->findOrFail($song->production_id)->artist()->update(['status' => ArtistStatus::Inactivo]);
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson("/api/v1/songs/{$song->id}")
        ->assertNoContent();

    expect(Song::withTrashed()->findOrFail($song->id)->deleted_at)->not->toBeNull();
});

it('responde 404 al eliminar una canción no disponible', function (mixed $songReference) {
    exigirRuta('DELETE', 'api/v1/songs/{song}');
    impersonarToken(claimsDeToken('productor'));
    $songId = is_callable($songReference) ? $songReference() : $songReference;

    $this->deleteJson("/api/v1/songs/{$songId}")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
})->with('canciones inexistentes');

it('rechaza el borrado sin identidad productora y conserva la fila', function (?string $role, int $status, string $code) {
    $song = Song::factory()->create();

    if ($role !== null) {
        impersonarToken(claimsDeToken($role));
    }

    $this->deleteJson("/api/v1/songs/{$song->id}")
        ->assertStatus($status)
        ->assertJsonPath('code', $code);

    expect(Song::query()->whereKey($song->id)->exists())->toBeTrue();
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'rol artista' => ['artista', 403, 'FORBIDDEN'],
    'rol desconocido' => ['desconocido', 403, 'FORBIDDEN'],
]);
