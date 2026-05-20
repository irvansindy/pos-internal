<?php

namespace App\Actions\ProductPackage;

use App\Models\ProductPackage;
use App\Models\ProductPackageAddonGroup;
use Illuminate\Support\Facades\DB;

class UpdateProductPackageAction
{
    public function execute(ProductPackage $package, array $data): ProductPackage
    {
        return DB::transaction(function () use ($package, $data) {
            $package->update([
                'category_id' => $data['category_id'] ?? $package->category_id,
                'sku'         => $data['sku'] ?? $package->sku,
                'name'        => $data['name'] ?? $package->name,
                'description' => $data['description'] ?? $package->description,
                'base_price'  => $data['base_price'] ?? $package->base_price,
                'is_active'   => $data['is_active'] ?? $package->is_active,
            ]);

            if (array_key_exists('items', $data)) {
                $this->syncItems($package, $data['items']);
            }

            if (array_key_exists('addon_groups', $data)) {
                $this->syncAddonGroups($package, $data['addon_groups']);
            }

            return $package->refresh()->load(['items.product', 'addonGroups.options.product']);
        });
    }

    private function syncItems(ProductPackage $package, array $items): void
    {
        $package->items()->delete();

        foreach ($items as $item) {
            $package->items()->create([
                'product_id' => $item['product_id'],
                'quantity'   => $item['quantity'] ?? 1,
                'note'       => $item['note'] ?? null,
            ]);
        }
    }

    private function syncAddonGroups(ProductPackage $package, array $groups): void
    {
        $package->addonGroups()->each(fn ($g) => $g->options()->delete());
        $package->addonGroups()->delete();

        foreach ($groups as $index => $groupData) {
            /** @var ProductPackageAddonGroup $group */
            $group = $package->addonGroups()->create([
                'name'               => $groupData['name'],
                'default_product_id' => $groupData['default_product_id'] ?? null,
                'is_required'        => $groupData['is_required'] ?? false,
                'sort_order'         => $groupData['sort_order'] ?? $index,
            ]);

            foreach ($groupData['options'] ?? [] as $optIndex => $option) {
                $group->options()->create([
                    'product_id'   => $option['product_id'],
                    'extra_charge' => $option['extra_charge'] ?? 0,
                    'sort_order'   => $option['sort_order'] ?? $optIndex,
                ]);
            }
        }
    }
}