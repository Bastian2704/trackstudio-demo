<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\SongStatus;
use App\Models\Song;
use App\Rules\UniqueSongName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateSongRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $song = $this->route('song');
        $productionId = null;
        $ignoreId = null;

        if ($song instanceof Song) {
            $productionId = (string) $song->getAttribute('production_id');
            $ignoreId = (string) $song->getKey();
        }

        return [
            'name' => ['bail', 'required', 'string', 'max:255', new UniqueSongName($productionId, $ignoreId)],
            'status' => ['bail', 'required', Rule::enum(SongStatus::class)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'status.enum' => 'El estado seleccionado no es válido.',
        ];
    }
}
