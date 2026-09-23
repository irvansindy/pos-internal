<?php

namespace App\Actions\StockTransfer;

use App\Models\InventoryBatch;
use App\Models\InventoryLocationBalance;
use App\Models\InventorySerial;
use App\Models\Organization;
use App\Models\Product;
use App\Models\StockTransfer;
use App\Models\Team;
use App\Models\User;
use App\Models\WarehouseBin;
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
                $product = $products->get((int) $item['product_id']);
                $transferItem = $transfer->items()->create([
                    'from_product_id' => (int) $item['product_id'],
                    'quantity' => (int) $item['quantity'],
                ]);

                $batchRows = collect($item['batches'] ?? [])->filter(fn ($row) => (int) ($row['quantity'] ?? 0) > 0);
                if ($product->tracks_batches) {
                    if ($batchRows->sum('quantity') !== (int) $item['quantity']) {
                        throw ValidationException::withMessages(['items' => "Alokasi batch {$product->name} harus sama dengan jumlah transfer."]);
                    }

                    foreach ($batchRows as $batchRow) {
                        $batch = InventoryBatch::query()
                            ->where('team_id', $from->id)
                            ->where('product_id', $product->id)
                            ->whereKey($batchRow['inventory_batch_id'])
                            ->first();
                        if (! $batch || $batch->quantity < (int) $batchRow['quantity']) {
                            throw ValidationException::withMessages(['items' => "Saldo batch {$product->name} tidak mencukupi."]);
                        }

                        $sourceBinId = (int) ($batchRow['warehouse_bin_id'] ?? 0);
                        $destinationBinId = (int) ($batchRow['to_warehouse_bin_id'] ?? 0);
                        $validSourceBin = WarehouseBin::query()
                            ->whereKey($sourceBinId)
                            ->whereHas('warehouse', fn ($query) => $query->where('team_id', $from->id))
                            ->exists();
                        $validDestinationBin = WarehouseBin::query()
                            ->whereKey($destinationBinId)
                            ->whereHas('warehouse', fn ($query) => $query->where('team_id', $to->id))
                            ->exists();
                        $locationQuantity = (int) InventoryLocationBalance::query()
                            ->where('product_id', $product->id)
                            ->where('inventory_batch_id', $batch->id)
                            ->where('warehouse_bin_id', $sourceBinId)
                            ->value('quantity');

                        if (! $validSourceBin || $locationQuantity < (int) $batchRow['quantity']) {
                            throw ValidationException::withMessages(['items' => "Saldo batch {$product->name} pada bin asal tidak mencukupi."]);
                        }
                        if (! $validDestinationBin) {
                            throw ValidationException::withMessages(['items' => "Bin tujuan {$product->name} tidak valid."]);
                        }
                        $transferItem->batchAllocations()->create([
                            'from_inventory_batch_id' => $batch->id,
                            'from_warehouse_bin_id' => $sourceBinId,
                            'to_warehouse_bin_id' => $destinationBinId,
                            'quantity' => (int) $batchRow['quantity'],
                        ]);
                    }
                }

                $serialIds = collect($item['inventory_serial_ids'] ?? [])->map(fn ($id) => (int) $id)->unique();
                if ($product->tracks_serials) {
                    if ($serialIds->count() !== (int) $item['quantity']) {
                        throw ValidationException::withMessages(['items' => "Pilih tepat {$item['quantity']} serial untuk {$product->name}."]);
                    }
                    $serials = InventorySerial::query()
                        ->where('team_id', $from->id)
                        ->where('product_id', $product->id)
                        ->where('status', InventorySerial::STATUS_IN_STOCK)
                        ->whereIn('id', $serialIds)
                        ->get();
                    if ($serials->count() !== $serialIds->count()) {
                        throw ValidationException::withMessages(['items' => "Serial {$product->name} tidak valid atau tidak tersedia."]);
                    }
                    if ($product->tracks_batches) {
                        $allocations = $transferItem->batchAllocations;
                        foreach ($allocations as $allocation) {
                            $selectedCount = $serials
                                ->where('inventory_batch_id', $allocation->from_inventory_batch_id)
                                ->where('warehouse_bin_id', $allocation->from_warehouse_bin_id)
                                ->count();
                            if ($selectedCount !== (int) $allocation->quantity) {
                                throw ValidationException::withMessages([
                                    'items' => "Serial {$product->name} harus sesuai dengan batch dan bin yang dialokasikan.",
                                ]);
                            }
                        }
                    }
                    foreach ($serials as $serial) {
                        $transferItem->serials()->create(['inventory_serial_id' => $serial->id]);
                    }
                }
            }

            return $transfer->load(['items.fromProduct', 'items.batchAllocations.sourceBatch', 'items.serials', 'fromTeam', 'toTeam']);
        });
    }
}
