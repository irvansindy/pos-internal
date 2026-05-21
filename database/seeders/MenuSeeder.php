<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class MenuSeeder extends Seeder
{
    public function run(): void
    {
        $menus = [
            // ── DASHBOARD (no permission required) ──────────
            [
                'name'        => 'dashboard',
                'label'       => 'Dashboard',
                'route'       => 'dashboard',
                'icon'        => 'LayoutDashboard',
                'sort_order'  => 1,
                'module'      => null,
                'permissions' => [],
                'children'    => [],
            ],

            // ── USER MANAGEMENT ──────────────────────────────
            [
                'name'        => 'user-management',
                'label'       => 'Manajemen User',
                'route'       => null,
                'icon'        => 'Users',
                'sort_order'  => 2,
                'module'      => 'user',
                'permissions' => ['user.view'],
                'children'    => [
                    [
                        'name'        => 'user-list',
                        'label'       => 'Daftar User',
                        'route'       => 'users.index',
                        'icon'        => 'UserList',
                        'sort_order'  => 1,
                        'permissions' => ['user.view'],
                    ],
                    [
                        'name'        => 'user-invitation',
                        'label'       => 'Undangan',
                        'route'       => 'invitations.index',
                        'icon'        => 'Mail',
                        'sort_order'  => 2,
                        'permissions' => ['user.invite'],
                    ],
                    [
                        'name'        => 'role-management',
                        'label'       => 'Role & Permission',
                        'route'       => 'roles.index',
                        'icon'        => 'Shield',
                        'sort_order'  => 3,
                        'permissions' => ['role.view'],
                    ],
                    [
                        'name'        => 'menu-management',
                        'label'       => 'Akses Menu',
                        'route'       => 'menus.index',
                        'icon'        => 'Menu',
                        'sort_order'  => 4,
                        'permissions' => ['role.update'],
                    ],
                ],
            ],

            // ── PRODUCT MANAGEMENT ───────────────────────────
            [
                'name'        => 'product-management',
                'label'       => 'Manajemen Produk',
                'route'       => null,
                'icon'        => 'Package',
                'sort_order'  => 3,
                'module'      => 'product',
                'permissions' => ['product.view'],
                'children'    => [
                    [
                        'name'        => 'product-list',
                        'label'       => 'Daftar Produk',
                        'route'       => 'products.index',
                        'icon'        => 'Box',
                        'sort_order'  => 1,
                        'permissions' => ['product.view'],
                    ],
                    [
                        'name'        => 'product-category',
                        'label'       => 'Kategori Produk',
                        'route'       => 'product-categories.index',
                        'icon'        => 'Tag',
                        'sort_order'  => 2,
                        'permissions' => ['product.category.view'],
                    ],
                    [
                        'name'        => 'product-stock',
                        'label'       => 'Manajemen Stok',
                        'route'       => 'product-stocks.index',
                        'icon'        => 'Warehouse',
                        'sort_order'  => 3,
                        'permissions' => ['product.stock.view'],
                    ],
                    // ── Paket Produk ─────────────────────────
                    [
                        'name'        => 'product-package',
                        'label'       => 'Paket Produk',
                        'route'       => 'product-packages.index',
                        'icon'        => 'Warehouse',
                        'sort_order'  => 4,
                        'permissions' => ['product-package.view'],
                    ],
                    [
                        'name'        => 'product-promotion',
                        'label'       => 'Promosi Produk',
                        'route'       => 'product-promotions.index',
                        'icon'        => 'Tag',
                        'permissions' => ['product-promotion.view'],
                        'sort_order'  => 5,
                    ],
                ],
            ],

            // ── CASHIER / POS ────────────────────────────────
            [
                'name'        => 'pos',
                'label'       => 'Kasir (POS)',
                'route'       => 'pos.index',
                'icon'        => 'ShoppingCart',
                'sort_order'  => 4,
                'module'      => 'transaction',
                'permissions' => ['transaction.create'],
                'children'    => [],
            ],

            // ── TRANSACTION MANAGEMENT ────────────────────────
            [
                'name'        => 'transaction-management',
                'label'       => 'Manajemen Transaksi',
                'route'       => null,
                'icon'        => 'Receipt',
                'sort_order'  => 5,
                'module'      => 'transaction',
                'permissions' => ['transaction.view'],
                'children'    => [
                    [
                        'name'        => 'transaction-list',
                        'label'       => 'Daftar Transaksi',
                        'route'       => 'transactions.index',
                        'icon'        => 'ListOrdered',
                        'sort_order'  => 1,
                        'permissions' => ['transaction.view'],
                    ],
                    [
                        'name'        => 'transaction-refund',
                        'label'       => 'Refund',
                        'route'       => 'transactions.refunds',
                        'icon'        => 'RotateCcw',
                        'sort_order'  => 2,
                        'permissions' => ['transaction.refund'],
                    ],
                    [
                        'name'        => 'transaction-return',
                        'label'       => 'Return Barang',
                        'route'       => 'transactions.returns',
                        'icon'        => 'PackageOpen',
                        'sort_order'  => 3,
                        'permissions' => ['transaction.return'],
                    ],
                    [
                        'name'        => 'voucher-management',
                        'label'       => 'Voucher Diskon',
                        'route'       => 'vouchers.index',
                        'icon'        => 'Ticket',
                        'sort_order'  => 4,
                        'permissions' => ['voucher.view'],
                    ],
                ],
            ],

            // ── REPORTS ──────────────────────────────────────
            [
                'name'        => 'reports',
                'label'       => 'Laporan',
                'route'       => null,
                'icon'        => 'BarChart2',
                'sort_order'  => 6,
                'module'      => 'report',
                'permissions' => ['report.sales'],
                'children'    => [
                    [
                        'name'        => 'report-sales',
                        'label'       => 'Laporan Penjualan',
                        'route'       => 'reports.sales',
                        'icon'        => 'TrendingUp',
                        'sort_order'  => 1,
                        'permissions' => ['report.sales'],
                    ],
                    [
                        'name'        => 'report-stock',
                        'label'       => 'Laporan Stok',
                        'route'       => 'reports.stock',
                        'icon'        => 'Archive',
                        'sort_order'  => 2,
                        'permissions' => ['report.stock'],
                    ],
                    [
                        'name'        => 'report-cashier',
                        'label'       => 'Laporan Kasir',
                        'route'       => 'reports.cashier',
                        'icon'        => 'UserCheck',
                        'sort_order'  => 3,
                        'permissions' => ['report.cashier'],
                    ],
                ],
            ],

            // ── SETTINGS (developer only) ────────────────────
            [
                'name'        => 'settings',
                'label'       => 'Pengaturan',
                'route'       => null,
                'icon'        => 'Settings',
                'sort_order'  => 99,
                'module'      => 'setting',
                'permissions' => ['setting.system'],
                'children'    => [
                    [
                        'name'        => 'setting-system',
                        'label'       => 'Sistem',
                        'route'       => 'settings.system',
                        'icon'        => 'Server',
                        'sort_order'  => 1,
                        'permissions' => ['setting.system'],
                    ],
                    [
                        'name'        => 'setting-membership',
                        'label'       => 'Membership',
                        'route'       => 'settings.membership',
                        'icon'        => 'CreditCard',
                        'sort_order'  => 2,
                        'permissions' => ['membership.manage'],
                    ],
                ],
            ],
        ];

        foreach ($menus as $menuData) {
            $children       = $menuData['children'] ?? [];
            $menuPermissions = $menuData['permissions'] ?? [];
            unset($menuData['children'], $menuData['permissions']);

            $menu = Menu::firstOrCreate(['name' => $menuData['name']], $menuData);

            if (! empty($menuPermissions)) {
                $permIds = Permission::whereIn('name', $menuPermissions)->pluck('id');
                $menu->permissions()->sync($permIds);
            }

            foreach ($children as $childData) {
                $childPermissions = $childData['permissions'] ?? [];
                unset($childData['permissions']);

                $child = Menu::firstOrCreate(
                    ['name' => $childData['name']],
                    array_merge($childData, [
                        'parent_id' => $menu->id,
                        'module'    => $menuData['module'],
                    ])
                );

                if (! empty($childPermissions)) {
                    $permIds = Permission::whereIn('name', $childPermissions)->pluck('id');
                    $child->permissions()->sync($permIds);
                }
            }
        }

        $this->command->info('✅ Menus seeded: ' . Menu::count() . ' total');
    }
}