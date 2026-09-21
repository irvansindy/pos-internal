<?php

namespace App\Actions\Customer;

use App\Models\Customer;
use App\Models\CustomerPointTransaction;
use App\Models\Transaction;

class EarnCustomerPointsAction
{
    public function execute(Customer $customer, Transaction $transaction): int
    {
        if ($transaction->payment_status !== Transaction::PAYMENT_STATUS_PAID) {
            return 0;
        }

        $existing = CustomerPointTransaction::query()
            ->where('customer_id', $customer->id)
            ->where('transaction_id', $transaction->id)
            ->where('type', CustomerPointTransaction::TYPE_EARN)
            ->exists();

        if ($existing) {
            return 0;
        }

        $points = (int) floor((float) $transaction->grand_total / max((int) config('loyalty.spend_per_point'), 1));

        if ($points < 1) {
            return 0;
        }

        $customer->increment('points_balance', $points);
        $balance = (int) $customer->fresh()->points_balance;

        $customer->pointTransactions()->create([
            'transaction_id' => $transaction->id,
            'type' => CustomerPointTransaction::TYPE_EARN,
            'points' => $points,
            'balance_after' => $balance,
            'note' => "Poin dari {$transaction->invoice_number}",
        ]);

        return $points;
    }
}
