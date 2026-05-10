<?php

namespace App\Actions\ProductActivity;

use App\Models\ProductActivityLog;
use App\Models\Team;
use App\Models\User;

class RecordProductActivityLogAction
{
    public function execute(
        Team $team,
        ?User $user,
        string $subjectType,
        ?int $subjectId,
        ?string $subjectName,
        string $action,
        ?array $changes = null,
        ?string $note = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
    ): ProductActivityLog {
        return ProductActivityLog::create([
            'team_id' => $team->id,
            'user_id' => $user?->id,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'subject_name' => $subjectName,
            'action' => $action,
            'changes' => $changes,
            'note' => $note,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
        ]);
    }
}
