<?php

use App\Http\Middleware\EnsureTeamPermission;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectIfAuthenticated;
use App\Http\Middleware\SetTeamContext;
use App\Http\Middleware\SetTeamUrlDefaults;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            Route::middleware('web')->group(base_path('routes/webhooks.php'));
            Route::middleware('web')->group(base_path('routes/admin.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        /**
         * Midtrans calls this endpoint without a browser session. Its request
         * authenticity is verified using the Midtrans signature in the
         * notification handler.
         */
        $middleware->preventRequestForgery(except: [
            'webhooks/midtrans',
        ]);

        /**
         * Append ke web group — JANGAN pakai ->group('web', [...])
         * karena itu menimpa seluruh default middleware.
         *
         * Order penting:
         * 1. SetTeamUrlDefaults — set URL::defaults(['current_team' => ...])
         *    harus sebelum middleware lain yang bisa generate URL (termasuk guest)
         * 2. HandleInertiaRequests — share props ke semua Inertia responses
         */
        $middleware->web(append: [
            SetTeamUrlDefaults::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        /**
         * Override RedirectIfAuthenticated (middleware 'guest') bawaan Laravel.
         * Default-nya pakai route('dashboard') yang butuh {current_team}.
         * Versi kita pakai URL absolut /{team-slug}/dashboard.
         */
        $middleware->alias([
            'guest' => RedirectIfAuthenticated::class,
            'team.context' => SetTeamContext::class,
            'team.permission' => EnsureTeamPermission::class,
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        /**
         * Handle 419 CSRF token mismatch — kembalikan ke halaman sebelumnya
         * dengan pesan error yang jelas, daripada menampilkan blank page.
         */
        $exceptions->respond(function (Response $response) {
            if ($response->getStatusCode() === 419) {
                return back()->with('error', 'Sesi Anda telah habis. Silakan muat ulang halaman dan coba lagi.');
            }

            return $response;
        });
    })->create();
