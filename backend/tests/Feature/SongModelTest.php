<?php

declare(strict_types=1);

use App\Enums\SongStatus;
use App\Models\Production;
use App\Models\Song;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-21 — Modelo y relaciones de Song
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-10.md §3.6 y §4 (#29–#30).
|
*/

it('castea el estado y pertenece a su producción', function () {
    $production = Production::factory()->create();
    $song = Song::factory()->create([
        'production_id' => $production->id,
        'status' => 'finalizada',
    ]);

    expect($song->status)->toBe(SongStatus::Finalizada)
        ->and($song->production->is($production))->toBeTrue();
});

it('expone desde la producción solo sus canciones vigentes', function () {
    $production = Production::factory()->create();
    $current = Song::factory()->create(['production_id' => $production->id]);
    Song::factory()->create(['production_id' => $production->id])->delete();
    Song::factory()->create();

    expect($production->songs()->pluck('songs.id')->all())->toBe([$current->id]);
});
