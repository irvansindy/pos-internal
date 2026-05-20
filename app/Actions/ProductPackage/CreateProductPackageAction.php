<?php

namespace App\Actions\ProductPackage;

use App\Models\ProductPackage;
use App\Models\ProductPackageAddonGroup;
use App\Models\Team;
use Illuminate\Support\Facades\DB;

class CreateProductPackageAction
{
    /**
     * Payload structure:
     * [
     *   'category_id'  => int|null,
     *   'sku'          => string,
     *   'name'         => string,
     *   'description'  => string|null,
     *   'base_price'   => numeric,
     *   'is_active'    => bool,
     *   'items'        => [
     *       ['product_id' => int, 'quantity' => int, 'note' => string|null],
     *       ...
     *   ],
     *   'addon_groups' => [
     *       [
     *           'name'               => string,
     *           'default_product_id' => int|null,
     *           'is_required'        => bool,
     *           'sort_order'         => int,
     *           'options'            => [
     *               ['product_id' => int, 'extra_charge' => numeric, 'sort_order' => int],
     *               ...
     *           ],
     *       ],
     *       ...
     *   ],
     * ]
     */
    public function execute(Team $team, array $data): ProductPackage
    {
        return DB::transaction(function () use ($team, $data) {
            /** @var ProductPackage $package */
            $package = $team->productPackages()->create([
                'category_id' => $data['category_id'] ?? null,
                'sku'         => $data['sku'],
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'base_price'  => $data['base_price'],
                'is_active'   => $data['is_active'] ?? true,
            ]);

            $this->syncItems($package, $data['items'] ?? []);
            $this->syncAddonGroups($package, $data['addon_groups'] ?? []);

            return $package->load(['items.product', 'addonGroups.options.product']);
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