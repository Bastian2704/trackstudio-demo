<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * TS-91: resumen del análisis técnico que calcula el navegador. Solo amplía el esquema.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('versions', function (Blueprint $table) {
            $table->jsonb('analysis')->nullable();
        });

        DB::statement(<<<'SQL'
    ALTER TABLE versions
    ADD CONSTRAINT versions_analysis_object_check
    CHECK (analysis IS NULL OR jsonb_typeof(analysis) = 'object')
    SQL);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE versions DROP CONSTRAINT versions_analysis_object_check');

        Schema::table('versions', function (Blueprint $table) {
            $table->dropColumn('analysis');
        });
    }
};
