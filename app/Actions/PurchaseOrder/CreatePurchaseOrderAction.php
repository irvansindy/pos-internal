<?php

namespace App\Actions\PurchaseOrder;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\Team;
use App\Models\User;
use App\Support\DocumentNumberGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreatePurchaseOrderAction
{
    public function execute(Team $team, User $user, array $data): PurchaseOrder
    {
        return DB::transaction(function () use ($team, $user, $data) {
            $supplier = Supplier::query()->where('team_id', $team->id)->find($data['supplier_id']);
            $productIds = collect($data['items'])->pluck('product_id')->unique();
            $products = Product::query()->where('team_id', $team->id)->whereIn('id', $productIds)->get();

            if (! $supplier || $products->count() !== $productIds->count()) {
                throw ValidationException::withMessages(['items' => 'Supplier dan produk harus berasal dari toko aktif.']);
            }

            $total = collect($data['items'])->sum(fn (array $item) => (int) $item['quantity'] * (float) $item['unit_cost']);
            $order = PurchaseOrder::create([
                'team_id' => $team->id,
                'supplier_id' => $supplier->id,
                'created_by' => $user->id,
                'order_number' => DocumentNumberGenerator::generate('PO', 'purchase_orders', 'order_number', $team->id),
                'status' => PurchaseOrder::STATUS_ORDERED,
                'total' => $total,
                'expected_at' => $data['expected_at'] ?? null,
                'note' => $data['note'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'],
                ]);
            }

            return $order->load(['supplier', 'items.product']);
        });
    }
}
