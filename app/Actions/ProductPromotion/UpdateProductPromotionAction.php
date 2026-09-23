<?php

namespace App\Actions\ProductPromotion;

use App\Models\ProductPromotion;
use App\Models\Team;
use App\Support\CatalogImageStorage;
use App\Support\TeamCatalogReferenceGuard;
use Illuminate\Support\Facades\DB;
use Throwable;

class UpdateProductPromotionAction
{
    public function execute(ProductPromotion $promotion, array $data): ProductPromotion
    {
        $oldImagePath = $promotion->image_path;
        $newImagePath = isset($data['image'])
            ? CatalogImageStorage::store($data['image'], "catalog/teams/{$promotion->team_id}/promotions")
            : null;
        $imagePath = $newImagePath
            ?? (($data['remove_image'] ?? false) ? null : $oldImagePath);

        try {
            $updatedPromotion = DB::transaction(function () use ($promotion, $data, $imagePath) {
                TeamCatalogReferenceGuard::ensure(Team::query()->findOrFail($promotion->team_id), [
                    ...collect($data['triggers'] ?? [])->pluck('product_id'),
                    ...collect($data['rewards'] ?? [])->pluck('product_id'),
                ]);

                $promotion->update([
                    'name' => $data['name'] ?? $promotion->name,
                    'description' => $data['description'] ?? $promotion->description,
                    'image_path' => $imagePath,
                    'type' => $data['type'] ?? $promotion->type,
                    'is_active' => $data['is_active'] ?? $promotion->is_active,
                    'starts_at' => array_key_exists('starts_at', $data) ? $data['starts_at'] : $promotion->starts_at,
                    'ends_at' => array_key_exists('ends_at', $data) ? $data['ends_at'] : $promotion->ends_at,
                ]);

                if (array_key_exists('triggers', $data)) {
                    $this->syncTriggers($promotion, $data['triggers']);
                }

                if (array_key_exists('rewards', $data)) {
                    $this->syncRewards($promotion, $data['rewards']);
                }

                return $promotion->refresh()->load(['triggers.product:id,name,image_path', 'rewards.product:id,name,image_path']);
            });
        } catch (Throwable $exception) {
            CatalogImageStorage::delete($newImagePath);

            throw $exception;
        }

        if ($imagePath !== $oldImagePath) {
            CatalogImageStorage::delete($oldImagePath);
        }

        return $updatedPromotion;
    }

    private function syncTriggers(ProductPromotion $promotion, array $triggers): void
    {
        $promotion->triggers()->delete();

        foreach ($triggers as $trigger) {
            $promotion->triggers()->create([
                'product_id' => $trigger['product_id'],
                'min_quantity' => $trigger['min_quantity'],
            ]);
        }
    }

    private function syncRewards(ProductPromotion $promotion, array $rewards): void
    {
        $promotion->rewards()->delete();

        foreach ($rewards as $reward) {
            $promotion->rewards()->create([
                'product_id' => $reward['product_id'],
                'quantity' => $reward['quantity'],
                'extra_charge' => $reward['extra_charge'] ?? 0,
            ]);
        }
    }
}
