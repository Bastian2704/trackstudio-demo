<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class IndexArtistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * `per_page` lo usa el selector del alta de producciones.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ];
    }
}
