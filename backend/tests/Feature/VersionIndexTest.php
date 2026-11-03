<?php

declare(strict_types=1);

use App\Models\Song;
use App\Models\Version;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-25 — Historial de versiones: GET /api/v1/songs/{song}/versions
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-14.md §3.6, §3.7 y §4 (#17–#21).
|
*/

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse('2026-11-03 14:03:11'));
});

it('lista solo las verificadas de la más reciente a la más antigua', function () {
    $song = Song::factory()->create();
    $v1 = Version::factory()->for($song)->verificada()->create(['version_number' => 1]);
    Version::factory()->for($song)->fallida()->create(['version_number' => 2]);
    Version::factory()->for($song)->create(['version_number' => 3]);
    $v4 = Version::factory()->for($song)->verificada()->create(['version_number' => 4]);
    Version::factory()->for($song)->verificada()->create(['version_number' => 5])->delete();
    Version::factory()->verificada()->create(['version_number' => 6]);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->getJson("/api/v1/songs/{$song->id}/versions");

    $response->assertOk();

    expect(array_column($response->json('data'), 'id'))->toBe([$v4->id, $v1->id]);

    foreach ($response->json('data') as $version) {
        expect(array_keys($version))->toEqualCanonicalizing(CAMPOS_DE_VERSION);
    }
});

it('devuelve label nulo, descripción y fechas', function () {
    $song = Song::factory()->create();
    Version::factory()->for($song)->verificada()->create([
        'version_number' => 1,
        'label' => null,
        'description' => 'Primera mezcla.',
    ]);
    Version::factory()->for($song)->verificada()->create([
        'version_number' => 2,
        'label' => 'Master final',
        'description' => null,
    ]);
    impersonarToken(claimsDeToken('productor'));

    $response = $this->getJson("/api/v1/songs/{$song->id}/versions")
        ->assertOk()
        ->assertJsonPath('data.0.label', 'Master final')
        ->assertJsonPath('data.0.description', null)
        ->assertJsonPath('data.1.label', null)
        ->assertJsonPath('data.1.description', 'Primera mezcla.');

    expect($response->json('data.1.created_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET)
        ->and($response->json('data.1.verified_at'))->toMatch(FORMATO_ISO_8601_CON_OFFSET);
});

it('marca fallidas las pendientes caducadas de la canción', function () {
    $song = Song::factory()->create();
    $otherSong = Song::factory()->create();
    $caducada = Version::factory()->for($song)->create(['version_number' => 1, 'created_at' => now()->subMinutes(20)]);
    $vigente = Version::factory()->for($song)->create(['version_number' => 2, 'created_at' => now()->subMinutes(19)]);
    $ajena = Version::factory()->for($otherSong)->create(['version_number' => 1, 'created_at' => now()->subMinutes(30)]);
    impersonarToken(claimsDeToken('productor'));

    $this->getJson("/api/v1/songs/{$song->id}/versions")
        ->assertOk()
        ->assertJsonPath('data', []);

    expect($caducada->refresh()->upload_status->value)->toBe('fallida')
        ->and($vigente->refresh()->upload_status->value)->toBe('pendiente')
        ->and($ajena->refresh()->upload_status->value)->toBe('pendiente');
});

it('pagina el historial', function () {
    $song = Song::factory()->create();

    foreach (range(1, 16) as $number) {
        Version::factory()->for($song)->verificada()->create(['version_number' => $number]);
    }

    impersonarToken(claimsDeToken('productor'));

    $this->getJson("/api/v1/songs/{$song->id}/versions")
        ->assertOk()
        ->assertJsonCount(15, 'data')
        ->assertJsonPath('data.0.version_number', 16)
        ->assertJsonPath('meta.total', 16);

    $this->getJson("/api/v1/songs/{$song->id}/versions?page=2")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.version_number', 1);
});

it('responde 404 si la canción no está disponible', function (mixed $songReference) {
    exigirRuta('GET', 'api/v1/songs/{song}/versions');
    impersonarToken(claimsDeToken('productor'));
    $songId = is_callable($songReference) ? $songReference() : $songReference;

    $this->getJson("/api/v1/songs/{$songId}/versions")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
})->with('canciones no disponibles para subir');

it('rechaza sin identidad o sin rol productor', function (?string $role, int $status, string $code) {
    $song = Song::factory()->create();
    Version::factory()->for($song)->verificada()->create();

    if ($role !== null) {
        impersonarToken(claimsDeToken($role));
    }

    $this->getJson("/api/v1/songs/{$song->id}/versions")
        ->assertStatus($status)
        ->assertJsonPath('code', $code);
})->with([
    'sin token' => [null, 401, 'UNAUTHENTICATED'],
    'rol artista' => ['artista', 403, 'FORBIDDEN'],
    'rol desconocido' => ['desconocido', 403, 'FORBIDDEN'],
]);
