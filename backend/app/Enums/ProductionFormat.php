<?php

declare(strict_types=1);

namespace App\Enums;

enum ProductionFormat: string
{
    case Sencillo = 'sencillo';
    case Ep = 'ep';
    case Album = 'album';
}
