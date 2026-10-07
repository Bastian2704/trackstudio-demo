<?php

declare(strict_types=1);

use App\Enums\ArtistStatus;
use App\Models\Artist;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-16 — Alta de artistas: POST /api/v1/artists
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-05.md §3 y §4 (#1–#13). La unicidad se define
| en docs/erd/modelo-sprint-2.md §2.1; aquí se prueba su efecto observable.
|
*/

function subDelProductor(): string
{
    return claimsDeToken('productor')['sub'];
}

it('registra un artista y responde 201 con su representación', function () {
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->postJson('/api/v1/artists', datosDeArtista());

    $respuesta->assertCreated()
        ->assertJsonPath('data.name', 'Luna Rivera')
        ->assertJsonPath('data.email', 'luna.rivera@ejemplo.test')
        ->assertJsonPath('data.status', 'invitado');

    expect(array_keys($respuesta->json('data')))->toEqualCanonicalizing(CAMPOS_DE_ARTISTA)
        ->and($respuesta->json('data.created_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($respuesta->json('data.updated_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET);

    $this->assertDatabaseHas('artists', [
        'id' => $respuesta->json('data.id'),
        'name' => 'Luna Rivera',
        'email' => 'luna.rivera@ejemplo.test',
        'status' => ArtistStatus::Invitado->value,
    ]);
});

it('genera el identificador UUID en el servidor', function () {
    impersonarToken(claimsDeToken('productor'));
    $idDelCliente = (string) Str::uuid();

    $respuesta = $this->postJson('/api/v1/artists', datosDeArtista(['id' => $idDelCliente]));

    $respuesta->assertCreated();
    $id = $respuesta->json('data.id');

    expect(Str::isUuid($id))->toBeTrue()
        ->and($id)->not->toBe($idDelCliente)
        ->and(Artist::query()->whereKey($id)->exists())->toBeTrue()
        ->and(Artist::query()->whereKey($idDelCliente)->exists())->toBeFalse();
});

it('ignora los campos que el productor no puede fijar', function () {
    impersonarToken(claimsDeToken('productor'));
    $otroUsuario = User::factory()->create();

    $respuesta = $this->postJson('/api/v1/artists', datosDeArtista([
        'status' => ArtistStatus::Activo->value,
        'user_id' => $otroUsuario->id,
        'created_by' => $otroUsuario->id,
        'invitation_token' => 'token-elegido-por-el-cliente',
    ]));

    $respuesta->assertCreated();
    $artista = Artist::query()->findOrFail($respuesta->json('data.id'));
    $productor = User::query()->where('auth0_sub', subDelProductor())->firstOrFail();

    expect($artista->status)->toBe(ArtistStatus::Invitado)
        ->and($artista->user_id)->toBeNull()
        ->and($artista->created_by)->toBe($productor->id)
        ->and($artista->invitation_token)->toBeNull();
});

it('no emite invitación al registrar', function () {
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->postJson('/api/v1/artists', datosDeArtista());

    $respuesta->assertCreated();
    $artista = Artist::query()->findOrFail($respuesta->json('data.id'));

    expect($artista->invitation_token)->toBeNull()
        ->and($artista->invited_at)->toBeNull()
        ->and($artista->invitation_expires_at)->toBeNull();
});

it('enlaza created_by con la fila local del sub del token sin inventar su email', function () {
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->postJson('/api/v1/artists', datosDeArtista());

    $respuesta->assertCreated();
    $productor = User::query()->where('auth0_sub', subDelProductor())->first();

    expect($productor)->not->toBeNull()
        ->and($productor->email)->toBeNull()
        ->and(Artist::query()->findOrFail($respuesta->json('data.id'))->created_by)->toBe($productor->id);
});

it('reutiliza la fila local del productor en altas sucesivas', function () {
    impersonarToken(claimsDeToken('productor'));
    $this->postJson('/api/v1/artists', datosDeArtista())->assertCreated();

    impersonarToken(claimsDeToken('productor'));
    $this->postJson('/api/v1/artists', datosDeArtista([
        'name' => 'Mar Salinas',
        'email' => 'mar.salinas@ejemplo.test',
    ]))->assertCreated();

    expect(User::query()->where('auth0_sub', subDelProductor())->count())->toBe(1)
        ->and(Artist::query()->distinct()->pluck('created_by')->all())->toHaveCount(1);
});

it('reutiliza la fila local del productor cuando ya existía', function () {
    $productor = User::factory()->withoutEmail()->create(['auth0_sub' => subDelProductor()]);
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->postJson('/api/v1/artists', datosDeArtista());

    $respuesta->assertCreated();

    expect(User::query()->count())->toBe(1)
        ->and(Artist::query()->findOrFail($respuesta->json('data.id'))->created_by)->toBe($productor->id);
});

it('rechaza datos inválidos con 422 VALIDATION_ERROR sin crear el artista', function (array $datos, string $campo) {
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->postJson('/api/v1/artists', $datos);

    $respuesta->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($respuesta->json('errors')))->toBe([$campo])
        ->and(Artist::query()->count())->toBe(0);
})->with('datos de artista inválidos');

it('rechaza un nombre duplicado sin distinguir mayúsculas', function (string $nombre) {
    Artist::factory()->create(datosDeArtista());
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->postJson('/api/v1/artists', [
        'name' => $nombre,
        'email' => 'otro.correo@ejemplo.test',
    ]);

    $respuesta->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($respuesta->json('errors')))->toBe(['name'])
        ->and(Artist::query()->count())->toBe(1);
})->with([
    'en mayúsculas' => ['LUNA RIVERA'],
    'en minúsculas' => ['luna rivera'],
    'con espacios alrededor' => ['  Luna Rivera  '],
]);

