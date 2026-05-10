<?php

namespace App\Actions\Product;

use App\Models\Product;
use App\Models\Team;

class CreateProductAction
{
    public function execute(Team $team, array $data): Product
    {
        return $team->products()->create([
            'category_id' => $data['category_id'] ?? null,
            'sku' => $data['sku'],
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'price' => $data['price'],
            'cost' => $data['cost'] ?? null,
            'stock' => $data['stock'] ?? 0,
            'min_stock' => $data['min_stock'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
        ]);
    }
}
