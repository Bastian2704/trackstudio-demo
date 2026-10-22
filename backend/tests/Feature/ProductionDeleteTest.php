<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Production;
use App\Models\Song;
use App\Models\Version;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-19 — Borrado de producción: DELETE /api/v1/productions/{production}
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-08.md §3 y §4 (#23–#25).
| TS-23 añade la cascada a canciones y versiones: docs/specs/backend/HU-12.md §3.3 y §4 (#5–#9).
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

/**
 * Producción con dos canciones vigentes y versiones en los tres estados.
 *
 * @return array{production: Production, songs: Collection<int, Song>, versions: Collection<int, Version>}
 */
function produccionConVersiones(?Production $production = null): array
{
    $production ??= Production::factory()->create();
    $songs = crearCanciones($production, 2);
    $versions = new Collection([
        Version::factory()->create(['song_id' => $songs[0]->id, 'version_number' => 1]),
        Version::factory()->verificada()->create(['song_id' => $songs[0]->id, 'version_number' => 2]),
        Version::factory()->fallida()->create(['song_id' => $songs[1]->id, 'version_number' => 1]),
    ]);

    return ['production' => $production, 'songs' => $songs, 'versions' => $versions];
}

it('borra en cascada canciones y versiones vigentes', function () {
    ['production' => $production, 'songs' => $songs, 'versions' => $versions] = produccionConVersiones();
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson("/api/v1/productions/{$production->id}")
        ->assertNoContent();

    $trashedSongs = Song::withTrashed()->whereKey($songs->pluck('id'))->orderBy('position')->get();

    expect(Song::query()->where('production_id', $production->id)->exists())->toBeFalse()
        ->and($trashedSongs->every(fn (Song $song): bool => $song->deleted_at !== null))->toBeTrue()
        ->and($trashedSongs->pluck('position')->all())->toBe([1, 2])
        ->and(Version::query()->whereKey($versions->pluck('id'))->exists())->toBeFalse()
        ->and(Version::withTrashed()->whereKey($versions->pluck('id'))->count())->toBe(3);
});

it('no toca canciones ni versiones de otras producciones', function () {
    ['production' => $production] = produccionConVersiones();
    ['songs' => $otherSongs, 'versions' => $otherVersions] = produccionConVersiones(
        Production::factory()->create(['artist_id' => $production->artist_id]),
    );
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson("/api/v1/productions/{$production->id}")
        ->assertNoContent();

    expect(Song::query()->whereKey($otherSongs->pluck('id'))->orderBy('position')->pluck('position')->all())->toBe([1, 2])
        ->and(Version::query()->whereKey($otherVersions->pluck('id'))->count())->toBe(3);
});

it('conserva la fecha de borrado de lo ya borrado', function () {
    ['production' => $production, 'songs' => $songs, 'versions' => $versions] = produccionConVersiones();
    $previousSong = $songs[1];
    $previousVersion = $versions[0];
    $deletedAt = CarbonImmutable::parse('2026-10-01 10:00:00');
    $this->travelTo($deletedAt);
    $previousSong->delete();
    $previousVersion->delete();
    $this->travelBack();
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson("/api/v1/productions/{$production->id}")
        ->assertNoContent();

    expect(Song::withTrashed()->findOrFail($previousSong->id)->deleted_at?->equalTo($deletedAt))->toBeTrue()
        ->and(Version::withTrashed()->findOrFail($previousVersion->id)->deleted_at?->equalTo($deletedAt))->toBeTrue();
});

it('es atómico si falla un paso', function (string $tabla) {
    ['production' => $production, 'songs' => $songs, 'versions' => $versions] = produccionConVersiones();
    fallarAlActualizar($tabla, 'OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL');
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson("/api/v1/productions/{$production->id}")
        ->assertStatus(500)
        ->assertJsonPath('code', 'INTERNAL_ERROR');

    expect(Production::query()->whereKey($production->id)->exists())->toBeTrue()
        ->and(Song::query()->whereKey($songs->pluck('id'))->count())->toBe(2)
        ->and(Version::query()->whereKey($versions->pluck('id'))->count())->toBe(3);
})->with([
    'falla en canciones' => ['songs'],
    'falla en versiones' => ['versions'],
]);

it('borra en cascada aunque el artista esté inactivo', function () {
    ['production' => $production, 'songs' => $songs, 'versions' => $versions] = produccionConVersiones();
    $production->artist()->update(['status' => ArtistStatus::Inactivo]);
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson("/api/v1/productions/{$production->id}")
        ->assertNoContent();

    expect(Song::query()->whereKey($songs->pluck('id'))->exists())->toBeFalse()
        ->and(Version::query()->whereKey($versions->pluck('id'))->exists())->toBeFalse();
});
