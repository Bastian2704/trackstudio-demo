<?php

declare(strict_types=1);

use App\Models\Comment;
use App\Models\Song;
use App\Models\User;
use App\Models\Version;
use App\Services\ProductionService;
use App\Services\SongService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-30 — Eliminar los comentarios propios: DELETE /api/v1/comments/{comment}
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-19.md §3 y §4 (#1–#7). Salvo donde el test dice
| lo contrario, el comentario es del usuario del token (`comentarioDelToken`),
| para que lo único que falle sea lo que el caso prueba.
|
*/

it('el autor borra su comentario', function () {
    $version = versionParaComentar();
    $propio = comentarioDelToken(['version_id' => $version->id]);
    $otro = Comment::factory()->create(['version_id' => $version->id]);
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson(urlDeComentario($propio->id))->assertNoContent();

    $this->assertDatabaseMissing('comments', ['id' => $propio->id]);
    $this->assertDatabaseHas('comments', ['id' => $otro->id]);

    expect(Version::query()->whereKey($version->id)->exists())->toBeTrue();
});

it('un segundo borrado responde 404', function () {
    $propio = comentarioDelToken(['version_id' => versionParaComentar()->id]);
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson(urlDeComentario($propio->id))->assertNoContent();

    $this->deleteJson(urlDeComentario($propio->id))
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
});

it('un productor no borra el comentario de otro', function () {
    // Dos `sub` distintos con el mismo rol: solo cambia la autoría (spec §4).
    $otroProductor = User::factory()->create(['auth0_sub' => 'auth0|otro-productor']);
    $ajeno = Comment::factory()->create([
        'version_id' => versionParaComentar()->id,
        'author_id' => $otroProductor->id,
    ]);
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson(urlDeComentario($ajeno->id))
        ->assertForbidden()
        ->assertJsonPath('code', 'FORBIDDEN');

    $this->assertDatabaseHas('comments', ['id' => $ajeno->id]);
});

it('rechaza sin identidad o sin rol productor', function (Closure $preparar, ?string $rol, int $status, string $code) {
    /** @var Comment $comentario */
    $comentario = $preparar();

    if ($rol !== null) {
        impersonarToken(claimsDeToken($rol));
    }

    $this->deleteJson(urlDeComentario($comentario->id))
        ->assertStatus($status)
        ->assertJsonPath('code', $code);

    $this->assertDatabaseHas('comments', ['id' => $comentario->id]);
})->with([
    'sin token' => [fn (): Comment => comentarioDelToken(), null, 401, 'UNAUTHENTICATED'],
    'artista sin acceso' => [fn (): Comment => comentarioDelToken(), 'artista', 403, 'FORBIDDEN'],
    'artista con acceso vigente' => [function (): Comment {
        $production = artistaConAcceso();
        $song = Song::factory()->create(['production_id' => $production->id]);

        return comentarioDelToken([
            'version_id' => versionParaComentar(['song_id' => $song->id])->id,
        ]);
    }, 'artista', 403, 'FORBIDDEN'],
    'rol desconocido' => [fn (): Comment => comentarioDelToken(), 'desconocido', 403, 'FORBIDDEN'],
]);

it('responde 404 si el comentario no está disponible', function (Closure $preparar) {
    exigirRuta('DELETE', 'api/v1/comments/{comment}');
    $commentId = $preparar();
    $comentariosAntes = Comment::query()->count();
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson(urlDeComentario($commentId))
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expect(Comment::query()->count())->toBe($comentariosAntes);
})->with([
    'UUID inexistente' => [fn (): string => (string) Str::uuid()],
    'id que no es UUID' => [fn (): string => 'no-es-un-uuid'],
    'comentario de una versión borrada' => [function (): string {
        $comentario = comentarioDelToken();
        $comentario->version->delete();

        return $comentario->id;
    }],
    'comentario de una canción borrada por la cascada' => [function (): string {
        $comentario = comentarioDelToken();
        app(SongService::class)->deleteSong($comentario->version->song);

        return $comentario->id;
    }],
    'comentario de una producción borrada por la cascada' => [function (): string {
        $comentario = comentarioDelToken();
        app(ProductionService::class)->deleteProduction($comentario->version->song->production);

        return $comentario->id;
    }],
]);

it('un comentario oculto responde 404 también a quien no es su autor', function () {
    exigirRuta('DELETE', 'api/v1/comments/{comment}');
    $ajeno = Comment::factory()->create();
    $ajeno->version->delete();
    impersonarToken(claimsDeToken('productor'));

    $this->deleteJson(urlDeComentario($ajeno->id))
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
});

it('no hay ninguna ruta para editar comentarios', function () {
    $edicion = collect(app('router')->getRoutes()->getRoutes())
        ->filter(fn (Route $ruta): bool => str_starts_with($ruta->uri(), 'api/v1/')
            && str_contains($ruta->uri(), 'comments')
            && array_intersect($ruta->methods(), ['PUT', 'PATCH']) !== [])
        ->map(fn (Route $ruta): string => implode('|', $ruta->methods()).' '.$ruta->uri())
        ->values()
        ->all();

    expect($edicion)->toBe([]);
});
