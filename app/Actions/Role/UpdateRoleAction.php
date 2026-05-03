<?php

namespace App\Actions\Role;

use App\Models\Team;
use Spatie\Permission\Models\Role;

class UpdateRoleAction
{
    /**
     * @param  array<int, string>  $permissions
     */
    public function execute(
        Team $team,
        Role $role,
        string $label,
        ?string $description,
        array $permissions = [],
    ): void {
        setPermissionsTeamId($role->team_id ?? $team->id);

        $role->update([
            'label'       => $label,
            'description' => $description,
        ]);

        $role->syncPermissions($permissions);
    }
}
