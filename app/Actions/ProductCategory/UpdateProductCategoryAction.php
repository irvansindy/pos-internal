<?php

namespace App\Actions\ProductCategory;

use App\Models\ProductCategory;

class UpdateProductCategoryAction
{
    public function execute(ProductCategory $category, array $data): ProductCategory
    {
        $category->update([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return $category;
    }
}
