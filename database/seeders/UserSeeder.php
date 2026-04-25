<?php

namespace Database\Seeders;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        app()['cache']->forget('spatie.permission.cache');

        // ── 1. DEVELOPER USER (global, no team) ──────────────
        $developer = User::firstOrCreate(
            ['email' => 'developer@pos.test'],
            [
                'name' => 'Developer',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // Developer gets all setting permissions globally (team_id = null)
        setPermissionsTeamId(null);
        $developerRole = Role::firstOrCreate(
            ['name' => 'developer', 'guard_name' => 'web', 'team_id' => null],
            ['label' => 'Developer', 'is_system' => true]
        );
        $developerRole->givePermissionTo(Permission::where('module', 'setting')->pluck('name')->toArray());
        $developer->assignRole($developerRole);

        // ── 2. OWNER + TEAM A ────────────────────────────────
        $owner = User::firstOrCreate(
            ['email' => 'owner@pos.test'],
            [
                'name' => 'Owner Toko',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $teamA = Team::firstOrCreate(['slug' => 'toko-utama'], [
            'name' => 'Toko Utama',
            'is_personal' => false,
        ]);

        // Owner joins as team owner
        $teamA->members()->syncWithoutDetaching([
            $owner->id => ['role' => TeamRole::Owner->value],
        ]);
        $owner->update(['current_team_id' => $teamA->id]);

        // ── 3. ROLES PER TEAM A ──────────────────────────────
        setPermissionsTeamId($teamA->id);

        $adminRole = Role::firstOrCreate(
            ['name' => 'admin', 'guard_name' => 'web', 'team_id' => $teamA->id],
            ['label' => 'Admin', 'is_system' => true]
        );
        $adminRole->syncPermissions([
            'user.view', 'user.create', 'user.update', 'user.invite',
            'role.view', 'role.create', 'role.update', 'role.assign',
            'permission.view', 'permission.assign',
            'product.view', 'product.create', 'product.update', 'product.delete',
            'product.category.view', 'product.category.create', 'product.category.update', 'product.category.delete',
            'product.stock.view', 'product.stock.adjust',
            'transaction.view', 'transaction.create', 'transaction.update', 'transaction.void', 'transaction.refund', 'transaction.return',
            'voucher.view', 'voucher.create', 'voucher.update', 'voucher.delete', 'voucher.apply',
            'report.sales', 'report.stock', 'report.cashier', 'report.export',
        ]);

        $kasirRole = Role::firstOrCreate(
            ['name' => 'kasir', 'guard_name' => 'web', 'team_id' => $teamA->id],
            ['label' => 'Kasir', 'is_system' => true]
        );
        $kasirRole->syncPermissions([
            'product.view',
            'product.stock.view',
            'transaction.view', 'transaction.create', 'transaction.void', 'transaction.refund',
            'voucher.view', 'voucher.apply',
            'report.sales', 'report.cashier',
        ]);

        $waiterRole = Role::firstOrCreate(
            ['name' => 'waiter', 'guard_name' => 'web', 'team_id' => $teamA->id],
            ['label' => 'Waiter', 'is_system' => true]
        );
        $waiterRole->syncPermissions([
            'product.view',
            'transaction.view', 'transaction.create',
        ]);

        // ── 4. STAFF USERS ───────────────────────────────────
        $admin = User::firstOrCreate(
            ['email' => 'admin@pos.test'],
            ['name' => 'Admin Toko', 'password' => Hash::make('password'), 'email_verified_at' => now()]
        );
        $teamA->members()->syncWithoutDetaching([$admin->id => ['role' => TeamRole::Admin->value]]);
        $admin->update(['current_team_id' => $teamA->id]);
        $admin->assignRole($adminRole);

        $kasir = User::firstOrCreate(
            ['email' => 'kasir@pos.test'],
            ['name' => 'Kasir Satu', 'password' => Hash::make('password'), 'email_verified_at' => now()]
        );
        $teamA->members()->syncWithoutDetaching([$kasir->id => ['role' => TeamRole::Member->value]]);
        $kasir->update(['current_team_id' => $teamA->id]);
        $kasir->assignRole($kasirRole);

        $waiter = User::firstOrCreate(
            ['email' => 'waiter@pos.test'],
            ['name' => 'Waiter Satu', 'password' => Hash::make('password'), 'email_verified_at' => now()]
        );
        $teamA->members()->syncWithoutDetaching([$waiter->id => ['role' => TeamRole::Member->value]]);
        $waiter->update(['current_team_id' => $teamA->id]);
        $waiter->assignRole($waiterRole);

        // ── 5. TEAM B (second tenant) ────────────────────────
        $teamB = Team::firstOrCreate(['slug' => 'cabang-dua'], [
            'name' => 'Cabang Dua',
            'is_personal' => false,
        ]);
        $teamB->members()->syncWithoutDetaching([
            $owner->id => ['role' => TeamRole::Owner->value],
        ]);

        setPermissionsTeamId($teamB->id);
        $adminRoleB = Role::firstOrCreate(
            ['name' => 'admin', 'guard_name' => 'web', 'team_id' => $teamB->id],
            ['label' => 'Admin', 'is_system' => true]
        );
        $adminRoleB->syncPermissions([
            'user.view', 'user.create', 'user.invite',
            'product.view', 'product.create', 'product.update',
            'product.category.view', 'product.stock.view', 'product.stock.adjust',
            'transaction.view', 'transaction.create', 'transaction.refund',
            'voucher.view', 'voucher.apply',
            'report.sales', 'report.cashier',
        ]);

        // Admin user from team A also joins team B as Admin
        $teamB->members()->syncWithoutDetaching([$admin->id => ['role' => TeamRole::Admin->value]]);
        $admin->assignRole($adminRoleB);

        $this->command->info('✅ Users seeded');
        $this->command->table(
            ['Email', 'Role', 'Team'],
            [
                ['developer@pos.test', 'developer (global)', '-'],
                ['owner@pos.test', 'owner', 'Toko Utama + Cabang Dua'],
                ['admin@pos.test', 'admin', 'Toko Utama + Cabang Dua'],
                ['kasir@pos.test', 'kasir', 'Toko Utama'],
                ['waiter@pos.test', 'waiter', 'Toko Utama'],
            ]
        );
    }
}