<?php

namespace App\Actions\InventoryBatch;

use App\Models\InventoryBatch;
use App\Models\InventoryBatchMovement;
use App\Models\Product;
use App\Models\ProductStockMovement;
use Illuminate\Validation\ValidationException;

class RecordInventoryBatchMovementAction
{
    public function execute(Product $product, ProductStockMovement $stockMovement, string $type, int $quantity, array $batchData = []): void
    {
        if (! $product->tracks_batches || $quantity === 0) {
            return;
        }

        if ($type === ProductStockMovement::TYPE_IN) {
            $this->add($product, $stockMovement, $quantity, $batchData);

            return;
        }

        if (! empty($batchData['batch_allocations'])) {
            $this->consumeAllocated($product, $stockMovement, $quantity, $batchData['batch_allocations']);

            return;
        }

        if (! empty($batchData['inventory_batch_id'])) {
            $this->consumeSpecific($product, $stockMovement, $quantity, (int) $batchData['inventory_batch_id']);

            return;
        }

        $this->consumeFefo($product, $stockMovement, $quantity);
    }

    public function initialize(Product $product): void
    {
        if (! $product->tracks_batches || $product->stock <= 0 || $product->inventoryBatches()->exists()) {
            return;
        }

        $product->inventoryBatches()->create([
            'team_id' => $product->team_id,
            'batch_number' => 'SALDO-AWAL',
            'quantity' => $product->stock,
        ]);
    }

    private function add(Product $product, ProductStockMovement $movement, int $quantity, array $data): void
    {
        $batchNumber = trim((string) ($data['batch_number'] ?? 'TANPA-BATCH')) ?: 'TANPA-BATCH';
        $batch = InventoryBatch::query()->firstOrCreate(
            ['team_id' => $product->team_id, 'product_id' => $product->id, 'batch_number' => $batchNumber],
            ['expires_at' => $data['expires_at'] ?? null, 'purchase_order_item_id' => $data['purchase_order_item_id'] ?? null, 'quantity' => 0],
        );
        $batch = InventoryBatch::query()->whereKey($batch->id)->lockForUpdate()->firstOrFail();
        $before = $batch->quantity;
        $batch->update([
            'quantity' => $before + $quantity,
            'expires_at' => $data['expires_at'] ?? $batch->expires_at,
            'purchase_order_item_id' => $data['purchase_order_item_id'] ?? $batch->purchase_order_item_id,
        ]);
        $this->record($batch, $movement, ProductStockMovement::TYPE_IN, $quantity, $before, $before + $quantity);
    }

    private function consumeFefo(Product $product, ProductStockMovement $movement, int $quantity): void
    {
        $batches = InventoryBatch::query()
            ->where('product_id', $product->id)
            ->where('quantity', '>', 0)
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhereDate('expires_at', '>=', today()))
            ->orderByRaw('expires_at IS NULL')
            ->orderBy('expires_at')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        if ($batches->sum('quantity') < $quantity) {
            throw ValidationException::withMessages([
                'quantity' => "Saldo batch '{$product->name}' tidak mencukupi. Lakukan koreksi batch sebelum transaksi.",
            ]);
        }

        $remaining = $quantity;
        foreach ($batches as $batch) {
            if ($remaining === 0) {
                break;
            }

            $taken = min($remaining, $batch->quantity);
            $before = $batch->quantity;
            $batch->update(['quantity' => $before - $taken]);
            $this->record($batch, $movement, ProductStockMovement::TYPE_OUT, $taken, $before, $before - $taken);
            $remaining -= $taken;
        }
    }

    private function consumeSpecific(Product $product, ProductStockMovement $movement, int $quantity, int $batchId): void
    {
        $batch = InventoryBatch::query()
            ->where('product_id', $product->id)
            ->whereKey($batchId)
            ->lockForUpdate()
            ->first();

        if (! $batch || $batch->quantity < $quantity) {
            throw ValidationException::withMessages(['inventory_batch_id' => "Saldo batch '{$product->name}' tidak mencukupi."]);
        }

        $before = $batch->quantity;
        $batch->update(['quantity' => $before - $quantity]);
        $this->record($batch, $movement, ProductStockMovement::TYPE_OUT, $quantity, $before, $before - $quantity);
    }

    /** @param array<int, array{inventory_batch_id: int, quantity: int}> $allocations */
    private function consumeAllocated(Product $product, ProductStockMovement $movement, int $quantity, array $allocations): void
    {
        if (collect($allocations)->sum('quantity') !== $quantity) {
            throw ValidationException::withMessages(['batch_allocations' => 'Total alokasi batch harus sama dengan jumlah stok keluar.']);
        }

        foreach ($allocations as $allocation) {
            $this->consumeSpecific(
                $product,
                $movement,
                (int) $allocation['quantity'],
                (int) $allocation['inventory_batch_id'],
            );
        }
    }

    private function record(InventoryBatch $batch, ProductStockMovement $movement, string $type, int $quantity, int $before, int $after): void
    {
        InventoryBatchMovement::create([
            'team_id' => $batch->team_id,
            'product_id' => $batch->product_id,
            'inventory_batch_id' => $batch->id,
            'product_stock_movement_id' => $movement->id,
            'type' => $type,
            'quantity' => $quantity,
            'quantity_before' => $before,
            'quantity_after' => $after,
        ]);
    }
}
