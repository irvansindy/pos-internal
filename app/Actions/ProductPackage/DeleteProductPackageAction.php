<?php

namespace App\Actions\ProductPackage;

use App\Models\ProductPackage;
use App\Support\CatalogImageStorage;
use Illuminate\Support\Facades\DB;

class DeleteProductPackageAction
{
    public function execute(ProductPackage $package): void
    {
        $imagePath = $package->image_path;

        DB::transaction(function () use ($package) {
            // Cascade via DB foreign keys, but explicit for clarity
            $package->addonGroups()->each(fn ($g) => $g->options()->delete());
            $package->addonGroups()->delete();
            $package->items()->delete();
            $package->delete();
        });

        CatalogImageStorage::delete($imagePath);
    }
}