it('rechaza un email duplicado sin distinguir mayúsculas', function (string $email) {
    Artist::factory()->create(datosDeArtista());
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->postJson('/api/v1/artists', [
        'name' => 'Otro Nombre',
        'email' => $email,
    ]);

    $respuesta->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');

    expect(array_keys($respuesta->json('errors')))->toBe(['email'])
        ->and(Artist::query()->count())->toBe(1);
})->with([
    'en mayúsculas' => ['LUNA.RIVERA@EJEMPLO.TEST'],
    'con casing mixto' => ['Luna.Rivera@Ejemplo.Test'],
]);

it('guarda el email en minúsculas', function () {
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->postJson('/api/v1/artists', datosDeArtista(['email' => 'Luna.Rivera@Ejemplo.TEST']));

    $respuesta->assertCreated()
        ->assertJsonPath('data.email', 'luna.rivera@ejemplo.test');

    expect(Artist::query()->findOrFail($respuesta->json('data.id'))->email)->toBe('luna.rivera@ejemplo.test');
});

it('permite reutilizar nombre y email de un artista borrado', function () {
    Artist::factory()->create(datosDeArtista())->delete();
    impersonarToken(claimsDeToken('productor'));

    $this->postJson('/api/v1/artists', datosDeArtista())->assertCreated();

    expect(Artist::withTrashed()->count())->toBe(2)
        ->and(Artist::query()->count())->toBe(1);
});

it('rechaza con 401 UNAUTHENTICATED cuando falta el token', function () {
    $this->postJson('/api/v1/artists', datosDeArtista())
        ->assertUnauthorized()
        ->assertJsonPath('code', 'UNAUTHENTICATED');

    expect(Artist::query()->count())->toBe(0);
});

it('rechaza con 403 FORBIDDEN a un artista y no crea nada', function () {
    impersonarToken(claimsDeToken('artista'));

    $this->postJson('/api/v1/artists', datosDeArtista())
        ->assertForbidden()
        ->assertJsonPath('code', 'FORBIDDEN');

    expect(Artist::query()->count())->toBe(0)
        ->and(User::query()->count())->toBe(0);
});

/*
 * Enmienda §3.8 (#26): el frontend pinta `errors.<campo>[0]` tal cual
 * (spec frontend HU-05 §3.5), así que el texto exacto es contrato.
 */
it('responde los errores de validación en español', function (array $datos, string $campo, string $mensaje) {
    Artist::factory()->create(datosDeArtista());
    impersonarToken(claimsDeToken('productor'));

    $respuesta = $this->postJson('/api/v1/artists', $datos);

    $respuesta->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR')
        ->assertJsonPath("errors.{$campo}.0", $mensaje);
})->with('mensajes de validación en español');
