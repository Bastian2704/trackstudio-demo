<?php

declare(strict_types=1);

namespace App\Enums;

/** Categoría del motivo de una versión */
enum ChangeCategory: string
{
    case Voz = 'voz';
    case Instrumentos = 'instrumentos';
    case Mezcla = 'mezcla';
    case Master = 'master';
    case Arreglo = 'arreglo';
    case Otro = 'otro';
}
