<?php

namespace App\Http\Controllers;

use App\Actions\ProductStock\AdjustProductStockAction;
use App\Http\Requests\ProductStock\AdjustProductStockRequest;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductStockController extends Controller
{
    public function __construct(
        private AdjustProductStockAction $adjustProductStockAction,
    ) {}

    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $products = $team->products()
            ->with(['category:id,name'])
            ->withCount('stockMovements')
            ->orderBy('name')
            ->paginate(15);

        $recentMovements = $team->productStockMovements()
            ->with(['product:id,name,sku', 'user:id,name'])
            ->latest()
            ->limit(10)
            ->get();

        return Inertia::render('product-stocks/index', [
            'products' => $products,
            'recentMovements' => $recentMovements,
            'stats' => [
                'totalProducts' => $team->products()->count(),
                'totalStockUnits' => (int) $team->products()->sum('stock'),
                'lowStockProducts' => $team->products()
                    ->whereColumn('stock', '<=', 'min_stock')
                    ->where('stock', '>', 0)
                    ->count(),
                'outOfStockProducts' => $team->products()
                    ->where('stock', '<=', 0)
                    ->count(),
            ],
            'teamSlug' => $team->slug,
            'canAdjust' => $authUser->canOnCurrentTeam('product.stock.adjust'),
        ]);
    }

    public function adjust(AdjustProductStockRequest $request)
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $product = $this->resolveProduct($request);
        $movement = $this->adjustProductStockAction->execute($product, $authUser, $request->validated());

        Inertia::flash('success', "Stok produk '{$movement->product->name}' berhasil diperbarui.");

        return back();
    }

    public function history(Request $request): Response
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        abort_unless($team->members()->where('users.id', $authUser->id)->exists(), 403);

        setPermissionsTeamId($team->id);

        $product = $this->resolveProduct($request)->load('category:id,name');
        $movements = $product->stockMovements()
            ->with('user:id,name')
            ->latest()
            ->paginate(20);

        return Inertia::render('product-stocks/history', [
            'product' => $product,
            'movements' => $movements,
            'teamSlug' => $team->slug,
            'canAdjust' => $authUser->canOnCurrentTeam('product.stock.adjust'),
        ]);
    }

    private function resolveProduct(Request $request): Product
    {
        $team = $request->user()->currentTeam;
        $productId = $request->route('productId') ?? $request->route('product');

        return Product::where('team_id', $team->id)
            ->where('id', $productId)
            ->firstOrFail();
    }
}
