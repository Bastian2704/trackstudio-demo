<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Production;
use Carbon\CarbonImmutable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Sin ShouldQueue: no hay worker y el envío va dentro de la transacción*/
final class ArtistInvitationMail extends Mailable
{
    public function __construct(
        public readonly Production $production,
        private readonly string $token,
        public readonly CarbonImmutable $expiresAt,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Te invitaron a Track Studio');
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.artist-invitation',
            with: [
                'productionName' => $this->production->name,
                'url' => config('app.frontend_url').'/invitacion/'.$this->token,
                'expiresAt' => $this->expiresAt->setTimezone('America/Guayaquil')->format('d/m/Y H:i'),
            ],
        );
    }
}
