<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Artist;

final class UpdateArtistRequest extends StoreArtistRequest
{
    protected function ignoredArtistId(): ?string
    {
        $artist = $this->route('artist');

        if ($artist instanceof Artist) {
            return $artist->getKey();
        }

        return null;
    }
}
