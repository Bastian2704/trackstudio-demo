<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\AudioContentType;
use App\Models\Version;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreVersionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'content_type' => [
                'bail',
                'required',
                'string',
                Rule::enum(AudioContentType::class),
            ],
            'size_bytes' => [
                'bail',
                'required',
                'integer',
                'min:1',
                'max:'.Version::MAX_SIZE_BYTES,
            ],
        ];
    }
}
