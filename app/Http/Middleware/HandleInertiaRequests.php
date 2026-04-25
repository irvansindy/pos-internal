<?php

namespace App\Http\Middleware;

use App\Models\Menu;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),

            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'email_verified_at' => $user->email_verified_at,
                    'two_factor_enabled' => ! empty($user->two_factor_secret),
                    'current_team' => $user->currentTeam ? [
                        'id' => $user->currentTeam->id,
                        'name' => $user->currentTeam->name,
                        'slug' => $user->currentTeam->slug,
                        'is_personal' => $user->currentTeam->is_personal,
                        'role' => $user->teamRole($user->currentTeam)?->value,
                        'role_label' => $user->teamRole($user->currentTeam)?->label(),
                        'is_owner' => $user->ownsTeam($user->currentTeam),
                    ] : null,
                    'teams' => $user->toUserTeams(includeCurrent: true),
                    'permissions' => $this->getUserPermissions($user),
                ] : null,
            ],

            'navigation' => $user ? $this->buildNavigation($user) : [],

            // Gunakan Session facade + hasSession() guard agar aman
            // ketika request belum melewati StartSession middleware
            'flash' => [
                'success' => fn () => $this->getFlash($request, 'success'),
                'error'   => fn () => $this->getFlash($request, 'error'),
                'warning' => fn () => $this->getFlash($request, 'warning'),
                'info'    => fn () => $this->getFlash($request, 'info'),
            ],
        ];
    }

    /**
     * Safely retrieve a flash value from the session.
     * Returns null jika session belum tersedia (misal request tanpa web middleware).
     */
    private function getFlash(Request $request, string $key): ?string
    {
        if (! $request->hasSession()) {
            return null;
        }

        return $request->session()->get($key);
    }

    /**
     * Build the navigation tree for the current user on their current team.
     */
    private function buildNavigation(\App\Models\User $user): array
    {
        return $user->accessibleMenus()
            ->map(fn (\App\Models\Menu $menu) => [
                'name' => $menu->name,
                'label' => $menu->label,
                'route' => $menu->route,
                'icon' => $menu->icon,
                'module' => $menu->module,
                'children' => $menu->children->map(fn (\App\Models\Menu $child) => [
                    'name' => $child->name,
                    'label' => $child->label,
                    'route' => $child->route,
                    'icon' => $child->icon,
                ])->values()->toArray(),
            ])
            ->values()
            ->toArray();
    }

    /**
     * Get all permission names for the user on their current team.
     * Returns empty array for non-owners, full list triggers owner bypass on frontend.
     */
    private function getUserPermissions(\App\Models\User $user): array
    {
        $team = $user->currentTeam;

        if (! $team) {
            return [];
        }

        if ($user->ownsTeam($team)) {
            return ['*']; // wildcard — frontend interprets this as "all permissions"
        }

        setPermissionsTeamId($team->id);

        return $user->getAllPermissions()->pluck('name')->toArray();
    }
}