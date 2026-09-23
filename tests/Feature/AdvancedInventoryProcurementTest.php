<?php

use App\Actions\Pos\CreatePosTransactionAction;
use App\Actions\Pos\VoidTransactionAction;
use App\Actions\Product\CreateProductAction;
use App\Actions\ProductStock\AdjustProductStockAction;
use App\Actions\PurchaseInvoice\AllocateLandedCostAction;
use App\Actions\PurchaseInvoice\CreatePurchaseInvoiceAction;
use App\Actions\PurchaseInvoice\RecordPurchaseInvoicePaymentAction;
use App\Actions\PurchaseOrder\CreatePurchaseOrderAction;
use App\Actions\PurchaseOrder\ReceivePurchaseOrderAction;
use App\Actions\StockTransfer\CancelStockTransferAction;
use App\Actions\StockTransfer\CreateStockTransferAction;
use App\Actions\StockTransfer\ReceiveStockTransferAction;
use App\Actions\StockTransfer\ShipStockTransferAction;
use App\Actions\SupplierReturn\CreateSupplierReturnAction;
use App\Actions\Transaction\CreateTransactionReturnAction;
use App\Models\InventoryLocationBalance;
use App\Models\InventorySerial;
use App\Models\ProductStockMovement;
use App\Models\PurchaseInvoice;
use App\Models\Supplier;
use App\Models\Team;
use App\Models\TransactionItemSerial;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function inventoryWarehouse(Team $team, string $code = 'UTAMA'): array
{
    $warehouse = Warehouse::create([
        'team_id' => $team->id,
        'code' => $code,
        'name' => "Gudang {$code}",
        'is_default' => $code === 'UTAMA',
        'is_active' => true,
    ]);
    $bin = $warehouse->bins()->create([
        'code' => 'DEFAULT',
        'name' => 'Rak Utama',
        'is_default' => true,
        'is_active' => true,
    ]);

    return [$warehouse, $bin];
}

test('purchase receipt registers batch serials and warehouse bin balance', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;
    [, $bin] = inventoryWarehouse($team);
    $product = app(CreateProductAction::class)->execute($team, [
        'sku' => 'SERIAL-001',
        'name' => 'Perangkat Serial',
        'price' => 150000,
        'cost' => 100000,
        'stock' => 0,
        'tracks_batches' => true,
        'tracks_serials' => true,
    ]);
    $supplier = Supplier::create(['team_id' => $team->id, 'name' => 'Supplier Serial']);
    $order = app(CreatePurchaseOrderAction::class)->execute($team, $owner, [
        'supplier_id' => $supplier->id,
        'items' => [['product_id' => $product->id, 'quantity' => 2, 'unit_cost' => 100000]],
    ]);
    $item = $order->items->first();

    app(ReceivePurchaseOrderAction::class)->execute(
        $order,
        $owner,
        [$item->id => 2],
        [$item->id => ['batch_number' => 'B-2026', 'expires_at' => '2027-09-23']],
        [$item->id => ['warehouse_bin_id' => $bin->id]],
        [$item->id => ['SN-001', 'SN-002']],
    );

    $batch = $product->inventoryBatches()->where('batch_number', 'B-2026')->firstOrFail();
    expect($product->fresh()->stock)->toBe(2)
        ->and($batch->quantity)->toBe(2)
        ->and(InventoryLocationBalance::where('warehouse_bin_id', $bin->id)->where('inventory_batch_id', $batch->id)->value('quantity'))->toBe(2)
        ->and(InventorySerial::where('product_id', $product->id)->pluck('serial_number')->all())->toEqualCanonicalizing(['SN-001', 'SN-002']);

    $soldSerial = InventorySerial::where('serial_number', 'SN-001')->firstOrFail();
    $transaction = app(CreatePosTransactionAction::class)->execute($team, $owner, [
        'items' => [[
            'product_id' => $product->id,
            'quantity' => 1,
            'inventory_serial_ids' => [$soldSerial->id],
        ]],
        'payment_method' => 'cash',
        'paid_amount' => 150000,
    ]);

    expect($soldSerial->fresh()->status)->toBe(InventorySerial::STATUS_SOLD)
        ->and(TransactionItemSerial::where('transaction_item_id', $transaction->items->first()->id)->value('serial_number'))->toBe('SN-001')
        ->and($product->fresh()->stock)->toBe(1);

    app(CreateTransactionReturnAction::class)->execute($team, $owner, [
        'transaction_item_id' => $transaction->items->first()->id,
        'quantity' => 1,
        'restock' => true,
        'status' => 'approved',
        'inventory_serial_ids' => [$soldSerial->id],
    ]);

    expect($soldSerial->fresh()->status)->toBe(InventorySerial::STATUS_IN_STOCK)
        ->and($product->fresh()->stock)->toBe(2);

    $voidSerial = InventorySerial::where('serial_number', 'SN-002')->firstOrFail();
    $voidTransaction = app(CreatePosTransactionAction::class)->execute($team, $owner, [
        'items' => [[
            'product_id' => $product->id,
            'quantity' => 1,
            'inventory_serial_ids' => [$voidSerial->id],
        ]],
        'payment_method' => 'cash',
        'paid_amount' => 150000,
    ]);
    app(VoidTransactionAction::class)->execute($team, $voidTransaction, $owner, 'Tes serial');

    expect($voidSerial->fresh()->status)->toBe(InventorySerial::STATUS_IN_STOCK)
        ->and($product->fresh()->stock)->toBe(2);
});

