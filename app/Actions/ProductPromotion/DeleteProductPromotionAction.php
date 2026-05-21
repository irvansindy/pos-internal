<?php

namespace App\Actions\ProductPromotion;

use App\Models\ProductPromotion;
use Illuminate\Support\Facades\DB;

class DeleteProductPromotionAction
{
    public function execute(ProductPromotion $promotion): void
    {
        DB::transaction(function () use ($promotion) {
            // Cascade via FK, tapi eksplisit untuk kejelasan
            $promotion->triggers()->delete();
            $promotion->rewards()->delete();
            $promotion->delete();
        });
    }
}