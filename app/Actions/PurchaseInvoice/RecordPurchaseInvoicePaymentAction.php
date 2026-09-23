<?php

namespace App\Actions\PurchaseInvoice;

use App\Models\PurchaseInvoice;
use App\Models\User;
use App\Support\DocumentNumberGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecordPurchaseInvoicePaymentAction
{
    public function execute(PurchaseInvoice $invoice, User $user, array $data): PurchaseInvoice
    {
        return DB::transaction(function () use ($invoice, $user, $data) {
            $locked = PurchaseInvoice::query()->lockForUpdate()->findOrFail($invoice->id);
            $amount = round((float) $data['amount'], 2);

            if ($amount <= 0 || $amount > (float) $locked->balance_due) {
                throw ValidationException::withMessages(['amount' => 'Pembayaran harus lebih dari nol dan tidak boleh melebihi sisa hutang.']);
            }

            $locked->payments()->create([
                'team_id' => $locked->team_id,
                'created_by' => $user->id,
                'payment_number' => DocumentNumberGenerator::generate('PAY', 'purchase_invoice_payments', 'payment_number', $locked->team_id),
                'paid_at' => $data['paid_at'],
                'amount' => $amount,
                'method' => $data['method'],
                'reference' => $data['reference'] ?? null,
                'note' => $data['note'] ?? null,
            ]);

            $paidTotal = (float) $locked->paid_total + $amount;
            $balance = max(0, (float) $locked->subtotal + (float) $locked->landed_cost_total - (float) $locked->return_total - $paidTotal);
            $locked->update([
                'paid_total' => $paidTotal,
                'balance_due' => $balance,
                'status' => $balance <= 0 ? PurchaseInvoice::STATUS_PAID : PurchaseInvoice::STATUS_PARTIAL,
            ]);

            return $locked->refresh()->load('payments');
        });
    }
}
