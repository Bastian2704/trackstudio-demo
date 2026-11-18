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
        Schema::create('production_access', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('production_id')
                ->index('production_access_production_id_index')
                ->constrained('productions');
            $table->foreignUuid('artist_id')
                ->index('production_access_artist_id_index')
                ->constrained('artists');
            $table->foreignUuid('granted_by')
                ->index('production_access_granted_by_index')
                ->constrained('users');
            $table->timestampTz('granted_at');
            $table->timestampTz('revoked_at')->nullable();
        });

        DB::statement(<<<'SQL'
        ALTER TABLE production_access
        ADD CONSTRAINT production_access_revoked_after_granted_check
        CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
        SQL);
        DB::statement(<<<'SQL'
        CREATE UNIQUE INDEX production_access_active_unique
        ON production_access (production_id, artist_id)
        WHERE revoked_at IS NULL
        SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_access');
    }
};
