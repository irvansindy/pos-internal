<?php

namespace App\Http\Middleware;

use App\Models\Team;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnsureTeamMembership
 *
 * Memverifikasi bahwa user yang login adalah anggota dari team
 * yang ada di URL prefix {current_team}.
 *
 * - Owner otomatis lolos (bypass)
 * - Jika bukan anggota, redirect ke team yang valid milik user
 * - Jika tidak punya team sama sekali, redirect ke home
 *
 * TIDAK berlaku untuk route auth (login, register, dsb) karena
 * route auth tidak masuk group middleware ini.
 */
class EnsureTeamMembership
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        // Ambil slug dari URL parameter
        $teamSlug = $request->route('current_team');

        if (! $teamSlug) {
            // Tidak ada team di URL — redirect ke team aktif user
            return $this->redirectToUserTeam($user);
        }

        $team = Team::where('slug', $teamSlug)->first();

        if (! $team) {
            return $this->redirectToUserTeam($user);
        }

        // Cek apakah user adalah anggota team ini
        if (! $user->belongsToTeam($team)) {
            // Bukan anggota — redirect ke team user yang valid
            return $this->redirectToUserTeam($user, "Anda bukan anggota tim \"{$team->name}\".");
        }

        // Switch ke team ini jika belum aktif
        if (! $user->isCurrentTeam($team)) {
            $user->switchTeam($team);
        }

        // Set Spatie permission team context
        setPermissionsTeamId($team->id);

        return $next($request);
    }

    /**
     * Redirect user ke dashboard team mereka yang aktif/pertama.
     */
    private function redirectToUserTeam(\App\Models\User $user, ?string $error = null): Response
    {
        $team = $user->currentTeam
            ?? $user->personalTeam()
            ?? $user->teams()->orderBy('name')->first();

        if (! $team) {
            // User tidak punya team sama sekali — ke home
            return redirect()->route('home')
                ->with('error', $error ?? 'Anda belum bergabung dengan tim manapun.');
        }

        // Update current team
        if ($user->current_team_id !== $team->id) {
            $user->update(['current_team_id' => $team->id]);
        }

        $redirect = redirect()->route('dashboard', ['current_team' => $team->slug]);

        if ($error) {
            $redirect->with('error', $error);
        }

        return $redirect;
    }
}