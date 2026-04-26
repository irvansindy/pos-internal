<?php

use App\Http\Middleware\EnsureTeamPermission;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectIfAuthenticated;
use App\Http\Middleware\SetTeamContext;
use App\Http\Middleware\SetTeamUrlDefaults;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
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
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        /**
         * Override RedirectIfAuthenticated (middleware 'guest') bawaan Laravel.
         * Default-nya pakai route('dashboard') yang butuh {current_team}.
         * Versi kita pakai URL absolut /{team-slug}/dashboard.
         */
        $middleware->alias([
            'guest'              => RedirectIfAuthenticated::class,
            'team.context'       => SetTeamContext::class,
            'team.permission'    => EnsureTeamPermission::class,
            'role'               => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission'         => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();