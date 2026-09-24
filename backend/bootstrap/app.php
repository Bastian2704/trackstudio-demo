<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Sentry\Laravel\Integration;
use Sentry\State\Scope;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

use function Sentry\configureScope;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api/v1',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $traceId = static function (Request $request): string {
            $attribute = 'trackstudio.trace_id';
            $existing = $request->attributes->get($attribute);

            if (is_string($existing) && $existing !== '') {
                return $existing;
            }

            $generated = (string) Str::ulid();

            $request->attributes->set($attribute, $generated);

            return $generated;
        };

        $exceptions->reportable(
            static function (Throwable $exception) use ($traceId): void {
                $request = request();

                if (! $request instanceof Request || ! $request->is('api/*')) {
                    return;
                }

                $resolvedTraceId = $traceId($request);

                configureScope(
                    static function (Scope $scope) use ($resolvedTraceId): void {
                        $scope->setTag('trace_id', $resolvedTraceId);
                    },
                );
            },
        );

        Integration::handles($exceptions);

        $problem = static function (
            ErrorCode $code,
            Request $request,
            string $detail,
            array $additional = [],
        ) use ($traceId): JsonResponse {
            $body = [
                'type' => $code->type(),
                'title' => $code->title(),
                'status' => $code->status(),
                'code' => $code->value,
                'detail' => $detail,
                'instance' => $request->getPathInfo(),
                'trace_id' => $traceId($request),
            ];

            return response()->json(
                array_merge($body, $additional),
                $code->status(),
                ['Content-Type' => 'application/problem+json'],
            );
        };
        $exceptions->render(
            function (NotFoundHttpException $exception, Request $request) use ($problem): ?JsonResponse {
                if (! $request->is('api/*')) {
                    return null;
                }

                $code = ErrorCode::ResourceNotFound;

                return $problem(
                    $code,
                    $request,
                    'El recurso solicitado no existe.',
                );

            },
        );

        $exceptions->render(
            function (ValidationException $exception, Request $request) use ($problem): ?JsonResponse {
                if (! $request->is('api/*')) {
                    return null;
                }

                $code = ErrorCode::ValidationError;

                return $problem(
                    $code,
                    $request,
                    'Revisa los campos señalados e inténtalo nuevamente.',
                    ['errors' => $exception->errors()],
                );
            },
        );

        $exceptions->render(
            function (AccessDeniedHttpException $exception, Request $request) use ($problem): ?JsonResponse {
                if (! $request->is('api/*')) {
                    return null;
                }

                $code = ErrorCode::Forbidden;

                return $problem(
                    $code,
                    $request,
                    'No tienes permiso para realizar esta acción.',
                );
            },
        );

        $exceptions->render(
            function (AuthenticationException $exception, Request $request) use ($problem): ?JsonResponse {
                if (! $request->is('api/*')) {
                    return null;
                }

                return $problem(
                    ErrorCode::Unauthenticated,
                    $request,
                    'Debes autenticarte para acceder a este recurso.',
                );
            },
        );

        $exceptions->render(
            function (ThrottleRequestsException $exception, Request $request) use ($problem): ?JsonResponse {
                if (! $request->is('api/*')) {
                    return null;
                }

                return $problem(
                    ErrorCode::RateLimited,
                    $request,
                    'Has realizado demasiadas solicitudes. Inténtalo nuevamente más tarde.',
                );
            },
        );

        $exceptions->render(
            function (Throwable $exception, Request $request) use ($problem): ?JsonResponse {
                if (! $request->is('api/*')) {
                    return null;
                }

                $code = ErrorCode::InternalError;

                $detail = config('app.debug') === true
                    ? $exception->getMessage()
                    : 'Ocurrió un error interno. Inténtalo nuevamente.';

                return $problem($code, $request, $detail);
            },
        );
    })->create();
