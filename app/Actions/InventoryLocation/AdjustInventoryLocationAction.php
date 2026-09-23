<?php

namespace App\Actions\InventoryLocation;

use App\Models\InventoryBatch;
use App\Models\InventoryBatchMovement;
use App\Models\InventoryLocationBalance;
use App\Models\InventoryLocationMovement;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\Warehouse;
use App\Models\WarehouseBin;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class AdjustInventoryLocationAction
{
    public function execute(Product $product, ProductStockMovement $movement, string $type, int $quantity, array $data): void
    {
        if ($quantity === 0) {
            return;
        }

        $bin = $this->resolveBin($product, $data['warehouse_bin_id'] ?? null);

        if ($product->tracks_batches) {
            $batchMovements = InventoryBatchMovement::query()
                ->where('product_stock_movement_id', $movement->id)
                ->get();

            foreach ($batchMovements as $batchMovement) {
                $this->apply(
                    $product,
                    $movement,
                    $type,
                    $batchMovement->quantity,
                    $type === ProductStockMovement::TYPE_IN ? $bin : null,
                    $batchMovement->inventory_batch_id,
                    $data['warehouse_bin_id'] ?? null,
                );
            }

            return;
        }

        $this->apply(
            $product,
            $movement,
            $type,
            $quantity,
            $type === ProductStockMovement::TYPE_IN ? $bin : null,
            null,
            $data['warehouse_bin_id'] ?? null,
        );
    }

    private function apply(Product $product, ProductStockMovement $movement, string $type, int $quantity, ?WarehouseBin $destinationBin, ?int $batchId, ?int $requestedBinId): void
    {
        if ($type === ProductStockMovement::TYPE_IN) {
            $this->increase($product, $movement, $destinationBin, $batchId, $quantity);

            return;
        }

        $balanceQuery = InventoryLocationBalance::query()
            ->with('bin.warehouse')
            ->where('team_id', $product->team_id)
            ->where('product_id', $product->id)
            ->where('inventory_batch_id', $batchId);

        if (! (clone $balanceQuery)->exists()) {
            $defaultBin = $this->resolveBin($product, null);
            $openingQuantity = $batchId
                ? ((int) InventoryBatch::query()->whereKey($batchId)->value('quantity')) + $quantity
                : (int) $movement->stock_before;

            InventoryLocationBalance::create([
                'team_id' => $product->team_id,
                'warehouse_id' => $defaultBin->warehouse_id,
                'warehouse_bin_id' => $defaultBin->id,
                'product_id' => $product->id,
                'inventory_batch_id' => $batchId,
                'quantity' => $openingQuantity,
            ]);
        }

        $balances = $balanceQuery
            ->when($requestedBinId, fn ($query) => $query->where('warehouse_bin_id', $requestedBinId))
            ->where('quantity', '>', 0)
            ->orderBy('warehouse_bin_id')
            ->lockForUpdate()
            ->get();

        $this->decrease($product, $movement, $balances, $batchId, $quantity);
    }

    private function increase(Product $product, ProductStockMovement $movement, WarehouseBin $bin, ?int $batchId, int $quantity): void
    {
        $balance = InventoryLocationBalance::query()->firstOrCreate(
            [
                'warehouse_bin_id' => $bin->id,
                'product_id' => $product->id,
                'inventory_batch_id' => $batchId,
            ],
            [
                'team_id' => $product->team_id,
                'warehouse_id' => $bin->warehouse_id,
                'quantity' => 0,
            ],
        );
        $balance = InventoryLocationBalance::query()->whereKey($balance->id)->lockForUpdate()->firstOrFail();
        $before = $balance->quantity;
        $balance->update(['quantity' => $before + $quantity]);
        $this->record($movement, $balance, ProductStockMovement::TYPE_IN, $quantity, $before, $before + $quantity);
    }

    /** @param Collection<int, InventoryLocationBalance> $balances */
    private function decrease(Product $product, ProductStockMovement $movement, Collection $balances, ?int $batchId, int $quantity): void
    {
        if ($balances->sum('quantity') < $quantity) {
            throw ValidationException::withMessages([
                'warehouse_bin_id' => "Saldo lokasi untuk '{$product->name}' tidak mencukupi.",
            ]);
        }

        $remaining = $quantity;
        foreach ($balances as $balance) {
            if ($remaining === 0) {
                break;
            }

            $taken = min($remaining, $balance->quantity);
            $before = $balance->quantity;
            $balance->update(['quantity' => $before - $taken]);
            $this->record($movement, $balance, ProductStockMovement::TYPE_OUT, $taken, $before, $before - $taken);
            $remaining -= $taken;
        }
    }

    private function record(ProductStockMovement $movement, InventoryLocationBalance $balance, string $type, int $quantity, int $before, int $after): void
    {
        InventoryLocationMovement::create([
            'team_id' => $balance->team_id,
            'product_id' => $balance->product_id,
            'warehouse_bin_id' => $balance->warehouse_bin_id,
            'inventory_batch_id' => $balance->inventory_batch_id,
            'product_stock_movement_id' => $movement->id,
            'type' => $type,
            'quantity' => $quantity,
            'quantity_before' => $before,
            'quantity_after' => $after,
        ]);
    }

    private function resolveBin(Product $product, ?int $binId): WarehouseBin
    {
        $query = WarehouseBin::query()
            ->whereHas('warehouse', fn ($warehouse) => $warehouse->where('team_id', $product->team_id));

        $bin = $binId
            ? $query->whereKey($binId)->first()
            : $query->where('is_default', true)->whereHas('warehouse', fn ($warehouse) => $warehouse->where('is_default', true))->first();

        if (! $bin && ! $binId) {
            $warehouse = Warehouse::query()->firstOrCreate(
                ['team_id' => $product->team_id, 'code' => 'UTAMA'],
                ['name' => 'Gudang Utama', 'is_default' => true, 'is_active' => true],
            );
            $bin = $warehouse->bins()->firstOrCreate(
                ['code' => 'DEFAULT'],
                ['name' => 'Penyimpanan Utama', 'is_default' => true, 'is_active' => true],
            );
        }

        if (! $bin) {
            throw ValidationException::withMessages(['warehouse_bin_id' => 'Lokasi gudang tidak ditemukan untuk toko aktif.']);
        }

        return $bin;
    }
}
