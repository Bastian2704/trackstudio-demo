<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Enums\ProductionFormat;
use App\Enums\SongStatus;
use App\Models\Artist;
use App\Models\Production;
use App\Models\Song;
use App\Models\Version;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-85 — Dashboard parcial del productor: GET /api/v1/dashboard
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/TS-85.md §3 y §4 (#1–#9). Solo productor.
|
| Las factories de Song y Version crean en cascada producción y artista si
| no se les pasa el padre. Aquí siempre se pasa, para que cada conteo sea
| exactamente el que el test construye.
|
*/

const RUTA_DEL_DASHBOARD = '/api/v1/dashboard';

/** Claves exactas de cada elemento de `recent_versions` (spec §3.3). */
const CAMPOS_DE_VERSION_RECIENTE = ['id', 'version_number', 'label', 'verified_at', 'song', 'production', 'artist'];

function artistaDelDashboard(ArtistStatus $estado): Artist
{
    return Artist::factory()->create(['status' => $estado]);
}

function produccionDelDashboard(Artist $artista, ProductionFormat $formato): Production
{
    return Production::factory()->create(['artist_id' => $artista->id, 'format' => $formato]);
}

function cancionDelDashboard(Production $produccion, SongStatus $estado, int $posicion = 1): Song
{
    return Song::factory()->create([
        'production_id' => $produccion->id,
        'status' => $estado,
        'position' => $posicion,
    ]);
}

/** @param  array<string, mixed>  $cambios */
function versionVerificadaDelDashboard(Song $cancion, int $numero, array $cambios = []): Version
{
    return Version::factory()->verificada()->create(array_merge([
        'song_id' => $cancion->id,
        'version_number' => $numero,
    ], $cambios));
}

it('devuelve los conteos por estado y formato', function () {
    $activa = artistaDelDashboard(ArtistStatus::Activo);
    $otraActiva = artistaDelDashboard(ArtistStatus::Activo);
    artistaDelDashboard(ArtistStatus::Inactivo);
    artistaDelDashboard(ArtistStatus::Invitado);

    produccionDelDashboard($activa, ProductionFormat::Sencillo);
    $ep = produccionDelDashboard($activa, ProductionFormat::Ep);
    $album = produccionDelDashboard($otraActiva, ProductionFormat::Album);
    produccionDelDashboard($otraActiva, ProductionFormat::Album);

    cancionDelDashboard($album, SongStatus::PorHacer, 1);
    cancionDelDashboard($album, SongStatus::EnProgreso, 2);
    cancionDelDashboard($album, SongStatus::EnProgreso, 3);
    cancionDelDashboard($ep, SongStatus::Finalizada, 1);

    impersonarToken(claimsDeToken('productor'));

    $this->getJson(RUTA_DEL_DASHBOARD)
        ->assertOk()
        ->assertJsonPath('data.artists', [
            'total' => 4,
            'by_status' => ['invitado' => 1, 'activo' => 2, 'inactivo' => 1],
        ])
        ->assertJsonPath('data.productions', [
            'total' => 4,
            'by_format' => ['sencillo' => 1, 'ep' => 1, 'album' => 2],
        ])
        ->assertJsonPath('data.songs.total', 4)
        ->assertJsonPath('data.songs.by_status', ['por_hacer' => 1, 'en_progreso' => 2, 'finalizada' => 1]);
});

it('devuelve todas las claves en cero sin datos', function () {
    impersonarToken(claimsDeToken('productor'));

    $data = $this->getJson(RUTA_DEL_DASHBOARD)->assertOk()->json('data');

    // `toBe` y no `toEqual`: un `null` o un "0" de un SUM sin convertir no pasan.
    expect($data)->toBe([
        'artists' => [
            'total' => 0,
            'by_status' => ['invitado' => 0, 'activo' => 0, 'inactivo' => 0],
        ],
        'productions' => [
            'total' => 0,
            'by_format' => ['sencillo' => 0, 'ep' => 0, 'album' => 0],
        ],
        'songs' => [
            'total' => 0,
            'by_status' => ['por_hacer' => 0, 'en_progreso' => 0, 'finalizada' => 0],
            'without_verified_version' => 0,
        ],
        'versions' => [
            'verified' => 0,
            'total_size_bytes' => 0,
            'total_duration_ms' => 0,
        ],
        'recent_versions' => [],
    ]);
});

it('no cuenta los registros eliminados', function () {
    $artista = artistaDelDashboard(ArtistStatus::Activo);
    $produccion = produccionDelDashboard($artista, ProductionFormat::Sencillo);
    $cancion = cancionDelDashboard($produccion, SongStatus::PorHacer, 1);
    $vigente = versionVerificadaDelDashboard($cancion, 1, ['size_bytes' => 1000, 'duration_ms' => 2000]);

    // Uno eliminado de cada tabla. La versión eliminada es la más reciente:
    // si se colara, encabezaría `recent_versions`.
    artistaDelDashboard(ArtistStatus::Activo)->delete();
    produccionDelDashboard($artista, ProductionFormat::Ep)->delete();
    cancionDelDashboard($produccion, SongStatus::EnProgreso, 2)->delete();
    versionVerificadaDelDashboard($cancion, 2, [
        'size_bytes' => 5000,
        'duration_ms' => 9000,
        'verified_at' => now()->addHour(),
    ])->delete();

    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->getJson(RUTA_DEL_DASHBOARD)->assertOk();

    $respuesta
        ->assertJsonPath('data.artists.total', 1)
        ->assertJsonPath('data.artists.by_status.activo', 1)
        ->assertJsonPath('data.productions.total', 1)
        ->assertJsonPath('data.productions.by_format.ep', 0)
        ->assertJsonPath('data.songs.total', 1)
        ->assertJsonPath('data.songs.by_status.en_progreso', 0)
        ->assertJsonPath('data.versions', [
            'verified' => 1,
            'total_size_bytes' => 1000,
            'total_duration_ms' => 2000,
        ]);

    expect(array_column($respuesta->json('data.recent_versions'), 'id'))->toBe([$vigente->id]);
});

it('solo cuenta las versiones verificadas y suma bytes y duración como enteros', function () {
    $produccion = produccionDelDashboard(artistaDelDashboard(ArtistStatus::Activo), ProductionFormat::Album);
    $cancion = cancionDelDashboard($produccion, SongStatus::EnProgreso);

    versionVerificadaDelDashboard($cancion, 1, ['size_bytes' => 100, 'duration_ms' => 1000]);
    versionVerificadaDelDashboard($cancion, 2, ['size_bytes' => 200, 'duration_ms' => 3000]);
    Version::factory()->create(['song_id' => $cancion->id, 'version_number' => 3, 'size_bytes' => 400]);
    Version::factory()->fallida()->create(['song_id' => $cancion->id, 'version_number' => 4, 'size_bytes' => 800]);

    impersonarToken(claimsDeToken('productor'));

    $versiones = $this->getJson(RUTA_DEL_DASHBOARD)->assertOk()->json('data.versions');

    expect($versiones)->toBe([
        'verified' => 2,
        'total_size_bytes' => 300,
        'total_duration_ms' => 4000,
    ]);
});

it('cuenta las canciones sin versión verificada', function () {
    $produccion = produccionDelDashboard(artistaDelDashboard(ArtistStatus::Activo), ProductionFormat::Album);

    // Cuentan: sin versiones; solo pendiente y fallida; su única verificada eliminada.
    cancionDelDashboard($produccion, SongStatus::PorHacer, 1);

    $soloSinVerificar = cancionDelDashboard($produccion, SongStatus::EnProgreso, 2);
    Version::factory()->create(['song_id' => $soloSinVerificar->id, 'version_number' => 1]);
    Version::factory()->fallida()->create(['song_id' => $soloSinVerificar->id, 'version_number' => 2]);

    $verificadaEliminada = cancionDelDashboard($produccion, SongStatus::EnProgreso, 3);
    versionVerificadaDelDashboard($verificadaEliminada, 1)->delete();

    // No cuenta: tiene una verificada vigente, aunque también una fallida.
    $conVerificada = cancionDelDashboard($produccion, SongStatus::Finalizada, 4);
    versionVerificadaDelDashboard($conVerificada, 1);
    Version::factory()->fallida()->create(['song_id' => $conVerificada->id, 'version_number' => 2]);

    impersonarToken(claimsDeToken('productor'));

    $this->getJson(RUTA_DEL_DASHBOARD)
        ->assertOk()
        ->assertJsonPath('data.songs.total', 4)
        ->assertJsonPath('data.songs.without_verified_version', 3);
});

it('lista las 5 versiones verificadas más recientes con su canción y producción', function () {
    $artista = artistaDelDashboard(ArtistStatus::Activo);
    $produccion = produccionDelDashboard($artista, ProductionFormat::Album);
    $primera = cancionDelDashboard($produccion, SongStatus::EnProgreso, 1);
    $segunda = cancionDelDashboard($produccion, SongStatus::EnProgreso, 2);

    // Creadas en orden inverso a su `verified_at`: el orden físico no da el esperado.
    $versiones = [];
    foreach ([1, 2, 3, 4, 5, 6] as $horasAtras) {
        $cancion = $horasAtras % 2 === 0 ? $segunda : $primera;
        $versiones[$horasAtras] = versionVerificadaDelDashboard($cancion, $horasAtras, [
            'verified_at' => now()->subHours($horasAtras),
            'label' => $horasAtras === 1 ? 'Mezcla final' : null,
        ]);
    }
    // Una pendiente creada después de todas: no es actividad verificada.
    Version::factory()->create(['song_id' => $primera->id, 'version_number' => 7]);

    impersonarToken(claimsDeToken('productor'));

    $recientes = $this->getJson(RUTA_DEL_DASHBOARD)->assertOk()->json('data.recent_versions');

    expect(array_column($recientes, 'id'))->toBe([
        $versiones[1]->id,
        $versiones[2]->id,
        $versiones[3]->id,
        $versiones[4]->id,
        $versiones[5]->id,
    ]);

    expect(array_keys($recientes[0]))->toEqualCanonicalizing(CAMPOS_DE_VERSION_RECIENTE)
        ->and($recientes[0]['version_number'])->toBe(1)
        ->and($recientes[0]['label'])->toBe('Mezcla final')
        ->and($recientes[1]['label'])->toBeNull()
        ->and($recientes[0]['verified_at'])->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($recientes[0]['song'])->toBe(['id' => $primera->id, 'name' => $primera->name])
        ->and($recientes[1]['song'])->toBe(['id' => $segunda->id, 'name' => $segunda->name])
        ->and($recientes[0]['production'])->toBe(['id' => $produccion->id, 'name' => $produccion->name])
        ->and($recientes[0]['artist'])->toBe(['id' => $artista->id, 'name' => $artista->name]);
});

it('rechaza sin token con 401 UNAUTHENTICATED', function () {
    $this->getJson(RUTA_DEL_DASHBOARD)
        ->assertUnauthorized()
        ->assertJsonPath('code', 'UNAUTHENTICATED');
});

it('rechaza sin rol productor con 403 FORBIDDEN', function (string $rol) {
    impersonarToken(claimsDeToken($rol));

    $this->getJson(RUTA_DEL_DASHBOARD)
        ->assertForbidden()
        ->assertJsonPath('code', 'FORBIDDEN');
})->with([
    'rol artista' => ['artista'],
    'rol desconocido' => ['desconocido'],
]);

it('mantiene constante el número de consultas', function () {
    exigirRuta('GET', 'api/v1/dashboard');
    impersonarToken(claimsDeToken('productor'));

    $consultasDelDashboard = function (): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson(RUTA_DEL_DASHBOARD)->assertOk();
        DB::disableQueryLog();

        return count(DB::getQueryLog());
    };

    $artista = artistaDelDashboard(ArtistStatus::Activo);
    versionVerificadaDelDashboard(
        cancionDelDashboard(produccionDelDashboard($artista, ProductionFormat::Sencillo), SongStatus::PorHacer),
        1,
    );
    // Calentamiento: lo que se resuelva una sola vez por proceso no cuenta.
    $consultasDelDashboard();
    $conUna = $consultasDelDashboard();

    // Cuatro versiones más, cada una en su propia canción y producción.
    foreach (range(1, 4) as $_) {
        versionVerificadaDelDashboard(
            cancionDelDashboard(produccionDelDashboard($artista, ProductionFormat::Ep), SongStatus::EnProgreso),
            1,
        );
    }
    $conCinco = $consultasDelDashboard();

    expect($conCinco)->toBe($conUna);
});
