<?php

namespace App\Actions\Role;

use App\Models\Team;
use Spatie\Permission\Models\Role;

class CreateRoleAction
{
    /**
     * @param  array<int, string>  $permissions
     */
    public function execute(
        Team $team,
        string $name,
        string $label,
        ?string $description,
        array $permissions = [],
    ): Role {
        setPermissionsTeamId($team->id);

        $role = Role::create([
            'team_id'     => $team->id,
            'name'        => $name,
            'guard_name'  => 'web',
            'label'       => $label,
            'description' => $description,
            'is_system'   => false,
        ]);

        $role->syncPermissions($permissions);

        return $role;
    }
}
