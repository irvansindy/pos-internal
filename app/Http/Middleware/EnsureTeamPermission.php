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
 * Owners bypass all checks.
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

        // Owner bypasses everything
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
}