test('purchase invoice drives payable landed cost payment and supplier return', function () {
    $owner = User::factory()->create();
    $team = $owner->currentTeam;
    [, $bin] = inventoryWarehouse($team);
    $product = app(CreateProductAction::class)->execute($team, [
        'sku' => 'PROC-001',
        'name' => 'Barang Procurement',
        'price' => 200,
        'cost' => 80,
        'stock' => 0,
        'tracks_batches' => true,
    ]);
    $supplier = Supplier::create(['team_id' => $team->id, 'name' => 'Supplier Procurement']);
    $order = app(CreatePurchaseOrderAction::class)->execute($team, $owner, [
        'supplier_id' => $supplier->id,
        'items' => [['product_id' => $product->id, 'quantity' => 2, 'unit_cost' => 100]],
    ]);
    $orderItem = $order->items->first();
    app(ReceivePurchaseOrderAction::class)->execute(
        $order,
        $owner,
        [$orderItem->id => 2],
        [$orderItem->id => ['batch_number' => 'RET-01']],
        [$orderItem->id => ['warehouse_bin_id' => $bin->id]],
    );

    $invoice = app(CreatePurchaseInvoiceAction::class)->execute($team, $owner, [
        'purchase_order_id' => $order->id,
        'supplier_invoice_number' => 'SUP-INV-001',
        'invoice_date' => '2026-09-23',
        'due_date' => '2026-10-23',
    ]);
    app(AllocateLandedCostAction::class)->execute($invoice, $owner, [
        'description' => 'Ongkos kirim',
        'amount' => 20,
        'allocation_method' => 'value',
    ]);
    app(RecordPurchaseInvoicePaymentAction::class)->execute($invoice->fresh(), $owner, [
        'paid_at' => '2026-09-23',
        'amount' => 100,
        'method' => 'bank_transfer',
    ]);
    $invoiceItem = $invoice->items()->firstOrFail();
    $batch = $product->inventoryBatches()->where('batch_number', 'RET-01')->firstOrFail();
    app(CreateSupplierReturnAction::class)->execute($team, $owner, [
        'purchase_invoice_id' => $invoice->id,
        'returned_at' => '2026-09-23',
        'items' => [[
            'purchase_invoice_item_id' => $invoiceItem->id,
            'quantity' => 1,
            'inventory_batch_id' => $batch->id,
            'warehouse_bin_id' => $bin->id,
        ]],
    ]);

    $freshInvoice = $invoice->fresh();
    expect((float) $freshInvoice->subtotal)->toBe(200.0)
        ->and((float) $freshInvoice->landed_cost_total)->toBe(20.0)
        ->and((float) $freshInvoice->paid_total)->toBe(100.0)
        ->and((float) $freshInvoice->return_total)->toBe(100.0)
        ->and((float) $freshInvoice->balance_due)->toBe(20.0)
        ->and($freshInvoice->status)->toBe(PurchaseInvoice::STATUS_PARTIAL)
        ->and((float) $product->fresh()->cost)->toBe(110.0)
        ->and($product->fresh()->stock)->toBe(1);
});

