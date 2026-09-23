<?php

namespace App\Actions\StockTransfer;

use App\Actions\ProductStock\AdjustProductStockAction;
use App\Models\InventorySerial;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\StockTransfer;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ShipStockTransferAction
{
    public function __construct(private AdjustProductStockAction $adjustStock) {}

    public function execute(StockTransfer $transfer, User $user): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $user) {
            $locked = StockTransfer::query()->with(['items.batchAllocations', 'items.serials.inventorySerial'])->lockForUpdate()->findOrFail($transfer->id);

            if ($locked->status !== StockTransfer::STATUS_PENDING) {
                throw ValidationException::withMessages(['transfer' => 'Hanya transfer pending yang dapat dikirim.']);
            }

            foreach ($locked->items as $item) {
                $product = Product::query()->where('team_id', $locked->from_team_id)->findOrFail($item->from_product_id);
                if ($product->tracks_batches) {
                    foreach ($item->batchAllocations as $allocation) {
                        $this->adjustStock->execute($product, $user, [
                            'type' => ProductStockMovement::TYPE_OUT,
                            'quantity' => $allocation->quantity,
                            'note' => "Pengiriman transfer {$locked->transfer_number}",
                            'reference_type' => StockTransfer::class,
                            'reference_id' => $locked->id,
                            'inventory_batch_id' => $allocation->from_inventory_batch_id,
                            'warehouse_bin_id' => $allocation->from_warehouse_bin_id,
                        ]);
                    }
                } elseif ($product->tracks_serials) {
                    foreach ($item->serials->groupBy(fn ($row) => $row->inventorySerial?->warehouse_bin_id ?? 'default') as $group) {
                        $this->adjustStock->execute($product, $user, [
                            'type' => ProductStockMovement::TYPE_OUT,
                            'quantity' => $group->count(),
                            'note' => "Pengiriman transfer {$locked->transfer_number}",
                            'reference_type' => StockTransfer::class,
                            'reference_id' => $locked->id,
                            'warehouse_bin_id' => $group->first()->inventorySerial?->warehouse_bin_id,
                        ]);
                    }
                } else {
                    $this->adjustStock->execute($product, $user, [
                        'type' => ProductStockMovement::TYPE_OUT,
                        'quantity' => $item->quantity,
                        'note' => "Pengiriman transfer {$locked->transfer_number}",
                        'reference_type' => StockTransfer::class,
                        'reference_id' => $locked->id,
                    ]);
                }

                if ($product->tracks_serials) {
                    InventorySerial::query()
                        ->whereIn('id', $item->serials->pluck('inventory_serial_id'))
                        ->update(['status' => InventorySerial::STATUS_IN_TRANSIT]);
                }
            }

            $locked->update(['status' => StockTransfer::STATUS_IN_TRANSIT, 'shipped_by' => $user->id, 'shipped_at' => now()]);

            return $locked->refresh();
        });
    }
}
