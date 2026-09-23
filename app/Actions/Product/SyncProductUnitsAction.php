<?php

namespace App\Actions\Product;

use App\Models\Product;

class SyncProductUnitsAction
{
    public function execute(Product $product, array $units): void
    {
        $keptIds = [];

        foreach ($units as $unit) {
            $record = $product->units()->updateOrCreate(
                ['id' => $unit['id'] ?? null],
                [
                    'team_id' => $product->team_id,
                    'name' => $unit['name'],
                    'abbreviation' => $unit['abbreviation'],
                    'conversion_quantity' => $unit['conversion_quantity'],
                    'barcode' => $unit['barcode'] ?: null,
                    'selling_price' => $unit['selling_price'],
                    'is_active' => $unit['is_active'] ?? true,
                ],
            );
            $keptIds[] = $record->id;
        }

        $product->units()->when($keptIds !== [], fn ($query) => $query->whereNotIn('id', $keptIds))->delete();
    }
}
