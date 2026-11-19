<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Version;
use App\Services\CommentService;
use Auth0\Laravel\Users\StatelessUserContract;
use Illuminate\Http\JsonResponse;

final class CommentController extends Controller
{
    public function __construct(private CommentService $comments) {}

    public function store(StoreCommentRequest $request, Version $version): JsonResponse
    {
        /** @var StatelessUserContract $autor */
        $autor = $request->user();

        return (new CommentResource(
            $this->comments->addComment($autor, $version, $request->validated())
        ))->response()->setStatusCode(201);
    }
}
