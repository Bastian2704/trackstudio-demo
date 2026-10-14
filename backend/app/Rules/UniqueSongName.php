<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\Song;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

final class UniqueSongName implements ValidationRule
{
    public function __construct(private ?string $productionId, private ?string $ignoreId = null) {}

    /**
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || $this->productionId === null) {
            return;
        }

        $query = Song::query()
            ->where('production_id', $this->productionId)
            ->whereRaw('lower(name) = lower(?)', [$value])
            ->when(
                $this->ignoreId !== null,
                fn ($query) => $query->whereKeyNot($this->ignoreId)
            );

        if ($query->exists()) {
            $fail('Ya existe una canción con ese nombre en esta producción.');
        }
    }
}
