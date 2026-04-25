<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\URL;
use Laravel\Fortify\Contracts\TwoFactorLoginResponse as TwoFactorLoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

class TwoFactorLoginResponse implements TwoFactorLoginResponseContract
{
    public function toResponse($request): Response
    {
        $user = $request->user();

        $team = $user->currentTeam
            ?? $user->personalTeam()
            ?? $user->teams()->orderBy('name')->first();

        if ($team) {
            URL::defaults(['current_team' => $team->slug]);
        }

        if ($request->wantsJson()) {
            return new JsonResponse(['two_factor' => false], 200);
        }

        if ($team) {
            return redirect()->route('dashboard', ['current_team' => $team->slug]);
        }

        return redirect()->route('dashboard');
    }
}