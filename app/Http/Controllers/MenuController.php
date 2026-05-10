<?php

namespace App\Http\Controllers;

use App\Actions\Menu\CreateMenuAction;
use App\Actions\Menu\DeleteMenuAction;
use App\Actions\Menu\SyncMenuStructureAction;
use App\Actions\Menu\UpdateMenuAction;
use App\Http\Requests\Menu\CreateMenuRequest;
use App\Http\Requests\Menu\SyncMenuRequest;
use App\Http\Requests\Menu\UpdateMenuRequest;
use App\Models\Menu;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MenuController extends Controller
{
    public function __construct(
        private readonly CreateMenuAction         $createMenu,
        private readonly UpdateMenuAction         $updateMenu,
        private readonly DeleteMenuAction         $deleteMenu,
        private readonly SyncMenuStructureAction  $syncMenuStructure,
    ) {}

    /**
     * Resolve menu from route parameter explicitly.
     * Avoids implicit binding issues.
     */
    private function resolveMenu(Request $request): Menu
    {
        $menuId = $request->route('menuId');
        return Menu::findOrFail($menuId);
    }

    /**
     * Display hierarchical menu list with permissions.
     */
    public function index(Request $request): Response
    {
        $authUser = $request->user();
        $team     = $authUser->currentTeam;

        setPermissionsTeamId($team->id);

        // Get root menus with children (hierarchical)
        $menus = Menu::whereNull('parent_id')
            ->orderBy('sort_order')
            ->with(['children' => function ($q) {
                $q->orderBy('sort_order');
            }, 'permissions'])
            ->get()
            ->map(fn (Menu $m) => $this->mapMenuToArray($m));

        // Get all available permissions for display
        $allPermissions = Menu::all()
            ->flatMap(fn (Menu $m) => $m->permissions->pluck('name'))
            ->unique()
            ->values()
            ->toArray();

        // Get all available parent menus for dropdown
        $availableParents = Menu::all(['id', 'label', 'name'])
            ->map(fn ($m) => ['value' => $m->id, 'label' => $m->label]);

        return Inertia::render('menus/index', [
            'menus'             => $menus,
            'allPermissions'    => $allPermissions,
            'availableParents'  => $availableParents,
            'canCreate'         => $authUser->canOnCurrentTeam('role.update'),
            'canUpdate'         => $authUser->canOnCurrentTeam('role.update'),
            'canDelete'         => $authUser->canOnCurrentTeam('role.update'),
        ]);
    }

    /**
     * Store a new menu.
     */
    public function store(CreateMenuRequest $request): RedirectResponse
    {
        $team = $request->user()->currentTeam;

        $this->createMenu->execute($team, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Menu berhasil dibuat.']);

        return back();
    }

    /**
     * Update a menu.
     */
    public function update(UpdateMenuRequest $request): RedirectResponse
    {
        $menu = $this->resolveMenu($request);

        $this->updateMenu->execute($menu, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Menu berhasil diperbarui.']);

        return back();
    }

    /**
     * Delete a menu and its children.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $menu = $this->resolveMenu($request);

        $this->deleteMenu->execute($menu);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Menu berhasil dihapus.']);

        return back();
    }

    /**
     * Sync menu structure and refresh permission cache.
     */
    public function sync(SyncMenuRequest $request): RedirectResponse
    {
        $team = $request->user()->currentTeam;
        $menuIds = $request->validated('menu_ids');

        $this->syncMenuStructure->execute($team, $menuIds);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Menu structure berhasil disinkronisasi.']);

        return back();
    }

    /**
     * Map menu model to array with children recursively.
     */
    private function mapMenuToArray(Menu $menu): array
    {
        return [
            'id'          => $menu->id,
            'name'        => $menu->name,
            'label'       => $menu->label,
            'route'       => $menu->route,
            'icon'        => $menu->icon,
            'module'      => $menu->module,
            'sort_order'  => $menu->sort_order,
            'is_active'   => $menu->is_active,
            'parent_id'   => $menu->parent_id,
            'permissions' => $menu->permissions->pluck('name')->toArray(),
            'children'    => $menu->children->map(fn ($child) => $this->mapMenuToArray($child))->toArray(),
        ];
    }
}
