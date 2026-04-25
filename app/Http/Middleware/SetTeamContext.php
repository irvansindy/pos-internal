<?php

namespace App\Http\Middleware;

use App\Models\Team;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * SetTeamContext
 *
 * Sets the active team for Spatie Permission's team-based checks.
 * Must run before any role/permission middleware.
 *
 * Route parameter `current_team` (slug) takes priority over
 * the user's stored `current_team_id`.
 */
class SetTeamContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Try route param first (e.g. /teams/{current_team}/dashboard)
        $teamSlug = $request->route('current_team');

        if ($teamSlug) {
            $team = Team::where('slug', $teamSlug)->first();

            if ($team && $user->belongsToTeam($team)) {
                if (! $user->isCurrentTeam($team)) {
                    $user->switchTeam($team);
                }
            }
        }

        $currentTeam = $user->currentTeam;

        if ($currentTeam) {
            setPermissionsTeamId($currentTeam->id);
        }

        return $next($request);
    }
}