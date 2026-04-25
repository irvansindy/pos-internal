<?php

namespace App\Http\Controllers;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $members = $team->members()
            ->with(['teamMemberships' => fn ($q) => $q->where('team_id', $team->id)])
            ->get()
            ->map(function (User $member) use ($team) {
                setPermissionsTeamId($team->id);
                $roles = $member->getRoleNames();

                return [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'email_verified_at' => $member->email_verified_at,
                    'team_role' => $member->teamRole($team)?->value,
                    'team_role_label' => $member->teamRole($team)?->label(),
                    'is_owner' => $member->ownsTeam($team),
                    'roles' => $roles,
                    'pivot' => [
                        'joined_at' => $member->pivot->created_at,
                    ],
                ];
            });

        $availableRoles = Role::where('team_id', $team->id)
            ->get(['id', 'name', 'label'])
            ->map(fn ($r) => ['value' => $r->name, 'label' => $r->label ?? ucfirst($r->name)]);

        return Inertia::render('Users/Index', [
            'members' => $members,
            'availableRoles' => $availableRoles,
            'teamRoles' => TeamRole::assignable(),
            'canInvite' => $user->canOnCurrentTeam('user.invite'),
            'canUpdate' => $user->canOnCurrentTeam('user.update'),
            'canDelete' => $user->canOnCurrentTeam('user.delete'),
        ]);
    }

    public function show(Request $request, User $user): Response
    {
        $team = $request->user()->currentTeam;

        // Ensure user is in same team
        if (! $user->belongsToTeam($team)) {
            abort(404);
        }

        setPermissionsTeamId($team->id);

        return Inertia::render('Users/Show', [
            'member' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at,
                'team_role' => $user->teamRole($team)?->value,
                'team_role_label' => $user->teamRole($team)?->label(),
                'is_owner' => $user->ownsTeam($team),
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
                'teams' => $user->toUserTeams(),
            ],
        ]);
    }

    public function edit(Request $request, User $user): Response
    {
        $team = $request->user()->currentTeam;
        if (! $user->belongsToTeam($team)) {
            abort(404);
        }

        setPermissionsTeamId($team->id);
        $availableRoles = Role::where('team_id', $team->id)->get(['id', 'name', 'label']);

        return Inertia::render('Users/Edit', [
            'member' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'team_role' => $user->teamRole($team)?->value,
                'roles' => $user->getRoleNames(),
            ],
            'availableRoles' => $availableRoles->map(fn ($r) => [
                'value' => $r->name,
                'label' => $r->label ?? ucfirst($r->name),
            ]),
            'teamRoles' => TeamRole::assignable(),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $team = $request->user()->currentTeam;
        if (! $user->belongsToTeam($team)) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'team_role' => ['required', 'string', 'in:admin,member'],
            'role' => ['nullable', 'string', 'exists:roles,name'],
        ]);

        // Update membership role
        $team->memberships()
            ->where('user_id', $user->id)
            ->update(['role' => $validated['team_role']]);

        // Sync spatie role
        if ($validated['role']) {
            setPermissionsTeamId($team->id);
            $role = Role::where('name', $validated['role'])
                ->where('team_id', $team->id)
                ->first();

            if ($role) {
                // Remove old roles on this team, assign new
                $oldRoles = $user->getRoleNames();
                foreach ($oldRoles as $oldRole) {
                    if (Role::where('name', $oldRole)->where('team_id', $team->id)->exists()) {
                        $user->removeRole($oldRole);
                    }
                }
                $user->assignRole($role);
            }
        }

        return redirect()->route('users.index')
            ->with('success', "User \"{$user->name}\" berhasil diperbarui.");
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $team = $request->user()->currentTeam;
        $authUser = $request->user();

        if ($user->id === $authUser->id) {
            return back()->with('error', 'Anda tidak dapat menghapus diri sendiri.');
        }

        if ($user->ownsTeam($team)) {
            return back()->with('error', 'Owner tim tidak dapat dihapus.');
        }

        if (! $user->belongsToTeam($team)) {
            abort(404);
        }

        // Remove from team (not deleting the user globally)
        setPermissionsTeamId($team->id);
        $user->removeRole(Role::where('team_id', $team->id)->whereIn('name', $user->getRoleNames())->pluck('name')->toArray());
        $team->members()->detach($user->id);

        // If this was their current team, switch to another
        if ($user->current_team_id === $team->id) {
            $fallback = $user->fallbackTeam($team);
            $user->update(['current_team_id' => $fallback?->id]);
        }

        return redirect()->route('users.index')
            ->with('success', "User \"{$user->name}\" berhasil dihapus dari tim.");
    }

    public function resetPassword(Request $request, User $user): RedirectResponse
    {
        $team = $request->user()->currentTeam;
        if (! $user->belongsToTeam($team)) {
            abort(404);
        }

        $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user->update(['password' => Hash::make($request->password)]);

        return back()->with('success', "Password user \"{$user->name}\" berhasil direset.");
    }

    // ── INVITATIONS ───────────────────────────────────────

    public function invitations(Request $request): Response
    {
        $team = $request->user()->currentTeam;

        $invitations = $team->invitations()
            ->with('inviter:id,name,email')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (TeamInvitation $inv) => [
                'id' => $inv->id,
                'email' => $inv->email,
                'role' => $inv->role?->value,
                'role_label' => $inv->role?->label(),
                'invited_by' => $inv->inviter?->name,
                'expires_at' => $inv->expires_at,
                'accepted_at' => $inv->accepted_at,
                'status' => $inv->isAccepted() ? 'accepted' : ($inv->isExpired() ? 'expired' : 'pending'),
            ]);

        return Inertia::render('Users/Invitations', [
            'invitations' => $invitations,
            'teamRoles' => TeamRole::assignable(),
        ]);
    }

    public function invite(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', 'string', 'in:admin,member'],
        ]);

        $team = $request->user()->currentTeam;

        // Check if already a member
        $alreadyMember = $team->members()->where('email', $validated['email'])->exists();
        if ($alreadyMember) {
            return back()->withErrors(['email' => 'User ini sudah menjadi anggota tim.']);
        }

        // Check pending invitation
        $pending = $team->invitations()
            ->where('email', $validated['email'])
            ->whereNull('accepted_at')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->exists();

        if ($pending) {
            return back()->withErrors(['email' => 'Undangan ke email ini masih pending.']);
        }

        $invitation = TeamInvitation::create([
            'team_id' => $team->id,
            'email' => $validated['email'],
            'role' => $validated['role'],
            'invited_by' => $request->user()->id,
            'expires_at' => now()->addDays(7),
        ]);

        // TODO: Send invitation email
        // Mail::to($validated['email'])->send(new TeamInvitationMail($invitation));

        return back()->with('success', "Undangan berhasil dikirim ke {$validated['email']}.");
    }

    public function cancelInvitation(Request $request, TeamInvitation $invitation): RedirectResponse
    {
        $team = $request->user()->currentTeam;
        if ($invitation->team_id !== $team->id) {
            abort(403);
        }

        $invitation->delete();

        return back()->with('success', 'Undangan berhasil dibatalkan.');
    }

    public function resendInvitation(Request $request, TeamInvitation $invitation): RedirectResponse
    {
        $team = $request->user()->currentTeam;
        if ($invitation->team_id !== $team->id) {
            abort(403);
        }

        $invitation->update(['expires_at' => now()->addDays(7)]);
        // TODO: Resend email

        return back()->with('success', 'Undangan berhasil dikirim ulang.');
    }

    public function acceptInvitation(Request $request, TeamInvitation $invitation): RedirectResponse
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login')->with('info', 'Silakan login terlebih dahulu untuk menerima undangan.');
        }

        if ($invitation->email !== $user->email) {
            return redirect()->route('dashboard')->with('error', 'Undangan ini bukan untuk akun Anda.');
        }

        if ($invitation->isExpired()) {
            return redirect()->route('dashboard')->with('error', 'Undangan ini sudah kedaluwarsa.');
        }

        if ($invitation->isAccepted()) {
            return redirect()->route('dashboard')->with('info', 'Anda sudah bergabung dengan tim ini.');
        }

        $team = $invitation->team;

        $team->members()->syncWithoutDetaching([
            $user->id => ['role' => $invitation->role->value],
        ]);

        $invitation->update(['accepted_at' => now()]);

        // Assign corresponding spatie role
        setPermissionsTeamId($team->id);
        $role = Role::where('name', $invitation->role === TeamRole::Admin ? 'admin' : 'kasir')
            ->where('team_id', $team->id)
            ->first();

        if ($role) {
            $user->assignRole($role);
        }

        $user->switchTeam($team);

        return redirect()->route('dashboard')
            ->with('success', "Selamat datang di tim \"{$team->name}\"!");
    }
}