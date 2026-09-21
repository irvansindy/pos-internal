<?php

namespace App\Support;

use App\Models\CashierCashMovement;
use App\Models\CashierShift;
use App\Models\Transaction;
use App\Models\TransactionRefund;
use App\Models\TransactionReturn;

class CashierShiftReconciliation
{
    public function calculate(CashierShift $shift): array
    {
        $salesCash = (float) $shift->payments()
            ->where('payment_method', 'cash')
            ->whereHas('transaction', fn ($query) => $query->where('status', '!=', Transaction::STATUS_VOID))
            ->sum('amount');
        $refundCash = (float) TransactionRefund::query()
            ->where('cashier_shift_id', $shift->id)
            ->where('method', 'cash')
            ->where('status', TransactionRefund::STATUS_APPROVED)
            ->sum('amount');
        $returnCash = (float) TransactionReturn::query()
            ->where('cashier_shift_id', $shift->id)
            ->where('refund_method', 'cash')
            ->where('status', TransactionReturn::STATUS_APPROVED)
            ->sum('refund_amount');
        $cashIn = (float) $shift->movements()->where('type', CashierCashMovement::TYPE_IN)->sum('amount');
        $cashOut = (float) $shift->movements()->where('type', CashierCashMovement::TYPE_OUT)->sum('amount');

        return [
            'sales_cash_amount' => $salesCash,
            'refunds_cash_amount' => $refundCash + $returnCash,
            'cash_in_amount' => $cashIn,
            'cash_out_amount' => $cashOut,
            'expected_amount' => round((float) $shift->opening_amount + $salesCash + $cashIn - $refundCash - $returnCash - $cashOut, 2),
        ];
    }
}
