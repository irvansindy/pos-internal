<?php

namespace App\Actions\ProductStock;

use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdjustProductStockAction
{
    public function execute(Product $product, User $user, array $data): ProductStockMovement
    {
        return DB::transaction(function () use ($product, $user, $data) {
            $lockedProduct = Product::whereKey($product->id)->lockForUpdate()->firstOrFail();

            $stockBefore = $lockedProduct->stock;
            $stockAfter = $this->calculateStockAfter($stockBefore, $data);

            if ($stockAfter < 0) {
                throw ValidationException::withMessages([
                    'quantity' => 'Stok tidak boleh menjadi negatif.',
                ]);
            }

            $quantity = abs($stockAfter - $stockBefore);

            $lockedProduct->update([
                'stock' => $stockAfter,
            ]);

            return ProductStockMovement::create([
                'team_id' => $lockedProduct->team_id,
                'product_id' => $lockedProduct->id,
                'user_id' => $user->id,
                'type' => $data['type'],
                'quantity' => $quantity,
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'note' => $data['note'] ?? null,
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
            ]);
        });
    }

    private function calculateStockAfter(int $stockBefore, array $data): int
    {
        return match ($data['type']) {
            ProductStockMovement::TYPE_IN => $stockBefore + (int) $data['quantity'],
            ProductStockMovement::TYPE_OUT => $stockBefore - (int) $data['quantity'],
            ProductStockMovement::TYPE_ADJUSTMENT => (int) $data['final_stock'],
        };
    }
}
