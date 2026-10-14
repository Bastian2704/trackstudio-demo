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
        Schema::create('songs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('production_id')
                ->index('songs_production_id_index')
                ->constrained('productions');
            $table->string('name');
            $table->smallInteger('position');
            $table->string('status', 20)->default('por_hacer');
            $table->timestampTz('created_at');
            $table->timestampTz('updated_at');
            $table->softDeletesTz();
        });

        DB::statement(<<<'SQL'
        ALTER TABLE songs
        ADD CONSTRAINT songs_position_check
        CHECK (position > 0)
        SQL);
        DB::statement(<<<'SQL'
        ALTER TABLE songs
        ADD CONSTRAINT songs_status_check
        CHECK (status IN ('por_hacer', 'en_progreso', 'finalizada'))
        SQL);
        DB::statement(<<<'SQL'
        CREATE UNIQUE INDEX songs_production_id_name_lower_unique
        ON songs (production_id, lower(name))
        WHERE deleted_at IS NULL
        SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('songs');
    }
};
