<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Mail\ArtistInvitationMail;
use App\Mail\ProductionAccessGrantedMail;
use App\Models\Artist;
use App\Models\Production;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-31 — Otorgar acceso: POST /api/v1/productions/{production}/access
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-20.md §3.3 y §4 (#1–#11, #22). El correo es un
| doble de MailerContract (falsearCorreo); el envío real se prueba en
| SmtpMailerTest (C4).
|
*/

const INSTANTE_DE_OTORGAMIENTO = '2026-11-20 15:00:00';

beforeEach(function () {
    config(['app.frontend_url' => FRONTEND_DE_PRUEBA]);
    $this->travelTo(CarbonImmutable::parse(INSTANTE_DE_OTORGAMIENTO));
    Log::spy();
});

/** Artista invitado sin cuenta ni invitación previa, con su producción. */
function produccionDeArtistaSinCuenta(): Production
{
    $artista = Artist::factory()->create([
        'invitation_token' => null,
        'invited_at' => null,
        'invitation_expires_at' => null,
    ]);

    return Production::factory()->create(['artist_id' => $artista->id]);
}

/** Artista activo con cuenta enlazada y sin invitación pendiente, con su producción. */
function produccionDeArtistaConCuenta(): Production
{
    $artista = Artist::factory()->create([
        'status' => ArtistStatus::Activo,
        'user_id' => User::factory()->create()->id,
        'invitation_token' => null,
        'invited_at' => null,
        'invitation_expires_at' => null,
    ]);

    return Production::factory()->create(['artist_id' => $artista->id]);
}

function otorgar(Production $production, ?string $artistId = null): TestResponse
{
    return test()->postJson(
        "/api/v1/productions/{$production->id}/access",
        ['artist_id' => $artistId ?? $production->artist_id],
    );
}

function contarAccesos(): int
{
    return DB::table('production_access')->count();
}

it('otorga acceso e invita al artista sin cuenta', function () {
    $produccion = produccionDeArtistaSinCuenta();
    $envios = falsearCorreo();
    impersonarToken(claimsDeToken('productor'));

    $respuesta = otorgar($produccion);

    $respuesta->assertCreated()
        ->assertJsonPath('data.production_id', $produccion->id)
        ->assertJsonPath('data.artist_id', $produccion->artist_id)
        ->assertJsonPath('data.revoked_at', null)
        ->assertJsonPath('data.is_active', true);

    expect(array_keys($respuesta->json('data')))->toEqualCanonicalizing(CAMPOS_DE_ACCESO)
        ->and($respuesta->json('data.granted_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and(CarbonImmutable::parse($respuesta->json('data.granted_at'))->equalTo(now()))->toBeTrue();

    $fila = DB::table('production_access')->where('id', $respuesta->json('data.id'))->first();

    expect($fila)->not->toBeNull()
        ->and($fila->granted_by)->toBe(usuarioDelToken()?->id)
        ->and($fila->revoked_at)->toBeNull();

    $artista = $produccion->artist()->firstOrFail();

    expect($artista->invitation_token)->toMatch('/^[0-9a-f]{64}$/')
        ->and($artista->invited_at?->equalTo(now()))->toBeTrue()
        ->and($artista->invitation_expires_at?->equalTo(now()->addDays(7)))->toBeTrue()
        ->and($envios)->toHaveCount(1)
        ->and($envios[0]['to'])->toBe($artista->email)
        ->and($envios[0]['mail'])->toBeInstanceOf(ArtistInvitationMail::class);
});

it('el enlace lleva el token en claro y la base solo su hash', function () {
    $produccion = produccionDeArtistaSinCuenta();
    $envios = falsearCorreo();
    impersonarToken(claimsDeToken('productor'));

    otorgar($produccion)->assertCreated();

    $guardado = $produccion->artist()->firstOrFail()->invitation_token;
    $token = tokenDelCorreo($envios[0]['mail']);

    expect(hash('sha256', $token))->toBe($guardado)
        ->and($envios[0]['mail']->render())->not->toContain((string) $guardado);
});

it('avisa sin token al artista que ya tiene cuenta', function () {
    $produccion = produccionDeArtistaConCuenta();
    $envios = falsearCorreo();
    impersonarToken(claimsDeToken('productor'));

    otorgar($produccion)->assertCreated();

    $artista = $produccion->artist()->firstOrFail();

    expect($envios)->toHaveCount(1)
        ->and($envios[0]['to'])->toBe($artista->email)
        ->and($envios[0]['mail'])->toBeInstanceOf(ProductionAccessGrantedMail::class)
        ->and($artista->invitation_token)->toBeNull()
        ->and($artista->invited_at)->toBeNull()
        ->and($artista->invitation_expires_at)->toBeNull();
});

it('un nuevo otorgamiento sustituye el token anterior', function () {
    $produccion = produccionDeArtistaSinCuenta();
    $otra = Production::factory()->create(['artist_id' => $produccion->artist_id]);
    falsearCorreo();
    impersonarToken(claimsDeToken('productor'));

    otorgar($produccion)->assertCreated();
    $anterior = $produccion->artist()->firstOrFail()->invitation_token;

    otorgar($otra)->assertCreated();
    $nuevo = $produccion->artist()->firstOrFail()->invitation_token;

    expect($nuevo)->toMatch('/^[0-9a-f]{64}$/')
        ->and($nuevo)->not->toBe($anterior);
});

it('rechaza con 422 sin crear fila ni enviar correo', function (Closure $preparar, string $mensaje) {
    /** @var array{0: Production, 1: string} $caso */
    $caso = $preparar();
    [$produccion, $artistId] = $caso;
    $previas = contarAccesos();
    $envios = falsearCorreo();
    impersonarToken(claimsDeToken('productor'));

    otorgar($produccion, $artistId)
        ->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonPath('errors.artist_id.0', $mensaje);

    expect(contarAccesos())->toBe($previas)
        ->and($envios)->toHaveCount(0);
})->with([
    'artista que no es el dueño' => [
        function (): array {
            $produccion = produccionDeArtistaSinCuenta();

            return [$produccion, Artist::factory()->create()->id];
        },
        'Solo se puede dar acceso al artista de la producción.',
    ],
    'artista inactivo' => [
        function (): array {
            $produccion = produccionDeArtistaSinCuenta();
            $produccion->artist()->update(['status' => ArtistStatus::Inactivo]);

            return [$produccion, $produccion->artist_id];
        },
        'El artista está inactivo.',
    ],
    'segundo acceso vigente' => [
        function (): array {
            $produccion = produccionDeArtistaSinCuenta();
            crearAcceso($produccion);

            return [$produccion, $produccion->artist_id];
        },
        'El artista ya tiene acceso a esta producción.',
    ],
]);

it('rechaza un segundo acceso vigente dejando una sola fila vigente', function () {
    $produccion = produccionDeArtistaSinCuenta();
    crearAcceso($produccion);
    falsearCorreo();
    impersonarToken(claimsDeToken('productor'));

    otorgar($produccion)->assertUnprocessable();

    expect(DB::table('production_access')
        ->where('production_id', $produccion->id)
        ->whereNull('revoked_at')
        ->count())->toBe(1);
});

it('permite volver a otorgar tras revocar', function () {
    $produccion = produccionDeArtistaSinCuenta();
    $revocadoEn = now()->subDay();
    $revocada = crearAcceso($produccion, [
        'granted_at' => now()->subDays(2),
        'revoked_at' => $revocadoEn,
    ]);
    falsearCorreo();
    impersonarToken(claimsDeToken('productor'));

    $respuesta = otorgar($produccion)->assertCreated();

    $vieja = DB::table('production_access')->where('id', $revocada)->first();

    expect($respuesta->json('data.id'))->not->toBe($revocada)
        ->and(DB::table('production_access')->where('production_id', $produccion->id)->count())->toBe(2)
        ->and($vieja?->revoked_at)->not->toBeNull()
        ->and(CarbonImmutable::parse($vieja?->revoked_at)->equalTo($revocadoEn))->toBeTrue();
});

it('si el correo falla no queda nada', function () {
    $produccion = produccionDeArtistaSinCuenta();
    $envios = falsearCorreo(new RuntimeException('SMTP caído'));
    impersonarToken(claimsDeToken('productor'));

    otorgar($produccion)
        ->assertStatus(502)
        ->assertJsonPath('code', 'MAIL_DELIVERY_FAILED')
        ->assertJsonPath('type', 'https://trackstudio.site/errors/mail-delivery-failed');

    $artista = $produccion->artist()->firstOrFail();

    expect($envios)->toHaveCount(1)
        ->and(contarAccesos())->toBe(0)
        ->and($artista->invitation_token)->toBeNull()
        ->and($artista->invited_at)->toBeNull()
        ->and($artista->invitation_expires_at)->toBeNull();

    Log::shouldHaveReceived('error')
        ->withArgs(fn (string $mensaje, array $contexto = []): bool => $mensaje === 'production_access.mail_failed'
            && ($contexto['artist_id'] ?? null) === $artista->id
            && ($contexto['exception'] ?? null) === RuntimeException::class
            && ! str_contains((string) json_encode($contexto), $artista->email))
        ->once();
});

it('valida artist_id', function (Closure $valor) {
    $produccion = produccionDeArtistaSinCuenta();
    $envios = falsearCorreo();
    impersonarToken(claimsDeToken('productor'));

    $cuerpo = $valor($produccion);

    $respuesta = $this->postJson("/api/v1/productions/{$produccion->id}/access", $cuerpo);

    $respuesta->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($respuesta->json('errors')))->toBe(['artist_id'])
        ->and(contarAccesos())->toBe(0)
        ->and($envios)->toHaveCount(0);
})->with([
    'ausente' => [fn (Production $p): array => []],
    'no uuid' => [fn (Production $p): array => ['artist_id' => 'no-es-un-uuid']],
    'inexistente' => [fn (Production $p): array => ['artist_id' => (string) Str::uuid()]],
    'artista borrado' => [function (Production $p): array {
        $borrado = Artist::factory()->create();
        $borrado->delete();

        return ['artist_id' => $borrado->id];
    }],
]);

it('responde 404 si la producción no existe o está borrada', function (Closure $id) {
    exigirRuta('POST', 'api/v1/productions/{production}/access');
    $produccion = produccionDeArtistaSinCuenta();
    falsearCorreo();
    impersonarToken(claimsDeToken('productor'));

    $this->postJson("/api/v1/productions/{$id($produccion)}/access", ['artist_id' => $produccion->artist_id])
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expect(contarAccesos())->toBe(0);
})->with([
    'inexistente' => [fn (Production $p): string => (string) Str::uuid()],
    'borrada' => [function (Production $p): string {
        $p->delete();

        return $p->id;
    }],
]);

it('protege las rutas del productor', function (string $metodo, string $uri, ?string $rol, int $http, string $code) {
    exigirRuta($metodo, $uri);
    $produccion = produccionDeArtistaSinCuenta();
    $acceso = crearAcceso($produccion);
    $envios = falsearCorreo();

    if ($rol !== null) {
        impersonarToken(claimsDeToken($rol === 'sin rol' ? null : $rol));
    }

    $url = '/'.str_replace(
        ['{production}', '{access}'],
        [$produccion->id, $acceso],
        $uri,
    );

    $this->json($metodo, $url, ['artist_id' => $produccion->artist_id])
        ->assertStatus($http)
        ->assertJsonPath('code', $code);

    expect(contarAccesos())->toBe(1)
        ->and(DB::table('production_access')->where('id', $acceso)->value('revoked_at'))->toBeNull()
        ->and($envios)->toHaveCount(0);
})->with([
    'otorgar' => ['POST', 'api/v1/productions/{production}/access'],
    'listar' => ['GET', 'api/v1/productions/{production}/access'],
    'revocar' => ['DELETE', 'api/v1/productions/{production}/access/{access}'],
])->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'artista' => ['artista', 403, 'FORBIDDEN'],
    'sin rol' => ['sin rol', 403, 'FORBIDDEN'],
]);
