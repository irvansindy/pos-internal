<?php

namespace App\Actions\InventorySerial;

use App\Models\InventoryBatch;
use App\Models\InventorySerial;
use App\Models\Product;
use App\Models\PurchaseOrderItem;
use App\Models\WarehouseBin;
use Illuminate\Validation\ValidationException;

class RegisterInventorySerialsAction
{
    /** @param array<int, string> $serialNumbers */
    public function execute(Product $product, PurchaseOrderItem $item, WarehouseBin $bin, array $serialNumbers, ?InventoryBatch $batch = null): void
    {
        $serialNumbers = collect($serialNumbers)
            ->map(fn ($serial) => trim((string) $serial))
            ->filter()
            ->values();

        if ($serialNumbers->duplicates()->isNotEmpty()) {
            throw ValidationException::withMessages(['serials' => 'Nomor serial dalam satu penerimaan harus unik.']);
        }

        $existing = InventorySerial::query()
            ->where('team_id', $product->team_id)
            ->whereIn('serial_number', $serialNumbers)
            ->exists();

        if ($existing) {
            throw ValidationException::withMessages(['serials' => 'Salah satu nomor serial sudah terdaftar di toko ini.']);
        }

        foreach ($serialNumbers as $serialNumber) {
            InventorySerial::create([
                'team_id' => $product->team_id,
                'product_id' => $product->id,
                'inventory_batch_id' => $batch?->id,
                'warehouse_bin_id' => $bin->id,
                'purchase_order_item_id' => $item->id,
                'serial_number' => $serialNumber,
                'status' => InventorySerial::STATUS_IN_STOCK,
            ]);
        }
    }
}
