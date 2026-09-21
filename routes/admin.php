<?php

use App\Http\Controllers\Admin\CustomPlanRequestController;
use App\Http\Controllers\Admin\PlatformAuditController;
use App\Http\Controllers\Admin\PlatformDashboardController;
use App\Http\Controllers\Admin\PlatformOrganizationController;
use App\Http\Controllers\Admin\PlatformPlanController;
use App\Http\Middleware\EnsurePlatformAdmin;
use Illuminate\Support\Facades\Route;

// Cross-tenant admin panel — deliberately NOT team-scoped. See
// App\Http\Middleware\EnsurePlatformAdmin for why this doesn't use the
// existing Spatie team-permission system.
Route::middleware(['auth', 'verified', EnsurePlatformAdmin::class])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/', PlatformDashboardController::class)->name('dashboard');

        Route::get('organizations', [PlatformOrganizationController::class, 'index'])
            ->name('organizations.index');
        Route::get('organizations/{organization}', [PlatformOrganizationController::class, 'show'])
            ->name('organizations.show');
        Route::put('organizations/{organization}/subscription-status', [PlatformOrganizationController::class, 'updateSubscriptionStatus'])
            ->name('organizations.subscription-status.update');

        Route::get('plans', [PlatformPlanController::class, 'index'])->name('plans.index');
        Route::put('plans/{plan}', [PlatformPlanController::class, 'update'])->name('plans.update');

        Route::get('audits', [PlatformAuditController::class, 'index'])->name('audits.index');

        Route::get('custom-plan-requests', [CustomPlanRequestController::class, 'index'])
            ->name('custom-plan-requests.index');

        Route::post('custom-plan-requests/{customPlanRequest}/review', [CustomPlanRequestController::class, 'review'])
            ->name('custom-plan-requests.review');
    });
