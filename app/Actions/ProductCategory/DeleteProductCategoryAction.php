<?php

namespace App\Actions\ProductCategory;

use App\Models\ProductCategory;

class DeleteProductCategoryAction
{
    public function execute(ProductCategory $category): void
    {
        $category->delete();
    }
}
