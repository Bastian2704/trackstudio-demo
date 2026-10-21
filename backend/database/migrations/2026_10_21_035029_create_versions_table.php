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
        Schema::create('versions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('song_id')->constrained('songs');
            $table->integer('version_number');
            $table->string('label', 100)->nullable();
            $table->text('description')->nullable();
            $table->string('s3_key', 512)->unique();
            $table->string('content_type', 50);
            $table->bigInteger('size_bytes');
            $table->string('etag', 64)->nullable();
            $table->string('upload_status', 20)->default('pendiente');
            $table->timestampTz('verified_at')->nullable();
            $table->integer('duration_ms')->nullable();
            $table->foreignUuid('uploaded_by')
                ->index('versions_uploaded_by_index')
                ->constrained('users');
            $table->timestampTz('created_at');
            $table->timestampTz('updated_at');
            $table->softDeletesTz();

            $table->unique(['song_id', 'version_number']);
        });

        DB::statement(<<<'SQL'
        ALTER TABLE versions
        ADD CONSTRAINT versions_version_number_check
        CHECK (version_number > 0)
        SQL);
        DB::statement(<<<'SQL'
        ALTER TABLE versions
        ADD CONSTRAINT versions_content_type_check
        CHECK (content_type IN ('audio/wav', 'audio/mpeg'))
        SQL);
        DB::statement(<<<'SQL'
        ALTER TABLE versions
        ADD CONSTRAINT versions_size_bytes_check
        CHECK (size_bytes > 0 AND size_bytes <= 524288000)
        SQL);
        DB::statement(<<<'SQL'
        ALTER TABLE versions
        ADD CONSTRAINT versions_upload_status_check
        CHECK (upload_status IN ('pendiente', 'verificada', 'fallida'))
        SQL);
        DB::statement(<<<'SQL'
        ALTER TABLE versions
        ADD CONSTRAINT versions_duration_ms_check
        CHECK (duration_ms > 0)
        SQL);
        DB::statement(<<<'SQL'
        ALTER TABLE versions
        ADD CONSTRAINT versions_verified_complete_check
        CHECK (upload_status <> 'verificada' OR (etag IS NOT NULL AND verified_at IS NOT NULL AND duration_ms IS NOT NULL))
        SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('versions');
    }
};
