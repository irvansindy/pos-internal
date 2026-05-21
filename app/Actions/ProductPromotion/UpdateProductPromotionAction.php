<?php

namespace App\Actions\ProductPromotion;

use App\Models\ProductPromotion;
use Illuminate\Support\Facades\DB;

class UpdateProductPromotionAction
{
    public function execute(ProductPromotion $promotion, array $data): ProductPromotion
    {
        return DB::transaction(function () use ($promotion, $data) {
            $promotion->update([
                'name'        => $data['name']        ?? $promotion->name,
                'description' => $data['description'] ?? $promotion->description,
                'type'        => $data['type']        ?? $promotion->type,
                'is_active'   => $data['is_active']   ?? $promotion->is_active,
                'starts_at'   => array_key_exists('starts_at', $data) ? $data['starts_at'] : $promotion->starts_at,
                'ends_at'     => array_key_exists('ends_at', $data)   ? $data['ends_at']   : $promotion->ends_at,
            ]);

            if (array_key_exists('triggers', $data)) {
                $this->syncTriggers($promotion, $data['triggers']);
            }

            if (array_key_exists('rewards', $data)) {
                $this->syncRewards($promotion, $data['rewards']);
            }

            return $promotion->refresh()->load(['triggers.product:id,name', 'rewards.product:id,name']);
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