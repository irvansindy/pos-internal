<?php

namespace App\Actions\Menu;

use App\Models\Menu;

class UpdateMenuAction
{
    /**
     * Update menu and sync related permission label.
     *
     * @param Menu $menu
     * @param array $data
     * @return Menu
     */
    public function execute(Menu $menu, array $data): Menu
    {
        // Update menu fields (name is immutable)
        $menu->update([
            'label'      => $data['label'] ?? $menu->label,
            'route'      => $data['route'] ?? $menu->route,
            'icon'       => $data['icon'] ?? $menu->icon,
            'parent_id'  => $data['parent_id'] ?? $menu->parent_id,
            'sort_order' => $data['sort_order'] ?? $menu->sort_order,
            'is_active'  => $data['is_active'] ?? $menu->is_active,
        ]);

        // Update permission label if menu label changed
        if (isset($data['label'])) {
            $permissionName = 'menu.' . $menu->name;
            $permission = \Spatie\Permission\Models\Permission::where('name', $permissionName)
                ->where('guard_name', 'web')
                ->first();

            if ($permission) {
                $permission->update([
                    'label' => 'menu.' . $data['label'],
                ]);
            }
        }

        return $menu;
    }
}
