<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

/**
 * SetTeamUrlDefaults
 *
 * Set default URL parameter `current_team` untuk semua route generation.
 * Harus dijalankan di web middleware group agar URL::defaults aktif
 * sebelum middleware lain (termasuk RedirectIfAuthenticated) generate URL.
 */
class SetTeamUrlDefaults
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->currentTeam) {
            URL::defaults([
                'current_team' => $user->currentTeam->slug,
            ]);
        }

        return $next($request);
    }
}