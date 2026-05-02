<?php

namespace App\Http\Controllers;

use App\Actions\User\AcceptInvitationAction;
use App\Actions\User\InviteUserAction;
use App\Actions\User\RemoveUserAction;
use App\Actions\User\ResetUserPasswordAction;
use App\Actions\User\UpdateUserAction;
use App\Enums\TeamRole;
use App\Http\Requests\User\InviteUserRequest;
use App\Http\Requests\User\ResetPasswordRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\TeamInvitation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function __construct(
        private readonly InviteUserAction        $inviteUser,
        private readonly UpdateUserAction        $updateUser,
        private readonly RemoveUserAction        $removeUser,
        private readonly ResetUserPasswordAction $resetPassword,
        private readonly AcceptInvitationAction  $acceptInvitation,
    ) {}

    // ── Resolve user dari route parameter secara eksplisit ────────────────────
    // Menggunakan $request->route('userId') untuk menghindari konflik binding
    // dengan {current_team} prefix parameter.
    private function resolveUser(Request $request): User
    {
        $userId = $request->route('userId');
        return User::findOrFail($userId);
    }

    // ── MEMBERS ───────────────────────────────────────────

    public function index(Request $request): Response
    {
        $authUser = $request->user();
        $team     = $authUser->currentTeam;

        setPermissionsTeamId($team->id);

        $members = $team->members()
            ->with(['teamMemberships' => fn ($q) => $q->where('team_id', $team->id)])
            ->get()
            ->map(fn (User $member) => [
                'id'                => $member->id,
                'name'              => $member->name,
                'email'             => $member->email,
                'email_verified_at' => $member->email_verified_at,
                'team_role'         => $member->teamRole($team)?->value,
                'team_role_label'   => $member->teamRole($team)?->label(),
                'is_owner'          => $member->ownsTeam($team),
                'roles'             => $member->getRoleNames(),
                'joined_at'         => $member->pivot->created_at,
            ]);

        $availableRoles = Role::where('team_id', $team->id)
            ->get(['id', 'name', 'label'])
            ->map(fn ($r) => ['value' => $r->name, 'label' => $r->label ?? ucfirst($r->name)]);

        return Inertia::render('users/index', [
            'members'        => $members,
            'availableRoles' => $availableRoles,
            'teamRoles'      => TeamRole::assignable(),
            'canInvite'      => $authUser->canOnCurrentTeam('user.invite'),
            'canUpdate'      => $authUser->canOnCurrentTeam('user.update'),
            'canDelete'      => $authUser->canOnCurrentTeam('user.delete'),
        ]);
    }

    public function show(Request $request): Response
    {
        $user = $this->resolveUser($request);
        $team = $request->user()->currentTeam;
        abort_unless($user->belongsToTeam($team), 404);

        setPermissionsTeamId($team->id);

        return Inertia::render('users/show', [
            'member' => [
                'id'                => $user->id,
                'name'              => $user->name,
                'email'             => $user->email,
                'email_verified_at' => $user->email_verified_at,
                'team_role'         => $user->teamRole($team)?->value,
                'team_role_label'   => $user->teamRole($team)?->label(),
                'is_owner'          => $user->ownsTeam($team),
                'roles'             => $user->getRoleNames(),
                'permissions'       => $user->getAllPermissions()->pluck('name'),
                'teams'             => $user->toUserTeams(),
            ],
        ]);
    }

    public function edit(Request $request): Response
    {
        $user = $this->resolveUser($request);
        $team = $request->user()->currentTeam;
        abort_unless($user->belongsToTeam($team), 404);

        setPermissionsTeamId($team->id);

        return Inertia::render('users/edit', [
            'member' => [
                'id'        => $user->id,
                'name'      => $user->name,
                'email'     => $user->email,
                'team_role' => $user->teamRole($team)?->value,
                'roles'     => $user->getRoleNames(),
            ],
            'availableRoles' => Role::where('team_id', $team->id)
                ->get(['id', 'name', 'label'])
                ->map(fn ($r) => ['value' => $r->name, 'label' => $r->label ?? ucfirst($r->name)]),
            'teamRoles' => TeamRole::assignable(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $this->resolveUser($request);
        $team = $request->user()->currentTeam;
        abort_unless($user->belongsToTeam($team), 404);

        $validated = $request->validate([
            'team_role' => ['required', 'string'],
            'role'      => ['nullable', 'string'],
        ]);

        $this->updateUser->execute(
            team: $team,
            member: $user,
            teamRole: $validated['team_role'],
            roleName: $validated['role'] ?? null,
        );

        return back()->with('success', "User \"{$user->name}\" berhasil diperbarui.");
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user     = $this->resolveUser($request);
        $authUser = $request->user();
        $team     = $authUser->currentTeam;

        if ($user->id === $authUser->id) {
            return back()->with('error', 'Anda tidak dapat menghapus diri sendiri.');
        }

        if ($user->ownsTeam($team)) {
            return back()->with('error', 'Owner tim tidak dapat dihapus dari tim.');
        }

        abort_unless($user->belongsToTeam($team), 404);

        $this->removeUser->execute($team, $user);

        return back()->with('success', "User \"{$user->name}\" berhasil dihapus dari tim.");
    }

    public function resetUserPassword(Request $request): RedirectResponse
    {
        $user = $this->resolveUser($request);
        $team = $request->user()->currentTeam;
        abort_unless($user->belongsToTeam($team), 404);

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'password.required'  => 'Password wajib diisi.',
            'password.min'       => 'Password minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
        ]);

        $this->resetPassword->execute($user, $validated['password']);

        return back()->with('success', "Password user \"{$user->name}\" berhasil direset.");
    }

    // ── INVITATIONS ───────────────────────────────────────

    public function invitations(Request $request): Response
    {
        $team = $request->user()->currentTeam;

        $invitations = $team->invitations()
            ->with('inviter:id,name,email')
            ->latest()
            ->get()
            ->map(fn (TeamInvitation $inv) => [
                'id'          => $inv->id,
                'email'       => $inv->email,
                'role'        => $inv->role?->value,
                'role_label'  => $inv->role?->label(),
                'invited_by'  => $inv->inviter?->name,
                'expires_at'  => $inv->expires_at,
                'accepted_at' => $inv->accepted_at,
                'status'      => match (true) {
                    $inv->isAccepted() => 'accepted',
                    $inv->isExpired()  => 'expired',
                    default            => 'pending',
                },
            ]);

        return Inertia::render('users/invitations', [
            'invitations' => $invitations,
            'teamRoles'   => TeamRole::assignable(),
        ]);
    }

    public function invite(InviteUserRequest $request): RedirectResponse
    {
        $this->inviteUser->execute(
            team: $request->user()->currentTeam,
            email: $request->validated('email'),
            role: $request->validated('role'),
            inviter: $request->user(),
        );

        return back()->with('success', "Undangan berhasil dikirim ke {$request->validated('email')}.");
    }

    public function cancelInvitation(Request $request, TeamInvitation $invitation): RedirectResponse
    {
        abort_unless($invitation->team_id === $request->user()->currentTeam->id, 403);

        $invitation->delete();

        return back()->with('success', 'Undangan berhasil dibatalkan.');
    }

    public function resendInvitation(Request $request, TeamInvitation $invitation): RedirectResponse
    {
        abort_unless($invitation->team_id === $request->user()->currentTeam->id, 403);

        $invitation->update(['expires_at' => now()->addDays(7)]);

        return back()->with('success', 'Undangan berhasil dikirim ulang.');
    }

    public function acceptInvitation(Request $request, TeamInvitation $invitation): RedirectResponse
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login')
                ->with('info', 'Silakan login terlebih dahulu untuk menerima undangan.');
        }

        if ($invitation->email !== $user->email) {
            return back()->with('error', 'Undangan ini bukan untuk akun Anda.');
        }

        if ($invitation->isExpired()) {
            return back()->with('error', 'Undangan ini sudah kedaluwarsa.');
        }

        if ($invitation->isAccepted()) {
            return back()->with('info', 'Anda sudah bergabung dengan tim ini.');
        }

        $this->acceptInvitation->execute($invitation, $user);

        return redirect(url("/{$invitation->team->slug}/dashboard"))
            ->with('success', "Selamat datang di tim \"{$invitation->team->name}\"!");
    }
}