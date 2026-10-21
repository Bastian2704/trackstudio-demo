<?php

declare(strict_types=1);

use App\Models\Artist;
use App\Models\Production;
use App\Models\Song;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

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

/*
|--------------------------------------------------------------------------
| TS-21 — Tabla songs (modelo-completo.md §3.4)
|--------------------------------------------------------------------------
*/

it('crea songs con el contrato exacto aprobado', function () {
    expect(Schema::hasTable('songs'))->toBeTrue();

    expect(columnasPostgresql('songs'))->toBe([
        ['column_name' => 'id', 'data_type' => 'uuid', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'production_id', 'data_type' => 'uuid', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'name', 'data_type' => 'character varying', 'is_nullable' => 'NO', 'character_maximum_length' => 255],
        ['column_name' => 'position', 'data_type' => 'smallint', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'status', 'data_type' => 'character varying', 'is_nullable' => 'NO', 'character_maximum_length' => 20],
        ['column_name' => 'created_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'updated_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'deleted_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'YES', 'character_maximum_length' => null],
    ]);

    $statusDefault = DB::scalar(
        <<<'SQL'
            SELECT column_default
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'songs'
              AND column_name = 'status'
        SQL,
    );

    expect($statusDefault)->toBeString()->toContain("'por_hacer'");
});

it('protege relaciones, estado, posición e índices de songs', function () {
    expect(Schema::hasTable('songs'))->toBeTrue();

    expect(restriccionesPostgresql('songs', 'p'))->toBe(['PRIMARY KEY (id)'])
        ->and(restriccionesPostgresql('songs', 'u'))->toBe([])
        ->and(clavesForaneasPostgresql('songs'))->toBe([
            ['column_name' => 'production_id', 'foreign_table' => 'productions', 'foreign_column' => 'id', 'delete_rule' => 'NO ACTION'],
        ]);

    $checks = restriccionesPostgresql('songs', 'c');
    $checkDeEstado = collect($checks)->first(fn (string $check): bool => str_contains($check, 'status'));
    $checkDePosicion = collect($checks)->first(fn (string $check): bool => str_contains($check, 'position'));

    expect($checks)->toHaveCount(2)
        ->and($checkDeEstado)->toBeString()
        ->toContain('por_hacer')
        ->toContain('en_progreso')
        ->toContain('finalizada')
        ->and($checkDePosicion)->toBeString()
        // PostgreSQL entrecomilla `position` (palabra clave) al reconstruir el CHECK.
        ->toMatch('/"?position"? > 0/');

    $indices = collect(DB::select(
        <<<'SQL'
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = current_schema()
              AND tablename = 'songs'
        SQL,
    ))->pluck('indexdef', 'indexname');

    expect($indices)->toHaveKey('songs_production_id_index')
        ->and($indices['songs_production_id_index'])->toContain('(production_id)')
        ->and($indices)->toHaveKey('songs_production_id_name_lower_unique')
        ->and($indices['songs_production_id_name_lower_unique'])
        ->toContain('CREATE UNIQUE INDEX')
        ->toContain('production_id')
        ->toContain('lower(')
        ->toContain('name')
        ->toContain('WHERE (deleted_at IS NULL)')
        // La posición no es única: la compactación del borrado la reescribe (§3.5).
        ->and($indices->contains(fn (string $indice): bool => str_contains($indice, 'position')))->toBeFalse();
});

it('impide en PostgreSQL repetir el nombre vigente dentro de la producción', function () {
    $production = Production::factory()->create();
    $otherProduction = Production::factory()->create();
    $original = Song::factory()->create(['production_id' => $production->id, 'name' => 'Intro', 'position' => 1]);

    expect(fn () => DB::transaction(fn () => Song::factory()->create([
        'production_id' => $production->id,
        'name' => 'INTRO',
        'position' => 2,
    ])))->toThrow(UniqueConstraintViolationException::class);

    Song::factory()->create(['production_id' => $otherProduction->id, 'name' => 'intro', 'position' => 1]);
    $original->delete();
    Song::factory()->create(['production_id' => $production->id, 'name' => 'Intro', 'position' => 1]);

    expect(Song::withTrashed()->count())->toBe(3);
});

/*
|--------------------------------------------------------------------------
| TS-24 — Tabla versions (modelo-completo.md §3.5)
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-13.md §3.9 y §4 (#1–#4). Sin clases nuevas: la
| tabla se inspecciona y se escribe con SQL para no tumbar los casos previos.
|
*/

/**
 * Fila mínima válida de `versions` para insertar con `DB::table()`.
 *
 * @param  array<string, mixed>  $cambios
 * @return array<string, mixed>
 */
function filaDeVersion(array $cambios = []): array
{
    $id = (string) Str::uuid();

    return array_merge([
        'id' => $id,
        'song_id' => Song::factory()->create()->id,
        'version_number' => 1,
        's3_key' => "artista/produccion/cancion/{$id}.wav",
        'content_type' => 'audio/wav',
        'size_bytes' => 1024,
        'uploaded_by' => User::factory()->create()->id,
        'created_at' => now(),
        'updated_at' => now(),
    ], $cambios);
}

it('crea versions con el contrato exacto aprobado', function () {
    expect(Schema::hasTable('versions'))->toBeTrue();

    expect(columnasPostgresql('versions'))->toBe([
        ['column_name' => 'id', 'data_type' => 'uuid', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'song_id', 'data_type' => 'uuid', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'version_number', 'data_type' => 'integer', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'label', 'data_type' => 'character varying', 'is_nullable' => 'YES', 'character_maximum_length' => 100],
        ['column_name' => 'description', 'data_type' => 'text', 'is_nullable' => 'YES', 'character_maximum_length' => null],
        ['column_name' => 's3_key', 'data_type' => 'character varying', 'is_nullable' => 'NO', 'character_maximum_length' => 512],
        ['column_name' => 'content_type', 'data_type' => 'character varying', 'is_nullable' => 'NO', 'character_maximum_length' => 50],
        ['column_name' => 'size_bytes', 'data_type' => 'bigint', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'etag', 'data_type' => 'character varying', 'is_nullable' => 'YES', 'character_maximum_length' => 64],
        ['column_name' => 'upload_status', 'data_type' => 'character varying', 'is_nullable' => 'NO', 'character_maximum_length' => 20],
        ['column_name' => 'verified_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'YES', 'character_maximum_length' => null],
        ['column_name' => 'duration_ms', 'data_type' => 'integer', 'is_nullable' => 'YES', 'character_maximum_length' => null],
        ['column_name' => 'uploaded_by', 'data_type' => 'uuid', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'created_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'updated_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'NO', 'character_maximum_length' => null],
        ['column_name' => 'deleted_at', 'data_type' => 'timestamp with time zone', 'is_nullable' => 'YES', 'character_maximum_length' => null],
    ]);

    $uploadStatusDefault = DB::scalar(
        <<<'SQL'
            SELECT column_default
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'versions'
              AND column_name = 'upload_status'
        SQL,
    );

    expect($uploadStatusDefault)->toBeString()->toContain("'pendiente'");
});

it('protege relaciones, únicos, checks e índices de versions', function () {
    expect(Schema::hasTable('versions'))->toBeTrue();

    expect(restriccionesPostgresql('versions', 'p'))->toBe(['PRIMARY KEY (id)'])
        ->and(clavesForaneasPostgresql('versions'))->toBe([
            ['column_name' => 'song_id', 'foreign_table' => 'songs', 'foreign_column' => 'id', 'delete_rule' => 'NO ACTION'],
            ['column_name' => 'uploaded_by', 'foreign_table' => 'users', 'foreign_column' => 'id', 'delete_rule' => 'NO ACTION'],
        ]);

    $checks = collect(restriccionesPostgresql('versions', 'c'));
    $check = fn (string $columna): ?string => $checks->first(fn (string $definicion): bool => str_contains($definicion, $columna));

    expect($checks)->toHaveCount(6)
        ->and($check('version_number'))->toBeString()->toContain('version_number > 0')
        ->and($check('content_type'))->toBeString()->toContain('audio/wav')->toContain('audio/mpeg')
        ->and($check('size_bytes'))->toBeString()->toContain('size_bytes > 0')->toContain('size_bytes <= 524288000')
        ->and($check('duration_ms'))->toBeString()->toContain('duration_ms > 0')
        ->and($checks->first(fn (string $definicion): bool => str_contains($definicion, 'etag IS NOT NULL')))
        ->toBeString()->toContain('verified_at IS NOT NULL')->toContain('duration_ms IS NOT NULL');

    $checkDeEstado = $checks->first(fn (string $definicion): bool => str_contains($definicion, 'upload_status')
        && str_contains($definicion, 'fallida'));

    expect($checkDeEstado)->toBeString()->toContain('pendiente')->toContain('verificada');

    $indices = collect(DB::select(
        <<<'SQL'
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = current_schema()
              AND tablename = 'versions'
        SQL,
    ))->pluck('indexdef', 'indexname');

    // Total, no parcial: un número borrado no se reutiliza nunca (ERD §3.5).
    expect($indices)->toHaveKey('versions_song_id_version_number_unique')
        ->and($indices['versions_song_id_version_number_unique'])
        ->toContain('CREATE UNIQUE INDEX')
        ->toContain('(song_id, version_number)')
        ->not->toContain('WHERE')
        ->and($indices->contains(fn (string $indice): bool => str_contains($indice, 'CREATE UNIQUE INDEX')
            && str_contains($indice, '(s3_key)')
            && ! str_contains($indice, 'WHERE')))->toBeTrue()
        ->and($indices)->toHaveKey('versions_uploaded_by_index')
        ->and($indices['versions_uploaded_by_index'])->toContain('(uploaded_by)');
});

it('rechaza repetir un número de versión aunque la anterior esté borrada', function () {
    $borrada = filaDeVersion(['deleted_at' => now()]);
    DB::table('versions')->insert($borrada);

    expect(fn () => DB::transaction(fn () => DB::table('versions')->insert(filaDeVersion([
        'song_id' => $borrada['song_id'],
        'version_number' => $borrada['version_number'],
    ]))))->toThrow(UniqueConstraintViolationException::class);

    expect(DB::table('versions')->count())->toBe(1);
});

it('rechaza una versión verificada sin evidencia de integridad', function (string $faltante) {
    $evidencia = array_diff_key([
        'etag' => 'd41d8cd98f00b204e9800998ecf8427e',
        'verified_at' => now(),
        'duration_ms' => 180000,
    ], [$faltante => true]);

    expect(fn () => DB::transaction(fn () => DB::table('versions')->insert(filaDeVersion([
        'upload_status' => 'verificada',
        ...$evidencia,
    ]))))->toThrow(QueryException::class, 'versions_verified_complete_check');

    expect(DB::table('versions')->count())->toBe(0);
})->with([
    'sin etag' => ['etag'],
    'sin verified_at' => ['verified_at'],
    'sin duration_ms' => ['duration_ms'],
]);
