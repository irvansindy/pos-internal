<?php

namespace App\Actions\ProductPromotion;

use App\Models\ProductPromotion;
use App\Models\Team;
use Illuminate\Support\Facades\DB;

class CreateProductPromotionAction
{
    /**
     * Payload:
     * [
     *   'name'        => string,
     *   'description' => string|null,
     *   'type'        => 'bxgy',
     *   'is_active'   => bool,
     *   'starts_at'   => string|null  (Y-m-d),
     *   'ends_at'     => string|null  (Y-m-d),
     *   'triggers'    => [
     *       ['product_id' => int, 'min_quantity' => int],
     *       ...
     *   ],
     *   'rewards'     => [
     *       ['product_id' => int, 'quantity' => int, 'extra_charge' => numeric],
     *       ...
     *   ],
     * ]
     */
    public function execute(Team $team, array $data): ProductPromotion
    {
        return DB::transaction(function () use ($team, $data) {
            /** @var ProductPromotion $promotion */
            $promotion = $team->productPromotions()->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'type'        => $data['type'] ?? ProductPromotion::TYPE_BXGY,
                'is_active'   => $data['is_active'] ?? true,
                'starts_at'   => $data['starts_at'] ?? null,
                'ends_at'     => $data['ends_at'] ?? null,
            ]);

            $this->syncTriggers($promotion, $data['triggers'] ?? []);
            $this->syncRewards($promotion, $data['rewards'] ?? []);

            return $promotion->load(['triggers.product:id,name', 'rewards.product:id,name']);
        });
    }

    private function syncTriggers(ProductPromotion $promotion, array $triggers): void
    {
        $promotion->triggers()->delete();

        foreach ($triggers as $trigger) {
            $promotion->triggers()->create([
                'product_id'   => $trigger['product_id'],
                'min_quantity' => $trigger['min_quantity'],
            ]);
        }
    }

    private function syncRewards(ProductPromotion $promotion, array $rewards): void
    {
        $promotion->rewards()->delete();

        foreach ($rewards as $reward) {
            $promotion->rewards()->create([
                'product_id'   => $reward['product_id'],
                'quantity'     => $reward['quantity'],
                'extra_charge' => $reward['extra_charge'] ?? 0,
            ]);
        }
    }
}