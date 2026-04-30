<?php

namespace App\Actions\User;

use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class InviteUserAction
{
    /**
     * Undang user baru ke dalam tim.
     *
     * @throws ValidationException
     */
    public function execute(Team $team, string $email, string $role, User $inviter): TeamInvitation
    {
        // Cek apakah sudah menjadi anggota
        if ($team->members()->where('users.email', $email)->exists()) {
            throw ValidationException::withMessages([
                'email' => 'User ini sudah menjadi anggota tim.',
            ]);
        }

        // Cek apakah sudah ada undangan pending
        $pendingExists = $team->invitations()
            ->where('email', $email)
            ->whereNull('accepted_at')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->exists();

        if ($pendingExists) {
            throw ValidationException::withMessages([
                'email' => 'Undangan ke email ini masih pending.',
            ]);
        }

        return TeamInvitation::create([
            'team_id'    => $team->id,
            'email'      => $email,
            'role'       => $role,
            'invited_by' => $inviter->id,
            'expires_at' => now()->addDays(7),
        ]);
    }
}