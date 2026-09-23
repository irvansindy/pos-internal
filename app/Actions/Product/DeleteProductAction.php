<?php

namespace App\Actions\Product;

use App\Models\Product;
use App\Support\CatalogImageStorage;

class DeleteProductAction
{
    public function execute(Product $product): void
    {
        $imagePath = $product->image_path;
        $product->delete();
        CatalogImageStorage::delete($imagePath);
    }
}
