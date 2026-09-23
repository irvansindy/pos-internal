<?php

namespace App\Actions\PurchaseOrder;

use App\Actions\InventorySerial\RegisterInventorySerialsAction;
use App\Actions\ProductStock\AdjustProductStockAction;
use App\Models\InventoryBatch;
use App\Models\ProductStockMovement;
use App\Models\PurchaseOrder;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\WarehouseBin;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReceivePurchaseOrderAction
{
    public function __construct(
        private AdjustProductStockAction $adjustStock,
        private RegisterInventorySerialsAction $registerSerials,
    ) {}

    /** @param array<int|string, int> $quantities */
    public function execute(PurchaseOrder $order, User $user, array $quantities, array $batches = [], array $locations = [], array $serials = []): PurchaseOrder
    {
        return DB::transaction(function () use ($order, $user, $quantities, $batches, $locations, $serials) {
            $locked = PurchaseOrder::query()->with('items.product')->lockForUpdate()->findOrFail($order->id);

            if (! in_array($locked->status, [PurchaseOrder::STATUS_ORDERED, PurchaseOrder::STATUS_PARTIAL], true)) {
                throw ValidationException::withMessages(['purchase_order' => 'PO ini tidak dapat menerima barang lagi.']);
            }

            $receivedAny = false;
            foreach ($locked->items as $item) {
                $receive = (int) ($quantities[$item->id] ?? 0);
                $remaining = $item->quantity - $item->received_quantity;

                if ($receive < 0 || $receive > $remaining) {
                    throw ValidationException::withMessages(['quantities' => "Jumlah terima {$item->product->name} melebihi sisa PO."]);
                }
                if ($receive === 0) {
                    continue;
                }

                $bin = WarehouseBin::query()
                    ->whereKey($locations[$item->id]['warehouse_bin_id'] ?? null)
                    ->whereHas('warehouse', fn ($query) => $query->where('team_id', $locked->team_id))
                    ->first();

                if (! $bin) {
                    $bin = WarehouseBin::query()
                        ->where('is_default', true)
                        ->whereHas('warehouse', fn ($query) => $query->where('team_id', $locked->team_id)->where('is_default', true))
                        ->first();
                }

                if (! $bin) {
                    $warehouse = Warehouse::query()->firstOrCreate(
                        ['team_id' => $locked->team_id, 'code' => 'UTAMA'],
                        ['name' => 'Gudang Utama', 'is_default' => true, 'is_active' => true],
                    );
                    $bin = $warehouse->bins()->firstOrCreate(
                        ['code' => 'DEFAULT'],
                        ['name' => 'Penyimpanan Utama', 'is_default' => true, 'is_active' => true],
                    );
                }

                $itemSerials = $serials[$item->id] ?? [];
                if ($item->product->tracks_serials && count(array_filter($itemSerials)) !== $receive) {
                    throw ValidationException::withMessages([
                        "serials.{$item->id}" => "Isi tepat {$receive} nomor serial untuk {$item->product->name}.",
                    ]);
                }

                $receivedAny = true;
                $this->adjustStock->execute($item->product, $user, [
                    'type' => ProductStockMovement::TYPE_IN,
                    'quantity' => $receive,
                    'note' => "Penerimaan {$locked->order_number}",
                    'reference_type' => PurchaseOrder::class,
                    'reference_id' => $locked->id,
                    'batch_number' => $batches[$item->id]['batch_number'] ?? null,
                    'expires_at' => $batches[$item->id]['expires_at'] ?? null,
                    'purchase_order_item_id' => $item->id,
                    'warehouse_bin_id' => $bin->id,
                ]);

                if ($item->product->tracks_serials) {
                    $batch = $item->product->tracks_batches
                        ? InventoryBatch::query()
                            ->where('product_id', $item->product_id)
                            ->where('batch_number', $batches[$item->id]['batch_number'])
                            ->first()
                        : null;
                    $this->registerSerials->execute($item->product, $item, $bin, $itemSerials, $batch);
                }
                $item->product->update(['cost' => $item->unit_cost]);
                $item->increment('received_quantity', $receive);
            }

            if (! $receivedAny) {
                throw ValidationException::withMessages(['quantities' => 'Isi minimal satu jumlah barang yang diterima.']);
            }

            $allReceived = $locked->items()->whereColumn('received_quantity', '<', 'quantity')->doesntExist();
            $locked->update([
                'status' => $allReceived ? PurchaseOrder::STATUS_RECEIVED : PurchaseOrder::STATUS_PARTIAL,
                'received_at' => $allReceived ? now() : null,
            ]);

            return $locked->refresh()->load(['supplier', 'items.product']);
        });
    }
}
