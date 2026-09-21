<?php

namespace App\Actions\Admin;

use App\Enums\SubscriptionStatus;
use App\Models\Organization;
use App\Models\Subscription;
use App\Models\User;
use App\Support\PlatformAuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateSubscriptionStatusAction
{
    public function __construct(private PlatformAuditLogger $auditLogger) {}

    public function execute(Organization $organization, User $actor, SubscriptionStatus $status, string $reason): Subscription
    {
        return DB::transaction(function () use ($organization, $actor, $status, $reason) {
            $subscription = Subscription::query()
                ->where('organization_id', $organization->id)
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if (! $subscription) {
                throw ValidationException::withMessages([
                    'status' => 'Organization belum memiliki subscription.',
                ]);
            }

            if ($subscription->status === $status) {
                throw ValidationException::withMessages([
                    'status' => 'Status subscription sudah sesuai pilihan.',
                ]);
            }

            $before = $this->snapshot($subscription);

            $subscription->update([
                'status' => $status,
                'canceled_at' => $status === SubscriptionStatus::Canceled ? now() : null,
            ]);

            $subscription->refresh();
            $this->auditLogger->record(
                actor: $actor,
                action: 'subscription.status_updated',
                target: $subscription,
                reason: $reason,
                organization: $organization,
                before: $before,
                after: $this->snapshot($subscription),
            );

            return $subscription;
        });
    }

    private function snapshot(Subscription $subscription): array
    {
        return [
            'status' => $subscription->status->value,
            'plan_id' => $subscription->plan_id,
            'current_period_end' => $subscription->current_period_end?->toISOString(),
            'canceled_at' => $subscription->canceled_at?->toISOString(),
        ];
    }
}
