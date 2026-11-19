<?php

declare(strict_types=1);

use App\Models\Comment;
use App\Models\User;
use App\Models\Version;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-28 — Esquema y modelo de comments (ERD §3.6)
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-17.md §3.1 y §4 (#11–#13). Las inserciones que
| deben fallar van en DB::transaction: el savepoint evita que PostgreSQL
| aborte la transacción de RefreshDatabase.
|
*/

// Sin la tabla, un INSERT que «debe fallar» falla por otra razón y nace verde (C2).
beforeEach(function () {
    expect(Schema::hasTable('comments'))->toBeTrue('Falta la migración de comments.');
});

/**
 * Inserta un comentario sin pasar por el modelo. Devuelve el id.
 *
 * @param  array<string, mixed>  $cambios
 */
function insertarComentario(array $cambios = []): string
{
    $id = (string) Str::uuid();

    DB::table('comments')->insert(array_merge([
        'id' => $id,
        'version_id' => Version::factory()->verificada()->create()->id,
        'author_id' => User::factory()->create()->id,
        'body' => 'Sube la voz en el coro',
        'timestamp_ms' => 1000,
        'created_at' => now(),
    ], $cambios));

    return $id;
}

it('relaciona versiones, autores y comentarios sin updated_at', function () {
    $version = Version::factory()->verificada()->create();
    $autor = User::factory()->create();

    // Con UPDATED_AT activo, el INSERT pediría una columna que no existe.
    $comment = Comment::factory()->create(['version_id' => $version->id, 'author_id' => $autor->id]);
    Comment::factory()->create();

    expect(Schema::getColumnListing('comments'))->toEqualCanonicalizing([
        'id', 'version_id', 'author_id', 'body', 'timestamp_ms', 'created_at',
    ])
        ->and(Schema::getColumnType('comments', 'created_at'))->toBe('timestamptz')
        ->and($comment->refresh()->version->is($version))->toBeTrue()
        ->and($comment->author->is($autor))->toBeTrue()
        ->and($version->comments()->pluck('comments.id')->all())->toBe([$comment->id]);
});

it('la tabla rechaza texto en blanco y marca negativa', function (array $cambios, string $restriccion) {
    expect(fn () => DB::transaction(fn () => insertarComentario($cambios)))
        ->toThrow(QueryException::class, $restriccion);
})->with([
    'texto en blanco' => [['body' => '   '], 'comments_body_not_blank_check'],
    'marca negativa' => [['timestamp_ms' => -1], 'comments_timestamp_ms_non_negative_check'],
]);

it('acepta una fila válida por debajo del modelo', function () {
    insertarComentario();

    expect(DB::table('comments')->count())->toBe(1);
});

it('crea los índices del ERD', function () {
    $indices = collect(DB::select("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'comments'"))
        ->pluck('indexdef', 'indexname');

    expect($indices->keys()->all())->toContain(
        'comments_version_id_timestamp_ms_index',
        'comments_author_id_index',
    )
        ->and($indices['comments_version_id_timestamp_ms_index'] ?? '')->toContain('(version_id, timestamp_ms)')
        ->and($indices->keys()->all())->not->toContain('comments_version_id_index');
});
