<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\MailerContract;
use App\Enums\ArtistStatus;
use App\Enums\ErrorCode;
use App\Exceptions\ApiProblemException;
use App\Mail\ArtistInvitationMail;
use App\Mail\ProductionAccessGrantedMail;
use App\Models\Artist;
use App\Models\Production;
use App\Models\ProductionAccess;
use App\Models\User;
use Auth0\Laravel\Users\StatelessUserContract;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

final class ProductionAccessService
{
    private const INVITATION_TTL_DAYS = 7;

    public function __construct(private MailerContract $mailer) {}

    public function grant(StatelessUserContract $productor, Production $production, Artist $artist): ProductionAccess
    {
        $this->ensureCanGrant($production, $artist);

        $usuario = User::firstOrCreate(['auth0_sub' => $productor->getAuthIdentifier()]);

        return DB::transaction(function () use ($usuario, $production, $artist): ProductionAccess {
            $access = ProductionAccess::create([
                'production_id' => $production->id,
                'artist_id' => $artist->id,
                'granted_by' => $usuario->id,
                'granted_at' => CarbonImmutable::now(),
            ]);

            $mail = $artist->user_id === null
                ? $this->issueInvitation($artist, $production)
                : new ProductionAccessGrantedMail($production);

            try {
                $this->mailer->send($artist->email, $mail);
            } catch (Throwable $e) {
                Log::error('production_access.mail_failed', [
                    'artist_id' => $artist->id,
                    'production_id' => $production->id,
                    'exception' => $e::class,
                ]);

                throw new ApiProblemException(
                    ErrorCode::MailDeliveryFailed,
                    'No se pudo enviar el correo al artista. El acceso no se otorgó; inténtalo de nuevo.',
                );
            }

            return $access;
        });
    }

    /**
     * @return Collection<int, ProductionAccess>
     */
    public function history(Production $production): Collection
    {
        return $production->accesses()->orderByDesc('granted_at')->get();
    }

    public function revoke(ProductionAccess $access): void
    {
        if ($access->revoked_at !== null) {
            return;
        }

        $access->update(['revoked_at' => CarbonImmutable::now()]);

        Log::info('production_access.revoked', [
            'access_id' => $access->id,
            'production_id' => $access->production_id,
            'artist_id' => $access->artist_id,
        ]);
    }

    private function ensureCanGrant(Production $production, Artist $artist): void
    {
        $error = match (true) {
            $artist->id !== $production->artist_id => 'Solo se puede dar acceso al artista de la producción.',
            $artist->status === ArtistStatus::Inactivo => 'El artista está inactivo.',
            $production->accesses()->where('artist_id', $artist->id)->whereNull('revoked_at')->exists() => 'El artista ya tiene acceso a esta producción.',
            default => null,
        };

        if ($error !== null) {
            throw ValidationException::withMessages(['artist_id' => $error]);
        }
    }

    /**
     * Emite un token nuevo que sustituye al anterior y guarda solo su SHA-256.
     */
    private function issueInvitation(Artist $artist, Production $production): ArtistInvitationMail
    {
        $token = Str::random(64);
        $expiresAt = CarbonImmutable::now()->addDays(self::INVITATION_TTL_DAYS);

        $artist->update([
            'invitation_token' => hash('sha256', $token),
            'invited_at' => CarbonImmutable::now(),
            'invitation_expires_at' => $expiresAt,
        ]);

        return new ArtistInvitationMail($production, $token, $expiresAt);
    }
}
