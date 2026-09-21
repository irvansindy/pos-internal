<?php

namespace App\Actions\StockTransfer;

use App\Actions\ProductStock\AdjustProductStockAction;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\StockTransfer;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CancelStockTransferAction
{
    public function __construct(private AdjustProductStockAction $adjustStock) {}

    public function execute(StockTransfer $transfer, User $user): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $user) {
            $locked = StockTransfer::query()->with('items')->lockForUpdate()->findOrFail($transfer->id);

            if (! in_array($locked->status, [StockTransfer::STATUS_PENDING, StockTransfer::STATUS_IN_TRANSIT], true)) {
                throw ValidationException::withMessages(['transfer' => 'Transfer ini tidak dapat dibatalkan.']);
            }

            if ($locked->status === StockTransfer::STATUS_IN_TRANSIT) {
                foreach ($locked->items as $item) {
                    $source = Product::query()->where('team_id', $locked->from_team_id)->findOrFail($item->from_product_id);
                    $this->adjustStock->execute($source, $user, [
                        'type' => ProductStockMovement::TYPE_IN,
                        'quantity' => $item->quantity,
                        'note' => "Pembatalan transfer {$locked->transfer_number}",
                        'reference_type' => StockTransfer::class,
                        'reference_id' => $locked->id,
                    ]);
                }
            }

            $locked->update(['status' => StockTransfer::STATUS_CANCELED, 'canceled_at' => now()]);

            return $locked->refresh();
        });
    }
}
