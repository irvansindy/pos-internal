import { Head, usePage } from '@inertiajs/react';
import { ShoppingCart, Package, Users, TrendingUp, BarChart2, AlertTriangle, Plus } from 'lucide-react';

// Type untuk props yang dikirim dari DashboardController
interface Stats {
    transactions_today?: number;
    revenue_today?: number;
    transactions_month?: number;
    revenue_month?: number;
    total_products?: number;
    low_stock_products?: number;
    total_members?: number;
}

interface Props {
    stats: Stats;
    isOwner: boolean;
}

function formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
}

// ─── Stat Card Component ─────────────────────────────────
function StatCard({
    title,
    value,
    icon,
    description,
    color = '#6b7280',
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description?: string;
    color?: string;
}) {
    return (
        <div style={{
            borderRadius: '12px',
            border: '1px solid var(--color-border-tertiary, #e5e7eb)',
            backgroundColor: 'var(--color-background-primary, #ffffff)',
            padding: '20px',
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary, #6b7280)', margin: 0 }}>
                        {title}
                    </p>
                    <p style={{
                        fontSize: '24px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary, #111827)',
                        margin: '4px 0 0',
                    }}>
                        {value}
                    </p>
                    {description && (
                        <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary, #9ca3af)', margin: '2px 0 0' }}>
                            {description}
                        </p>
                    )}
                </div>
                <div style={{
                    height: '40px', width: '40px', borderRadius: '10px',
                    backgroundColor: 'var(--color-background-secondary, #f9fafb)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    color,
                }}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

// ─── Main Dashboard Page ─────────────────────────────────
export default function Dashboard({ stats, isOwner }: Props) {
    const { auth } = usePage().props as any;
    const user = auth?.user;
    const team = user?.current_team;
    const permissions: string[] = user?.permissions ?? [];
    const can = (perm: string) => permissions.includes('*') || permissions.includes(perm);

    return (
        <>
            <Head title="Dashboard" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Header */}
                <div>
                    <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0, color: 'var(--color-text-primary, #ffffff)' }}>
                        Dashboard
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary, #6b7280)', margin: '4px 0 0' }}>
                        Selamat datang, <strong>{user?.name}</strong>
                        {team && (
                            <> · <span style={{ color: 'var(--color-text-tertiary, #9ca3af)' }}>{team.name}</span>
                            {' '}
                            <span style={{
                                display: 'inline-flex', alignItems: 'center',
                                padding: '1px 8px', borderRadius: '999px',
                                fontSize: '11px', fontWeight: 500,
                                backgroundColor: 'var(--color-background-info, #eff6ff)',
                                color: 'var(--color-text-info, #3b82f6)',
                            }}>
                                {team.role_label ?? (isOwner ? 'Owner' : 'Member')}
                            </span>
                            </>
                        )}
                    </p>
                </div>

                {/* Quick Actions */}
                {can('transaction.create') && (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <a
                            href={team ? `/${team.slug}/pos` : '#'}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                height: '40px', padding: '0 20px', borderRadius: '10px',
                                backgroundColor: 'var(--color-text-primary, #111827)',
                                color: 'var(--color-background-primary, #ffffff)',
                                textDecoration: 'none', fontSize: '14px', fontWeight: 500,
                            }}
                        >
                            <ShoppingCart size={16} />
                            Buka Kasir
                        </a>
                        {can('product.create') && (
                            <a
                                href={team ? `/${team.slug}/products/create` : '#'}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    height: '40px', padding: '0 20px', borderRadius: '10px',
                                    border: '1px solid var(--color-border-tertiary, #e5e7eb)',
                                    backgroundColor: 'transparent',
                                    // color: 'var(--color-text-primary, #111827)',
                                    color: 'var(--color-text-primary, #ffffff)',
                                    textDecoration: 'none', fontSize: '14px', fontWeight: 500,
                                }}
                            >
                                <Plus size={16} />
                                Tambah Produk
                            </a>
                        )}
                    </div>
                )}

                {/* Stats Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '16px',
                }}>
                    {can('transaction.view') && typeof stats.transactions_today !== 'undefined' && (
                        <>
                            <StatCard
                                title="Transaksi Hari Ini"
                                value={stats.transactions_today ?? 0}
                                icon={<ShoppingCart size={20} />}
                                description="total transaksi"
                                color="var(--color-text-info, #3b82f6)"
                            />
                            <StatCard
                                title="Pendapatan Hari Ini"
                                value={formatRupiah(stats.revenue_today ?? 0)}
                                icon={<TrendingUp size={20} />}
                                description="total pendapatan"
                                color="var(--color-text-success, #10b981)"
                            />
                            <StatCard
                                title="Transaksi Bulan Ini"
                                value={stats.transactions_month ?? 0}
                                icon={<BarChart2 size={20} />}
                                description="total transaksi"
                                color="var(--color-text-warning, #f59e0b)"
                            />
                            <StatCard
                                title="Pendapatan Bulan Ini"
                                value={formatRupiah(stats.revenue_month ?? 0)}
                                icon={<TrendingUp size={20} />}
                                description="total pendapatan"
                                color="var(--color-text-success, #10b981)"
                            />
                        </>
                    )}

                    {can('product.view') && typeof stats.total_products !== 'undefined' && (
                        <>
                            <StatCard
                                title="Total Produk"
                                value={stats.total_products ?? 0}
                                icon={<Package size={20} />}
                                description="produk terdaftar"
                                color="var(--color-text-info, #3b82f6)"
                            />
                            <StatCard
                                title="Stok Menipis"
                                value={stats.low_stock_products ?? 0}
                                icon={<AlertTriangle size={20} />}
                                description="produk perlu restock"
                                color="var(--color-text-danger, #ef4444)"
                            />
                        </>
                    )}

                    {can('user.view') && typeof stats.total_members !== 'undefined' && (
                        <StatCard
                            title="Anggota Tim"
                            value={stats.total_members ?? 0}
                            icon={<Users size={20} />}
                            description="anggota aktif"
                            color="var(--color-text-secondary, #6b7280)"
                        />
                    )}
                </div>

                {/* Owner Summary */}
                {isOwner && team && (
                    <div style={{
                        borderRadius: '12px',
                        border: '1px solid var(--color-border-tertiary, #e5e7eb)',
                        backgroundColor: 'var(--color-background-primary, #ffffff)',
                        padding: '20px',
                    }}>
                        <h2 style={{
                            fontSize: '14px', fontWeight: 600,
                            color: 'var(--color-text-primary, #111827)', margin: '0 0 4px',
                        }}>
                            Ringkasan Tim — {team.name}
                        </h2>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary, #9ca3af)', margin: '0 0 16px' }}>
                            Anda adalah owner tim ini
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                            {[
                                { label: 'Anggota', value: stats.total_members ?? 0 },
                                { label: 'Produk', value: stats.total_products ?? 0 },
                                { label: 'Transaksi', value: stats.transactions_month ?? 0 },
                            ].map(item => (
                                <div key={item.label} style={{
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--color-background-secondary, #f9fafb)',
                                    padding: '16px',
                                }}>
                                    <p style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: 'var(--color-text-primary, #111827)' }}>
                                        {item.value}
                                    </p>
                                    <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary, #9ca3af)', margin: '4px 0 0' }}>
                                        {item.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state jika tidak ada stat sama sekali */}
                {Object.keys(stats).length === 0 && (
                    <div style={{
                        borderRadius: '12px',
                        border: '1px solid var(--color-border-tertiary, #e5e7eb)',
                        backgroundColor: 'var(--color-background-primary, #ffffff)',
                        padding: '48px 20px',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            height: '48px', width: '48px', borderRadius: '12px',
                            backgroundColor: 'var(--color-background-secondary, #f9fafb)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px',
                        }}>
                            <BarChart2 size={24} style={{ color: 'var(--color-text-tertiary, #9ca3af)' }} />
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary, #111827)', margin: 0 }}>
                            Belum ada data
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary, #6b7280)', margin: '4px 0 0' }}>
                            Data akan muncul setelah ada aktivitas di tim ini.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}

// Layout wrapper — Inertia akan inject layout dari app.tsx
// Tidak perlu AppLayout di sini karena menggunakan persistent layout
Dashboard.layout = undefined;