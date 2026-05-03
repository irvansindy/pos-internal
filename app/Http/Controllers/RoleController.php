<?php

namespace App\Http\Controllers;

use App\Actions\Role\CreateRoleAction;
use App\Actions\Role\DeleteRoleAction;
use App\Actions\Role\SyncRolePermissionsAction;
use App\Actions\Role\UpdateRoleAction;
use App\Http\Requests\Role\StoreRoleRequest;
use App\Http\Requests\Role\SyncRolePermissionsRequest;
use App\Http\Requests\Role\UpdateRoleRequest;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function __construct(
        private readonly CreateRoleAction          $createRole,
        private readonly UpdateRoleAction          $updateRole,
        private readonly DeleteRoleAction          $deleteRole,
        private readonly SyncRolePermissionsAction $syncRolePermissions,
    ) {}

    // ─── Resolve role dari route parameter secara eksplisit ───────────────
    // Menggunakan {roleId} agar konsisten dengan pola UserController.
    private function resolveRole(Request $request): Role
    {
        $roleId = $request->route('roleId');

        return Role::findOrFail($roleId);
    }

    private function authorizeDeveloper(Request $request): void
    {
        abort_unless(
            $request->user()->hasDeveloperRole(),
            403,
            'Hanya developer yang dapat mengelola role dan permission.',
        );
    }

    private function authorizeTeamRole(Request $request, Role $role): Team
    {
        $team = $request->user()->currentTeam;

        if ($request->user()->hasDeveloperRole()) {
            setPermissionsTeamId($role->team_id);

            return $team;
        }

        abort_unless(
            $role->team_id === $team->id || $role->team_id === null,
            403,
            'Role ini bukan milik tim Anda.',
        );

        setPermissionsTeamId($role->team_id);

        return $team;
    }

    private function permissionsByModule(): Collection
    {
        return Permission::orderBy('module')
            ->orderBy('name')
            ->get(['id', 'name', 'label', 'description', 'module'])
            ->groupBy(fn (Permission $permission) => $permission->module ?? 'general')
            ->map(fn (Collection $permissions) => $permissions->map(fn (Permission $permission) => [
                'id'          => $permission->id,
                'name'        => $permission->name,
                'label'       => $permission->label ?? $permission->name,
                'description' => $permission->description,
                'module'      => $permission->module ?? 'general',
            ])->values());
    }

    // ─── ROLES ────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $this->authorizeDeveloper($request);

        $authUser = $request->user();
        $team     = $authUser->currentTeam;

        setPermissionsTeamId($team->id);

        $roleModels = Role::query()
            ->when(! $authUser->hasDeveloperRole(), fn ($query) => $query
                ->where(fn ($query) => $query
                    ->where('team_id', $team->id)
                    ->orWhereNull('team_id')))
            ->with('permissions')
            ->withCount(['permissions', 'users'])
            ->orderBy('name')
            ->get();

        $teams = Team::whereIn('id', $roleModels->pluck('team_id')->filter()->unique())
            ->get(['id', 'name', 'slug'])
            ->keyBy('id');

        $roles = $roleModels->map(fn (Role $role) => [
            'id'                => $role->id,
            'name'              => $role->name,
            'label'             => $role->label ?? ucfirst($role->name),
            'description'       => $role->description,
            'is_system'         => $role->is_system,
            'is_global'         => $role->team_id === null,
            'team'              => $teams->has($role->team_id) ? [
                'id'   => $teams->get($role->team_id)->id,
                'name' => $teams->get($role->team_id)->name,
                'slug' => $teams->get($role->team_id)->slug,
            ] : null,
            'permissions_count' => $role->permissions_count,
            'users_count'       => $role->users_count,
            'permissions'       => $role->permissions->pluck('name'),
        ]);

        return Inertia::render('roles/index', [
            'roles'          => $roles,
            'allPermissions' => $this->permissionsByModule(),
            'currentTeam'    => [
                'id'   => $team->id,
                'name' => $team->name,
                'slug' => $team->slug,
            ],
            'canCreate'          => $authUser->canOnCurrentTeam('role.create'),
            'canUpdate'          => $authUser->canOnCurrentTeam('role.update'),
            'canDelete'          => $authUser->canOnCurrentTeam('role.delete'),
            'canAssignPermission' => $authUser->canOnCurrentTeam('permission.assign'),
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorizeDeveloper($request);

        $team = $request->user()->currentTeam;

        return Inertia::render('roles/create', [
            'allPermissions' => $this->permissionsByModule(),
            'currentTeam'    => [
                'id'   => $team->id,
                'name' => $team->name,
                'slug' => $team->slug,
            ],
        ]);
    }

    public function store(StoreRoleRequest $request): RedirectResponse
    {
        $this->authorizeDeveloper($request);

        $team      = $request->user()->currentTeam;
        $validated = $request->validated();

        $role = $this->createRole->execute(
            team: $team,
            name: $validated['name'],
            label: $validated['label'],
            description: $validated['description'] ?? null,
            permissions: $validated['permissions'] ?? [],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => "Role \"{$role->label}\" berhasil dibuat."]);

        return redirect()->route('roles.index', ['current_team' => $team]);
    }

    public function show(Request $request): Response
    {
        $this->authorizeDeveloper($request);

        $role = $this->resolveRole($request);
        $team = $this->authorizeTeamRole($request, $role);

        $role->load('permissions');

        $users = $role->users()
            ->select('users.id', 'users.name', 'users.email')
            ->orderBy('users.name')
            ->get();

        return Inertia::render('roles/show', [
            'role' => [
                'id'          => $role->id,
                'name'        => $role->name,
                'label'       => $role->label ?? ucfirst($role->name),
                'description' => $role->description,
                'is_system'   => $role->is_system,
                'is_global'   => $role->team_id === null,
                'permissions' => $role->permissions->map(fn (Permission $permission) => [
                    'id'          => $permission->id,
                    'name'        => $permission->name,
                    'label'       => $permission->label ?? $permission->name,
                    'description' => $permission->description,
                    'module'      => $permission->module ?? 'general',
                ]),
            ],
            'users'       => $users,
            'currentTeam' => [
                'id'   => $team->id,
                'name' => $team->name,
                'slug' => $team->slug,
            ],
        ]);
    }

    public function edit(Request $request): Response
    {
        $this->authorizeDeveloper($request);

        $role = $this->resolveRole($request);
        $team = $this->authorizeTeamRole($request, $role);

        $role->load('permissions');

        return Inertia::render('roles/edit', [
            'role' => [
                'id'          => $role->id,
                'name'        => $role->name,
                'label'       => $role->label ?? ucfirst($role->name),
                'description' => $role->description,
                'is_system'   => $role->is_system,
                'is_global'   => $role->team_id === null,
                'permissions' => $role->permissions->pluck('name'),
            ],
            'allPermissions' => $this->permissionsByModule(),
            'currentTeam'    => [
                'id'   => $team->id,
                'name' => $team->name,
                'slug' => $team->slug,
            ],
        ]);
    }

    public function update(UpdateRoleRequest $request): RedirectResponse
    {
        $this->authorizeDeveloper($request);

        $role      = $this->resolveRole($request);
        $team      = $this->authorizeTeamRole($request, $role);
        $validated = $request->validated();

        $this->updateRole->execute(
            team: $team,
            role: $role,
            label: $validated['label'],
            description: $validated['description'] ?? null,
            permissions: $validated['permissions'] ?? [],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => "Role \"{$role->label}\" berhasil diperbarui."]);

        return back();
    }

    public function destroy(Request $request): RedirectResponse
    {
        $this->authorizeDeveloper($request);

        $role = $this->resolveRole($request);
        $team = $this->authorizeTeamRole($request, $role);

        if ($role->is_system) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Role sistem tidak dapat dihapus.']);

            return back();
        }

        if ($role->users()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Role ini masih digunakan oleh user. Hapus assignment terlebih dahulu.']);

            return back();
        }

        $label = $role->label ?? ucfirst($role->name);

        $this->deleteRole->execute($team, $role);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Role \"{$label}\" berhasil dihapus."]);

        return back();
    }

    public function syncPermissions(SyncRolePermissionsRequest $request): RedirectResponse
    {
        $this->authorizeDeveloper($request);

        $role      = $this->resolveRole($request);
        $team      = $this->authorizeTeamRole($request, $role);
        $validated = $request->validated();

        $this->syncRolePermissions->execute(
            team: $team,
            role: $role,
            permissions: $validated['permissions'] ?? [],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Permission role berhasil diperbarui.']);

        return back();
    }
}
