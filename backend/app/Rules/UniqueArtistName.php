<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\Artist;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

final class UniqueArtistName implements ValidationRule
{
    public function __construct(private ?string $ignoreId = null) {}

    /**
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        $query = Artist::query()
            ->whereRaw('lower(name) = lower(?)', [$value])
            ->when(
                $this->ignoreId !== null,
                fn ($query) => $query->whereKeyNot($this->ignoreId)
            );

        if ($query->exists()) {
            $fail('Ya existe un artista con ese nombre.');
        }
    }
}
