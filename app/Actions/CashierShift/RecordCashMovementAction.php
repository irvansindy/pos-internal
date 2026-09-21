<?php

namespace App\Actions\CashierShift;

use App\Models\CashierCashMovement;
use App\Models\CashierShift;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecordCashMovementAction
{
    public function execute(Team $team, User $user, CashierShift $shift, array $data): CashierCashMovement
    {
        return DB::transaction(function () use ($team, $user, $shift, $data) {
            $shift = CashierShift::query()->lockForUpdate()->findOrFail($shift->id);

            if ($shift->team_id !== $team->id || $shift->user_id !== $user->id) {
                abort(404);
            }

            if ($shift->status !== CashierShift::STATUS_OPEN) {
                throw ValidationException::withMessages([
                    'cashier_shift' => 'Kas masuk atau keluar hanya dapat dicatat pada shift aktif.',
                ]);
            }

            return CashierCashMovement::create([
                'cashier_shift_id' => $shift->id,
                'team_id' => $team->id,
                'user_id' => $user->id,
                'type' => $data['type'],
                'amount' => $data['amount'],
                'category' => $data['category'],
                'note' => $data['note'] ?? null,
                'occurred_at' => now(),
            ]);
        });
    }
}
