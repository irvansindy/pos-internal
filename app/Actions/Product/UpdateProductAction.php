<?php

namespace App\Actions\Product;

use App\Models\Product;

class UpdateProductAction
{
    public function execute(Product $product, array $data): Product
    {
        $product->update([
            'category_id' => $data['category_id'] ?? $product->category_id,
            'sku' => $data['sku'] ?? $product->sku,
            'name' => $data['name'] ?? $product->name,
            'description' => $data['description'] ?? $product->description,
            'price' => $data['price'] ?? $product->price,
            'cost' => $data['cost'] ?? $product->cost,
            'stock' => $data['stock'] ?? $product->stock,
            'min_stock' => $data['min_stock'] ?? $product->min_stock,
            'is_active' => $data['is_active'] ?? $product->is_active,
        ]);

        return $product;
    }
}
