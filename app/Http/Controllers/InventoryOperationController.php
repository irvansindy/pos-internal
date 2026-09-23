<?php

namespace App\Http\Controllers;

use App\Actions\InventoryLocation\InitializeInventoryLocationAction;
use App\Actions\PurchaseInvoice\AllocateLandedCostAction;
use App\Actions\PurchaseInvoice\CreatePurchaseInvoiceAction;
use App\Actions\PurchaseInvoice\RecordPurchaseInvoicePaymentAction;
use App\Actions\PurchaseOrder\CreatePurchaseOrderAction;
use App\Actions\PurchaseOrder\ReceivePurchaseOrderAction;
use App\Actions\StockOpname\CreateStockOpnameAction;
use App\Actions\SupplierReturn\CreateSupplierReturnAction;
use App\Models\PurchaseInvoice;
use App\Models\PurchaseOrder;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InventoryOperationController extends Controller
{
    public function index(Request $request, InitializeInventoryLocationAction $initializeLocation): Response
    {
        $team = $request->user()->currentTeam;
        $this->ensureDefaultWarehouse($team->id);
        $team->products()->where('stock', '>', 0)->each(fn ($product) => $initializeLocation->execute($product));

        return Inertia::render('inventory/operations', [
            'teamSlug' => $team->slug,
            'products' => $team->products()->where('is_active', true)->orderBy('name')->get(['id', 'sku', 'name', 'variant_name', 'base_unit', 'tracks_batches', 'tracks_serials', 'stock', 'cost']),
            'suppliers' => $team->suppliers()->orderBy('name')->get(),
            'warehouses' => $team->warehouses()->with(['bins' => fn ($query) => $query->with(['balances.product:id,name,sku', 'balances.batch:id,batch_number,expires_at'])->orderBy('code')])->orderBy('name')->get(),
            'purchaseOrders' => $team->purchaseOrders()->with(['supplier:id,name', 'items.product:id,name,sku,base_unit,tracks_batches,tracks_serials'])->latest()->get(),
            'purchaseInvoices' => $team->purchaseInvoices()->with(['supplier:id,name', 'purchaseOrder:id,order_number', 'items.product:id,name,sku,tracks_batches,tracks_serials', 'payments', 'landedCosts'])->latest()->get(),
            'supplierReturns' => $team->supplierReturns()->with(['supplier:id,name', 'items'])->latest()->limit(30)->get(),
            'serials' => $team->products()->with(['inventorySerials' => fn ($query) => $query->with('bin.warehouse')->latest()])->where('tracks_serials', true)->get(['id', 'name', 'sku']),
            'expiringBatches' => $team->products()->with(['inventoryBatches' => fn ($query) => $query->where('quantity', '>', 0)->orderByRaw('expires_at IS NULL')->orderBy('expires_at')])->whereHas('inventoryBatches', fn ($query) => $query->where('quantity', '>', 0))->get(['id', 'name', 'sku', 'base_unit']),
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
        $data = $request->validate([
            'quantities' => ['required', 'array'],
            'quantities.*' => ['nullable', 'integer', 'min:0'],
            'batches' => ['nullable', 'array'],
            'batches.*.batch_number' => ['nullable', 'string', 'max:100'],
            'batches.*.expires_at' => ['nullable', 'date'],
            'locations' => ['nullable', 'array'],
            'locations.*.warehouse_bin_id' => ['nullable', 'integer'],
            'serials' => ['nullable', 'array'],
            'serials.*' => ['nullable', 'array'],
            'serials.*.*' => ['nullable', 'string', 'max:160'],
        ]);
        $trackedItemIds = $purchaseOrder->items()->whereHas('product', fn ($query) => $query->where('tracks_batches', true))->pluck('id');
        foreach ($trackedItemIds as $itemId) {
            if ((int) ($data['quantities'][$itemId] ?? 0) > 0 && blank($data['batches'][$itemId]['batch_number'] ?? null)) {
                throw ValidationException::withMessages(["batches.{$itemId}.batch_number" => 'Nomor batch wajib diisi untuk produk yang melacak batch.']);
            }
        }
        $action->execute(
            $purchaseOrder,
            $request->user(),
            $data['quantities'],
            $data['batches'] ?? [],
            $data['locations'] ?? [],
            $data['serials'] ?? [],
        );

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

    public function storeWarehouse(Request $request)
    {
        $team = $request->user()->currentTeam;
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32', Rule::unique('warehouses')->where('team_id', $team->id)],
            'name' => ['required', 'string', 'max:255'],
            'default_bin_code' => ['required', 'string', 'max:48'],
            'default_bin_name' => ['required', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($team, $data) {
            $warehouse = $team->warehouses()->create([
                'code' => strtoupper($data['code']),
                'name' => $data['name'],
                'is_active' => true,
            ]);
            $warehouse->bins()->create([
                'code' => strtoupper($data['default_bin_code']),
                'name' => $data['default_bin_name'],
                'is_default' => true,
                'is_active' => true,
            ]);
        });

        return back()->with('success', 'Gudang dan bin awal ditambahkan.');
    }

    public function storeWarehouseBin(Request $request, Warehouse $warehouse)
    {
        abort_unless($warehouse->team_id === $request->user()->currentTeam->id, 404);
        $data = $request->validate([
            'code' => ['required', 'string', 'max:48', Rule::unique('warehouse_bins')->where('warehouse_id', $warehouse->id)],
            'name' => ['required', 'string', 'max:255'],
        ]);
        $warehouse->bins()->create(['code' => strtoupper($data['code']), 'name' => $data['name'], 'is_active' => true]);

        return back()->with('success', 'Bin gudang ditambahkan.');
    }

    public function storePurchaseInvoice(Request $request, CreatePurchaseInvoiceAction $action)
    {
        $data = $request->validate([
            'purchase_order_id' => ['required', 'integer'],
            'supplier_invoice_number' => ['required', 'string', 'max:100'],
            'invoice_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:invoice_date'],
            'note' => ['nullable', 'string', 'max:1000'],
            'quantities' => ['nullable', 'array'],
            'quantities.*' => ['nullable', 'integer', 'min:0'],
        ]);
        $invoice = $action->execute($request->user()->currentTeam, $request->user(), $data);

        return back()->with('success', "Invoice {$invoice->document_number} dicatat.");
    }

    public function storePurchaseInvoicePayment(Request $request, PurchaseInvoice $purchaseInvoice, RecordPurchaseInvoicePaymentAction $action)
    {
        abort_unless($purchaseInvoice->team_id === $request->user()->currentTeam->id, 404);
        $data = $request->validate([
            'paid_at' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', Rule::in(['cash', 'bank_transfer', 'giro', 'other'])],
            'reference' => ['nullable', 'string', 'max:100'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);
        $action->execute($purchaseInvoice, $request->user(), $data);

        return back()->with('success', 'Pembayaran hutang supplier dicatat.');
    }

    public function storeLandedCost(Request $request, PurchaseInvoice $purchaseInvoice, AllocateLandedCostAction $action)
    {
        abort_unless($purchaseInvoice->team_id === $request->user()->currentTeam->id, 404);
        $data = $request->validate([
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'allocation_method' => ['required', Rule::in(['quantity', 'value'])],
        ]);
        $action->execute($purchaseInvoice, $request->user(), $data);

        return back()->with('success', 'Landed cost dialokasikan ke item invoice.');
    }

    public function storeSupplierReturn(Request $request, CreateSupplierReturnAction $action)
    {
        $data = $request->validate([
            'purchase_invoice_id' => ['required', 'integer'],
            'returned_at' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.purchase_invoice_item_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.inventory_batch_id' => ['nullable', 'integer'],
            'items.*.warehouse_bin_id' => ['nullable', 'integer'],
            'items.*.inventory_serial_ids' => ['nullable', 'array'],
            'items.*.inventory_serial_ids.*' => ['integer'],
        ]);
        $return = $action->execute($request->user()->currentTeam, $request->user(), $data);

        return back()->with('success', "Retur {$return->return_number} selesai dan stok berkurang.");
    }

    private function ensureDefaultWarehouse(int $teamId): void
    {
        $warehouse = Warehouse::query()->firstOrCreate(
            ['team_id' => $teamId, 'code' => 'UTAMA'],
            ['name' => 'Gudang Utama', 'is_default' => true, 'is_active' => true],
        );
        $warehouse->bins()->firstOrCreate(
            ['code' => 'DEFAULT'],
            ['name' => 'Penyimpanan Utama', 'is_default' => true, 'is_active' => true],
        );
    }
}
