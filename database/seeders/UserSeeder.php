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
    /**
     * Permission set untuk role Admin (full product-package access).
     * Dipakai di Team A dan Team B agar DRY.
     */
    private const PACKAGE_PERMISSIONS = [
        'product-package.view',
        'product-package.create',
        'product-package.update',
        'product-package.delete',
    ];

    public function run(): void
    {
        app()['cache']->forget('spatie.permission.cache');

        // ── 1. DEVELOPER USER (global, no team) ──────────────
        $developer = User::firstOrCreate(
            ['email' => 'developer@pos.test'],
            [
                'name'               => 'Developer',
                'password'           => Hash::make('password'),
                'email_verified_at'  => now(),
            ]
        );

        // Developer mendapat semua setting permission secara global (team_id = null)
        setPermissionsTeamId(null);
        $developerRole = Role::firstOrCreate(
            ['name' => 'developer', 'guard_name' => 'web', 'team_id' => null],
            ['label' => 'Developer', 'is_system' => true]
        );
        $developerRole->givePermissionTo(
            Permission::where('module', 'setting')->pluck('name')->toArray()
        );
        $developer->assignRole($developerRole);

        // ── 2. OWNER + TEAM A ────────────────────────────────
        $owner = User::firstOrCreate(
            ['email' => 'owner@pos.test'],
            [
                'name'               => 'Owner Toko',
                'password'           => Hash::make('password'),
                'email_verified_at'  => now(),
            ]
        );

        $teamA = Team::firstOrCreate(['slug' => 'toko-utama'], [
            'name'        => 'Toko Utama',
            'is_personal' => false,
        ]);

        $teamA->members()->syncWithoutDetaching([
            $owner->id => ['role' => TeamRole::Owner->value],
        ]);
        $owner->update(['current_team_id' => $teamA->id]);

        // ── 3. ROLES PER TEAM A ──────────────────────────────
        setPermissionsTeamId($teamA->id);

        // Admin — full access termasuk product-package
        $adminRole = Role::firstOrCreate(
            ['name' => 'admin', 'guard_name' => 'web', 'team_id' => $teamA->id],
            ['label' => 'Admin', 'is_system' => true]
        );
        $adminRole->syncPermissions([
            // User
            'user.view', 'user.create', 'user.update', 'user.invite',
            // Role & Permission
            'role.view', 'role.create', 'role.update', 'role.assign',
            'permission.view', 'permission.assign',
            // Product
            'product.view', 'product.create', 'product.update', 'product.delete',
            'product.category.view', 'product.category.create', 'product.category.update', 'product.category.delete',
            'product.stock.view', 'product.stock.adjust',
            // Product Package (admin & owner)
            ...self::PACKAGE_PERMISSIONS,
            // Transaction
            'transaction.view', 'transaction.create', 'transaction.update',
            'transaction.void', 'transaction.refund', 'transaction.return',
            // Voucher
            'voucher.view', 'voucher.create', 'voucher.update', 'voucher.delete', 'voucher.apply',
            // Report
            'report.sales', 'report.stock', 'report.cashier', 'report.export',
        ]);

        // Kasir — tidak dapat akses product-package
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

        // Waiter — tidak dapat akses product-package
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
            [
                'name'              => 'Admin Toko',
                'password'          => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $teamA->members()->syncWithoutDetaching([$admin->id => ['role' => TeamRole::Admin->value]]);
        $admin->update(['current_team_id' => $teamA->id]);
        $admin->assignRole($adminRole);

        $kasir = User::firstOrCreate(
            ['email' => 'kasir@pos.test'],
            [
                'name'              => 'Kasir Satu',
                'password'          => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $teamA->members()->syncWithoutDetaching([$kasir->id => ['role' => TeamRole::Member->value]]);
        $kasir->update(['current_team_id' => $teamA->id]);
        $kasir->assignRole($kasirRole);

        $waiter = User::firstOrCreate(
            ['email' => 'waiter@pos.test'],
            [
                'name'              => 'Waiter Satu',
                'password'          => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $teamA->members()->syncWithoutDetaching([$waiter->id => ['role' => TeamRole::Member->value]]);
        $waiter->update(['current_team_id' => $teamA->id]);
        $waiter->assignRole($waiterRole);

        // ── 5. TEAM B (second tenant) ────────────────────────
        $teamB = Team::firstOrCreate(['slug' => 'cabang-dua'], [
            'name'        => 'Cabang Dua',
            'is_personal' => false,
        ]);
        $teamB->members()->syncWithoutDetaching([
            $owner->id => ['role' => TeamRole::Owner->value],
        ]);

        setPermissionsTeamId($teamB->id);

        // Admin Team B — termasuk product-package
        $adminRoleB = Role::firstOrCreate(
            ['name' => 'admin', 'guard_name' => 'web', 'team_id' => $teamB->id],
            ['label' => 'Admin', 'is_system' => true]
        );
        $adminRoleB->syncPermissions([
            // User
            'user.view', 'user.create', 'user.invite',
            // Product
            'product.view', 'product.create', 'product.update',
            'product.category.view',
            'product.stock.view', 'product.stock.adjust',
            // Product Package (admin & owner)
            ...self::PACKAGE_PERMISSIONS,
            // Transaction
            'transaction.view', 'transaction.create', 'transaction.refund',
            // Voucher
            'voucher.view', 'voucher.apply',
            // Report
            'report.sales', 'report.cashier',
        ]);

        // Admin dari Team A juga bergabung ke Team B
        $teamB->members()->syncWithoutDetaching([$admin->id => ['role' => TeamRole::Admin->value]]);
        $admin->assignRole($adminRoleB);

        // ── 6. Summary ───────────────────────────────────────
        $this->command->info('✅ Users seeded');
        $this->command->table(
            ['Email', 'Role', 'Team', 'Package Access'],
            [
                ['developer@pos.test', 'developer (global)', '-',                        '✅ via owner bypass'],
                ['owner@pos.test',     'owner',              'Toko Utama + Cabang Dua',  '✅ via owner bypass'],
                ['admin@pos.test',     'admin',              'Toko Utama + Cabang Dua',  '✅'],
                ['kasir@pos.test',     'kasir',              'Toko Utama',               '❌'],
                ['waiter@pos.test',    'waiter',             'Toko Utama',               '❌'],
            ]
        );
    }
}
