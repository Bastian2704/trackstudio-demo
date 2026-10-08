<?php

declare(strict_types=1);

use App\Enums\ProductionFormat;
use App\Models\Artist;
use App\Models\Production;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| TS-19 — Modelo y relaciones de Production
|--------------------------------------------------------------------------
|
| Spec: docs/specs/backend/HU-08.md §3.6 y §4 (#1).
|
*/

it('castea el formato y pertenece a su artista', function () {
    $artist = Artist::factory()->create();
    $production = Production::factory()->create([
        'artist_id' => $artist->id,
        'format' => 'ep',
    ]);

    expect($production->format)->toBe(ProductionFormat::Ep)
        ->and($production->artist->is($artist))->toBeTrue();
});

it('expone desde el artista solo sus producciones vigentes', function () {
    $artist = Artist::factory()->create();
    $current = Production::factory()->create(['artist_id' => $artist->id]);
    Production::factory()->create(['artist_id' => $artist->id])->delete();

    expect($artist->productions()->pluck('productions.id')->all())->toBe([$current->id]);
});
