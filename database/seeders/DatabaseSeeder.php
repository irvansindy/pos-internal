<?php

namespace Database\Seeders;

use App\Models\Team;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            ProductPromotionPermissionSeeder::class,
            MenuSeeder::class,
            PlanSeeder::class,
            UserSeeder::class,
        ]);
    }
}

// ──────────────────────────────────────────────────────
// FILE: database/seeders/PermissionSeeder.php
// ──────────────────────────────────────────────────────
// Defines all system permissions grouped by module.
// Roles are created per-team by owners, not globally.
