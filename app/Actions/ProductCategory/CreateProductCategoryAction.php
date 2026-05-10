<?php

namespace App\Actions\ProductCategory;

use App\Models\ProductCategory;
use App\Models\Team;

class CreateProductCategoryAction
{
    public function execute(Team $team, array $data): ProductCategory
    {
        return ProductCategory::create([
            'team_id' => $team->id,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);
    }
}
