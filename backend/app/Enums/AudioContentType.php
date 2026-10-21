<?php

declare(strict_types=1);

namespace App\Enums;

enum AudioContentType: string
{
    case Wav = 'audio/wav';
    case Mpeg = 'audio/mpeg';

    public function extension(): string
    {
        return match ($this) {
            self::Wav => 'wav',
            self::Mpeg => 'mp3',
        };
    }
}
