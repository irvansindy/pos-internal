<?php

namespace App\Actions\Role;

use App\Models\Team;
use Spatie\Permission\Models\Role;

class DeleteRoleAction
{
    public function execute(Team $team, Role $role): void
    {
        setPermissionsTeamId($role->team_id ?? $team->id);

        $role->delete();
    }
}
