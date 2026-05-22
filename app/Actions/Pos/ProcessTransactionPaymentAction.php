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

        $receivedAmount = (float) $data['paid_amount'];
        $existingPaidAmount = (float) $transaction->paid_amount;
        $grandTotal = (float) $transaction->grand_total;
        $remainingAmount = max($grandTotal - $existingPaidAmount, 0);

        $this->validatePaidAmount($receivedAmount, $remainingAmount);

        $transaction->update([
            'status' => Transaction::STATUS_COMPLETED,
            'payment_status' => Transaction::PAYMENT_STATUS_PAID,
            'payment_method' => $data['payment_method'],
            'paid_amount' => $existingPaidAmount + $receivedAmount,
            'change_amount' => max($receivedAmount - $remainingAmount, 0),
            'paid_at' => now(),
        ]);

        return $transaction->refresh();
    }

    private function validatePaidAmount(float $paidAmount, float $remainingAmount): void
    {
        if ($paidAmount <= 0) {
            throw ValidationException::withMessages([
                'paid_amount' => 'Jumlah bayar wajib diisi.',
            ]);
        }

        if ($paidAmount < $remainingAmount) {
            throw ValidationException::withMessages([
                'paid_amount' => 'Nominal pembayaran kurang dari sisa tagihan.',
            ]);
        }
    }
}
