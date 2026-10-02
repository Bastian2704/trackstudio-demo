<?php

declare(strict_types=1);

use App\Http\Controllers\HealthController;
use App\Http\Controllers\MeController;
use App\Http\Controllers\RbacCheckController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);
Route::get('/me', MeController::class)->middleware('auth:auth0-api');
Route::post('/rbac-check', RbacCheckController::class)
    ->middleware([
        'auth:auth0-api',
        'can:perform-producer-action',
    ]);
