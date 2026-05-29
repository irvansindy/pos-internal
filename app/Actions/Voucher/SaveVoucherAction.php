<?php

namespace App\Actions\Voucher;

use App\Models\Team;
use App\Models\Voucher;
use Illuminate\Validation\ValidationException;

class SaveVoucherAction
{
    public function execute(Team $team, array $data, ?Voucher $voucher = null): Voucher
    {
        $code = strtoupper(trim($data['code']));

        $exists = Voucher::where('team_id', $team->id)
            ->where('code', $code)
            ->when($voucher, fn ($query) => $query->where('id', '!=', $voucher->id))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'code' => 'Kode voucher sudah digunakan pada tim ini.',
            ]);
        }

        $payload = [
            'team_id' => $team->id,
            'code' => $code,
            'name' => $data['name'],
            'type' => $data['type'],
            'value' => $data['value'],
            'min_purchase' => $data['min_purchase'] ?? 0,
            'max_discount' => $data['max_discount'] ?? null,
            'usage_limit' => $data['usage_limit'] ?? null,
            'starts_at' => $data['starts_at'] ?? null,
            'expires_at' => $data['expires_at'] ?? null,
            'is_active' => (bool) ($data['is_active'] ?? true),
        ];

        if ($voucher) {
            $voucher->update($payload);

            return $voucher->fresh();
        }

        return Voucher::create($payload);
    }
}
