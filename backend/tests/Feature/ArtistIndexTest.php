<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Artist;
use App\Models\Production;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-17 — Listado de artistas: GET /api/v1/artists
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-06.md §3 y §4 (#1–#12). Solo productor.
|
| Los tests de orden fijan los `id` a mano: Laravel genera UUID ordenados por
| tiempo, y sin fijarlos el desempate por `id` podría dar el orden esperado
| por casualidad. Se insertan de forma que el orden físico de la tabla y el
| orden por `id` contradigan siempre el orden que pide la spec.
|
*/

/**
 * UUID en orden ascendente. PostgreSQL compara `uuid` byte a byte, que es el
 * mismo orden que la comparación de su forma hexadecimal en minúsculas.
 *
 * @return list<string>
 */
function uuidsAscendentes(int $cuantos): array
{
    $ids = array_map(fn (): string => strtolower((string) Str::uuid()), range(1, $cuantos));
    sort($ids, SORT_STRING);

    return $ids;
}

/** @return list<string> */
function idsDelListado(mixed $data): array
{
    return array_column($data, 'id');
}

it('lista los artistas con la forma del Resource', function () {
    $artista = Artist::factory()->create(datosDeArtista(['status' => ArtistStatus::Activo]));
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->getJson('/api/v1/artists');

    $respuesta->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $artista->id)
        ->assertJsonPath('data.0.name', 'Luna Rivera')
        ->assertJsonPath('data.0.email', 'luna.rivera@ejemplo.test')
        ->assertJsonPath('data.0.status', 'activo')
        ->assertJsonPath('meta.total', 1);

    expect(array_keys($respuesta->json('data.0')))->toEqualCanonicalizing([...CAMPOS_DE_ARTISTA, 'productions'])
        ->and($respuesta->json('data.0.created_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($respuesta->json('data.0.updated_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($respuesta->json())->toHaveKeys(['data', 'links', 'meta'])
        ->and($respuesta->getContent())->not->toContain((string) $artista->invitation_token)
        ->and($respuesta->getContent())->not->toContain($artista->created_by);
});

it('ordena por estado activo, invitado e inactivo', function () {
    // Creados en orden inverso y con la fecha también al revés: ni el orden
    // físico, ni la fecha sola, ni el orden alfabético del estado dan el esperado.
    [$idActivo, $idInvitado, $idInactivo] = uuidsAscendentes(3);
    Artist::factory()->create(['id' => $idInactivo, 'status' => ArtistStatus::Inactivo, 'created_at' => now()]);
    Artist::factory()->create(['id' => $idInvitado, 'status' => ArtistStatus::Invitado, 'created_at' => now()->subDay()]);
    Artist::factory()->create(['id' => $idActivo, 'status' => ArtistStatus::Activo, 'created_at' => now()->subDays(2)]);
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->getJson('/api/v1/artists')->assertOk();

    expect(array_column($respuesta->json('data'), 'status'))->toBe(['activo', 'invitado', 'inactivo'])
        ->and(idsDelListado($respuesta->json('data')))->toBe([$idActivo, $idInvitado, $idInactivo]);
});

it('ordena por fecha descendente dentro de cada estado', function () {
    // El más reciente tiene el `id` menor y se inserta primero: quitar la fecha
    // deja el desempate por `id`, que los devolvería del más antiguo al más reciente.
    [$idReciente, $idIntermedio, $idAntiguo] = uuidsAscendentes(3);
    Artist::factory()->create(['id' => $idReciente, 'status' => ArtistStatus::Activo, 'created_at' => now()->subHour()]);
    Artist::factory()->create(['id' => $idIntermedio, 'status' => ArtistStatus::Activo, 'created_at' => now()->subDay()]);
    Artist::factory()->create(['id' => $idAntiguo, 'status' => ArtistStatus::Activo, 'created_at' => now()->subWeek()]);
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->getJson('/api/v1/artists')->assertOk();

    expect(idsDelListado($respuesta->json('data')))->toBe([$idReciente, $idIntermedio, $idAntiguo]);
});

it('desempata por id cuando coinciden estado y fecha', function () {
    // Insertados en orden ascendente de `id`: sin desempate, la base tiende a
    // devolverlos en ese orden físico, el contrario al esperado.
    $ids = uuidsAscendentes(5);
    $mismaFecha = Carbon::parse('2026-10-05 14:03:11', 'UTC');

    foreach ($ids as $id) {
        Artist::factory()->create(['id' => $id, 'status' => ArtistStatus::Invitado, 'created_at' => $mismaFecha]);
    }
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->getJson('/api/v1/artists')->assertOk();

    expect(idsDelListado($respuesta->json('data')))->toBe(array_reverse($ids));
});

it('incluye las producciones vigentes de cada artista', function () {
    $artista = Artist::factory()->create(['status' => ArtistStatus::Activo, 'created_at' => now()]);
    $otroArtista = Artist::factory()->create(['status' => ArtistStatus::Activo, 'created_at' => now()->subDay()]);

    // Mismo patrón que los artistas: la reciente tiene el `id` menor y las
    // empatadas se insertan en orden ascendente de `id`, el contrario al esperado.
    // Con solo dos empatadas la base acertaba el orden por casualidad (C3, M7).
    $ids = uuidsAscendentes(7);
    [$idReciente, $idBorrada] = $ids;
    $idsEmpatados = array_slice($ids, 2);
    $mismaFecha = now()->subDays(3)->toImmutable();
    $empatadas = collect($idsEmpatados)
        ->map(fn (string $id): Production => Production::factory()->ep()->for($artista)->create(['id' => $id, 'created_at' => $mismaFecha]))
        ->reverse();
    $reciente = Production::factory()->sencillo()->for($artista)->create(['id' => $idReciente, 'created_at' => now()->subHour()]);
    Production::factory()->for($artista)->create(['id' => $idBorrada, 'created_at' => now()])->delete();
    $ajena = Production::factory()->ep()->for($otroArtista)->create();
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->getJson('/api/v1/artists')->assertOk();

    $forma = fn (Production $produccion): array => [
        'id' => $produccion->id,
        'name' => $produccion->name,
        'format' => $produccion->format->value,
    ];

    expect(idsDelListado($respuesta->json('data')))->toBe([$artista->id, $otroArtista->id])
        ->and($respuesta->json('data.0.productions'))->toEqual([$forma($reciente), ...$empatadas->map($forma)->all()])
        ->and($respuesta->json('data.1.productions'))->toEqual([$forma($ajena)]);
});

it('devuelve una lista vacía para un artista sin producciones', function () {
    Artist::factory()->create();
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->getJson('/api/v1/artists')->assertOk();

    expect($respuesta->json('data.0'))->toHaveKey('productions')
        ->and($respuesta->json('data.0.productions'))->toBe([]);
});

it('excluye a los artistas con soft delete', function () {
    $vigente = Artist::factory()->create();
    Artist::factory()->create()->delete();
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->getJson('/api/v1/artists')->assertOk();

    expect(idsDelListado($respuesta->json('data')))->toBe([$vigente->id])
        ->and($respuesta->json('meta.total'))->toBe(1);
});

it('pagina de 15 en 15 sin repetir ni perder artistas', function () {
    // Estados alternos y fechas repetidas de dos en dos: el orden esperado
    // necesita los tres criterios de §3.3 y cruza el corte de página.
    $estados = ArtistStatus::cases();
    $base = now()->toImmutable();
    $artistas = collect(uuidsAscendentes(16))->map(fn (string $id, int $i): Artist => Artist::factory()->create([
        'id' => $id,
        'status' => $estados[$i % count($estados)],
        'created_at' => $base->subMinutes(intdiv($i, 2)),
    ]));
    $rango = [ArtistStatus::Activo->value => 0, ArtistStatus::Invitado->value => 1, ArtistStatus::Inactivo->value => 2];
    $esperado = $artistas
        ->sort(fn (Artist $a, Artist $b): int => [$rango[$a->status->value], $b->created_at, $b->id]
            <=> [$rango[$b->status->value], $a->created_at, $a->id])
        ->pluck('id')
        ->all();
    impersonarToken(claimsDeToken('productor'));

    $primera = $this->getJson('/api/v1/artists')->assertOk();
    $segunda = $this->getJson('/api/v1/artists?page=2')->assertOk();

    expect($primera->json('data'))->toHaveCount(15)
        ->and($segunda->json('data'))->toHaveCount(1)
        ->and($primera->json('meta.total'))->toBe(16)
        ->and($primera->json('meta.per_page'))->toBe(15)
        ->and($primera->json('meta.last_page'))->toBe(2)
        ->and([...idsDelListado($primera->json('data')), ...idsDelListado($segunda->json('data'))])->toBe($esperado);
});

it('responde 200 con data vacía cuando no hay artistas', function () {
    impersonarToken(claimsDeToken('productor'));

    $this->getJson('/api/v1/artists')
        ->assertOk()
        ->assertJsonPath('data', [])
        ->assertJsonPath('meta.total', 0)
        ->assertJsonPath('meta.from', null)
        ->assertJsonPath('meta.to', null);
});

it('no hace consultas N+1', function () {
    impersonarToken(claimsDeToken('productor'));

    $consultasDelListado = function (): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/artists')->assertOk();
        DB::disableQueryLog();

        return count(DB::getQueryLog());
    };

    Artist::factory()->count(2)->has(Production::factory()->count(2))->create();
    // Primer request de calentamiento: lo que se resuelva una sola vez por
    // proceso no debe contar como diferencia entre los dos escenarios.
    $consultasDelListado();
    $conPocos = $consultasDelListado();

    Artist::factory()->count(4)->has(Production::factory()->count(3))->create();
    $conMuchos = $consultasDelListado();

    expect($conMuchos)->toBe($conPocos);
});

it('rechaza sin token con 401 UNAUTHENTICATED', function () {
    $this->getJson('/api/v1/artists')
        ->assertUnauthorized()
        ->assertJsonPath('code', 'UNAUTHENTICATED');
});

it('rechaza al rol artista con 403 FORBIDDEN', function (string $rol) {
    Artist::factory()->create();
    impersonarToken(claimsDeToken($rol));

    $this->getJson('/api/v1/artists')
        ->assertForbidden()
        ->assertJsonPath('code', 'FORBIDDEN');
})->with([
    'rol artista' => ['artista'],
    'rol desconocido' => ['desconocido'],
]);
