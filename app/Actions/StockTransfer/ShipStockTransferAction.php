<?php

namespace App\Actions\StockTransfer;

use App\Actions\ProductStock\AdjustProductStockAction;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\StockTransfer;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ShipStockTransferAction
{
    public function __construct(private AdjustProductStockAction $adjustStock) {}

    public function execute(StockTransfer $transfer, User $user): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $user) {
            $locked = StockTransfer::query()->with('items')->lockForUpdate()->findOrFail($transfer->id);

            if ($locked->status !== StockTransfer::STATUS_PENDING) {
                throw ValidationException::withMessages(['transfer' => 'Hanya transfer pending yang dapat dikirim.']);
            }

            foreach ($locked->items as $item) {
                $product = Product::query()->where('team_id', $locked->from_team_id)->findOrFail($item->from_product_id);
                $this->adjustStock->execute($product, $user, [
                    'type' => ProductStockMovement::TYPE_OUT,
                    'quantity' => $item->quantity,
                    'note' => "Pengiriman transfer {$locked->transfer_number}",
                    'reference_type' => StockTransfer::class,
                    'reference_id' => $locked->id,
                ]);
            }

            $locked->update(['status' => StockTransfer::STATUS_IN_TRANSIT, 'shipped_by' => $user->id, 'shipped_at' => now()]);

            return $locked->refresh();
        });
    }
}
