<?php

namespace App\Actions\PurchaseInvoice;

use App\Models\PurchaseInvoice;
use App\Models\PurchaseInvoiceItem;
use App\Models\PurchaseOrder;
use App\Models\Team;
use App\Models\User;
use App\Support\DocumentNumberGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreatePurchaseInvoiceAction
{
    public function execute(Team $team, User $user, array $data): PurchaseInvoice
    {
        return DB::transaction(function () use ($team, $user, $data) {
            $order = PurchaseOrder::query()
                ->with(['supplier', 'items.product'])
                ->where('team_id', $team->id)
                ->lockForUpdate()
                ->find($data['purchase_order_id']);

            if (! $order) {
                throw ValidationException::withMessages(['purchase_order_id' => 'Purchase order tidak ditemukan.']);
            }

            $rows = [];
            foreach ($order->items as $item) {
                $alreadyInvoiced = PurchaseInvoiceItem::query()
                    ->where('purchase_order_item_id', $item->id)
                    ->sum('quantity');
                $available = $item->received_quantity - $alreadyInvoiced;
                $quantity = (int) ($data['quantities'][$item->id] ?? $available);

                if ($quantity < 0 || $quantity > $available) {
                    throw ValidationException::withMessages(['quantities' => "Jumlah invoice {$item->product->name} melebihi barang yang sudah diterima."]);
                }

                if ($quantity > 0) {
                    $rows[] = ['item' => $item, 'quantity' => $quantity];
                }
            }

            if ($rows === []) {
                throw ValidationException::withMessages(['quantities' => 'Tidak ada penerimaan yang dapat ditagihkan.']);
            }

            $subtotal = collect($rows)->sum(fn ($row) => $row['quantity'] * (float) $row['item']->unit_cost);
            $invoice = PurchaseInvoice::create([
                'team_id' => $team->id,
                'supplier_id' => $order->supplier_id,
                'purchase_order_id' => $order->id,
                'created_by' => $user->id,
                'document_number' => DocumentNumberGenerator::generate('PINV', 'purchase_invoices', 'document_number', $team->id),
                'supplier_invoice_number' => $data['supplier_invoice_number'],
                'invoice_date' => $data['invoice_date'],
                'due_date' => $data['due_date'] ?? null,
                'status' => PurchaseInvoice::STATUS_UNPAID,
                'subtotal' => $subtotal,
                'balance_due' => $subtotal,
                'note' => $data['note'] ?? null,
            ]);

            foreach ($rows as $row) {
                $invoice->items()->create([
                    'purchase_order_item_id' => $row['item']->id,
                    'product_id' => $row['item']->product_id,
                    'quantity' => $row['quantity'],
                    'unit_cost' => $row['item']->unit_cost,
                    'subtotal' => $row['quantity'] * (float) $row['item']->unit_cost,
                ]);
            }

            return $invoice->load(['supplier', 'purchaseOrder', 'items.product']);
        });
    }
}
