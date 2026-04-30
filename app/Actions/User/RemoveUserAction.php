<?php

namespace App\Actions\User;

use App\Models\Team;
use App\Models\User;
use Spatie\Permission\Models\Role;

class RemoveUserAction
{
    public function execute(Team $team, User $member): void
    {
        setPermissionsTeamId($team->id);

        // Cabut semua role Spatie di team ini
        $roleNames = $member->roles()
            ->where('team_id', $team->id)
            ->pluck('name')
            ->toArray();

        foreach ($roleNames as $roleName) {
            $member->removeRole($roleName);
        }

        // Hapus dari team
        $team->members()->detach($member->id);

        // Jika ini current team-nya, alihkan ke team lain
        if ($member->current_team_id === $team->id) {
            $fallback = $member->fallbackTeam($team);
            $member->update(['current_team_id' => $fallback?->id]);
        }
    }
}