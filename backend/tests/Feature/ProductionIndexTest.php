<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Artist;
use App\Models\Production;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-32 — Listado de producciones por rol: GET /api/v1/productions
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-21.md §3.2 y §4 (#1–#7). El productor ve todas;
| el artista, solo las de acceso efectivo (§3.1).
|
| Como en ArtistIndexTest, los `id` se fijan a mano y se insertan para que ni
| el orden físico ni el orden por `id` coincidan con el que pide la spec.
|
*/

/** @return list<string> */
function uuidsAscendentesDeProduccion(int $cuantos): array
{
    $ids = array_map(fn (): string => strtolower((string) Str::uuid()), range(1, $cuantos));
    sort($ids, SORT_STRING);

    return $ids;
}

/** @return list<string> */
function idsDeProducciones(mixed $data): array
{
    return array_column($data, 'id');
}

it('el productor lista todas por fecha de creación con su artista', function () {
    exigirRuta('GET', 'api/v1/productions');
    $luna = Artist::factory()->create(['name' => 'Luna Rivera', 'status' => ArtistStatus::Activo]);
    $sol = Artist::factory()->create(['name' => 'Sol Vega', 'status' => ArtistStatus::Invitado]);
    $mar = Artist::factory()->create(['name' => 'Mar Paz', 'status' => ArtistStatus::Inactivo]);

    // La más reciente tiene el `id` mayor del grupo empatado y se inserta la
    // última; las empatadas van en orden ascendente de `id`, el contrario al esperado.
    [$idA, $idB, $idC, $idReciente, $idAntigua] = uuidsAscendentesDeProduccion(5);
    $empate = Carbon::parse('2026-11-10 12:00:00', 'UTC');
    Production::factory()->create(['id' => $idAntigua, 'artist_id' => $sol->id, 'created_at' => $empate->copy()->subDay()]);
    foreach ([[$idA, $luna], [$idB, $mar], [$idC, $sol]] as [$id, $artista]) {
        Production::factory()->create(['id' => $id, 'artist_id' => $artista->id, 'created_at' => $empate]);
    }
    Production::factory()->create(['id' => $idReciente, 'artist_id' => $mar->id, 'created_at' => $empate->copy()->addHour()]);
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->getJson('/api/v1/productions')->assertOk();

    expect(idsDeProducciones($respuesta->json('data')))->toBe([$idReciente, $idC, $idB, $idA, $idAntigua])
        ->and(array_keys($respuesta->json('data.0')))->toEqualCanonicalizing([...CAMPOS_DE_PRODUCCION, 'artist'])
        ->and($respuesta->json('data.0.artist'))->toBe(['id' => $mar->id, 'name' => 'Mar Paz'])
        ->and($respuesta->json('data.3.artist'))->toBe(['id' => $luna->id, 'name' => 'Luna Rivera'])
        ->and($respuesta->json('data.0.created_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($respuesta->json())->toHaveKeys(['data', 'links', 'meta']);
});

it('no lista producciones borradas', function (string $rol) {
    exigirRuta('GET', 'api/v1/productions');
    $vigente = artistaConAcceso();
    $borrada = Production::factory()->create(['artist_id' => $vigente->artist_id]);
    crearAcceso($borrada);
    $borrada->delete();
    impersonarToken(claimsDeToken($rol));

    $respuesta = $this->getJson('/api/v1/productions')->assertOk();

    expect(idsDeProducciones($respuesta->json('data')))->toBe([$vigente->id]);
})->with(['productor', 'artista']);

it('muestra el nombre de un artista borrado al productor', function () {
    exigirRuta('GET', 'api/v1/productions');
    $artista = Artist::factory()->create(['name' => 'Río Claro']);
    $production = Production::factory()->create(['artist_id' => $artista->id]);
    $artista->delete();
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->getJson('/api/v1/productions')->assertOk();

    expect(idsDeProducciones($respuesta->json('data')))->toBe([$production->id])
        ->and($respuesta->json('data.0.artist'))->toBe(['id' => $artista->id, 'name' => 'Río Claro']);
});

it('pagina de 15 en 15', function () {
    exigirRuta('GET', 'api/v1/productions');
    $artista = Artist::factory()->create();
    $base = now()->toImmutable();
    $ids = collect(range(0, 15))
        ->map(fn (int $i): string => Production::factory()->create([
            'artist_id' => $artista->id,
            'created_at' => $base->subMinutes($i),
        ])->id)
        ->all();
    impersonarToken(claimsDeToken('productor'));

    $primera = $this->getJson('/api/v1/productions')->assertOk();
    $segunda = $this->getJson('/api/v1/productions?page=2')->assertOk();

    expect($primera->json('data'))->toHaveCount(15)
        ->and($segunda->json('data'))->toHaveCount(1)
        ->and($primera->json('meta.total'))->toBe(16)
        ->and($primera->json('meta.per_page'))->toBe(15)
        ->and([...idsDeProducciones($primera->json('data')), ...idsDeProducciones($segunda->json('data'))])->toBe($ids);
});

it('el artista solo lista las de acceso vigente', function () {
    exigirRuta('GET', 'api/v1/productions');
    $antigua = artistaConAcceso();
    $antigua->forceFill(['created_at' => now()->subDays(2)])->save();
    $reciente = Production::factory()->create(['artist_id' => $antigua->artist_id, 'created_at' => now()->subHour()]);
    crearAcceso($reciente);
    $revocada = Production::factory()->create(['artist_id' => $antigua->artist_id]);
    crearAcceso($revocada, ['granted_at' => now()->subDay(), 'revoked_at' => now()]);
    Production::factory()->create(['artist_id' => $antigua->artist_id]);
    $ajena = Production::factory()->create(['artist_id' => Artist::factory()->create([
        'user_id' => User::factory()->create(['auth0_sub' => 'auth0|otro-artista'])->id,
        'status' => ArtistStatus::Activo,
    ])->id]);
    crearAcceso($ajena);
    impersonarToken(claimsDeToken('artista'));

    $respuesta = $this->getJson('/api/v1/productions')->assertOk();

    expect(idsDeProducciones($respuesta->json('data')))->toBe([$reciente->id, $antigua->id])
        ->and($respuesta->json('data.0.artist.id'))->toBe($antigua->artist_id)
        ->and($respuesta->json('meta.total'))->toBe(2);
});

it('devuelve una página vacía sin acceso efectivo', function (Closure $montar) {
    exigirRuta('GET', 'api/v1/productions');
    $montar();
    impersonarToken(claimsDeToken('artista'));

    $respuesta = $this->getJson('/api/v1/productions')->assertOk();

    expect($respuesta->json('data'))->toBe([])
        ->and($respuesta->json('meta.total'))->toBe(0);
})->with([
    'artista inactivo' => [fn () => artistaConAcceso(['status' => ArtistStatus::Inactivo])],
    'artista borrado' => [fn () => artistaConAcceso()->artist()->firstOrFail()->delete()],
    'sin cuenta enlazada' => [function (): void {
        User::query()->firstOrCreate(['auth0_sub' => claimsDeToken()['sub']]);
        artistaConAcceso(['user_id' => null]);
    }],
    'sin filas de acceso' => [function (): void {
        $usuario = User::query()->firstOrCreate(['auth0_sub' => claimsDeToken()['sub']]);
        $artista = Artist::factory()->create(['user_id' => $usuario->id, 'status' => ArtistStatus::Activo]);
        Production::factory()->create(['artist_id' => $artista->id]);
    }],
]);

it('protege el listado por rol', function (?string $rol, int $estado, string $codigo) {
    exigirRuta('GET', 'api/v1/productions');
    Production::factory()->create();

    if ($rol !== null || $estado === 403) {
        impersonarToken(claimsDeToken($rol));
    }

    $this->getJson('/api/v1/productions')
        ->assertStatus($estado)
        ->assertJsonPath('code', $codigo);
})->with([
    'sin rol' => [null, 403, 'FORBIDDEN'],
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
]);
