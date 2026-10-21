<?php

declare(strict_types=1);

use App\Enums\AudioContentType;
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
    Version::factory()->for($song)->create(['version_number' => 2])->delete();
    Version::factory()->create();

    $current->refresh();

    expect($current->content_type)->toBe(AudioContentType::Mpeg)
        ->and($current->upload_status)->toBe(UploadStatus::Fallida)
        ->and($current->song->is($song))->toBeTrue()
        ->and($song->versions()->pluck('versions.id')->all())->toBe([$current->id]);
});
