<?php

namespace App\Actions\InventoryLocation;

use App\Models\InventoryLocationBalance;
use App\Models\Product;
use App\Models\Warehouse;

class InitializeInventoryLocationAction
{
    public function execute(Product $product): void
    {
        if ($product->stock <= 0 || $product->locationBalances()->exists()) {
            return;
        }

        $warehouse = Warehouse::query()->firstOrCreate(
            ['team_id' => $product->team_id, 'code' => 'UTAMA'],
            ['name' => 'Gudang Utama', 'is_default' => true, 'is_active' => true],
        );
        $bin = $warehouse->bins()->firstOrCreate(
            ['code' => 'DEFAULT'],
            ['name' => 'Penyimpanan Utama', 'is_default' => true, 'is_active' => true],
        );
        $batches = $product->inventoryBatches()->where('quantity', '>', 0)->get();

        if ($batches->isEmpty()) {
            InventoryLocationBalance::create([
                'team_id' => $product->team_id,
                'warehouse_id' => $warehouse->id,
                'warehouse_bin_id' => $bin->id,
                'product_id' => $product->id,
                'quantity' => $product->stock,
            ]);

            return;
        }

        foreach ($batches as $batch) {
            InventoryLocationBalance::create([
                'team_id' => $product->team_id,
                'warehouse_id' => $warehouse->id,
                'warehouse_bin_id' => $bin->id,
                'product_id' => $product->id,
                'inventory_batch_id' => $batch->id,
                'quantity' => $batch->quantity,
            ]);
        }
    }
}
