<?php

namespace App\Actions\Transaction;

use App\Models\CashierShift;
use App\Models\Team;
use App\Models\Transaction;
use App\Models\TransactionRefund;
use App\Models\TransactionReturn;
use App\Models\User;
use App\Support\DocumentNumberGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateTransactionRefundAction
{
    public function execute(Team $team, User $user, array $data): TransactionRefund
    {
        return DB::transaction(function () use ($team, $user, $data) {
            $transaction = Transaction::where('team_id', $team->id)
                ->whereKey($data['transaction_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($transaction->status !== Transaction::STATUS_COMPLETED) {
                throw ValidationException::withMessages([
                    'transaction_id' => 'Refund hanya dapat dibuat untuk transaksi selesai.',
                ]);
            }

            if (! in_array($transaction->payment_status, [Transaction::PAYMENT_STATUS_PAID, Transaction::PAYMENT_STATUS_PARTIAL], true)) {
                throw ValidationException::withMessages([
                    'transaction_id' => 'Refund hanya dapat dibuat untuk transaksi yang sudah menerima pembayaran.',
                ]);
            }

            $amount = (float) $data['amount'];
            $status = $data['status'] ?? TransactionRefund::STATUS_APPROVED;
            $refunded = (float) $transaction->refunds()
                ->where('status', TransactionRefund::STATUS_APPROVED)
                ->sum('amount');
            $returned = (float) $transaction->returns()
                ->where('status', TransactionReturn::STATUS_APPROVED)
                ->sum('refund_amount');
            $collected = min((float) $transaction->paid_amount, (float) $transaction->grand_total);
            $remaining = max($collected - $refunded - $returned, 0);

            if ($status === TransactionRefund::STATUS_APPROVED && $amount > $remaining) {
                throw ValidationException::withMessages([
                    'amount' => 'Nominal refund melebihi sisa pembayaran yang dapat direfund.',
                ]);
            }

            return TransactionRefund::create([
                'team_id' => $team->id,
                'transaction_id' => $transaction->id,
                'user_id' => $user->id,
                'cashier_shift_id' => CashierShift::query()
                    ->where('team_id', $team->id)
                    ->where('user_id', $user->id)
                    ->where('status', CashierShift::STATUS_OPEN)
                    ->value('id'),
                'refund_number' => DocumentNumberGenerator::generate('RFN', 'transaction_refunds', 'refund_number', $team->id),
                'amount' => $amount,
                'method' => $data['method'],
                'status' => $status,
                'reason' => $data['reason'] ?? null,
                'refunded_at' => $status === TransactionRefund::STATUS_APPROVED ? now() : null,
            ])->load(['transaction:id,invoice_number,customer_name,grand_total', 'user:id,name']);
        });
    }
}
