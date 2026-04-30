<?php

namespace App\Actions\User;

use App\Enums\TeamRole;
use App\Models\TeamInvitation;
use App\Models\User;
use Spatie\Permission\Models\Role;

class AcceptInvitationAction
{
    public function execute(TeamInvitation $invitation, User $user): void
    {
        $team = $invitation->team;

        // Tambahkan ke team
        $team->members()->syncWithoutDetaching([
            $user->id => ['role' => $invitation->role->value],
        ]);

        // Tandai undangan sebagai diterima
        $invitation->update(['accepted_at' => now()]);

        // Assign Spatie role yang sesuai
        setPermissionsTeamId($team->id);

        $roleName = $invitation->role === TeamRole::Admin ? 'admin' : 'kasir';
        $role = Role::where('name', $roleName)
            ->where('team_id', $team->id)
            ->first();

        if ($role) {
            $user->assignRole($role);
        }

        // Switch ke team baru
        $user->switchTeam($team);
    }
}