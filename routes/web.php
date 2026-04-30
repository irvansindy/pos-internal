<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ProductCategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductStockController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VoucherController;
use App\Http\Middleware\EnsureTeamMembership;
use App\Http\Middleware\EnsureTeamPermission;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

// ── PUBLIC ───────────────────────────────────────────────
// Tidak ada middleware auth — route ini untuk semua orang
Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

// ── AUTH ONLY (tanpa team requirement) ───────────────────
// Invitation accept dan team switch tidak memerlukan EnsureTeamMembership
// karena user sedang proses bergabung / beralih tim
Route::middleware(['auth'])->group(function () {
    Route::get(
        'invitations/{invitation}/accept',
        [TeamInvitationController::class, 'accept']
    )->name('invitations.accept');

    Route::post('/current-team/switch/{team:slug}', function (\App\Models\Team $team) {
        $user = request()->user();
        if ($user->switchTeam($team)) {
            return redirect()
                ->route('dashboard', ['current_team' => $team->slug])
                ->with('success', "Beralih ke tim: {$team->name}");
        }
        return back()->with('error', 'Tidak dapat beralih ke tim tersebut.');
    })->name('current-team.switch');
});

// ── TEAM-SCOPED ROUTES ────────────────────────────────────
// Semua route di sini memerlukan:
//   1. auth          — sudah login
//   2. verified      — email terverifikasi
//   3. EnsureTeamMembership — user adalah anggota team di URL
//
// Route Fortify (login, register, password reset, dll)
// TIDAK masuk sini — mereka diregister Fortify sendiri
// dengan middleware 'web' saja (lihat config/fortify.php: 'middleware' => ['web'])
Route::prefix('{current_team}')
    ->middleware(['auth', EnsureTeamMembership::class])
    ->group(function () {

        // Dashboard — tidak perlu permission khusus, semua member bisa akses
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

        // ── USER MANAGEMENT ───────────────────────────────
        Route::prefix('users')->name('users.')->group(function () {
            Route::middleware(EnsureTeamPermission::class.':user.view')->group(function () {
                Route::get('/', [UserController::class, 'index'])->name('index');
                Route::get('/{user}', [UserController::class, 'show'])->name('show');
            });
            Route::get('/{user}/edit', [UserController::class, 'edit'])->name('edit')
                ->middleware(EnsureTeamPermission::class.':user.update');
            Route::put('/{user}', [UserController::class, 'update'])->name('update')
                ->middleware(EnsureTeamPermission::class.':user.update');
            Route::delete('/{user}', [UserController::class, 'destroy'])->name('destroy')
                ->middleware(EnsureTeamPermission::class.':user.delete');
            Route::post('/{user}/reset-password', [UserController::class, 'resetUserPassword'])->name('reset-password')
                ->middleware(EnsureTeamPermission::class.':user.update');
        });

        Route::prefix('invitations')->name('invitations.')->middleware(EnsureTeamPermission::class.':user.invite')->group(function () {
            Route::get('/', [UserController::class, 'invitations'])->name('index');
            Route::post('/', [UserController::class, 'invite'])->name('store');
            Route::delete('/{invitation}', [UserController::class, 'cancelInvitation'])->name('destroy');
            Route::post('/resend/{invitation}', [UserController::class, 'resendInvitation'])->name('resend');
        });

        // ── ROLE & PERMISSION ─────────────────────────────
        Route::prefix('roles')->name('roles.')->group(function () {
            Route::middleware(EnsureTeamPermission::class.':role.view')->group(function () {
                Route::get('/', [RoleController::class, 'index'])->name('index');
                Route::get('/{role}', [RoleController::class, 'show'])->name('show');
            });
            Route::get('/create', [RoleController::class, 'create'])->name('create')
                ->middleware(EnsureTeamPermission::class.':role.create');
            Route::post('/', [RoleController::class, 'store'])->name('store')
                ->middleware(EnsureTeamPermission::class.':role.create');
            Route::get('/{role}/edit', [RoleController::class, 'edit'])->name('edit')
                ->middleware(EnsureTeamPermission::class.':role.update');
            Route::put('/{role}', [RoleController::class, 'update'])->name('update')
                ->middleware(EnsureTeamPermission::class.':role.update');
            Route::delete('/{role}', [RoleController::class, 'destroy'])->name('destroy')
                ->middleware(EnsureTeamPermission::class.':role.delete');
            Route::post('/{role}/permissions', [RoleController::class, 'syncPermissions'])->name('sync-permissions')
                ->middleware(EnsureTeamPermission::class.':permission.assign');
        });

        // Route::get('permissions', [PermissionController::class, 'index'])->name('permissions.index')
        //     ->middleware(EnsureTeamPermission::class.':permission.view');

        // Route::prefix('menus')->name('menus.')->middleware(EnsureTeamPermission::class.':role.update')->group(function () {
        //     Route::get('/', [MenuController::class, 'index'])->name('index');
        //     Route::post('/sync', [MenuController::class, 'sync'])->name('sync');
        // });

        // // ── PRODUCT ───────────────────────────────────────
        // Route::prefix('products')->name('products.')->group(function () {
        //     Route::middleware(EnsureTeamPermission::class.':product.view')->group(function () {
        //         Route::get('/', [ProductController::class, 'index'])->name('index');
        //         Route::get('/{product}', [ProductController::class, 'show'])->name('show');
        //     });
        //     Route::get('/create', [ProductController::class, 'create'])->name('create')
        //         ->middleware(EnsureTeamPermission::class.':product.create');
        //     Route::post('/', [ProductController::class, 'store'])->name('store')
        //         ->middleware(EnsureTeamPermission::class.':product.create');
        //     Route::get('/{product}/edit', [ProductController::class, 'edit'])->name('edit')
        //         ->middleware(EnsureTeamPermission::class.':product.update');
        //     Route::put('/{product}', [ProductController::class, 'update'])->name('update')
        //         ->middleware(EnsureTeamPermission::class.':product.update');
        //     Route::delete('/{product}', [ProductController::class, 'destroy'])->name('destroy')
        //         ->middleware(EnsureTeamPermission::class.':product.delete');
        // });

        // Route::prefix('product-categories')->name('product-categories.')->group(function () {
        //     Route::get('/', [ProductCategoryController::class, 'index'])->name('index')
        //         ->middleware(EnsureTeamPermission::class.':product.category.view');
        //     Route::post('/', [ProductCategoryController::class, 'store'])->name('store')
        //         ->middleware(EnsureTeamPermission::class.':product.category.create');
        //     Route::put('/{category}', [ProductCategoryController::class, 'update'])->name('update')
        //         ->middleware(EnsureTeamPermission::class.':product.category.update');
        //     Route::delete('/{category}', [ProductCategoryController::class, 'destroy'])->name('destroy')
        //         ->middleware(EnsureTeamPermission::class.':product.category.delete');
        // });

        // Route::prefix('product-stocks')->name('product-stocks.')->group(function () {
        //     Route::get('/', [ProductStockController::class, 'index'])->name('index')
        //         ->middleware(EnsureTeamPermission::class.':product.stock.view');
        //     Route::post('/{product}/adjust', [ProductStockController::class, 'adjust'])->name('adjust')
        //         ->middleware(EnsureTeamPermission::class.':product.stock.adjust');
        //     Route::get('/{product}/history', [ProductStockController::class, 'history'])->name('history')
        //         ->middleware(EnsureTeamPermission::class.':product.stock.view');
        // });

        // // ── POS / KASIR ───────────────────────────────────
        // Route::prefix('pos')->name('pos.')->middleware(EnsureTeamPermission::class.':transaction.create')->group(function () {
        //     Route::get('/', [PosController::class, 'index'])->name('index');
        //     Route::post('/transaction', [PosController::class, 'createTransaction'])->name('transaction.create');
        //     Route::post('/transaction/{transaction}/payment', [PosController::class, 'processPayment'])->name('transaction.payment');
        //     Route::get('/products/search', [PosController::class, 'searchProducts'])->name('products.search');
        //     Route::post('/voucher/validate', [PosController::class, 'validateVoucher'])->name('voucher.validate');
        // });

        // // ── TRANSACTIONS ──────────────────────────────────
        // Route::prefix('transactions')->name('transactions.')->group(function () {
        //     Route::middleware(EnsureTeamPermission::class.':transaction.view')->group(function () {
        //         Route::get('/', [TransactionController::class, 'index'])->name('index');
        //         Route::get('/{transaction}', [TransactionController::class, 'show'])->name('show');
        //     });
        //     Route::post('/{transaction}/void', [TransactionController::class, 'void'])->name('void')
        //         ->middleware(EnsureTeamPermission::class.':transaction.void');
        //     Route::get('/refunds', [TransactionController::class, 'refunds'])->name('refunds')
        //         ->middleware(EnsureTeamPermission::class.':transaction.refund');
        //     Route::post('/{transaction}/refund', [TransactionController::class, 'processRefund'])->name('refund')
        //         ->middleware(EnsureTeamPermission::class.':transaction.refund');
        //     Route::get('/returns', [TransactionController::class, 'returns'])->name('returns')
        //         ->middleware(EnsureTeamPermission::class.':transaction.return');
        //     Route::post('/{transaction}/return', [TransactionController::class, 'processReturn'])->name('return')
        //         ->middleware(EnsureTeamPermission::class.':transaction.return');
        // });

        // Route::prefix('vouchers')->name('vouchers.')->group(function () {
        //     Route::middleware(EnsureTeamPermission::class.':voucher.view')->group(function () {
        //         Route::get('/', [VoucherController::class, 'index'])->name('index');
        //         Route::get('/{voucher}', [VoucherController::class, 'show'])->name('show');
        //     });
        //     Route::get('/create', [VoucherController::class, 'create'])->name('create')
        //         ->middleware(EnsureTeamPermission::class.':voucher.create');
        //     Route::post('/', [VoucherController::class, 'store'])->name('store')
        //         ->middleware(EnsureTeamPermission::class.':voucher.create');
        //     Route::get('/{voucher}/edit', [VoucherController::class, 'edit'])->name('edit')
        //         ->middleware(EnsureTeamPermission::class.':voucher.update');
        //     Route::put('/{voucher}', [VoucherController::class, 'update'])->name('update')
        //         ->middleware(EnsureTeamPermission::class.':voucher.update');
        //     Route::delete('/{voucher}', [VoucherController::class, 'destroy'])->name('destroy')
        //         ->middleware(EnsureTeamPermission::class.':voucher.delete');
        // });

        // // ── REPORTS ───────────────────────────────────────
        // Route::prefix('reports')->name('reports.')->group(function () {
        //     Route::get('/sales', [ReportController::class, 'sales'])->name('sales')
        //         ->middleware(EnsureTeamPermission::class.':report.sales');
        //     Route::get('/stock', [ReportController::class, 'stock'])->name('stock')
        //         ->middleware(EnsureTeamPermission::class.':report.stock');
        //     Route::get('/cashier', [ReportController::class, 'cashier'])->name('cashier')
        //         ->middleware(EnsureTeamPermission::class.':report.cashier');
        //     Route::get('/export', [ReportController::class, 'export'])->name('export')
        //         ->middleware(EnsureTeamPermission::class.':report.export');
        // });

        // // ── SETTINGS ─────────────────────────────────────
        // Route::prefix('settings')->name('settings.')->middleware(EnsureTeamPermission::class.':setting.system')->group(function () {
        //     Route::get('/system', [SettingController::class, 'system'])->name('system');
        //     Route::put('/system', [SettingController::class, 'updateSystem'])->name('system.update');
        //     Route::get('/membership', [SettingController::class, 'membership'])->name('membership')
        //         ->middleware(EnsureTeamPermission::class.':membership.manage');
        //     Route::put('/membership', [SettingController::class, 'updateMembership'])->name('membership.update')
        //         ->middleware(EnsureTeamPermission::class.':membership.manage');
        // });
    });

require __DIR__.'/settings.php';