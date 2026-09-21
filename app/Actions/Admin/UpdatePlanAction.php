<?php

namespace App\Actions\Admin;

use App\Models\Plan;
use App\Models\User;
use App\Support\PlatformAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdatePlanAction
{
    public function __construct(private PlatformAuditLogger $auditLogger) {}

    public function execute(Plan $plan, User $actor, array $data): Plan
    {
        return DB::transaction(function () use ($plan, $actor, $data) {
            $plan = Plan::query()->lockForUpdate()->findOrFail($plan->id);

            if (! $plan->is_custom && (! $data['max_stores'] || ! $data['max_owners'])) {
                throw ValidationException::withMessages([
                    'max_stores' => 'Paket reguler wajib memiliki kuota toko dan owner.',
                ]);
            }

            $fields = ['name', 'max_stores', 'max_owners', 'price_monthly', 'price_yearly', 'is_active'];
            $before = $plan->only($fields);
            $plan->update(collect($data)->only($fields)->all());
            $plan->refresh();

            $this->auditLogger->record(
                actor: $actor,
                action: 'plan.updated',
                target: $plan,
                reason: $data['reason'],
                before: $before,
                after: $plan->only($fields),
            );

            return $plan;
        });
    }
}
