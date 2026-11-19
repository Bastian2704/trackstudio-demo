<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'body' => ['bail', 'required', 'string', 'max:2000'],
            'timestamp_ms' => ['bail', 'required', 'integer:strict', 'min:0', 'max:2147483647'],
        ];
    }
}
