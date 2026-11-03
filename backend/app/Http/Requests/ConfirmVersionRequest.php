<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ConfirmVersionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * El ETag puede llegar con las comillas de la cabecera de S3. Solo se admite
     * el de un objeto de una sola parte. El tope de
     * duration_ms es el máximo de integer en PostgreSQL.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'etag' => [
                'bail',
                'required',
                'string',
                'regex:/^"?[0-9a-fA-F]{32}"?$/',
            ],
            'duration_ms' => [
                'bail',
                'required',
                'integer:strict',
                'min:1',
                'max:2147483647',
            ],
        ];
    }
}
