<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Production;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Sin ShouldQueue: no hay worker y el envío va dentro de la transacción (HU-20 §3.7). */
final class ProductionAccessGrantedMail extends Mailable
{
    public function __construct(public readonly Production $production) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Tienes acceso a una nueva producción');
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.production-access-granted',
            with: [
                'productionName' => $this->production->name,
                'url' => config('app.frontend_url'),
            ],
        );
    }
}
