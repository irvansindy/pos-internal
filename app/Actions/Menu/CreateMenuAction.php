<?php

namespace App\Actions\Menu;

use App\Models\Menu;
use App\Models\Team;
use Spatie\Permission\Models\Permission;

class CreateMenuAction
{
    /**
     * Create a new menu and auto-create its permission.
     *
     * @param Team $team
     * @param array $data
     * @return Menu
     */
    public function execute(Team $team, array $data): Menu
    {
        // Create the menu
        $menu = Menu::create($data);

        // Auto-create permission: menu.{menu.name}
        $permissionName = 'menu.' . $menu->name;
        $permissionLabel = 'menu.' . $menu->label;

        $permission = Permission::firstOrCreate(
            [
                'name'       => $permissionName,
                'guard_name' => 'web',
            ],
            [
                'label'       => $permissionLabel,
                'description' => 'Permission untuk menu: ' . $menu->label,
                'team_id'     => $team->id,
            ]
        );

        // Sync permission to menu via pivot table
        $menu->permissions()->syncWithoutDetaching([$permission->id]);

        return $menu;
    }
}
