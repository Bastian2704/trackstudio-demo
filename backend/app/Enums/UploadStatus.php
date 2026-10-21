<?php

declare(strict_types=1);

namespace App\Enums;

enum UploadStatus: string
{
    case Pendiente = 'pendiente';
    case Verificada = 'verificada';
    case Fallida = 'fallida';
}
