<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Production;
use App\Models\Song;
use Illuminate\Database\Eloquent\Factories\Sequence;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-22 — Listado de canciones: GET /api/v1/productions/{production}/songs
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-11.md §3 y §4 (#1–#10).
|
*/

it('lista las canciones de la producción ordenadas por posición', function () {
    exigirRuta('GET', 'api/v1/productions/{production}/songs');
    $production = Production::factory()->create();
    $tercera = Song::factory()->for($production)->create(['position' => 3]);
    $primera = Song::factory()->for($production)->create(['position' => 1]);
    $segunda = Song::factory()->for($production)->create(['position' => 2]);
    Song::factory()->create(['position' => 1]);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->getJson("/api/v1/productions/{$production->id}/songs");

    $response->assertOk()
        ->assertJsonPath('data.*.id', [$primera->id, $segunda->id, $tercera->id])
        ->assertJsonPath('data.*.position', [1, 2, 3])
        ->assertJsonPath('data.0.production_id', $production->id)
        ->assertJsonPath('data.0.name', $primera->name);

    foreach ($response->json('data') as $cancion) {
        expect(array_keys($cancion))->toEqualCanonicalizing(CAMPOS_DE_CANCION)
            ->and($cancion['created_at'])->toMatch(FORMATO_ISO_8601_CON_OFFSET)
            ->and($cancion['updated_at'])->toMatch(FORMATO_ISO_8601_CON_OFFSET);
    }
});

it('desempata por id cuando dos canciones comparten posición', function () {
    exigirRuta('GET', 'api/v1/productions/{production}/songs');
    $production = Production::factory()->create();
    // Sin desempate, PostgreSQL devuelve los empates en orden arbitrario: con 6 filas,
    // acertar el orden por azar es 1/720 (con 3 era 1/6 y la C3 no era fiable).
    $ids = Song::factory()->for($production)->count(6)->create(['position' => 1])
        ->pluck('id')
        ->sort()
        ->values()
        ->all();
    impersonarToken(claimsDeToken('productor'));

    $this->getJson("/api/v1/productions/{$production->id}/songs")
        ->assertOk()
        ->assertJsonPath('data.*.id', $ids);
});

it('excluye las canciones borradas', function () {
    exigirRuta('GET', 'api/v1/productions/{production}/songs');
    $production = Production::factory()->create();
    $vigente = Song::factory()->for($production)->create(['position' => 1]);
    Song::factory()->for($production)->create(['position' => 2])->delete();
    impersonarToken(claimsDeToken('productor'));

    $this->getJson("/api/v1/productions/{$production->id}/songs")
        ->assertOk()
        ->assertJsonPath('data.*.id', [$vigente->id])
        ->assertJsonPath('meta.total', 1);
});

it('devuelve el estado de cada canción', function (string $status) {
    exigirRuta('GET', 'api/v1/productions/{production}/songs');
    $production = Production::factory()->create();
    Song::factory()->for($production)->create(['status' => $status]);
    impersonarToken(claimsDeToken('productor'));

    $this->getJson("/api/v1/productions/{$production->id}/songs")
        ->assertOk()
        ->assertJsonPath('data.0.status', $status);
})->with('estados de cancion');

it('responde vacío para una producción sin canciones', function () {
    exigirRuta('GET', 'api/v1/productions/{production}/songs');
    $production = Production::factory()->create();
    impersonarToken(claimsDeToken('productor'));

    $this->getJson("/api/v1/productions/{$production->id}/songs")
        ->assertOk()
        ->assertJsonPath('data', [])
        ->assertJsonPath('meta.total', 0)
        ->assertJsonPath('meta.from', null)
        ->assertJsonPath('meta.to', null);
});

it('lista en una producción de artista inactivo', function () {
    exigirRuta('GET', 'api/v1/productions/{production}/songs');
    $production = Production::factory()->create();
    $song = Song::factory()->for($production)->create();
    $production->artist()->update(['status' => ArtistStatus::Inactivo]);
    impersonarToken(claimsDeToken('productor'));

    $this->getJson("/api/v1/productions/{$production->id}/songs")
        ->assertOk()
        ->assertJsonPath('data.*.id', [$song->id]);
});

it('pagina de 15 en 15 sin repetir ni perder canciones', function () {
    exigirRuta('GET', 'api/v1/productions/{production}/songs');
    $production = Production::factory()->create();
    Song::factory()->for($production)->count(16)
        ->state(new Sequence(fn (Sequence $sequence): array => ['position' => $sequence->index + 1]))
        ->create();
    impersonarToken(claimsDeToken('productor'));

    $this->getJson("/api/v1/productions/{$production->id}/songs")
        ->assertOk()
        ->assertJsonPath('data.*.position', range(1, 15))
        ->assertJsonPath('meta.per_page', 15)
        ->assertJsonPath('meta.total', 16);

    $this->getJson("/api/v1/productions/{$production->id}/songs?page=2")
        ->assertOk()
        ->assertJsonPath('data.*.position', [16])
        ->assertJsonPath('meta.current_page', 2);
});

it('responde 404 si la producción no está disponible', function (mixed $productionReference) {
    exigirRuta('GET', 'api/v1/productions/{production}/songs');
    impersonarToken(claimsDeToken('productor'));
    $productionId = is_callable($productionReference) ? $productionReference() : $productionReference;

    $this->getJson("/api/v1/productions/{$productionId}/songs")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
})->with([
    'UUID inexistente' => [fn (): string => (string) Str::uuid()],
    // Residual 2 de HU-10 §3.8: sus canciones siguen vigentes, pero no se listan.
    'producción borrada con canciones vigentes' => [function (): string {
        $production = Production::factory()->create();
        Song::factory()->for($production)->create();
        $production->delete();

        return $production->id;
    }],
    'id que no es UUID' => ['no-es-un-uuid'],
]);

it('rechaza sin identidad o sin rol productor', function (?string $role, int $status, string $code) {
    exigirRuta('GET', 'api/v1/productions/{production}/songs');
    $production = Production::factory()->create();

    if ($role !== null) {
        impersonarToken(claimsDeToken($role));
    }

    $this->getJson("/api/v1/productions/{$production->id}/songs")
        ->assertStatus($status)
        ->assertJsonPath('code', $code);
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'rol artista' => ['artista', 403, 'FORBIDDEN'],
    'rol desconocido' => ['desconocido', 403, 'FORBIDDEN'],
]);

it('no hace consultas N+1', function () {
    exigirRuta('GET', 'api/v1/productions/{production}/songs');
    impersonarToken(claimsDeToken('productor'));
    $production = Production::factory()->create();

    $consultasDelListado = function () use ($production): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson("/api/v1/productions/{$production->id}/songs")->assertOk();
        DB::disableQueryLog();

        return count(DB::getQueryLog());
    };

    Song::factory()->for($production)->count(2)->create();
    // Calentamiento: lo que se resuelve una vez por proceso no cuenta como diferencia.
    $consultasDelListado();
    $conPocas = $consultasDelListado();

    Song::factory()->for($production)->count(10)->create();
    $conMuchas = $consultasDelListado();

    expect($conMuchas)->toBe($conPocas);
});
