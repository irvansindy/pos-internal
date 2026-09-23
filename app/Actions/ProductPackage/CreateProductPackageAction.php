<?php

namespace App\Actions\ProductPackage;

use App\Models\ProductPackage;
use App\Models\ProductPackageAddonGroup;
use App\Models\Team;
use App\Support\CatalogImageStorage;
use App\Support\TeamCatalogReferenceGuard;
use Illuminate\Support\Facades\DB;
use Throwable;

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
        $imagePath = isset($data['image'])
            ? CatalogImageStorage::store($data['image'], "catalog/teams/{$team->id}/packages")
            : null;

        try {
            return DB::transaction(function () use ($team, $data, $imagePath) {
                TeamCatalogReferenceGuard::ensure(
                    $team,
                    $this->productIds($data),
                    $data['category_id'] ?? null,
                );

                /** @var ProductPackage $package */
                $package = $team->productPackages()->create([
                    'category_id' => $data['category_id'] ?? null,
                    'sku' => $data['sku'],
                    'name' => $data['name'],
                    'description' => $data['description'] ?? null,
                    'image_path' => $imagePath,
                    'base_price' => $data['base_price'],
                    'is_active' => $data['is_active'] ?? true,
                ]);

                $this->syncItems($package, $data['items'] ?? []);
                $this->syncAddonGroups($package, $data['addon_groups'] ?? []);

                return $package->load(['items.product', 'addonGroups.options.product']);
            });
        } catch (Throwable $exception) {
            CatalogImageStorage::delete($imagePath);

            throw $exception;
        }
    }

    private function productIds(array $data): array
    {
        return collect($data['items'] ?? [])->pluck('product_id')
            ->concat(collect($data['addon_groups'] ?? [])->pluck('default_product_id'))
            ->concat(collect($data['addon_groups'] ?? [])->flatMap(fn (array $group) => collect($group['options'] ?? [])->pluck('product_id')))
            ->all();
    }

    private function syncItems(ProductPackage $package, array $items): void
    {
        $package->items()->delete();

        foreach ($items as $item) {
            $package->items()->create([
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'] ?? 1,
                'note' => $item['note'] ?? null,
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
                'name' => $groupData['name'],
                'default_product_id' => $groupData['default_product_id'] ?? null,
                'is_required' => $groupData['is_required'] ?? false,
                'sort_order' => $groupData['sort_order'] ?? $index,
            ]);

            foreach ($groupData['options'] ?? [] as $optIndex => $option) {
                $group->options()->create([
                    'product_id' => $option['product_id'],
                    'extra_charge' => $option['extra_charge'] ?? 0,
                    'sort_order' => $option['sort_order'] ?? $optIndex,
                ]);
            }
        }
    }
}
