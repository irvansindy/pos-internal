<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Team;
use Symfony\Component\HttpFoundation\Response;

/**
 * RedirectIfAuthenticated (override Laravel default)
 *
 * Mengganti behavior default yang menggunakan route('dashboard')
 * (yang butuh {current_team} parameter) menjadi URL absolut
 * yang langsung mengandung team slug.
 */
class RedirectIfAuthenticated
{
    public function handle(Request $request, Closure $next, string ...$guards): Response
    {
        $guards = empty($guards) ? [null] : $guards;

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                // User sudah login — redirect ke dashboard mereka
                // Gunakan URL absolut, bukan route() agar tidak butuh current_team
                return redirect($this->getDashboardUrl(Auth::guard($guard)->user()));
            }
        }

        return $next($request);
    }

    /**
     * Build absolute dashboard URL untuk user yang sudah login.
     */
    private function getDashboardUrl($user): string
    {
        if (! $user) {
            return url('/');
        }

        // Cek current_team_id
        if ($user->current_team_id) {
            $isMember = DB::table('team_members')
                ->where('team_id', $user->current_team_id)
                ->where('user_id', $user->id)
                ->exists();

            if ($isMember) {
                $team = Team::whereNull('deleted_at')->find($user->current_team_id);
                if ($team) {
                    return url("/{$team->slug}/dashboard");
                }
            }
        }

        // Cari team pertama
        $membership = DB::table('team_members')
            ->where('user_id', $user->id)
            ->orderBy('created_at')
            ->first();

        if ($membership) {
            $team = Team::whereNull('deleted_at')->find($membership->team_id);
            if ($team) {
                return url("/{$team->slug}/dashboard");
            }
        }

        // Fallback ke home
        return url('/');
    }
}