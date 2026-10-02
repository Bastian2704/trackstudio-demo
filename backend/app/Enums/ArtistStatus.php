<?php

declare(strict_types=1);

namespace App\Enums;

enum ArtistStatus: string
{
    case Invitado = 'invitado';
    case Activo = 'activo';
    case Inactivo = 'inactivo';
}
