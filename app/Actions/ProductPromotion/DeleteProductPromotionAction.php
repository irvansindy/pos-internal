<?php

namespace App\Actions\ProductPromotion;

use App\Models\ProductPromotion;
use App\Support\CatalogImageStorage;
use Illuminate\Support\Facades\DB;

class DeleteProductPromotionAction
{
    public function execute(ProductPromotion $promotion): void
    {
        $imagePath = $promotion->image_path;

        DB::transaction(function () use ($promotion) {
            // Cascade via FK, tapi eksplisit untuk kejelasan
            $promotion->triggers()->delete();
            $promotion->rewards()->delete();
            $promotion->delete();
        });

        CatalogImageStorage::delete($imagePath);
    }
}
