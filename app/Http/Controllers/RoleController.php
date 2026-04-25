<?php

namespace App\Http\Controllers;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $roles = Role::where('team_id', $team->id)
            ->with('permissions')
            ->withCount(['permissions', 'users'])
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'label' => $role->label ?? ucfirst($role->name),
                'description' => $role->description,
                'is_system' => $role->is_system,
                'permissions_count' => $role->permissions_count,
                'users_count' => $role->users_count,
                'permissions' => $role->permissions->pluck('name'),
            ]);

        // Group permissions by module for the UI
        $allPermissions = Permission::orderBy('module')->orderBy('name')->get()
            ->groupBy('module')
            ->map(fn ($perms) => $perms->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'label' => $p->label,
                'description' => $p->description,
            ]));

        return Inertia::render('Roles/Index', [
            'roles' => $roles,
            'allPermissions' => $allPermissions,
            'currentTeam' => [
                'id' => $team->id,
                'name' => $team->name,
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $allPermissions = Permission::orderBy('module')->orderBy('name')->get()
            ->groupBy('module')
            ->map(fn ($perms) => $perms->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'label' => $p->label,
                'description' => $p->description,
                'module' => $p->module,
            ]));

        return Inertia::render('Roles/Create', [
            'allPermissions' => $allPermissions,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50', 'regex:/^[a-z_]+$/'],
            'label' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ], [
            'name.regex' => 'Nama role hanya boleh huruf kecil dan underscore.',
        ]);

        $team = $request->user()->currentTeam;

        // Check uniqueness within team
        $exists = Role::where('team_id', $team->id)
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            return back()->withErrors(['name' => 'Role dengan nama ini sudah ada di tim ini.'])->withInput();
        }

        setPermissionsTeamId($team->id);

        $role = Role::create([
            'name' => $validated['name'],
            'label' => $validated['label'],
            'description' => $validated['description'],
            'guard_name' => 'web',
            'team_id' => $team->id,
            'is_system' => false,
        ]);

        if (! empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
        }

        return redirect()->route('roles.index')
            ->with('success', "Role \"{$role->label}\" berhasil dibuat.");
    }

    public function show(Request $request, Role $role): Response
    {
        $this->authorizeTeamRole($request, $role);

        $role->load('permissions');
        $users = User::role($role->name, 'web')->get(['id', 'name', 'email']);

        return Inertia::render('Roles/Show', [
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'label' => $role->label ?? ucfirst($role->name),
                'description' => $role->description,
                'is_system' => $role->is_system,
                'permissions' => $role->permissions->map(fn ($p) => [
                    'name' => $p->name,
                    'label' => $p->label,
                    'module' => $p->module,
                ]),
            ],
            'users' => $users,
        ]);
    }

    public function edit(Request $request, Role $role): Response
    {
        $this->authorizeTeamRole($request, $role);

        $role->load('permissions');
        $allPermissions = Permission::orderBy('module')->orderBy('name')->get()
            ->groupBy('module')
            ->map(fn ($perms) => $perms->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'label' => $p->label,
                'description' => $p->description,
            ]));

        return Inertia::render('Roles/Edit', [
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'label' => $role->label,
                'description' => $role->description,
                'is_system' => $role->is_system,
                'permissions' => $role->permissions->pluck('name'),
            ],
            'allPermissions' => $allPermissions,
        ]);
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        $this->authorizeTeamRole($request, $role);

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role->update([
            'label' => $validated['label'],
            'description' => $validated['description'],
        ]);

        setPermissionsTeamId($request->user()->currentTeam->id);
        $role->syncPermissions($validated['permissions'] ?? []);

        return redirect()->route('roles.index')
            ->with('success', "Role \"{$role->label}\" berhasil diperbarui.");
    }

    public function destroy(Request $request, Role $role): RedirectResponse
    {
        $this->authorizeTeamRole($request, $role);

        if ($role->is_system) {
            return back()->with('error', 'Role sistem tidak dapat dihapus.');
        }

        if ($role->users()->count() > 0) {
            return back()->with('error', 'Role ini masih digunakan oleh beberapa user. Hapus assignment terlebih dahulu.');
        }

        $label = $role->label;
        $role->delete();

        return redirect()->route('roles.index')
            ->with('success', "Role \"{$label}\" berhasil dihapus.");
    }

    public function syncPermissions(Request $request, Role $role): RedirectResponse
    {
        $this->authorizeTeamRole($request, $role);

        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        setPermissionsTeamId($request->user()->currentTeam->id);
        $role->syncPermissions($validated['permissions']);

        return back()->with('success', 'Permission role berhasil diperbarui.');
    }

    /**
     * Ensure the role belongs to the current team.
     */
    private function authorizeTeamRole(Request $request, Role $role): void
    {
        $team = $request->user()->currentTeam;

        if ($role->team_id !== $team->id) {
            abort(403, 'Role ini bukan milik tim Anda.');
        }
    }
}