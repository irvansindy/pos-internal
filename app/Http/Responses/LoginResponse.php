<?php

namespace App\Http\Responses;

use App\Enums\TeamRole;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request): Response
    {
        $user = $request->user();

        // Cari team via query langsung (hindari relasi cached yang stale)
        $team = $this->resolveTeam($user);

        // Pastikan current_team_id tersimpan
        if ($user->current_team_id !== $team->id) {
            $user->update(['current_team_id' => $team->id]);
        }

        // Inertia mengirim X-Inertia header — bukan pure JSON API
        if ($request->wantsJson() && ! $request->hasHeader('X-Inertia')) {
            return new JsonResponse(['two_factor' => false], 200);
        }

        // Selalu gunakan URL absolut — tidak bergantung Ziggy URL::defaults
        $dashboardUrl = url("/{$team->slug}/dashboard");

        // Cek apakah ada intended URL yang valid
        $intended = $request->hasSession() ? session()->pull('url.intended') : null;

        if ($intended && str_contains($intended, '/' . $team->slug . '/')) {
            return redirect($intended);
        }

        return redirect($dashboardUrl);
    }

    /**
     * Resolve team user:
     * 1. Current team dari DB
     * 2. Team pertama yang dimiliki dari DB
     * 3. Buat personal team baru
     */
    private function resolveTeam(\App\Models\User $user): Team
    {
        // Cek current_team_id langsung
        if ($user->current_team_id) {
            $isMember = DB::table('team_members')
                ->where('team_id', $user->current_team_id)
                ->where('user_id', $user->id)
                ->exists();

            if ($isMember) {
                $team = Team::whereNull('deleted_at')->find($user->current_team_id);
                if ($team) {
                    return $team;
                }
            }
        }

        // Cari team pertama via membership
        $membership = DB::table('team_members')
            ->where('user_id', $user->id)
            ->orderBy('created_at')
            ->first();

        if ($membership) {
            $team = Team::whereNull('deleted_at')->find($membership->team_id);
            if ($team) {
                return $team;
            }
        }

        // Tidak punya team — buat personal team
        return $this->createPersonalTeam($user);
    }

    /**
     * Buat personal team baru untuk user.
     * Pakai DB::insert langsung agar tidak ada issue dengan Pivot model.
     */
    private function createPersonalTeam(\App\Models\User $user): Team
    {
        $team = Team::create([
            'name'        => $user->name . "'s Team",
            'is_personal' => true,
        ]);

        DB::table('team_members')->insert([
            'team_id'    => $team->id,
            'user_id'    => $user->id,
            'role'       => TeamRole::Owner->value,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $user->update(['current_team_id' => $team->id]);

        return $team;
    }
}