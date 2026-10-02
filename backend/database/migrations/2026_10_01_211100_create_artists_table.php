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
        Schema::create('artists', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email');
            $table->string('status', 20)->default('invitado');

            $table->foreignUuid('user_id')
                ->nullable()
                ->unique()
                ->constrained('users');

            $table->string('invitation_token')->nullable()->unique();
            $table->timestampTz('invited_at')->nullable();
            $table->timestampTz('invitation_expires_at')->nullable();

            $table->foreignUuid('created_by')
                ->index()
                ->constrained('users');

            $table->timestampTz('created_at');
            $table->timestampTz('updated_at');
            $table->softDeletesTz();
        });

        DB::statement(<<<'SQL'
            ALTER TABLE artists
            ADD CONSTRAINT artists_status_check
            CHECK (status IN ('invitado', 'activo', 'inactivo'))
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('artists');
    }
};
