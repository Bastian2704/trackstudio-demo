<?php

declare(strict_types=1);

use App\Enums\AudioContentType;
use App\Enums\ChangeCategory;
use App\Enums\UploadStatus;
use App\Models\Song;
use App\Models\Version;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-24 — Modelo y relaciones de Version
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-13.md §3.9 y §4 (#5).
|
*/

it('relaciona canciones y versiones y castea sus enums', function () {
    $song = Song::factory()->create();
    $current = Version::factory()->for($song)->create([
        'version_number' => 1,
        'content_type' => 'audio/mpeg',
        'upload_status' => 'fallida',
    ]);
    $deleted = Version::factory()->for($song)->create(['version_number' => 2]);
    $deleted->delete();
    Version::factory()->create();

    $current->refresh();

    // Sin SoftDeletes el borrado sería físico y versions() también la excluiría.
    expect(Version::withTrashed()->findOrFail($deleted->id)->trashed())->toBeTrue()
        ->and($current->content_type)->toBe(AudioContentType::Mpeg)
        ->and($current->upload_status)->toBe(UploadStatus::Fallida)
        ->and($current->song->is($song))->toBeTrue()
        ->and($song->versions()->pluck('versions.id')->all())->toBe([$current->id]);
});

// TS-90 §4 (#5).
it('castea la categoría del cambio', function () {
    $song = Song::factory()->create();
    $conMotivo = Version::factory()->for($song)->create([
        'version_number' => 1,
        'change_category' => 'mezcla',
        'description' => 'Subí la voz en el estribillo.',
    ]);
    $sinMotivo = Version::factory()->for($song)->create(['version_number' => 2]);

    expect($conMotivo->refresh()->change_category)->toBe(ChangeCategory::Mezcla)
        ->and($sinMotivo->refresh()->change_category)->toBeNull();
});
