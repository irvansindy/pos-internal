<?php

namespace App\Actions\SupplierReturn;

use App\Actions\ProductStock\AdjustProductStockAction;
use App\Models\InventorySerial;
use App\Models\ProductStockMovement;
use App\Models\PurchaseInvoice;
use App\Models\PurchaseInvoiceItem;
use App\Models\SupplierReturn;
use App\Models\Team;
use App\Models\User;
use App\Support\DocumentNumberGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateSupplierReturnAction
{
    public function __construct(private AdjustProductStockAction $adjustStock) {}

    public function execute(Team $team, User $user, array $data): SupplierReturn
    {
        return DB::transaction(function () use ($team, $user, $data) {
            $invoice = PurchaseInvoice::query()
                ->with(['items.product'])
                ->where('team_id', $team->id)
                ->lockForUpdate()
                ->find($data['purchase_invoice_id']);

            if (! $invoice) {
                throw ValidationException::withMessages(['purchase_invoice_id' => 'Purchase invoice tidak ditemukan.']);
            }

            $return = SupplierReturn::create([
                'team_id' => $team->id,
                'supplier_id' => $invoice->supplier_id,
                'purchase_invoice_id' => $invoice->id,
                'created_by' => $user->id,
                'return_number' => DocumentNumberGenerator::generate('SRET', 'supplier_returns', 'return_number', $team->id),
                'returned_at' => $data['returned_at'],
                'note' => $data['note'] ?? null,
            ]);

            $total = 0.0;
            foreach ($data['items'] as $row) {
                $item = PurchaseInvoiceItem::query()
                    ->where('purchase_invoice_id', $invoice->id)
                    ->with('product')
                    ->lockForUpdate()
                    ->find($row['purchase_invoice_item_id']);
                $quantity = (int) $row['quantity'];

                if (! $item || $quantity < 1 || $quantity > $item->quantity - $item->returned_quantity) {
                    throw ValidationException::withMessages(['items' => 'Jumlah retur melebihi item invoice yang tersedia.']);
                }

                $serialIds = collect($row['inventory_serial_ids'] ?? [])->map(fn ($id) => (int) $id)->unique()->values();
                if ($item->product->tracks_batches && empty($row['inventory_batch_id'])) {
                    throw ValidationException::withMessages(['items' => "Pilih batch yang dikembalikan untuk {$item->product->name}."]);
                }
                if (empty($row['warehouse_bin_id'])) {
                    throw ValidationException::withMessages(['items' => "Pilih bin asal untuk {$item->product->name}."]);
                }
                if ($item->product->tracks_serials && $serialIds->count() !== $quantity) {
                    throw ValidationException::withMessages(['items' => "Pilih tepat {$quantity} serial untuk {$item->product->name}."]);
                }

                $this->adjustStock->execute($item->product, $user, [
                    'type' => ProductStockMovement::TYPE_OUT,
                    'quantity' => $quantity,
                    'note' => "Retur supplier {$return->return_number}",
                    'reference_type' => SupplierReturn::class,
                    'reference_id' => $return->id,
                    'inventory_batch_id' => $row['inventory_batch_id'] ?? null,
                    'warehouse_bin_id' => $row['warehouse_bin_id'] ?? null,
                ]);

                if ($serialIds->isNotEmpty()) {
                    $updated = InventorySerial::query()
                        ->where('team_id', $team->id)
                        ->where('product_id', $item->product_id)
                        ->where('status', InventorySerial::STATUS_IN_STOCK)
                        ->when($item->product->tracks_batches, fn ($query) => $query->where('inventory_batch_id', $row['inventory_batch_id']))
                        ->where('warehouse_bin_id', $row['warehouse_bin_id'])
                        ->whereIn('id', $serialIds)
                        ->update(['status' => InventorySerial::STATUS_RETURNED]);
                    if ($updated !== $quantity) {
                        throw ValidationException::withMessages(['items' => 'Serial retur tidak valid atau tidak lagi tersedia.']);
                    }
                }

                $subtotal = $quantity * (float) $item->unit_cost;
                $return->items()->create([
                    'purchase_invoice_item_id' => $item->id,
                    'product_id' => $item->product_id,
                    'inventory_batch_id' => $row['inventory_batch_id'] ?? null,
                    'warehouse_bin_id' => $row['warehouse_bin_id'] ?? null,
                    'quantity' => $quantity,
                    'unit_cost' => $item->unit_cost,
                    'subtotal' => $subtotal,
                ]);
                $item->increment('returned_quantity', $quantity);
                $total += $subtotal;
            }

            $return->update(['total' => $total]);
            $returnTotal = (float) $invoice->return_total + $total;
            $balance = max(0, (float) $invoice->subtotal + (float) $invoice->landed_cost_total - $returnTotal - (float) $invoice->paid_total);
            $invoice->update([
                'return_total' => $returnTotal,
                'balance_due' => $balance,
                'status' => $balance <= 0 ? PurchaseInvoice::STATUS_PAID : ((float) $invoice->paid_total > 0 ? PurchaseInvoice::STATUS_PARTIAL : PurchaseInvoice::STATUS_UNPAID),
            ]);

            return $return->load(['supplier', 'items']);
        });
    }
}
