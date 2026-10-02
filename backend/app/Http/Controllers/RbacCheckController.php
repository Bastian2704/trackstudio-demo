<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Response;

final class RbacCheckController extends Controller
{
    public function __invoke(): Response
    {
        return response()->noContent();
    }
}
