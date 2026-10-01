<?php

declare(strict_types=1);

namespace App\Enums;

enum Role: string
{
    case Productor = 'productor';
    case Artista = 'artista';
}
