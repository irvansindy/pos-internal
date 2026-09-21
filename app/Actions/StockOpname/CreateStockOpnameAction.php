<?php

namespace App\Actions\StockOpname;

use App\Actions\ProductStock\AdjustProductStockAction;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\StockOpname;
use App\Models\Team;
use App\Models\User;
use App\Support\DocumentNumberGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateStockOpnameAction
{
    public function __construct(private AdjustProductStockAction $adjustStock) {}

    public function execute(Team $team, User $user, array $data): StockOpname
    {
        return DB::transaction(function () use ($team, $user, $data) {
            $productIds = collect($data['items'])->pluck('product_id')->unique();
            $products = Product::query()->where('team_id', $team->id)->whereIn('id', $productIds)->lockForUpdate()->get()->keyBy('id');

            if ($products->count() !== $productIds->count()) {
                throw ValidationException::withMessages(['items' => 'Produk opname harus berasal dari toko aktif.']);
            }

            $opname = StockOpname::create([
                'team_id' => $team->id,
                'created_by' => $user->id,
                'opname_number' => DocumentNumberGenerator::generate('SO', 'stock_opnames', 'opname_number', $team->id),
                'status' => 'completed',
                'note' => $data['note'] ?? null,
                'completed_at' => now(),
            ]);

            foreach ($data['items'] as $row) {
                $product = $products->get((int) $row['product_id']);
                $systemQty = (int) $product->stock;
                $physicalQty = (int) $row['physical_qty'];
                $difference = $physicalQty - $systemQty;

                $opname->items()->create([
                    'product_id' => $product->id,
                    'system_qty' => $systemQty,
                    'physical_qty' => $physicalQty,
                    'difference' => $difference,
                    'note' => $row['note'] ?? null,
                ]);

                if ($difference !== 0) {
                    $this->adjustStock->execute($product, $user, [
                        'type' => ProductStockMovement::TYPE_ADJUSTMENT,
                        'final_stock' => $physicalQty,
                        'note' => "Stok opname {$opname->opname_number}".(! empty($row['note']) ? ": {$row['note']}" : ''),
                        'reference_type' => StockOpname::class,
                        'reference_id' => $opname->id,
                    ]);
                }
            }

            return $opname->load('items.product');
        });
    }
}
