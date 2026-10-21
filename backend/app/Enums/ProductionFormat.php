<?php

declare(strict_types=1);

namespace App\Enums;

enum ProductionFormat: string
{
    case Sencillo = 'sencillo';
    case Ep = 'ep';
    case Album = 'album';

    public function maxSongs(): ?int
    {
        return match ($this) {
            self::Sencillo => 1,
            self::Ep => 6,
            self::Album => null,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Sencillo => 'sencillo',
            self::Ep => 'EP',
            self::Album => 'álbum',
        };
    }
}
