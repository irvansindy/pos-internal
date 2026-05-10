<?php

namespace App\Actions\Pos;

use App\Models\Team;
use App\Models\Transaction;
use Illuminate\Validation\ValidationException;

class ProcessTransactionPaymentAction
{
    public function execute(Team $team, Transaction $transaction, array $data): Transaction
    {
        if ($transaction->team_id !== $team->id) {
            abort(404);
        }

        if ($transaction->status === Transaction::STATUS_VOID) {
            throw ValidationException::withMessages([
                'transaction' => 'Transaksi yang dibatalkan tidak dapat dibayar.',
            ]);
        }

        $paidAmount = (float) $data['paid_amount'];
        $grandTotal = (float) $transaction->grand_total;

        $transaction->update([
            'status' => $paidAmount >= $grandTotal ? Transaction::STATUS_COMPLETED : Transaction::STATUS_PENDING,
            'payment_status' => $paidAmount >= $grandTotal ? Transaction::PAYMENT_STATUS_PAID : Transaction::PAYMENT_STATUS_PARTIAL,
            'payment_method' => $data['payment_method'],
            'paid_amount' => $paidAmount,
            'change_amount' => max($paidAmount - $grandTotal, 0),
            'paid_at' => $paidAmount >= $grandTotal ? now() : null,
        ]);

        return $transaction->refresh();
    }
}
