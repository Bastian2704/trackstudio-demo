<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\Production;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Str;
use Illuminate\Translation\PotentiallyTranslatedString;

final class UniqueProductionName implements ValidationRule
{
    public function __construct(private ?string $artistId, private ?string $ignoreId = null) {}

    /**
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || $this->artistId === null || ! Str::isUuid($this->artistId)) {
            return;
        }

        $query = Production::query()
            ->where('artist_id', $this->artistId)
            ->whereRaw('lower(name) = lower(?)', [$value])
            ->when(
                $this->ignoreId !== null,
                fn ($query) => $query->whereKeyNot($this->ignoreId)
            );

        if ($query->exists()) {
            $fail('Ya existe una producción con ese nombre para este artista.');
        }
    }
}
