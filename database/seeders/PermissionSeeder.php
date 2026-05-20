<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    /**
     * All system permissions, grouped by module.
     * These are global (not team-scoped) and define what CAN be assigned.
     * Owner can assign permissions to roles based on their membership plan.
     */
    public static array $permissions = [
        // ── USER MODULE ──────────────────────────────────────
        'user' => [
            ['name' => 'user.view',    'label' => 'Lihat User',   'description' => 'Melihat daftar dan detail user'],
            ['name' => 'user.create',  'label' => 'Buat User',    'description' => 'Membuat user baru dalam tim'],
            ['name' => 'user.update',  'label' => 'Edit User',    'description' => 'Mengubah data user'],
            ['name' => 'user.delete',  'label' => 'Hapus User',   'description' => 'Menghapus user dari tim'],
            ['name' => 'user.invite',  'label' => 'Undang User',  'description' => 'Mengundang user baru ke tim'],
        ],

        // ── ROLE & PERMISSION MODULE ─────────────────────────
        'role' => [
            ['name' => 'role.view',         'label' => 'Lihat Role',        'description' => 'Melihat daftar role'],
            ['name' => 'role.create',       'label' => 'Buat Role',         'description' => 'Membuat role baru'],
            ['name' => 'role.update',       'label' => 'Edit Role',         'description' => 'Mengubah role'],
            ['name' => 'role.delete',       'label' => 'Hapus Role',        'description' => 'Menghapus role'],
            ['name' => 'role.assign',       'label' => 'Assign Role',       'description' => 'Assign role ke user'],
            ['name' => 'permission.view',   'label' => 'Lihat Permission',  'description' => 'Melihat daftar permission'],
            ['name' => 'permission.assign', 'label' => 'Assign Permission', 'description' => 'Assign permission ke role'],
        ],

        // ── PRODUCT MODULE ───────────────────────────────────
        'product' => [
            ['name' => 'product.view',            'label' => 'Lihat Produk',          'description' => 'Melihat daftar produk'],
            ['name' => 'product.create',          'label' => 'Buat Produk',           'description' => 'Membuat produk baru'],
            ['name' => 'product.update',          'label' => 'Edit Produk',           'description' => 'Mengubah produk'],
            ['name' => 'product.delete',          'label' => 'Hapus Produk',          'description' => 'Menghapus produk'],
            ['name' => 'product.category.view',   'label' => 'Lihat Kategori',        'description' => 'Melihat kategori produk'],
            ['name' => 'product.category.create', 'label' => 'Buat Kategori',         'description' => 'Membuat kategori produk'],
            ['name' => 'product.category.update', 'label' => 'Edit Kategori',         'description' => 'Mengubah kategori produk'],
            ['name' => 'product.category.delete', 'label' => 'Hapus Kategori',        'description' => 'Menghapus kategori produk'],
            ['name' => 'product.stock.view',      'label' => 'Lihat Stok',            'description' => 'Melihat stok produk'],
            ['name' => 'product.stock.adjust',    'label' => 'Adjust Stok',           'description' => 'Menyesuaikan stok produk'],
            // ── Product Package ──────────────────────────────
            ['name' => 'product-package.view',    'label' => 'Lihat Paket Produk',    'description' => 'Melihat daftar dan detail paket produk'],
            ['name' => 'product-package.create',  'label' => 'Buat Paket Produk',     'description' => 'Membuat paket produk baru'],
            ['name' => 'product-package.update',  'label' => 'Edit Paket Produk',     'description' => 'Mengubah paket produk'],
            ['name' => 'product-package.delete',  'label' => 'Hapus Paket Produk',    'description' => 'Menghapus paket produk'],
        ],

        // ── TRANSACTION MODULE ───────────────────────────────
        'transaction' => [
            ['name' => 'transaction.view',   'label' => 'Lihat Transaksi',  'description' => 'Melihat daftar transaksi'],
            ['name' => 'transaction.create', 'label' => 'Buat Transaksi',   'description' => 'Membuat transaksi baru (kasir)'],
            ['name' => 'transaction.update', 'label' => 'Edit Transaksi',   'description' => 'Mengubah transaksi'],
            ['name' => 'transaction.delete', 'label' => 'Hapus Transaksi',  'description' => 'Menghapus transaksi'],
            ['name' => 'transaction.void',   'label' => 'Void Transaksi',   'description' => 'Membatalkan transaksi'],
            ['name' => 'transaction.refund', 'label' => 'Refund Transaksi', 'description' => 'Melakukan refund transaksi'],
            ['name' => 'transaction.return', 'label' => 'Return Transaksi', 'description' => 'Melakukan return barang'],
            ['name' => 'voucher.view',       'label' => 'Lihat Voucher',    'description' => 'Melihat daftar voucher diskon'],
            ['name' => 'voucher.create',     'label' => 'Buat Voucher',     'description' => 'Membuat voucher diskon'],
            ['name' => 'voucher.update',     'label' => 'Edit Voucher',     'description' => 'Mengubah voucher diskon'],
            ['name' => 'voucher.delete',     'label' => 'Hapus Voucher',    'description' => 'Menghapus voucher diskon'],
            ['name' => 'voucher.apply',      'label' => 'Apply Voucher',    'description' => 'Menggunakan voucher di transaksi'],
        ],

        // ── REPORT MODULE ────────────────────────────────────
        'report' => [
            ['name' => 'report.sales',   'label' => 'Laporan Penjualan', 'description' => 'Melihat laporan penjualan'],
            ['name' => 'report.stock',   'label' => 'Laporan Stok',      'description' => 'Melihat laporan stok'],
            ['name' => 'report.cashier', 'label' => 'Laporan Kasir',     'description' => 'Melihat laporan per kasir'],
            ['name' => 'report.export',  'label' => 'Export Laporan',    'description' => 'Export laporan ke Excel/PDF'],
        ],

        // ── SETTING MODULE (developer only) ─────────────────
        'setting' => [
            ['name' => 'setting.system',    'label' => 'Setting Sistem',    'description' => 'Mengubah pengaturan sistem (developer)'],
            ['name' => 'setting.user',      'label' => 'Setting User',      'description' => 'Mengubah pengaturan user (developer)'],
            ['name' => 'setting.team',      'label' => 'Setting Team',      'description' => 'Mengubah pengaturan team (developer)'],
            ['name' => 'setting.product',   'label' => 'Setting Produk',    'description' => 'Mengubah pengaturan produk (developer)'],
            ['name' => 'membership.manage', 'label' => 'Kelola Membership', 'description' => 'Mengelola paket membership (developer)'],
        ],
    ];

    public function run(): void
    {
        app()['cache']->forget('spatie.permission.cache');

        foreach (static::$permissions as $module => $permissions) {
            foreach ($permissions as $permission) {
                Permission::firstOrCreate(
                    ['name' => $permission['name'], 'guard_name' => 'web'],
                    [
                        'label'       => $permission['label'],
                        'description' => $permission['description'],
                        'module'      => $module,
                    ]
                );
            }
        }

        $this->command->info('✅ Permissions seeded: ' . Permission::count() . ' total');
    }
}