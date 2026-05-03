<?php

namespace App\Actions\Role;

use App\Models\Team;
use Spatie\Permission\Models\Role;

class SyncRolePermissionsAction
{
    /**
     * @param  array<int, string>  $permissions
     */
    public function execute(Team $team, Role $role, array $permissions): void
    {
        setPermissionsTeamId($role->team_id ?? $team->id);

        $role->syncPermissions($permissions);
    }
}