test('inter-store transfer moves the explicitly selected batch and destination bin', function () {
    $owner = User::factory()->create();
    $organization = $owner->currentOrganization;
    $sourceTeam = $owner->currentTeam;
    $destinationTeam = Team::factory()->create(['organization_id' => $organization->id]);
    [, $sourceBin] = inventoryWarehouse($sourceTeam);
    [, $destinationBin] = inventoryWarehouse($destinationTeam);
    $product = app(CreateProductAction::class)->execute($sourceTeam, [
        'sku' => 'BATCH-XFER',
        'name' => 'Barang Batch',
        'price' => 200,
        'cost' => 100,
        'stock' => 0,
        'tracks_batches' => true,
        'tracks_serials' => true,
    ]);
    app(AdjustProductStockAction::class)->execute($product, $owner, [
        'type' => ProductStockMovement::TYPE_IN,
        'quantity' => 5,
        'note' => 'Saldo transfer test',
        'batch_number' => 'SALDO-AWAL',
        'warehouse_bin_id' => $sourceBin->id,
    ]);
    $sourceBatch = $product->inventoryBatches()->where('batch_number', 'SALDO-AWAL')->firstOrFail();
    $serial = InventorySerial::create([
        'team_id' => $sourceTeam->id,
        'product_id' => $product->id,
        'inventory_batch_id' => $sourceBatch->id,
        'warehouse_bin_id' => $sourceBin->id,
        'serial_number' => 'XFER-SN-001',
        'status' => InventorySerial::STATUS_IN_STOCK,
    ]);
    $cancelSerial = InventorySerial::create([
        'team_id' => $sourceTeam->id,
        'product_id' => $product->id,
        'inventory_batch_id' => $sourceBatch->id,
        'warehouse_bin_id' => $sourceBin->id,
        'serial_number' => 'XFER-SN-002',
        'status' => InventorySerial::STATUS_IN_STOCK,
    ]);
    $transfer = app(CreateStockTransferAction::class)->execute(
        $organization,
        $sourceTeam,
        $destinationTeam,
        $owner,
        [
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 1,
                'batches' => [[
                    'inventory_batch_id' => $sourceBatch->id,
                    'warehouse_bin_id' => $sourceBin->id,
                    'to_warehouse_bin_id' => $destinationBin->id,
                    'quantity' => 1,
                ]],
                'inventory_serial_ids' => [$serial->id],
            ]],
        ],
    );

    app(ShipStockTransferAction::class)->execute($transfer, $owner);
    app(ReceiveStockTransferAction::class)->execute($transfer->fresh(), $owner);

    $destinationProduct = $destinationTeam->products()->where('sku', 'BATCH-XFER')->firstOrFail();
    $destinationBatch = $destinationProduct->inventoryBatches()->where('batch_number', 'SALDO-AWAL')->firstOrFail();
    $allocation = $transfer->items()->firstOrFail()->batchAllocations()->firstOrFail();

    expect($sourceBatch->fresh()->quantity)->toBe(4)
        ->and($destinationBatch->quantity)->toBe(1)
        ->and($allocation->to_inventory_batch_id)->toBe($destinationBatch->id)
        ->and($allocation->to_warehouse_bin_id)->toBe($destinationBin->id)
        ->and(InventoryLocationBalance::where('warehouse_bin_id', $destinationBin->id)->where('inventory_batch_id', $destinationBatch->id)->value('quantity'))->toBe(1)
        ->and($serial->fresh()->team_id)->toBe($destinationTeam->id)
        ->and($serial->fresh()->product_id)->toBe($destinationProduct->id)
        ->and($serial->fresh()->inventory_batch_id)->toBe($destinationBatch->id)
        ->and($serial->fresh()->warehouse_bin_id)->toBe($destinationBin->id)
        ->and($serial->fresh()->status)->toBe(InventorySerial::STATUS_IN_STOCK);

    $canceledTransfer = app(CreateStockTransferAction::class)->execute(
        $organization,
        $sourceTeam,
        $destinationTeam,
        $owner,
        [
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 1,
                'batches' => [[
                    'inventory_batch_id' => $sourceBatch->id,
                    'warehouse_bin_id' => $sourceBin->id,
                    'to_warehouse_bin_id' => $destinationBin->id,
                    'quantity' => 1,
                ]],
                'inventory_serial_ids' => [$cancelSerial->id],
            ]],
        ],
    );
    app(ShipStockTransferAction::class)->execute($canceledTransfer, $owner);
    app(CancelStockTransferAction::class)->execute($canceledTransfer->fresh(), $owner);

    expect($sourceBatch->fresh()->quantity)->toBe(4)
        ->and($product->fresh()->stock)->toBe(4)
        ->and($cancelSerial->fresh()->status)->toBe(InventorySerial::STATUS_IN_STOCK)
        ->and($cancelSerial->fresh()->inventory_batch_id)->toBe($sourceBatch->id)
        ->and($cancelSerial->fresh()->warehouse_bin_id)->toBe($sourceBin->id);
});
