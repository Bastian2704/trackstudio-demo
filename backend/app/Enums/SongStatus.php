<?php

declare(strict_types=1);

namespace App\Enums;

enum SongStatus: string
{
    case PorHacer = 'por_hacer';
    case EnProgreso = 'en_progreso';
    case Finalizada = 'finalizada';
}
