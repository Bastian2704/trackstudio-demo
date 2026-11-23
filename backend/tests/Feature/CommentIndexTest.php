<?php

declare(strict_types=1);

use App\Models\Artist;
use App\Models\Comment;
use App\Models\Song;
use App\Models\User;
use App\Models\Version;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-29 — Ver comentarios en la línea de tiempo: GET /api/v1/versions/{version}/comments
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-18.md §3 y §4 (#1–#10). Los comentarios se
| crean con la factory, no por la API: así cada test fija la marca, la fecha,
| el autor y el id que necesita, y el orden de inserción no coincide con el
| esperado.
|
*/

it('lista los comentarios de la versión con autor y fecha', function () {
    $version = versionParaComentar();
    $comentario = Comment::factory()->create([
        'version_id' => $version->id,
        'body' => 'Sube la voz en el coro',
        'timestamp_ms' => 83500,
    ]);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->getJson(urlDeComentarios($version->id));

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $comentario->id)
        ->assertJsonPath('data.0.version_id', $version->id)
        ->assertJsonPath('data.0.author_id', $comentario->author_id)
        ->assertJsonPath('data.0.body', 'Sube la voz en el coro')
        ->assertJsonPath('data.0.timestamp_ms', 83500)
        ->assertJsonPath('data.0.created_at', '2026-11-17T15:20:00+00:00');

    expect(array_keys($response->json()))->toBe(['data'])
        ->and(array_keys($response->json('data.0')))->toEqualCanonicalizing(CAMPOS_DE_COMENTARIO_LISTADO)
        ->and($response->json('data.0.author'))->toBe(['role' => 'productor', 'name' => null])
        ->and($response->json('data.0.created_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET);
});

it('ordena por marca de tiempo y no por orden de inserción', function () {
    $version = versionParaComentar();

    foreach ([90000, 0, 45000, DURACION_PARA_COMENTAR] as $marca) {
        Comment::factory()->create(['version_id' => $version->id, 'timestamp_ms' => $marca]);
    }

    impersonarToken(claimsDeToken('productor'));

    $response = $this->getJson(urlDeComentarios($version->id));

    $response->assertOk();

    expect(array_column($response->json('data'), 'timestamp_ms'))
        ->toBe([0, 45000, 90000, DURACION_PARA_COMENTAR]);
});

it('a igual marca, sale primero el más antiguo y luego el de menor id', function () {
    $version = versionParaComentar();
    $instante = CarbonImmutable::parse(INSTANTE_DEL_COMENTARIO);

    // Se insertan al revés del orden esperado, y cada id va en contra del
    // criterio que lo precede: quitar o invertir cualquier criterio cambia el
    // orden siempre, no la mitad de las veces.
    $crear = function (string $id, string $body, CarbonImmutable $fecha) use ($version): void {
        $this->travelTo($fecha);
        Comment::factory()->create([
            'id' => $id,
            'version_id' => $version->id,
            'body' => $body,
            'timestamp_ms' => 5000,
        ]);
    };

    $crear('00000000-0000-4000-8000-000000000001', 'reciente', $instante->addMinute());
    $crear('ffffffff-ffff-4fff-bfff-ffffffffffff', 'antiguo, id mayor', $instante);
    $crear('77777777-7777-4777-b777-777777777777', 'antiguo, id menor', $instante);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->getJson(urlDeComentarios($version->id));

    $response->assertOk();

    expect(array_column($response->json('data'), 'body'))
        ->toBe(['antiguo, id menor', 'antiguo, id mayor', 'reciente']);
});

it('responde una lista vacía si la versión no tiene comentarios', function () {
    $version = versionParaComentar();
    impersonarToken(claimsDeToken('productor'));

    $response = $this->getJson(urlDeComentarios($version->id));

    $response->assertOk();

    expect($response->json())->toBe(['data' => []]);
});

it('solo lista los comentarios de esa versión', function () {
    $primera = versionParaComentar(['version_number' => 1]);
    $segunda = versionParaComentar(['song_id' => $primera->song_id, 'version_number' => 2]);
    $propios = Comment::factory()->count(2)->create(['version_id' => $primera->id]);
    Comment::factory()->count(3)->create(['version_id' => $segunda->id]);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->getJson(urlDeComentarios($primera->id));

    $response->assertOk();

    expect(array_column($response->json('data'), 'id'))
        ->toEqualCanonicalizing($propios->pluck('id')->all());
});

it('identifica al artista autor por su nombre', function () {
    $version = versionParaComentar();

    $artista = User::factory()->create();
    Artist::factory()->create(['user_id' => $artista->id, 'name' => 'Luna Rivera']);

    $artistaBorrado = User::factory()->create();
    Artist::factory()->create(['user_id' => $artistaBorrado->id, 'name' => 'Sol Duarte'])->delete();

    $productor = User::factory()->create();

    foreach ([1000 => $artista, 2000 => $artistaBorrado, 3000 => $productor] as $marca => $autor) {
        Comment::factory()->create([
            'version_id' => $version->id,
            'author_id' => $autor->id,
            'timestamp_ms' => $marca,
        ]);
    }

    impersonarToken(claimsDeToken('productor'));

    $response = $this->getJson(urlDeComentarios($version->id));

    $response->assertOk();

    expect(array_column($response->json('data'), 'author'))->toBe([
        ['role' => 'artista', 'name' => 'Luna Rivera'],
        ['role' => 'artista', 'name' => 'Sol Duarte'],
        ['role' => 'productor', 'name' => null],
    ]);
});

it('no hace una consulta por comentario', function () {
    exigirRuta('GET', 'api/v1/versions/{version}/comments');
    $version = versionParaComentar();
    impersonarToken(claimsDeToken('productor'));

    // Cada comentario, de un autor distinto con su artista: así se cargan las
    // dos relaciones (`author` y `author.artist`).
    $comentar = function (int $cantidad) use ($version): void {
        foreach (range(1, $cantidad) as $_) {
            $autor = User::factory()->create();
            Artist::factory()->create(['user_id' => $autor->id]);
            Comment::factory()->create(['version_id' => $version->id, 'author_id' => $autor->id]);
        }
    };

    $consultasDelListado = function () use ($version): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson(urlDeComentarios($version->id))->assertOk();
        DB::disableQueryLog();

        return count(DB::getQueryLog());
    };

    $comentar(2);
    // Calentamiento: lo que se resuelve una vez por proceso no cuenta como diferencia.
    $consultasDelListado();
    $conPocos = $consultasDelListado();

    $comentar(8);
    $conMuchos = $consultasDelListado();

    expect($conMuchos)->toBe($conPocos);
});

it('responde 404 si la versión no está verificada', function (Closure $crear) {
    exigirRuta('GET', 'api/v1/versions/{version}/comments');
    /** @var Version $version */
    $version = $crear();
    Comment::factory()->create(['version_id' => $version->id]);
    impersonarToken(claimsDeToken('productor'));

    $this->getJson(urlDeComentarios($version->id))
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
})->with([
    'pendiente' => [fn (): Version => Version::factory()->create()],
    'fallida' => [fn (): Version => Version::factory()->fallida()->create()],
]);

it('responde 404 si la versión no está disponible', function (mixed $referencia) {
    exigirRuta('GET', 'api/v1/versions/{version}/comments');
    impersonarToken(claimsDeToken('productor'));
    $versionId = is_callable($referencia) ? $referencia() : $referencia;

    $this->getJson(urlDeComentarios($versionId))
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
})->with('versiones no disponibles para reproducir');

it('rechaza sin identidad o sin rol productor', function (Closure $preparar, ?string $rol, int $status, string $code) {
    /** @var Version $version */
    $version = $preparar();
    Comment::factory()->create(['version_id' => $version->id]);

    if ($rol !== null) {
        impersonarToken(claimsDeToken($rol));
    }

    $response = $this->getJson(urlDeComentarios($version->id));

    $response->assertStatus($status)->assertJsonPath('code', $code);

    expect($response->json('data'))->toBeNull();
})->with([
    'sin token' => [fn (): Version => versionParaComentar(), null, 401, 'UNAUTHENTICATED'],
    'artista sin acceso' => [fn (): Version => versionParaComentar(), 'artista', 403, 'FORBIDDEN'],
    'artista con acceso vigente' => [function (): Version {
        $production = artistaConAcceso();
        $song = Song::factory()->create(['production_id' => $production->id]);

        return versionParaComentar(['song_id' => $song->id]);
    }, 'artista', 403, 'FORBIDDEN'],
    'rol desconocido' => [fn (): Version => versionParaComentar(), 'desconocido', 403, 'FORBIDDEN'],
]);
