<?php

namespace App\Actions\CashierShift;

use App\Models\CashierShift;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OpenCashierShiftAction
{
    public function execute(Team $team, User $user, array $data): CashierShift
    {
        try {
            return DB::transaction(function () use ($team, $user, $data) {
                Team::query()->lockForUpdate()->findOrFail($team->id);

                if (CashierShift::where('open_guard', CashierShift::guardFor($team->id, $user->id))->exists()) {
                    throw ValidationException::withMessages([
                        'opening_amount' => 'Anda masih memiliki shift aktif di toko ini.',
                    ]);
                }

                return CashierShift::create([
                    'team_id' => $team->id,
                    'user_id' => $user->id,
                    'status' => CashierShift::STATUS_OPEN,
                    'open_guard' => CashierShift::guardFor($team->id, $user->id),
                    'opening_amount' => $data['opening_amount'],
                    'opening_note' => $data['opening_note'] ?? null,
                    'opened_at' => now(),
                ]);
            });
        } catch (QueryException $exception) {
            if (CashierShift::where('open_guard', CashierShift::guardFor($team->id, $user->id))->exists()) {
                throw ValidationException::withMessages([
                    'opening_amount' => 'Anda masih memiliki shift aktif di toko ini.',
                ]);
            }

            throw $exception;
        }
    }
}
