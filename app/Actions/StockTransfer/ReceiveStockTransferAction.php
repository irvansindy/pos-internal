<?php

namespace App\Actions\StockTransfer;

use App\Actions\ProductStock\AdjustProductStockAction;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\StockTransfer;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReceiveStockTransferAction
{
    public function __construct(private AdjustProductStockAction $adjustStock) {}

    public function execute(StockTransfer $transfer, User $user): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $user) {
            $locked = StockTransfer::query()->with('items.fromProduct')->lockForUpdate()->findOrFail($transfer->id);

            if ($locked->status !== StockTransfer::STATUS_IN_TRANSIT) {
                throw ValidationException::withMessages(['transfer' => 'Hanya transfer dalam perjalanan yang dapat diterima.']);
            }

            foreach ($locked->items as $item) {
                $source = $item->fromProduct;
                $destination = Product::firstOrCreate(
                    ['team_id' => $locked->to_team_id, 'sku' => $source->sku],
                    [
                        'category_id' => null,
                        'name' => $source->name,
                        'description' => $source->description,
                        'price' => $source->price,
                        'cost' => $source->cost,
                        'stock' => 0,
                        'min_stock' => $source->min_stock,
                        'is_active' => true,
                    ],
                );

                $this->adjustStock->execute($destination, $user, [
                    'type' => ProductStockMovement::TYPE_IN,
                    'quantity' => $item->quantity,
                    'note' => "Penerimaan transfer {$locked->transfer_number}",
                    'reference_type' => StockTransfer::class,
                    'reference_id' => $locked->id,
                ]);
                $item->update(['to_product_id' => $destination->id]);
            }

            $locked->update(['status' => StockTransfer::STATUS_RECEIVED, 'received_by' => $user->id, 'received_at' => now()]);

            return $locked->refresh();
        });
    }
}
