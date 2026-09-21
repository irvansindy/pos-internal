<?php

namespace App\Actions\Pos;

use App\Actions\Customer\EarnCustomerPointsAction;
use App\Models\CashierShift;
use App\Models\DiningTable;
use App\Models\Team;
use App\Models\Transaction;
use App\Models\TransactionPayment;
use App\Models\User;
use App\Support\PaymentStatusResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProcessTransactionPaymentAction
{
    /**
     * Tambah pembayaran ke transaksi yang sudah ada (melunasi transaksi
     * yang statusnya partial/unpaid). Menerima top-up SEBAGIAN juga —
     * tidak wajib langsung melunasi semua sisa tagihan dalam satu kali
     * bayar, konsisten dengan alur checkout awal yang sekarang juga
     * menerima partial payment.
     */
    public function execute(Team $team, Transaction $transaction, array $data, ?User $cashier = null): Transaction
    {
        if ($transaction->team_id !== $team->id) {
            abort(404);
        }

        return DB::transaction(function () use ($team, $transaction, $data, $cashier) {
            $transaction = Transaction::query()->with(['customer', 'diningTable'])->lockForUpdate()->findOrFail($transaction->id);

            if ($transaction->status === Transaction::STATUS_VOID) {
                throw ValidationException::withMessages([
                    'transaction' => 'Transaksi yang dibatalkan tidak dapat dibayar.',
                ]);
            }

            $receivedAmount = (float) $data['paid_amount'];
            $existingPaidAmount = (float) $transaction->paid_amount;
            $grandTotal = (float) $transaction->grand_total;
            $remainingAmount = max($grandTotal - $existingPaidAmount, 0);

            $this->validateReceivedAmount($receivedAmount, $remainingAmount);

            $newPaidAmount = $existingPaidAmount + $receivedAmount;
            $appliedAmount = min($receivedAmount, $remainingAmount);
            $changeAmount = max($receivedAmount - $remainingAmount, 0);
            ['status' => $status, 'paymentStatus' => $paymentStatus] = PaymentStatusResolver::resolve($grandTotal, $newPaidAmount);

            $transaction->update([
                'status' => $status,
                'payment_status' => $paymentStatus,
                'payment_method' => $data['payment_method'],
                'paid_amount' => $newPaidAmount,
                'change_amount' => $changeAmount,
                'paid_at' => now(),
            ]);

            $paymentUser = $cashier ?? $transaction->cashier;
            $cashierShift = $paymentUser ? CashierShift::query()
                ->where('team_id', $team->id)
                ->where('user_id', $paymentUser->id)
                ->where('status', CashierShift::STATUS_OPEN)
                ->first() : null;

            TransactionPayment::create([
                'team_id' => $team->id,
                'transaction_id' => $transaction->id,
                'cashier_shift_id' => $cashierShift?->id,
                'user_id' => $paymentUser?->id,
                'payment_method' => $data['payment_method'],
                'amount' => $appliedAmount,
                'tendered_amount' => $receivedAmount,
                'change_amount' => $changeAmount,
                'received_at' => now(),
            ]);

            if ($paymentStatus === Transaction::PAYMENT_STATUS_PAID) {
                if ($transaction->customer) {
                    app(EarnCustomerPointsAction::class)->execute($transaction->customer, $transaction->fresh());
                }
                if ($transaction->diningTable) {
                    $transaction->diningTable->update(['status' => DiningTable::STATUS_AVAILABLE]);
                }
            }

            return $transaction->refresh();
        });
    }

    private function validateReceivedAmount(float $receivedAmount, float $remainingAmount): void
    {
        if ($receivedAmount <= 0) {
            throw ValidationException::withMessages([
                'paid_amount' => 'Jumlah bayar wajib diisi.',
            ]);
        }

        if ($remainingAmount <= 0) {
            throw ValidationException::withMessages([
                'paid_amount' => 'Transaksi ini sudah lunas.',
            ]);
        }
    }
}
