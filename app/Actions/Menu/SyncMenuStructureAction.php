<?php

namespace App\Actions\Menu;

use App\Models\Menu;
use App\Models\Team;

class SyncMenuStructureAction
{
    /**
     * Sync menu structure and rebuild permission cache.
     *
     * @param Team $team
     * @param array|null $menuIds Optional: specific menu IDs to sync. If null, syncs all.
     * @return array Hierarchical menu structure
     */
    public function execute(Team $team, ?array $menuIds = null): array
    {
        $query = Menu::query();

        // If specific menu IDs provided, sync only those and their parents/children
        if ($menuIds) {
            $query->whereIn('id', $menuIds);
        }

        // Refresh permission cache for team
        app('cache')
            ->store(config('permission.cache.store') !== 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));

        // Get all root menus with children (hierarchical)
        $menus = Menu::whereNull('parent_id')
            ->orderBy('sort_order')
            ->with(['children' => function ($query) {
                $query->orderBy('sort_order');
            }])
            ->get();

        return $this->buildHierarchicalMenus($menus);
    }

    /**
     * Build hierarchical menu structure recursively.
     *
     * @param \Illuminate\Database\Eloquent\Collection $menus
     * @return array
     */
    private function buildHierarchicalMenus($menus): array
    {
        return $menus->map(function (Menu $menu) {
            return [
                'id'         => $menu->id,
                'name'       => $menu->name,
                'label'      => $menu->label,
                'route'      => $menu->route,
                'icon'       => $menu->icon,
                'module'     => $menu->module,
                'sort_order' => $menu->sort_order,
                'is_active'  => $menu->is_active,
                'parent_id'  => $menu->parent_id,
                'permissions' => $menu->permissions->pluck('name')->toArray(),
                'children'   => $this->buildHierarchicalMenus($menu->children),
            ];
        })->toArray();
    }
}
