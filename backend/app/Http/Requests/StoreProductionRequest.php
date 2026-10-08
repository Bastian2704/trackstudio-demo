<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\ProductionFormat;
use App\Rules\UniqueProductionName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreProductionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    private function artistId(): ?string
    {
        $artistId = $this->input('artist_id');

        return is_string($artistId) ? $artistId : null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $artistId = $this->artistId();

        return [
            'artist_id' => [
                'bail',
                'required',
                'uuid',
                Rule::exists('artists', 'id')->withoutTrashed(),
            ],
            'name' => [
                'bail',
                'required',
                'string',
                'max:255',
                new UniqueProductionName($artistId),
            ],
            'format' => [
                'bail',
                'required',
                Rule::enum(ProductionFormat::class),
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
            'format.enum' => 'El formato seleccionado no es válido.',
        ];
    }
}
