import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Box, Edit2, PackagePlus, Trash2 } from 'lucide-react';

interface Package {
    id: number;
    name: string;
    sku: string;
}

interface ActivityChange {
    before: string | number | boolean | null;
    after: string | number | boolean | null;
}

interface Activity {
    id: number;
    action: 'created' | 'updated' | 'deleted';
    changes: Record<string, ActivityChange> | null;
    note: string | null;
    created_at: string;
    user?: { id: number; name: string } | null;
}

interface Props {
    package: Package;
    activity: { data: Activity[]; total: number };
    teamSlug: string;
}

function buildUrl(path: string, teamSlug: string) {
    return `/${teamSlug}${path}`;
}

function label(action: Activity['action']) {
    return { created: 'Dibuat', updated: 'Diperbarui', deleted: 'Dihapus' }[action];
}

function icon(action: Activity['action']) {
    if (action === 'created') return <PackagePlus size={14} />;
    if (action === 'deleted') return <Trash2 size={14} />;
    return <Edit2 size={14} />;
}

const FIELD_LABELS: Record<string, string> = {
    category_id: 'Kategori',
    sku: 'SKU',
    name: 'Nama',
    description: 'Deskripsi',
    base_price: 'Harga Dasar',
    is_active: 'Status',
};

function formatValue(value: ActivityChange['before']): string {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Aktif' : 'Nonaktif';
    return String(value);
}

function formatChanges(changes: Activity['changes']): string {
    if (!changes || Object.keys(changes).length === 0) return '-';
    return Object.entries(changes)
        .map(([field, change]) => `${FIELD_LABELS[field] ?? field}: ${formatValue(change.before)} → ${formatValue(change.after)}`)
        .join('; ');
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function ProductPackageHistory({ package: pkg, activity, teamSlug }: Props) {
    return (
        <>
            <Head title={`Riwayat Paket ${pkg.name}`} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Link href={buildUrl('/product-packages', teamSlug)} style={{ alignItems: 'center', color: 'hsl(214 100% 50%)', display: 'inline-flex', gap: '8px', textDecoration: 'none', width: 'fit-content' }}>
                    <ArrowLeft size={16} />
                    Kembali ke Paket Produk
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'hsl(214 100% 95%)', color: 'hsl(214 100% 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box size={22} />
                    </div>
                    <div>
                        <h1 style={{ margin: '0 0 3px 0', color: 'var(--foreground)', fontSize: '24px', fontWeight: 700 }}>Riwayat Paket</h1>
                        <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>{pkg.name} · <span style={{ fontFamily: 'monospace' }}>{pkg.sku}</span></p>
                    </div>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', backgroundColor: 'var(--card)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Tanggal', 'Aksi', 'User', 'Perubahan', 'Catatan'].map((h) => (
                                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', color: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activity.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted-foreground)' }}>Belum ada riwayat untuk paket ini.</td>
                                </tr>
                            ) : (
                                activity.data.map((item) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 16px' }}>{formatDate(item.created_at)}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                {icon(item.action)}{label(item.action)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>{item.user?.name ?? '-'}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--muted-foreground)', maxWidth: '260px', wordBreak: 'break-word' }}>{formatChanges(item.changes)}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--muted-foreground)' }}>{item.note ?? '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}