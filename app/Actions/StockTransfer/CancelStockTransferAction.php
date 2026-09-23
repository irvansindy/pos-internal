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

class CancelStockTransferAction
{
    public function __construct(private AdjustProductStockAction $adjustStock) {}

    public function execute(StockTransfer $transfer, User $user): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $user) {
            $locked = StockTransfer::query()
                ->with(['items.batchAllocations.sourceBatch', 'items.serials.inventorySerial'])
                ->lockForUpdate()
                ->findOrFail($transfer->id);

            if (! in_array($locked->status, [StockTransfer::STATUS_PENDING, StockTransfer::STATUS_IN_TRANSIT], true)) {
                throw ValidationException::withMessages(['transfer' => 'Transfer ini tidak dapat dibatalkan.']);
            }

            if ($locked->status === StockTransfer::STATUS_IN_TRANSIT) {
                foreach ($locked->items as $item) {
                    $source = Product::query()->where('team_id', $locked->from_team_id)->findOrFail($item->from_product_id);
                    if ($source->tracks_batches) {
                        foreach ($item->batchAllocations as $allocation) {
                            $this->adjustStock->execute($source, $user, [
                                'type' => ProductStockMovement::TYPE_IN,
                                'quantity' => $allocation->quantity,
                                'note' => "Pembatalan transfer {$locked->transfer_number}",
                                'reference_type' => StockTransfer::class,
                                'reference_id' => $locked->id,
                                'batch_number' => $allocation->sourceBatch->batch_number,
                                'expires_at' => $allocation->sourceBatch->expires_at,
                                'warehouse_bin_id' => $allocation->from_warehouse_bin_id,
                            ]);
                        }
                    } elseif ($source->tracks_serials) {
                        foreach ($item->serials->groupBy(fn ($row) => $row->inventorySerial?->warehouse_bin_id ?? 'default') as $group) {
                            $this->adjustStock->execute($source, $user, [
                                'type' => ProductStockMovement::TYPE_IN,
                                'quantity' => $group->count(),
                                'note' => "Pembatalan transfer {$locked->transfer_number}",
                                'reference_type' => StockTransfer::class,
                                'reference_id' => $locked->id,
                                'warehouse_bin_id' => $group->first()->inventorySerial?->warehouse_bin_id,
                            ]);
                        }
                    } else {
                        $this->adjustStock->execute($source, $user, [
                            'type' => ProductStockMovement::TYPE_IN,
                            'quantity' => $item->quantity,
                            'note' => "Pembatalan transfer {$locked->transfer_number}",
                            'reference_type' => StockTransfer::class,
                            'reference_id' => $locked->id,
                        ]);
                    }

                    if ($source->tracks_serials) {
                        InventorySerial::query()
                            ->whereIn('id', $item->serials->pluck('inventory_serial_id'))
                            ->where('status', InventorySerial::STATUS_IN_TRANSIT)
                            ->update(['status' => InventorySerial::STATUS_IN_STOCK]);
                    }
                }
            }

            $locked->update(['status' => StockTransfer::STATUS_CANCELED, 'canceled_at' => now()]);

            return $locked->refresh();
        });
    }
}
