<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('version_id')->constrained('versions');
            $table->foreignUuid('author_id')
                ->index('comments_author_id_index')
                ->constrained('users');
            $table->text('body');
            $table->integer('timestamp_ms');
            $table->timestampTz('created_at');

            $table->index(['version_id', 'timestamp_ms'], 'comments_version_id_timestamp_ms_index');
        });

        DB::statement(<<<'SQL'
    ALTER TABLE comments
    ADD CONSTRAINT comments_body_not_blank_check
    CHECK (length(btrim(body)) > 0)
    SQL);
        DB::statement(<<<'SQL'
    ALTER TABLE comments
    ADD CONSTRAINT comments_timestamp_ms_non_negative_check
    CHECK (timestamp_ms >= 0)
    SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
