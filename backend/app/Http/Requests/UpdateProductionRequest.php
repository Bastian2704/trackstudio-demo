<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\ProductionFormat;
use App\Models\Production;
use App\Rules\UniqueProductionName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateProductionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $production = $this->route('production');
        $artistId = null;
        $ignoreId = null;

        if ($production instanceof Production) {
            $artistId = (string) $production->getAttribute('artist_id');
            $ignoreId = (string) $production->getKey();
        }

        return [
            'name' => [
                'bail',
                'required',
                'string',
                'max:255',
                new UniqueProductionName($artistId, $ignoreId),
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
            'format.enum' => 'El formato seleccionado no es válido.',
        ];
    }
}
