<?php

namespace App\Actions\Customer;

use App\Models\Customer;
use App\Models\CustomerPointTransaction;
use App\Models\Transaction;
use Illuminate\Validation\ValidationException;

class RedeemCustomerPointsAction
{
    public function discount(int $points, float $maximum): float
    {
        return min($maximum, $points * max((int) config('loyalty.point_value'), 1));
    }

    public function execute(Customer $customer, Transaction $transaction, int $points): void
    {
        if ($points < 1) {
            return;
        }

        if ((int) $customer->points_balance < $points) {
            throw ValidationException::withMessages(['points_to_redeem' => 'Saldo poin pelanggan tidak mencukupi.']);
        }

        $customer->decrement('points_balance', $points);
        $balance = (int) $customer->fresh()->points_balance;

        $customer->pointTransactions()->create([
            'transaction_id' => $transaction->id,
            'type' => CustomerPointTransaction::TYPE_REDEEM,
            'points' => -$points,
            'balance_after' => $balance,
            'note' => "Penukaran poin pada {$transaction->invoice_number}",
        ]);
    }
}
