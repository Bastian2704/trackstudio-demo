<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreProductionAccessRequest extends FormRequest
{
    /**
     * La autorización ya la hizo la Gate de la ruta.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'artist_id' => [
                'bail',
                'required',
                'uuid',
                Rule::exists('artists', 'id')->withoutTrashed(),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'artist_id.uuid' => 'El campo artista debe ser un UUID válido.',
            'artist_id.exists' => 'El artista seleccionado no existe.',
        ];
    }
}
