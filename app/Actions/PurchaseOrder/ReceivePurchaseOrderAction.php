<?php

namespace App\Actions\PurchaseOrder;

use App\Actions\ProductStock\AdjustProductStockAction;
use App\Models\ProductStockMovement;
use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReceivePurchaseOrderAction
{
    public function __construct(private AdjustProductStockAction $adjustStock) {}

    /** @param array<int|string, int> $quantities */
    public function execute(PurchaseOrder $order, User $user, array $quantities): PurchaseOrder
    {
        return DB::transaction(function () use ($order, $user, $quantities) {
            $locked = PurchaseOrder::query()->with('items.product')->lockForUpdate()->findOrFail($order->id);

            if (! in_array($locked->status, [PurchaseOrder::STATUS_ORDERED, PurchaseOrder::STATUS_PARTIAL], true)) {
                throw ValidationException::withMessages(['purchase_order' => 'PO ini tidak dapat menerima barang lagi.']);
            }

            $receivedAny = false;
            foreach ($locked->items as $item) {
                $receive = (int) ($quantities[$item->id] ?? 0);
                $remaining = $item->quantity - $item->received_quantity;

                if ($receive < 0 || $receive > $remaining) {
                    throw ValidationException::withMessages(['quantities' => "Jumlah terima {$item->product->name} melebihi sisa PO."]);
                }
                if ($receive === 0) {
                    continue;
                }

                $receivedAny = true;
                $this->adjustStock->execute($item->product, $user, [
                    'type' => ProductStockMovement::TYPE_IN,
                    'quantity' => $receive,
                    'note' => "Penerimaan {$locked->order_number}",
                    'reference_type' => PurchaseOrder::class,
                    'reference_id' => $locked->id,
                ]);
                $item->product->update(['cost' => $item->unit_cost]);
                $item->increment('received_quantity', $receive);
            }

            if (! $receivedAny) {
                throw ValidationException::withMessages(['quantities' => 'Isi minimal satu jumlah barang yang diterima.']);
            }

            $allReceived = $locked->items()->whereColumn('received_quantity', '<', 'quantity')->doesntExist();
            $locked->update([
                'status' => $allReceived ? PurchaseOrder::STATUS_RECEIVED : PurchaseOrder::STATUS_PARTIAL,
                'received_at' => $allReceived ? now() : null,
            ]);

            return $locked->refresh()->load(['supplier', 'items.product']);
        });
    }
}
