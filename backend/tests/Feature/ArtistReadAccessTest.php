<?php

declare(strict_types=1);

use App\Enums\UploadStatus;
use App\Models\Production;
use App\Models\Song;
use App\Models\Version;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-32 — Lectura del artista con acceso vigente
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-21.md §3.3, §3.5 y §4 (#8–#14). El artista con
| acceso efectivo lee producción, canciones e historial y reproduce; todo lo
| demás, incluido cualquier recurso ajeno o escritura, sigue en 403.
|
*/

/**
 * Canción y versión verificada dentro de la producción, con las FK a mano para
 * no crear padres en cascada (trampa de v40).
 *
 * @return array{song: Song, version: Version}
 */
function contenidoDe(Production $production): array
{
    $song = Song::factory()->create(['production_id' => $production->id]);
    $version = Version::factory()->verificada()->create(['song_id' => $song->id]);

    return ['song' => $song, 'version' => $version];
}

/**
 * Las cinco lecturas de §3.3, como URI para cada recurso de la producción.
 *
 * @return array<string, string>
 */
function lecturasDe(Production $production): array
{
    ['song' => $song, 'version' => $version] = contenidoDe($production);

    return [
        'producción' => "/api/v1/productions/{$production->id}",
        'canciones' => "/api/v1/productions/{$production->id}/songs",
        'canción' => "/api/v1/songs/{$song->id}",
        'historial' => "/api/v1/songs/{$song->id}/versions",
        'reproducción' => "/api/v1/versions/{$version->id}/playback-url",
    ];
}

/** Foto de las tablas que una escritura podría tocar. @return array<string, mixed> */
function fotoDeLaBase(): array
{
    return collect(['artists', 'productions', 'songs', 'versions', 'production_access'])
        ->mapWithKeys(fn (string $tabla): array => [$tabla => DB::table($tabla)->orderBy('id')->get()->toArray()])
        ->all();
}

it('el artista con acceso ve la producción como el productor', function () {
    $production = artistaConAcceso();

    impersonarToken(claimsDeToken('productor'));
    $delProductor = $this->getJson("/api/v1/productions/{$production->id}")->assertOk()->json();

    impersonarToken(claimsDeToken('artista'));
    $delArtista = $this->getJson("/api/v1/productions/{$production->id}")->assertOk()->json();

    expect($delArtista)->toBe($delProductor)
        ->and(array_keys($delArtista['data']))->toEqualCanonicalizing(CAMPOS_DE_PRODUCCION);
});

it('el artista con acceso lista canciones, ve una canción y su historial verificado', function () {
    $production = artistaConAcceso();
    ['song' => $song, 'version' => $verificada] = contenidoDe($production);
    Version::factory()->create(['song_id' => $song->id, 'version_number' => 2]);
    Version::factory()->fallida()->create(['song_id' => $song->id, 'version_number' => 3]);
    impersonarToken(claimsDeToken('artista'));

    $canciones = $this->getJson("/api/v1/productions/{$production->id}/songs")->assertOk();
    $this->getJson("/api/v1/songs/{$song->id}")->assertOk()->assertJsonPath('data.id', $song->id);
    $historial = $this->getJson("/api/v1/songs/{$song->id}/versions")->assertOk();

    expect(array_column($canciones->json('data'), 'id'))->toBe([$song->id])
        ->and(array_column($historial->json('data'), 'id'))->toBe([$verificada->id]);
});

it('el artista con acceso reproduce una versión verificada', function () {
    $production = artistaConAcceso();
    ['version' => $version] = contenidoDe($production);
    $firmadas = falsearLecturaDeAudio();
    impersonarToken(claimsDeToken('artista'));

    $respuesta = $this->getJson("/api/v1/versions/{$version->id}/playback-url")->assertOk();

    expect($respuesta->json('data.url'))->toContain($version->s3_key)
        ->and((string) $respuesta->headers->get('Cache-Control'))->toContain('no-store')
        ->and($firmadas->getArrayCopy())->toBe([$version->s3_key]);
});

it('rechaza cada lectura sin acceso efectivo', function (Closure $montar, string $lectura) {
    /** @var Production $production */
    $production = $montar();
    $uri = lecturasDe($production)[$lectura];
    falsearLecturaDeAudio();
    impersonarToken(claimsDeToken('artista'));

    $this->getJson($uri)
        ->assertForbidden()
        ->assertJsonPath('code', 'FORBIDDEN')
        ->assertJsonPath('status', 403);
})->with('sin acceso efectivo')->with([
    'producción', 'canciones', 'canción', 'historial', 'reproducción',
]);

it('una cuenta sin rol con la cadena completa no lee', function (string $lectura) {
    $uri = lecturasDe(artistaConAcceso())[$lectura];
    falsearLecturaDeAudio();
    impersonarToken(claimsDeToken());

    $this->getJson($uri)->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');
})->with(['producción', 'canciones', 'canción', 'historial', 'reproducción']);

it('el artista con acceso no escribe', function (string $metodo, Closure $uri) {
    $production = artistaConAcceso();
    ['song' => $song, 'version' => $version] = contenidoDe($production);
    $acceso = (string) DB::table('production_access')->where('production_id', $production->id)->value('id');
    $ruta = $uri($production, $song, $version, $acceso);
    falsearLecturaDeAudio();
    impersonarToken(claimsDeToken('artista'));
    $antes = fotoDeLaBase();

    $this->json($metodo, $ruta, ['name' => 'Intento', 'format' => 'ep', 'artist_id' => $production->artist_id])
        ->assertForbidden()
        ->assertJsonPath('code', 'FORBIDDEN');

    expect(fotoDeLaBase())->toEqual($antes);
})->with([
    'crear producción' => ['POST', fn (): string => '/api/v1/productions'],
    'editar producción' => ['PUT', fn (Production $p): string => "/api/v1/productions/{$p->id}"],
    'borrar producción' => ['DELETE', fn (Production $p): string => "/api/v1/productions/{$p->id}"],
    'crear canción' => ['POST', fn (Production $p): string => "/api/v1/productions/{$p->id}/songs"],
    'editar canción' => ['PUT', fn (Production $p, Song $s): string => "/api/v1/songs/{$s->id}"],
    'borrar canción' => ['DELETE', fn (Production $p, Song $s): string => "/api/v1/songs/{$s->id}"],
    'subir versión' => ['POST', fn (Production $p, Song $s): string => "/api/v1/songs/{$s->id}/versions"],
    'confirmar versión' => ['POST', fn (Production $p, Song $s, Version $v): string => "/api/v1/versions/{$v->id}/confirm"],
    'otorgar acceso' => ['POST', fn (Production $p): string => "/api/v1/productions/{$p->id}/access"],
    'historial de accesos' => ['GET', fn (Production $p): string => "/api/v1/productions/{$p->id}/access"],
    'revocar acceso' => ['DELETE', fn (Production $p, Song $s, Version $v, string $a): string => "/api/v1/productions/{$p->id}/access/{$a}"],
    'crear artista' => ['POST', fn (): string => '/api/v1/artists'],
    'listar artistas' => ['GET', fn (): string => '/api/v1/artists'],
    'ver artista' => ['GET', fn (Production $p): string => "/api/v1/artists/{$p->artist_id}"],
    'editar artista' => ['PUT', fn (Production $p): string => "/api/v1/artists/{$p->artist_id}"],
    'estado del artista' => ['PUT', fn (Production $p): string => "/api/v1/artists/{$p->artist_id}/status"],
    'dashboard' => ['GET', fn (): string => '/api/v1/dashboard'],
]);

it('la reproducción de una versión no verificada sigue en 404', function () {
    $production = artistaConAcceso();
    ['song' => $song] = contenidoDe($production);
    $pendiente = Version::factory()->create(['song_id' => $song->id, 'version_number' => 2]);
    $firmadas = falsearLecturaDeAudio();
    impersonarToken(claimsDeToken('artista'));

    expect($pendiente->upload_status)->toBe(UploadStatus::Pendiente);

    $this->getJson("/api/v1/versions/{$pendiente->id}/playback-url")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expect($firmadas->getArrayCopy())->toBe([]);
});
