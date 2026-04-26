<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:fix-user-setup')]
#[Description('Command description')]
class FixUserSetup extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $emails = [
            'developer@pos.test',
            'owner@pos.test',
            'admin@pos.test',
            'kasir@pos.test',
            'waiter@pos.test',
        ];

        foreach ($emails as $email) {
            $user = User::where('email', $email)->first();

            if (! $user) {
                $this->warn("User tidak ditemukan: {$email}");
                continue;
            }

            $updates = [];

            // Fix email_verified_at
            if (! $user->email_verified_at) {
                $updates['email_verified_at'] = now();
            }

            // Fix current_team_id
            if (! $user->current_team_id) {
                $team = $user->personalTeam()
                    ?? $user->teams()->orderBy('name')->first();

                if ($team) {
                    $updates['current_team_id'] = $team->id;
                }
            }

            if (! empty($updates)) {
                $user->update($updates);
                $this->info("Fixed {$email}: " . implode(', ', array_keys($updates)));
            } else {
                $this->line("OK {$email} (tidak perlu diubah)");
            }
        }

        $this->newLine();
        $this->info('Selesai!');
    }
}
