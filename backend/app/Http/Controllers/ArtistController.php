<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreArtistRequest;
use App\Http\Requests\UpdateArtistRequest;
use App\Models\Artist;

final class ArtistController extends Controller
{
    public function store(StoreArtistRequest $request): void {}

    public function show(Artist $artist): void {}

    public function update(UpdateArtistRequest $request, Artist $artist): void {}
}
