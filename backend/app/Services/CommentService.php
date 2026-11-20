<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\UploadStatus;
use App\Models\Comment;
use App\Models\User;
use App\Models\Version;
use Auth0\Laravel\Users\StatelessUserContract;
use Illuminate\Validation\ValidationException;

final class CommentService
{
    /**
     * @param  array{body: string, timestamp_ms: int}  $datos
     */
    public function addComment(StatelessUserContract $autor, Version $version, array $datos): Comment
    {
        abort_unless($version->upload_status === UploadStatus::Verificada, 404);

        if ($datos['timestamp_ms'] > $version->duration_ms) {
            throw ValidationException::withMessages([
                'timestamp_ms' => 'La marca de tiempo no puede superar la duración de la versión.',
            ]);
        }

        $usuario = User::firstOrCreate(['auth0_sub' => $autor->getAuthIdentifier()]);

        return $version->comments()->create([
            'author_id' => $usuario->id,
            'body' => $datos['body'],
            'timestamp_ms' => $datos['timestamp_ms'],
        ]);
    }
}
