<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnsureTeamPermission
 *
 * Usage in routes:
 *   ->middleware('team.permission:product.view')
 *   ->middleware('team.permission:product.create,product.update') // any of these
 *
 * Owners bypass most checks. Role/permission management is developer-only.
 */
class EnsureTeamPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        $team = $user->currentTeam;

        if (! $team) {
            abort(403, 'Tidak ada tim aktif. Silakan pilih tim terlebih dahulu.');
        }

        if ($this->containsDeveloperOnlyPermission($permissions)) {
            if ($user->hasDeveloperRole()) {
                return $next($request);
            }

            abort(403, 'Hanya developer yang dapat mengelola role dan permission.');
        }

        // Owner bypasses non-developer-only permissions.
        if ($user->ownsTeam($team)) {
            return $next($request);
        }

        // Check any of the given permissions
        foreach ($permissions as $permission) {
            if ($user->canOnCurrentTeam($permission)) {
                return $next($request);
            }
        }

        if ($request->wantsJson() || $request->inertia()) {
            abort(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
        }

        return redirect()->route('dashboard')
            ->with('error', 'Anda tidak memiliki izin untuk mengakses halaman ini.');
    }

    /**
     * @param  array<int, string>  $permissions
     */
    private function containsDeveloperOnlyPermission(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (str_starts_with($permission, 'role.') || str_starts_with($permission, 'permission.')) {
                return true;
            }
        }

        return false;
    }
}
