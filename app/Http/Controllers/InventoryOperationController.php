<?php

namespace App\Http\Controllers;

use App\Actions\PurchaseOrder\CreatePurchaseOrderAction;
use App\Actions\PurchaseOrder\ReceivePurchaseOrderAction;
use App\Actions\StockOpname\CreateStockOpnameAction;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryOperationController extends Controller
{
    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;

        return Inertia::render('inventory/operations', [
            'teamSlug' => $team->slug,
            'products' => $team->products()->where('is_active', true)->orderBy('name')->get(['id', 'sku', 'name', 'stock', 'cost']),
            'suppliers' => $team->suppliers()->orderBy('name')->get(),
            'purchaseOrders' => $team->purchaseOrders()->with(['supplier:id,name', 'items.product:id,name,sku'])->latest()->get(),
            'stockOpnames' => $team->stockOpnames()->with(['creator:id,name', 'items.product:id,name,sku'])->latest()->limit(30)->get(),
        ]);
    }

    public function storeSupplier(Request $request)
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255'], 'phone' => ['nullable', 'string', 'max:32'], 'email' => ['nullable', 'email'], 'address' => ['nullable', 'string', 'max:1000']]);
        $request->user()->currentTeam->suppliers()->create($data);

        return back()->with('success', 'Supplier ditambahkan.');
    }

    public function storePurchaseOrder(Request $request, CreatePurchaseOrderAction $action)
    {
        $data = $request->validate([
            'supplier_id' => ['required', 'integer'], 'expected_at' => ['nullable', 'date'], 'note' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'], 'items.*.product_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1'], 'items.*.unit_cost' => ['required', 'numeric', 'min:0'],
        ]);
        $order = $action->execute($request->user()->currentTeam, $request->user(), $data);

        return back()->with('success', "PO {$order->order_number} dibuat.");
    }

    public function receivePurchaseOrder(Request $request, PurchaseOrder $purchaseOrder, ReceivePurchaseOrderAction $action)
    {
        abort_unless($purchaseOrder->team_id === $request->user()->currentTeam->id, 404);
        $data = $request->validate(['quantities' => ['required', 'array'], 'quantities.*' => ['nullable', 'integer', 'min:0']]);
        $action->execute($purchaseOrder, $request->user(), $data['quantities']);

        return back()->with('success', 'Penerimaan PO dicatat dan stok diperbarui.');
    }

    public function storeStockOpname(Request $request, CreateStockOpnameAction $action)
    {
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'], 'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'distinct'], 'items.*.physical_qty' => ['required', 'integer', 'min:0'],
            'items.*.note' => ['nullable', 'string', 'max:255'],
        ]);
        $opname = $action->execute($request->user()->currentTeam, $request->user(), $data);

        return back()->with('success', "Opname {$opname->opname_number} selesai.");
    }
}
