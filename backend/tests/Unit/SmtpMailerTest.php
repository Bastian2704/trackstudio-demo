<?php

declare(strict_types=1);

use App\Contracts\MailerContract;
use App\Mail\ProductionAccessGrantedMail;
use App\Mail\SmtpMailer;
use App\Models\Production;
use Illuminate\Mail\Transport\ResendTransport;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| TS-31 — MailerContract real (C4)
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-20.md §3.7 y §4 (#24, #25). Los feature tests
| usan un doble del contrato; aquí se prueba que la implementación registrada
| envía de verdad por el mailer de Laravel, sin cola, y que no se traga fallos.
| #31: Railway no deja salir SMTP desde staging; el transporte es la API HTTP
| de Resend (enmienda del 2026-11-18).
|
*/

function correoDeAcceso(): ProductionAccessGrantedMail
{
    return new ProductionAccessGrantedMail(Production::factory()->make(['artist_id' => (string) Str::uuid()]));
}

it('registra SmtpMailer como implementación del contrato', function () {
    expect(app(MailerContract::class))->toBeInstanceOf(SmtpMailer::class);
});

it('envía de verdad por el mailer configurado', function () {
    Mail::fake();
    $correo = correoDeAcceso();

    app(MailerContract::class)->send('artista@ejemplo.test', $correo);

    Mail::assertSent(ProductionAccessGrantedMail::class, fn (ProductionAccessGrantedMail $enviado): bool => $enviado === $correo
        && $enviado->hasTo('artista@ejemplo.test'));
    Mail::assertNothingQueued();
});

it('propaga el fallo del transporte', function () {
    config(['mail.default' => 'fallido', 'mail.mailers.fallido' => ['transport' => 'transporte-que-no-existe']]);

    expect(fn () => app(MailerContract::class)->send('artista@ejemplo.test', correoDeAcceso()))
        ->toThrow(InvalidArgumentException::class);
});

it('el transporte resend de la API HTTP está disponible', function () {
    config(['services.resend.key' => 're_clave_de_prueba']);

    expect(Mail::mailer('resend')->getSymfonyTransport())->toBeInstanceOf(ResendTransport::class);
});
