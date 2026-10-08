<?php

declare(strict_types=1);

use App\Http\Controllers\ArtistController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MeController;
use App\Http\Controllers\ProductionController;
use App\Http\Controllers\RbacCheckController;
use App\Models\Artist;
use App\Models\Production;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::get('/me', MeController::class)->middleware('auth:auth0-api');

Route::post('/rbac-check', RbacCheckController::class)
    ->middleware([
        'auth:auth0-api',
        'can:perform-producer-action',
    ]);

Route::post('/artists', [ArtistController::class, 'store'])
    ->middleware([
        'auth:auth0-api',
        'can:create,'.Artist::class,
    ]);

Route::get('/artists/{artist}', [ArtistController::class, 'show'])
    ->whereUuid('artist')
    ->middleware([
        'auth:auth0-api',
        'can:view,artist',
    ]);

Route::put('/artists/{artist}', [ArtistController::class, 'update'])
    ->whereUuid('artist')
    ->middleware([
        'auth:auth0-api',
        'can:update,artist',
    ]);

Route::post('/productions', [ProductionController::class, 'store'])
    ->middleware([
        'auth:auth0-api',
        'can:create,'.Production::class,
    ]);

Route::get('/productions/{production}', [ProductionController::class, 'show'])
    ->whereUuid('production')
    ->middleware([
        'auth:auth0-api',
        'can:view,production',
    ]);

Route::put('/productions/{production}', [ProductionController::class, 'update'])
    ->whereUuid('production')
    ->middleware([
        'auth:auth0-api',
        'can:update,production',
    ]);

Route::delete('/productions/{production}', [ProductionController::class, 'destroy'])
    ->whereUuid('production')
    ->middleware([
        'auth:auth0-api',
        'can:delete,production',
    ]);
