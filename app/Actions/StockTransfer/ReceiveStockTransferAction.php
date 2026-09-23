<?php

namespace App\Actions\StockTransfer;

use App\Actions\ProductStock\AdjustProductStockAction;
use App\Models\InventoryBatch;
use App\Models\InventorySerial;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\StockTransfer;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReceiveStockTransferAction
{
    public function __construct(private AdjustProductStockAction $adjustStock) {}

    public function execute(StockTransfer $transfer, User $user): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $user) {
            $locked = StockTransfer::query()->with(['items.fromProduct', 'items.batchAllocations.sourceBatch', 'items.serials'])->lockForUpdate()->findOrFail($transfer->id);

            if ($locked->status !== StockTransfer::STATUS_IN_TRANSIT) {
                throw ValidationException::withMessages(['transfer' => 'Hanya transfer dalam perjalanan yang dapat diterima.']);
            }

            foreach ($locked->items as $item) {
                $source = $item->fromProduct;
                $destination = Product::firstOrCreate(
                    ['team_id' => $locked->to_team_id, 'sku' => $source->sku],
                    [
                        'category_id' => null,
                        'name' => $source->name,
                        'description' => $source->description,
                        'price' => $source->price,
                        'cost' => $source->cost,
                        'stock' => 0,
                        'min_stock' => $source->min_stock,
                        'base_unit' => $source->base_unit,
                        'barcode' => null,
                        'tracks_batches' => $source->tracks_batches,
                        'tracks_serials' => $source->tracks_serials,
                        'is_active' => true,
                    ],
                );

                $warehouse = Warehouse::query()->firstOrCreate(
                    ['team_id' => $locked->to_team_id, 'code' => 'UTAMA'],
                    ['name' => 'Gudang Utama', 'is_default' => true, 'is_active' => true],
                );
                $defaultBin = $warehouse->bins()->firstOrCreate(
                    ['code' => 'DEFAULT'],
                    ['name' => 'Penyimpanan Utama', 'is_default' => true, 'is_active' => true],
                );

                if ($source->tracks_batches) {
                    foreach ($item->batchAllocations as $allocation) {
                        $sourceBatch = $allocation->sourceBatch;
                        $destinationBinId = $allocation->to_warehouse_bin_id ?: $defaultBin->id;
                        $this->adjustStock->execute($destination, $user, [
                            'type' => ProductStockMovement::TYPE_IN,
                            'quantity' => $allocation->quantity,
                            'note' => "Penerimaan transfer {$locked->transfer_number}",
                            'reference_type' => StockTransfer::class,
                            'reference_id' => $locked->id,
                            'batch_number' => $sourceBatch->batch_number,
                            'expires_at' => $sourceBatch->expires_at,
                            'warehouse_bin_id' => $destinationBinId,
                        ]);
                        $destinationBatch = InventoryBatch::query()
                            ->where('product_id', $destination->id)
                            ->where('batch_number', $sourceBatch->batch_number)
                            ->firstOrFail();
                        $allocation->update(['to_inventory_batch_id' => $destinationBatch->id, 'to_warehouse_bin_id' => $destinationBinId]);
                    }
                } else {
                    $this->adjustStock->execute($destination, $user, [
                        'type' => ProductStockMovement::TYPE_IN,
                        'quantity' => $item->quantity,
                        'note' => "Penerimaan transfer {$locked->transfer_number}",
                        'reference_type' => StockTransfer::class,
                        'reference_id' => $locked->id,
                        'warehouse_bin_id' => $defaultBin->id,
                    ]);
                }

                if ($source->tracks_serials) {
                    $serials = InventorySerial::query()
                        ->whereIn('id', $item->serials->pluck('inventory_serial_id'))
                        ->lockForUpdate()
                        ->get();

                    foreach ($serials as $serial) {
                        $allocation = $item->batchAllocations
                            ->first(fn ($row) => (int) $row->from_inventory_batch_id === (int) $serial->inventory_batch_id);

                        $serial->update([
                            'team_id' => $locked->to_team_id,
                            'product_id' => $destination->id,
                            'inventory_batch_id' => $allocation?->to_inventory_batch_id,
                            'warehouse_bin_id' => $allocation?->to_warehouse_bin_id ?? $defaultBin->id,
                            'status' => InventorySerial::STATUS_IN_STOCK,
                        ]);
                    }
                }
                $item->update(['to_product_id' => $destination->id]);
            }

            $locked->update(['status' => StockTransfer::STATUS_RECEIVED, 'received_by' => $user->id, 'received_at' => now()]);

            return $locked->refresh();
        });
    }
}
