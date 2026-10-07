<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('productions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('artist_id')
                ->index('productions_artist_id_index')
                ->constrained('artists');
            $table->string('name');
            $table->string('format', 10);
            $table->timestampTz('created_at');
            $table->timestampTz('updated_at');
            $table->softDeletesTz();
        });

        DB::statement(<<<'SQL'
            ALTER TABLE productions
            ADD CONSTRAINT productions_format_check
            CHECK (format IN ('sencillo', 'ep', 'album'))
            SQL);
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX productions_artist_id_name_lower_unique
            ON productions (artist_id, lower(name))
            WHERE deleted_at IS NULL
            SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('productions');
    }
};
