<?php

namespace App\Actions\User;

use App\Models\Team;
use App\Models\User;
use Spatie\Permission\Models\Role;

class UpdateUserAction
{
    public function execute(Team $team, User $member, string $teamRole, ?string $roleName): void
    {
        setPermissionsTeamId($team->id);

        // Update membership role di team_members
        $team->memberships()
            ->where('user_id', $member->id)
            ->update(['role' => $teamRole]);

        // Sync Spatie role jika diberikan
        if ($roleName) {
            $role = Role::where('name', $roleName)
                ->where('team_id', $team->id)
                ->first();

            if ($role) {
                // Cabut semua role lama di team ini
                $existingRoles = $member->roles()
                    ->where('team_id', $team->id)
                    ->pluck('name')
                    ->toArray();

                foreach ($existingRoles as $existing) {
                    $member->removeRole($existing);
                }

                $member->assignRole($role);
            }
        }
    }
}