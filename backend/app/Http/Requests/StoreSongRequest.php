<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Production;
use App\Rules\UniqueSongName;
use Illuminate\Foundation\Http\FormRequest;

final class StoreSongRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $production = $this->route('production');
        $productionId = $production instanceof Production
            ? (string) $production->getKey()
            : null;

        return [
            'name' => [
                'bail',
                'required',
                'string',
                'max:255',
                new UniqueSongName($productionId),
            ],
        ];
    }
}
