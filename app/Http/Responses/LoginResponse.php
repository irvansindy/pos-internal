<?php

namespace App\Http\Responses;

use App\Enums\TeamRole;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\URL;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request): Response
    {
        $user = $request->user();

        // Ambil team: current → personal → pertama yang ada
        $team = $user->currentTeam
            ?? $user->personalTeam()
            ?? $user->teams()->orderBy('name')->first();

        // Jika belum punya team sama sekali, buat personal team otomatis
        if (! $team) {
            $team = $this->createPersonalTeam($user);
        }

        // Set sebagai current team jika belum tersimpan
        if (! $user->current_team_id || $user->current_team_id !== $team->id) {
            $user->update(['current_team_id' => $team->id]);
            $user->setRelation('currentTeam', $team);
        }

        // Bangun URL dashboard secara langsung (absolut, bukan via Ziggy)
        // agar tidak bergantung pada URL::defaults yang mungkin belum aktif
        $dashboardUrl = url("/{$team->slug}/dashboard");

        // Inertia mengirim header X-Inertia = true tapi juga Accept: text/html
        // Cek apakah ini pure JSON API request (bukan Inertia)
        $isInertia = $request->hasHeader('X-Inertia');
        $isPureJson = $request->wantsJson() && ! $isInertia;

        if ($isPureJson) {
            return new JsonResponse(['two_factor' => false], 200);
        }

        // Untuk Inertia dan request biasa: redirect ke dashboard
        // Inertia akan follow redirect ini secara otomatis
        $intended = session()->pull('url.intended');

        return redirect($intended && str_contains($intended, $team->slug)
            ? $intended
            : $dashboardUrl
        );
    }

    /**
     * Buat personal team untuk user yang belum punya team.
     */
    private function createPersonalTeam(\App\Models\User $user): Team
    {
        $team = Team::create([
            'name'        => $user->name . "'s Team",
            'is_personal' => true,
        ]);

        $team->members()->attach($user->id, ['role' => TeamRole::Owner->value]);

        return $team;
    }
}