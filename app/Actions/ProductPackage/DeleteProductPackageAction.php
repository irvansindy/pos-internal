<?php

namespace App\Actions\ProductPackage;

use App\Models\ProductPackage;
use Illuminate\Support\Facades\DB;

class DeleteProductPackageAction
{
    public function execute(ProductPackage $package): void
    {
        DB::transaction(function () use ($package) {
            // Cascade via DB foreign keys, but explicit for clarity
            $package->addonGroups()->each(fn ($g) => $g->options()->delete());
            $package->addonGroups()->delete();
            $package->items()->delete();
            $package->delete();
        });
    }
}