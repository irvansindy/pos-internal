<?php

namespace App\Support;

use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Team;
use Illuminate\Validation\ValidationException;

final class TeamCatalogReferenceGuard
{
    /** @param array<int, mixed> $productIds */
    public static function ensure(Team $team, array $productIds, mixed $categoryId = null): void
    {
        $productIds = collect($productIds)
            ->filter(fn ($id) => $id !== null && $id !== '')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $ownedProductCount = Product::query()
            ->where('team_id', $team->id)
            ->whereIn('id', $productIds)
            ->count();

        if ($ownedProductCount !== $productIds->count()) {
            throw ValidationException::withMessages([
                'products' => 'Semua produk harus berasal dari toko aktif.',
            ]);
        }

        if ($categoryId !== null && ! ProductCategory::query()
            ->where('team_id', $team->id)
            ->whereKey($categoryId)
            ->exists()) {
            throw ValidationException::withMessages([
                'category_id' => 'Kategori harus berasal dari toko aktif.',
            ]);
        }
    }
}
