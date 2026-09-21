<?php

namespace App\Support;

use App\Models\Organization;
use App\Models\PlatformAdminAudit;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class PlatformAuditLogger
{
    public function record(
        User $actor,
        string $action,
        Model $target,
        string $reason,
        ?Organization $organization = null,
        ?array $before = null,
        ?array $after = null,
    ): PlatformAdminAudit {
        return PlatformAdminAudit::create([
            'organization_id' => $organization?->id,
            'actor_id' => $actor->id,
            'action' => $action,
            'target_type' => $target::class,
            'target_id' => $target->getKey(),
            'before' => $before,
            'after' => $after,
            'reason' => $reason,
            'ip_address' => request()?->ip(),
            'user_agent' => mb_substr((string) request()?->userAgent(), 0, 500) ?: null,
        ]);
    }
}
