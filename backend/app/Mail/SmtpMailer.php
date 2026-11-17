<?php

declare(strict_types=1);

namespace App\Mail;

use App\Contracts\MailerContract;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;

final class SmtpMailer implements MailerContract
{
    public function send(string $to, Mailable $mail): void
    {
        Mail::to($to)->send($mail);
    }
}
