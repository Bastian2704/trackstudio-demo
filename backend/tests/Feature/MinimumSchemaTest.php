<?php

declare(strict_types=1);

use App\Models\Artist;
use App\Models\Production;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-15 — Modelo mínimo aprobado en TS-54
|--------------------------------------------------------------------------
|
| PostgreSQL es parte del contrato: UUID, timestamptz, checks, FKs e índices
| se inspeccionan en sus catálogos en vez de aproximarlos con SQLite.
|
*/

/**
 * @return array<int, array{
 *     column_name: string,
 *     data_type: string,
 *     is_nullable: string,
 *     character_maximum_length: int|null,
 * }>
 */
function columnasPostgresql(string $tabla): array
{
    return collect(DB::select(
        <<<'SQL'
            SELECT column_name, data_type, is_nullable, character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = ?
            ORDER BY ordinal_position
        SQL,
        [$tabla],
    ))->map(static fn (stdClass $columna): array => [
        'column_name' => $columna->column_name,
        'data_type' => $columna->data_type,
        'is_nullable' => $columna->is_nullable,
        'character_maximum_length' => $columna->character_maximum_length,
    ])->all();
}

/** @return list<string> */
function restriccionesPostgresql(string $tabla, string $tipo): array
{
    return collect(DB::select(
        <<<'SQL'
            SELECT pg_get_constraintdef(restriccion.oid) AS definition
            FROM pg_constraint AS restriccion
            INNER JOIN pg_class AS tabla ON tabla.oid = restriccion.conrelid
            INNER JOIN pg_namespace AS esquema ON esquema.oid = tabla.relnamespace
            WHERE esquema.nspname = current_schema()
              AND tabla.relname = ?
              AND restriccion.contype = ?
            ORDER BY definition
        SQL,
        [$tabla, $tipo],
    ))->pluck('definition')->all();
}

/**
 * @return list<array{column_name: string, foreign_table: string, foreign_column: string, delete_rule: string}>
 */
function clavesForaneasPostgresql(string $tabla): array
{
    return collect(DB::select(
        <<<'SQL'
            SELECT
                columnas.column_name,
                columnas_foraneas.table_name AS foreign_table,
                columnas_foraneas.column_name AS foreign_column,
                referencias.delete_rule
            FROM information_schema.table_constraints AS restricciones
            INNER JOIN information_schema.key_column_usage AS columnas
                ON restricciones.constraint_name = columnas.constraint_name
               AND restricciones.constraint_schema = columnas.constraint_schema
            INNER JOIN information_schema.referential_constraints AS referencias
                ON restricciones.constraint_name = referencias.constraint_name
               AND restricciones.constraint_schema = referencias.constraint_schema
            INNER JOIN information_schema.constraint_column_usage AS columnas_foraneas
                ON referencias.unique_constraint_name = columnas_foraneas.constraint_name
               AND referencias.unique_constraint_schema = columnas_foraneas.constraint_schema
            WHERE restricciones.table_schema = current_schema()
              AND restricciones.table_name = ?
              AND restricciones.constraint_type = 'FOREIGN KEY'
            ORDER BY columnas.column_name
        SQL,
        [$tabla],
    ))->map(static fn (stdClass $clave): array => [
        'column_name' => $clave->column_name,
        'foreign_table' => $clave->foreign_table,
        'foreign_column' => $clave->foreign_column,
        'delete_rule' => $clave->delete_rule,
    ])->all();
}

it('crea users con el contrato exacto aprobado', function () {
    expect(columnasPostgresql('users'))->toBe([
        ['column_name' => 'id', 'data_type' => 'uuid', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'auth0_sub', 'data_type' => 'character varying', 'is_nullable' => 'NO', 'character_maximum_length' => 255],
        ['column_name' => 'email', 'data_type' => 'character varying', 'is_nullable' => 'YES', 'character_maximum_length' => 255],
        ['column_name' => 'created_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'updated_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'NO', 'character_maximum_length' => null],
    ]);

    expect(restriccionesPostgresql('users', 'p'))->toBe(['PRIMARY KEY (id)'])
        ->and(restriccionesPostgresql('users', 'u'))->toEqualCanonicalizing([
            'UNIQUE (auth0_sub)',
            'UNIQUE (email)',
        ]);
});

