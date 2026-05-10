<?php

namespace App\Actions\Menu;

use App\Models\Menu;
use Spatie\Permission\Models\Permission;

class DeleteMenuAction
{
    /**
     * Delete menu and its children, and remove associated permissions.
     *
     * @param Menu $menu
     * @return bool
     */
    public function execute(Menu $menu): bool
    {
        // Get all child menus recursively
        $childIds = $this->getChildMenuIds($menu);
        $allIds = array_merge([$menu->id], $childIds);

        // Get and delete permissions for this menu and all children
        $permissionNames = Menu::whereIn('id', $allIds)
            ->pluck('name')
            ->map(fn ($name) => 'menu.' . $name)
            ->toArray();

        Permission::where('guard_name', 'web')
            ->whereIn('name', $permissionNames)
            ->delete();

        // Delete menu (cascades to children via foreign key)
        return $menu->delete();
    }

    /**
     * Recursively get all child menu IDs.
     *
     * @param Menu $menu
     * @return array
     */
    private function getChildMenuIds(Menu $menu): array
    {
        $childIds = [];

        foreach ($menu->children as $child) {
            $childIds[] = $child->id;
            $childIds = array_merge($childIds, $this->getChildMenuIds($child));
        }

        return $childIds;
    }
}
