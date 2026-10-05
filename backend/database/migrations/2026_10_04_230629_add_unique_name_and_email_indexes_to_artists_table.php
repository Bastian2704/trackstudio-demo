<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement('CREATE UNIQUE INDEX artists_name_lower_unique ON artists (lower(name)) WHERE deleted_at IS NULL');
        DB::statement('CREATE UNIQUE INDEX artists_email_lower_unique ON artists (lower(email)) WHERE deleted_at IS NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS artists_email_lower_unique');
        DB::statement('DROP INDEX IF EXISTS artists_name_lower_unique');
    }
};
