<?php

namespace App\Actions\StockTransfer;

use App\Models\Organization;
use App\Models\Product;
use App\Models\StockTransfer;
use App\Models\Team;
use App\Models\User;
use App\Support\DocumentNumberGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateStockTransferAction
{
    public function execute(Organization $organization, Team $from, Team $to, User $user, array $data): StockTransfer
    {
        if ($from->organization_id !== $organization->id || $to->organization_id !== $organization->id || $from->is($to)) {
            throw ValidationException::withMessages(['to_team_id' => 'Toko asal dan tujuan harus berbeda dalam organization yang sama.']);
        }

        return DB::transaction(function () use ($organization, $from, $to, $user, $data) {
            $productIds = collect($data['items'])->pluck('product_id')->unique();
            $products = Product::query()->where('team_id', $from->id)->whereIn('id', $productIds)->get()->keyBy('id');

            if ($products->count() !== $productIds->count()) {
                throw ValidationException::withMessages(['items' => 'Produk transfer harus berasal dari toko asal.']);
            }

            $transfer = StockTransfer::create([
                'transfer_number' => DocumentNumberGenerator::generate('STF', 'stock_transfers', 'transfer_number', $organization->id, scopeColumn: 'organization_id'),
                'organization_id' => $organization->id,
                'from_team_id' => $from->id,
                'to_team_id' => $to->id,
                'requested_by' => $user->id,
                'status' => StockTransfer::STATUS_PENDING,
                'note' => $data['note'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $transfer->items()->create([
                    'from_product_id' => (int) $item['product_id'],
                    'quantity' => (int) $item['quantity'],
                ]);
            }

            return $transfer->load(['items.fromProduct', 'fromTeam', 'toTeam']);
        });
    }
}