it('crea artists con el contrato exacto aprobado', function () {
    expect(Schema::hasTable('artists'))->toBeTrue();

    expect(columnasPostgresql('artists'))->toBe([
        ['column_name' => 'id', 'data_type' => 'uuid', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'name', 'data_type' => 'character varying', 'is_nullable' => 'NO', 'character_maximum_length' => 255],
        ['column_name' => 'email', 'data_type' => 'character varying', 'is_nullable' => 'NO', 'character_maximum_length' => 255],
        ['column_name' => 'status', 'data_type' => 'character varying', 'is_nullable' => 'NO', 'character_maximum_length' => 20],
        ['column_name' => 'user_id', 'data_type' => 'uuid', 'is_nullable' => 'YES', 'character_maximum_length' => null],
        ['column_name' => 'invitation_token', 'data_type' => 'character varying', 'is_nullable' => 'YES', 'character_maximum_length' => 255],
        ['column_name' => 'invited_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'YES', 'character_maximum_length' => null],
        ['column_name' => 'invitation_expires_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'YES', 'character_maximum_length' => null],
        ['column_name' => 'created_by', 'data_type' => 'uuid', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'created_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'updated_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'deleted_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'YES', 'character_maximum_length' => null],
    ]);
});

it('protege las relaciones e invariantes de artists en PostgreSQL', function () {
    expect(Schema::hasTable('artists'))->toBeTrue();

    expect(restriccionesPostgresql('artists', 'p'))->toBe(['PRIMARY KEY (id)'])
        ->and(restriccionesPostgresql('artists', 'u'))->toEqualCanonicalizing([
            'UNIQUE (invitation_token)',
            'UNIQUE (user_id)',
        ])
        ->and(clavesForaneasPostgresql('artists'))->toBe([
            ['column_name' => 'created_by', 'foreign_table' => 'users', 'foreign_column' => 'id', 'delete_rule' => 'NO ACTION'],
            ['column_name' => 'user_id', 'foreign_table' => 'users', 'foreign_column' => 'id', 'delete_rule' => 'NO ACTION'],
        ]);

    $checks = restriccionesPostgresql('artists', 'c');

    expect($checks)->toHaveCount(1)
        ->and($checks[0])->toContain('status')
        ->toContain('invitado')
        ->toContain('activo')
        ->toContain('inactivo');

    $indices = collect(DB::select(
        <<<'SQL'
            SELECT indexdef
            FROM pg_indexes
            WHERE schemaname = current_schema()
              AND tablename = 'artists'
        SQL,
    ))->pluck('indexdef');

    expect($indices->contains(
        static fn (string $indice): bool => str_contains($indice, '(created_by)'),
    ))->toBeTrue();
});

it('mantiene fuera las tablas diferidas y de autenticación local', function () {
    expect(Schema::hasTable('production_access'))->toBeFalse()
        ->and(Schema::hasTable('password_reset_tokens'))->toBeFalse()
        ->and(Schema::hasTable('sessions'))->toBeFalse();
});

/*
|--------------------------------------------------------------------------
| TS-16 — Unicidad de artistas vigentes (docs/erd/modelo-sprint-2.md §2.1)
|--------------------------------------------------------------------------
|
| Un índice único parcial no es una restricción (`pg_constraint`), así que la
| prueba anterior no lo ve: se inspecciona `pg_indexes` y se ejercita con
| INSERT reales. Cada intento fallido va en su propia transacción anidada
| (savepoint) para no abortar la transacción de RefreshDatabase.
|
*/

it('define índices únicos parciales sobre lower(name) y lower(email) de artistas vigentes', function () {
    $indices = collect(DB::select(
        <<<'SQL'
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = current_schema()
              AND tablename = 'artists'
        SQL,
    ))->pluck('indexdef', 'indexname');

    foreach (['artists_name_lower_unique' => 'name', 'artists_email_lower_unique' => 'email'] as $indice => $columna) {
        expect($indices)->toHaveKey($indice);

        expect($indices[$indice])
            ->toContain('CREATE UNIQUE INDEX')
            ->toContain('lower(')
            ->toContain($columna)
            ->toContain('WHERE (deleted_at IS NULL)');
    }
});

it('rechaza en la base de datos un nombre de artista vigente repetido con otro casing', function () {
    Artist::factory()->create(['name' => 'Luna Rivera']);

    expect(fn () => DB::transaction(fn () => Artist::factory()->create(['name' => 'LUNA RIVERA'])))
        ->toThrow(UniqueConstraintViolationException::class);
});

it('rechaza en la base de datos un email de artista vigente repetido con otro casing', function () {
    Artist::factory()->create(['email' => 'luna.rivera@ejemplo.test']);

    expect(fn () => DB::transaction(fn () => Artist::factory()->create(['email' => 'LUNA.RIVERA@EJEMPLO.TEST'])))
        ->toThrow(UniqueConstraintViolationException::class);
});

it('libera nombre y email en la base de datos cuando el artista se borra', function () {
    $original = Artist::factory()->create(datosDeArtista());

    // Precondición: mientras está vigente, el duplicado se rechaza.
    expect(fn () => DB::transaction(fn () => Artist::factory()->create(datosDeArtista())))
        ->toThrow(UniqueConstraintViolationException::class);

    $original->delete();
    Artist::factory()->create(datosDeArtista());

    expect(Artist::withTrashed()->count())->toBe(2);
});

/*
|--------------------------------------------------------------------------
| TS-19 — Slice aprobado de productions (modelo-sprint-2.md §5)
|--------------------------------------------------------------------------
*/

it('crea productions con el contrato exacto aprobado', function () {
    expect(Schema::hasTable('productions'))->toBeTrue();

    expect(columnasPostgresql('productions'))->toBe([
        ['column_name' => 'id', 'data_type' => 'uuid', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'artist_id', 'data_type' => 'uuid', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'name', 'data_type' => 'character varying', 'is_nullable' => 'NO', 'character_maximum_length' => 255],
        ['column_name' => 'format', 'data_type' => 'character varying', 'is_nullable' => 'NO', 'character_maximum_length' => 10],
        ['column_name' => 'created_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'updated_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'deleted_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'YES', 'character_maximum_length' => null],
    ]);
});

it('protege relaciones, formato e índices de productions en PostgreSQL', function () {
    expect(restriccionesPostgresql('productions', 'p'))->toBe(['PRIMARY KEY (id)'])
        ->and(clavesForaneasPostgresql('productions'))->toBe([
            ['column_name' => 'artist_id', 'foreign_table' => 'artists', 'foreign_column' => 'id', 'delete_rule' => 'NO ACTION'],
        ]);

    $checks = restriccionesPostgresql('productions', 'c');
    expect($checks)->toHaveCount(1)
        ->and($checks[0])->toContain('format')
        ->toContain('sencillo')
        ->toContain('ep')
        ->toContain('album');

    $formatDefault = DB::scalar(
        <<<'SQL'
            SELECT column_default
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'productions'
              AND column_name = 'format'
        SQL,
    );

    expect($formatDefault)->toBeNull();

    $indices = collect(DB::select(
        <<<'SQL'
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = current_schema()
              AND tablename = 'productions'
        SQL,
    ))->pluck('indexdef', 'indexname');

    expect($indices)->toHaveKey('productions_artist_id_index')
        ->and($indices['productions_artist_id_index'])->toContain('(artist_id)')
        ->and($indices)->toHaveKey('productions_artist_id_name_lower_unique')
        ->and($indices['productions_artist_id_name_lower_unique'])
        ->toContain('CREATE UNIQUE INDEX')
        ->toContain('artist_id')
        ->toContain('lower(')
        ->toContain('name')
        ->toContain('WHERE (deleted_at IS NULL)');
});

it('impide en PostgreSQL repetir el nombre vigente dentro del mismo artista', function () {
    $artist = Artist::factory()->create();
    Production::factory()->create(['artist_id' => $artist->id, 'name' => 'Demos']);

    expect(fn () => DB::transaction(fn () => Production::factory()->create([
        'artist_id' => $artist->id,
        'name' => 'DEMOS',
    ])))->toThrow(UniqueConstraintViolationException::class);
});

it('permite en PostgreSQL el mismo nombre para otro artista o tras soft delete', function () {
    $firstArtist = Artist::factory()->create();
    $secondArtist = Artist::factory()->create();
    $original = Production::factory()->create(['artist_id' => $firstArtist->id, 'name' => 'Demos']);

    Production::factory()->create(['artist_id' => $secondArtist->id, 'name' => 'DEMOS']);
    $original->delete();
    Production::factory()->create(['artist_id' => $firstArtist->id, 'name' => 'demos']);

    expect(Production::withTrashed()->count())->toBe(3);
});
