<?php

declare(strict_types=1);

namespace App\Contracts;

use Illuminate\Mail\Mailable;

interface MailerContract
{
    /**
     * Envía el correo de forma síncrona.
     *
     * @throws \Throwable si el transporte falla; nunca se traga el error
     */
    public function send(string $to, Mailable $mail): void;
}
