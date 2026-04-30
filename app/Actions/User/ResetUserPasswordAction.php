<?php

namespace App\Actions\User;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class ResetUserPasswordAction
{
    public function execute(User $user, string $password): void
    {
        $user->update(['password' => Hash::make($password)]);
    }
}