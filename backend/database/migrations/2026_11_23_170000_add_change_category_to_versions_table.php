<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * TS-90: categoría del motivo. Solo amplía el esquema.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('versions', function (Blueprint $table) {
            $table->string('change_category', 20)->nullable();
        });

        DB::statement(<<<'SQL'
    ALTER TABLE versions
    ADD CONSTRAINT versions_change_category_check
    CHECK (change_category IN ('voz', 'instrumentos', 'mezcla', 'master', 'arreglo', 'otro'))
    SQL);
        // El IS NOT NULL es obligatorio: length(btrim(NULL)) da NULL y el CHECK pasaría.
        DB::statement(<<<'SQL'
    ALTER TABLE versions
    ADD CONSTRAINT versions_change_reason_check
    CHECK (change_category IS NULL OR (description IS NOT NULL AND length(btrim(description)) > 0))
    SQL);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE versions DROP CONSTRAINT versions_change_reason_check');
        DB::statement('ALTER TABLE versions DROP CONSTRAINT versions_change_category_check');

        Schema::table('versions', function (Blueprint $table) {
            $table->dropColumn('change_category');
        });
    }
};
