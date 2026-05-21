<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

/**
 * Jalankan seeder ini setelah PermissionSeeder utama Anda.
 *
 * php artisan db:seed --class=ProductPromotionPermissionSeeder
 *
 * Atau tambahkan ke DatabaseSeeder / PermissionSeeder utama:
 *
 *   $this->call(ProductPromotionPermissionSeeder::class);
 */
class ProductPromotionPermissionSeeder extends Seeder
{
    /**
     * Daftar permission modul Product Promotion.
     * Guard disesuaikan dengan guard yang dipakai di aplikasi Anda (default: 'web').
     */
    private array $permissions = [
        // ── Product Promotion ─────────────────────────────
        'product-promotion.view',
        'product-promotion.create',
        'product-promotion.update',
        'product-promotion.delete',
    ];

    public function run(): void
    {
        foreach ($this->permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission, 'guard_name' => 'web'],
            );
        }

        $this->command->info('✅ Product Promotion permissions seeded successfully.');
        $this->command->table(
            ['Permission'],
            collect($this->permissions)->map(fn ($p) => [$p])->toArray(),
        );
    }
}