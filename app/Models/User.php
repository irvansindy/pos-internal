<?php

namespace App\Models;

use App\Concerns\HasTeams;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password', 'current_team_id'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, HasTeams, Notifiable, TwoFactorAuthenticatable;

    /**
     * Get all accessible menus for the user on their current team.
     * Owner bypasses all permission checks.
     *
     * @return \Illuminate\Support\Collection<int, Menu>
     */
    public function accessibleMenus(): \Illuminate\Support\Collection
    {
        $team = $this->currentTeam;

        if (! $team) {
            return collect();
        }

        // Owner bypasses — gets all active root menus with children
        if ($this->ownsTeam($team)) {
            return Menu::with('children.permissions')
                ->whereNull('parent_id')
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get();
        }

        // Get all permissions for this user on this team
        setPermissionsTeamId($team->id);
        $userPermissions = $this->getAllPermissions()->pluck('name');

        // Get menus accessible by those permissions
        return Menu::with(['children' => function ($query) use ($userPermissions) {
            $query->where('is_active', true)
                ->whereHas('permissions', fn ($q) => $q->whereIn('name', $userPermissions))
                ->orderBy('sort_order');
        }])
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->whereHas('permissions', fn ($q) => $q->whereIn('name', $userPermissions))
            ->orWhereDoesntHave('permissions') // menus with no permission req. are public
            ->orderBy('sort_order')
            ->get()
            ->filter(fn ($menu) => $menu->children->isNotEmpty() || $menu->route !== null);
    }

    /**
     * Check if user has a specific spatie permission on their current team.
     */
    public function canOnCurrentTeam(string $permission): bool
    {
        $team = $this->currentTeam;
        if (! $team) {
            return false;
        }

        if ($this->ownsTeam($team)) {
            return true;
        }

        setPermissionsTeamId($team->id);
        return $this->hasPermissionTo($permission);
    }

    /**
     * Get the guard name used by Spatie permissions.
     */
    public function guardName(): string
    {
        return 'web';
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}