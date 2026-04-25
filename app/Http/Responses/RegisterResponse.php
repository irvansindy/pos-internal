<?php

namespace App\Http\Responses;

use App\Enums\TeamRole;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\URL;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;
use Symfony\Component\HttpFoundation\Response;

class RegisterResponse implements RegisterResponseContract
{
    public function toResponse($request): Response
    {
        $user = $request->user();

        // Ambil atau buat personal team
        $team = $user->personalTeam()
            ?? $user->teams()->orderBy('name')->first();

        if (! $team) {
            $team = Team::create([
                'name'        => $user->name . "'s Team",
                'is_personal' => true,
            ]);
            $team->members()->attach($user->id, ['role' => TeamRole::Owner->value]);
        }

        if (! $user->current_team_id) {
            $user->update(['current_team_id' => $team->id]);
            $user->setRelation('currentTeam', $team);
        }

        URL::defaults(['current_team' => $team->slug]);

        if ($request->wantsJson()) {
            return new JsonResponse('', 201);
        }

        return redirect()->route('dashboard', ['current_team' => $team->slug]);
    }
}