<?php

namespace App\Actions\CashierShift;

use App\Models\CashierShift;
use App\Models\Team;
use App\Models\User;
use App\Support\CashierShiftReconciliation;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CloseCashierShiftAction
{
    public function __construct(private CashierShiftReconciliation $reconciliation) {}

    public function execute(Team $team, User $user, CashierShift $shift, array $data): CashierShift
    {
        return DB::transaction(function () use ($team, $user, $shift, $data) {
            $shift = CashierShift::query()->lockForUpdate()->findOrFail($shift->id);

            if ($shift->team_id !== $team->id || $shift->user_id !== $user->id) {
                abort(404);
            }

            if ($shift->status !== CashierShift::STATUS_OPEN) {
                throw ValidationException::withMessages([
                    'cashier_shift' => 'Shift ini sudah ditutup.',
                ]);
            }

            $summary = $this->reconciliation->calculate($shift);
            $counted = round((float) $data['counted_amount'], 2);

            $shift->update([
                'status' => CashierShift::STATUS_CLOSED,
                'open_guard' => null,
                'sales_cash_amount' => $summary['sales_cash_amount'],
                'refunds_cash_amount' => $summary['refunds_cash_amount'],
                'cash_in_amount' => $summary['cash_in_amount'],
                'cash_out_amount' => $summary['cash_out_amount'],
                'expected_amount' => $summary['expected_amount'],
                'counted_amount' => $counted,
                'difference_amount' => round($counted - $summary['expected_amount'], 2),
                'closing_note' => $data['closing_note'] ?? null,
                'closed_at' => now(),
            ]);

            return $shift->refresh();
        });
    }
}
