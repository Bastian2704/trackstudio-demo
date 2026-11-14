<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\DashboardResource;
use App\Services\DashboardService;

final class DashboardController
{
    public function __construct(private DashboardService $dashboard) {}

    public function __invoke(): DashboardResource
    {
        return new DashboardResource($this->dashboard->summary());
    }
}
