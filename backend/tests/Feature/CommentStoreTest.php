<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Production;
use App\Models\Song;
use App\Models\User;
use App\Models\Version;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-28 — Comentar sobre una marca de tiempo: POST /api/v1/versions/{version}/comments
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-17.md §3 y §4 (#1–#10, #15). Las cuentas van
| por `DB::table('comments')`: una fila creada por cualquier camino cuenta.
|
*/

it('crea un comentario sobre una versión verificada', function () {
    $version = versionParaComentar();
    impersonarToken(claimsDeToken('productor'));

    $response = $this->postJson(urlDeComentarios($version->id), datosDeComentario());

    $response->assertCreated()
        ->assertJsonPath('data.version_id', $version->id)
        ->assertJsonPath('data.body', 'Sube la voz en el coro')
        ->assertJsonPath('data.timestamp_ms', 83500)
        ->assertJsonPath('data.created_at', '2026-11-17T15:20:00+00:00');

    expect(array_keys($response->json()))->toBe(['data'])
        ->and(array_keys($response->json('data')))->toEqualCanonicalizing(CAMPOS_DE_COMENTARIO)
        ->and($response->json('data.created_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET);

    $fila = DB::table('comments')->where('id', $response->json('data.id'))->first();

    expect($fila)->not->toBeNull()
        ->and($fila->version_id)->toBe($version->id)
        ->and($fila->body)->toBe('Sube la voz en el coro')
        ->and($fila->timestamp_ms)->toBe(83500)
        ->and(CarbonImmutable::parse($fila->created_at)->equalTo(CarbonImmutable::parse(INSTANTE_DEL_COMENTARIO)))->toBeTrue();
});

it('registra como autor al usuario del token e ignora el del cliente', function (bool $existia) {
    $version = versionParaComentar();
    $otraVersion = Version::factory()->verificada()->create(['duration_ms' => DURACION_PARA_COMENTAR]);
    $impostor = User::factory()->create();
    $previo = $existia ? User::factory()->create(['auth0_sub' => claimsDeToken()['sub']]) : null;
    impersonarToken(claimsDeToken('productor'));

    $response = $this->postJson(urlDeComentarios($version->id), datosDeComentario([
        'author_id' => $impostor->id,
        'version_id' => $otraVersion->id,
        'created_at' => '2020-01-01T00:00:00+00:00',
    ]));

    $response->assertCreated();
    $autor = usuarioDelToken();

    expect($autor)->not->toBeNull()
        ->and($response->json('data.author_id'))->toBe($autor->id)
        ->and($response->json('data.version_id'))->toBe($version->id)
        ->and($response->json('data.created_at'))->toBe('2026-11-17T15:20:00+00:00')
        ->and(User::query()->where('auth0_sub', claimsDeToken()['sub'])->count())->toBe(1)
        ->and(DB::table('comments')->where('author_id', $impostor->id)->exists())->toBeFalse()
        ->and(DB::table('comments')->where('version_id', $otraVersion->id)->exists())->toBeFalse();

    if ($previo !== null) {
        expect($autor->id)->toBe($previo->id);
    }
})->with([
    'usuario nuevo' => [false],
    'usuario que ya existía' => [true],
]);

it('guarda el texto recortado', function () {
    $version = versionParaComentar();
    impersonarToken(claimsDeToken('productor'));

    $response = $this->postJson(urlDeComentarios($version->id), datosDeComentario(['body' => '  Sube la voz  ']));

    $response->assertCreated()->assertJsonPath('data.body', 'Sube la voz');

    expect(DB::table('comments')->value('body'))->toBe('Sube la voz');
});

it('acepta los extremos de la marca', function (int $marca) {
    $version = versionParaComentar();
    impersonarToken(claimsDeToken('productor'));

    $this->postJson(urlDeComentarios($version->id), datosDeComentario(['timestamp_ms' => $marca]))
        ->assertCreated()
        ->assertJsonPath('data.timestamp_ms', $marca);

    expect(DB::table('comments')->value('timestamp_ms'))->toBe($marca);
})->with([
    'inicio' => [0],
    'igual a la duración' => [DURACION_PARA_COMENTAR],
]);

it('rechaza una marca mayor que la duración', function () {
    $version = versionParaComentar();
    impersonarToken(claimsDeToken('productor'));

    $response = $this->postJson(
        urlDeComentarios($version->id),
        datosDeComentario(['timestamp_ms' => DURACION_PARA_COMENTAR + 1]),
    );

    $response->assertUnprocessable()->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($response->json('errors')))->toBe(['timestamp_ms'])
        ->and(DB::table('comments')->count())->toBe(0);
});

it('rechaza datos inválidos', function (array $cambios, ?string $quitar, string $campo) {
    $version = versionParaComentar();
    impersonarToken(claimsDeToken('productor'));
    $payload = datosDeComentario($cambios);

    if ($quitar !== null) {
        unset($payload[$quitar]);
    }

    $response = $this->postJson(urlDeComentarios($version->id), $payload);

    $response->assertUnprocessable()->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($response->json('errors')))->toBe([$campo])
        ->and(DB::table('comments')->count())->toBe(0);
})->with('datos de comentario invalidos');

it('acepta un texto de 2000 caracteres', function () {
    $version = versionParaComentar();
    impersonarToken(claimsDeToken('productor'));
    $texto = str_repeat('a', 2000);

    $this->postJson(urlDeComentarios($version->id), datosDeComentario(['body' => $texto]))
        ->assertCreated();

    expect(DB::table('comments')->value('body'))->toBe($texto);
});

it('responde 404 si la versión no está verificada', function (Closure $crear) {
    exigirRuta('POST', 'api/v1/versions/{version}/comments');
    /** @var Version $version */
    $version = $crear();
    impersonarToken(claimsDeToken('productor'));

    $this->postJson(urlDeComentarios($version->id), datosDeComentario())
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expect(DB::table('comments')->count())->toBe(0);
})->with([
    'pendiente' => [fn (): Version => Version::factory()->create()],
    'fallida' => [fn (): Version => Version::factory()->fallida()->create()],
]);

it('responde 404 si la versión no está disponible', function (mixed $referencia) {
    exigirRuta('POST', 'api/v1/versions/{version}/comments');
    impersonarToken(claimsDeToken('productor'));
    $versionId = is_callable($referencia) ? $referencia() : $referencia;

    $this->postJson(urlDeComentarios($versionId), datosDeComentario())
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expect(DB::table('comments')->count())->toBe(0);
})->with('versiones no disponibles para reproducir');

it('rechaza sin identidad o sin rol productor', function (Closure $preparar, ?string $rol, int $status, string $code) {
    /** @var Version $version */
    $version = $preparar();

    if ($rol !== null) {
        impersonarToken(claimsDeToken($rol));
    }

    $this->postJson(urlDeComentarios($version->id), datosDeComentario())
        ->assertStatus($status)
        ->assertJsonPath('code', $code);

    expect(DB::table('comments')->count())->toBe(0);
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

it('permite comentar la versión de un artista inactivo', function () {
    $version = versionParaComentar();
    /** @var Production $production */
    $production = $version->song->production;
    $production->artist()->update(['status' => ArtistStatus::Inactivo]);
    impersonarToken(claimsDeToken('productor'));

    $this->postJson(urlDeComentarios($version->id), datosDeComentario())->assertCreated();

    expect(DB::table('comments')->where('version_id', $version->id)->count())->toBe(1);
});

it('permite comentar una versión verificada anterior a la última', function () {
    $primera = versionParaComentar(['version_number' => 1]);
    versionParaComentar(['song_id' => $primera->song_id, 'version_number' => 2]);
    impersonarToken(claimsDeToken('productor'));

    $this->postJson(urlDeComentarios($primera->id), datosDeComentario())
        ->assertCreated()
        ->assertJsonPath('data.version_id', $primera->id);
});
