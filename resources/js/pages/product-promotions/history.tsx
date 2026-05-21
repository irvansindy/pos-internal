import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Edit2, Tag, Trash2, Zap } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────

interface Promotion {
    id: number;
    name: string;
    type: string;
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
    promotion: Promotion;
    activity: {
        data: Activity[];
        current_page: number;
        last_page: number;
        total: number;
    };
    teamSlug: string;
    canUpdate: boolean;
    canDelete: boolean;
}

// ─── Helpers ──────────────────────────────────────────────

function buildUrl(path: string, teamSlug: string): string {
    return `/${teamSlug}${path}`;
}

function actionLabel(action: Activity['action']): string {
    return { created: 'Dibuat', updated: 'Diperbarui', deleted: 'Dihapus' }[
        action
    ];
}

function actionIcon(action: Activity['action']) {
    if (action === 'created') return <Zap size={14} />;
    if (action === 'deleted') return <Trash2 size={14} />;
    return <Edit2 size={14} />;
}

function actionColor(
    action: Activity['action'],
): { bg: string; text: string } {
    const map = {
        created: { bg: 'hsl(142 76% 92%)', text: 'hsl(142 76% 30%)' },
        updated: { bg: 'hsl(214 100% 95%)', text: 'hsl(214 100% 40%)' },
        deleted: { bg: 'hsl(0 72% 94%)', text: 'hsl(0 72% 40%)' },
    };
    return map[action];
}

const FIELD_LABELS: Record<string, string> = {
    name:        'Nama',
    description: 'Deskripsi',
    type:        'Tipe',
    is_active:   'Status',
    starts_at:   'Berlaku Mulai',
    ends_at:     'Berlaku Sampai',
};

function formatValue(value: ActivityChange['before']): string {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Aktif' : 'Nonaktif';
    return String(value);
}

function formatChanges(changes: Activity['changes']): string {
    if (!changes || Object.keys(changes).length === 0) return '-';

    return Object.entries(changes)
        .map(
            ([field, change]) =>
                `${FIELD_LABELS[field] ?? field}: ${formatValue(change.before)} → ${formatValue(change.after)}`,
        )
        .join('; ');
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

// ─── Page ─────────────────────────────────────────────────

export default function ProductPromotionHistory({
    promotion,
    activity,
    teamSlug,
}: Props) {
    return (
        <>
            <Head title={`Riwayat Promosi ${promotion.name}`} />

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                }}
            >
                {/* Back link */}
                <Link
                    href={buildUrl('/product-promotions', teamSlug)}
                    style={{
                        alignItems: 'center',
                        color: 'hsl(214 100% 50%)',
                        display: 'inline-flex',
                        gap: '8px',
                        textDecoration: 'none',
                        width: 'fit-content',
                    }}
                >
                    <ArrowLeft size={16} />
                    Kembali ke Promosi Produk
                </Link>

                {/* Title */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}
                >
                    <div
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            backgroundColor: 'hsl(270 60% 94%)',
                            color: 'hsl(270 60% 40%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Tag size={22} />
                    </div>
                    <div>
                        <h1
                            style={{
                                margin: '0 0 3px 0',
                                color: 'var(--foreground)',
                                fontSize: '24px',
                                fontWeight: 700,
                            }}
                        >
                            Riwayat Promosi
                        </h1>
                        <p
                            style={{
                                margin: 0,
                                color: 'var(--muted-foreground)',
                                fontSize: '13px',
                            }}
                        >
                            {promotion.name}
                        </p>
                    </div>
                </div>

                {/* Table */}
                <div
                    style={{
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        backgroundColor: 'var(--card)',
                        overflow: 'hidden',
                    }}
                >
                    <table
                        style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '13px',
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    borderBottom: '1px solid var(--border)',
                                }}
                            >
                                {[
                                    'Tanggal',
                                    'Aksi',
                                    'User',
                                    'Perubahan',
                                    'Catatan',
                                ].map((h) => (
                                    <th
                                        key={h}
                                        style={{
                                            padding: '11px 16px',
                                            textAlign: 'left',
                                            color: 'var(--muted-foreground)',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            letterSpacing: '0.04em',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activity.data.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        style={{
                                            padding: '40px 16px',
                                            textAlign: 'center',
                                            color: 'var(--muted-foreground)',
                                        }}
                                    >
                                        Belum ada riwayat untuk promosi ini.
                                    </td>
                                </tr>
                            ) : (
                                activity.data.map((item) => {
                                    const color = actionColor(item.action);
                                    return (
                                        <tr
                                            key={item.id}
                                            style={{
                                                borderBottom:
                                                    '1px solid var(--border)',
                                            }}
                                        >
                                            <td
                                                style={{
                                                    padding: '12px 16px',
                                                    whiteSpace: 'nowrap',
                                                    color: 'var(--muted-foreground)',
                                                    fontSize: '12px',
                                                }}
                                            >
                                                {formatDate(item.created_at)}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '3px 10px',
                                                        borderRadius: '999px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        backgroundColor:
                                                            color.bg,
                                                        color: color.text,
                                                    }}
                                                >
                                                    {actionIcon(item.action)}
                                                    {actionLabel(item.action)}
                                                </span>
                                            </td>
                                            <td
                                                style={{
                                                    padding: '12px 16px',
                                                    color: 'var(--card-foreground)',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {item.user?.name ?? (
                                                    <span
                                                        style={{
                                                            color: 'var(--muted-foreground)',
                                                        }}
                                                    >
                                                        -
                                                    </span>
                                                )}
                                            </td>
                                            <td
                                                style={{
                                                    padding: '12px 16px',
                                                    color: 'var(--muted-foreground)',
                                                    maxWidth: '280px',
                                                    wordBreak: 'break-word',
                                                    fontSize: '12px',
                                                }}
                                            >
                                                {formatChanges(item.changes)}
                                            </td>
                                            <td
                                                style={{
                                                    padding: '12px 16px',
                                                    color: 'var(--muted-foreground)',
                                                    fontSize: '12px',
                                                }}
                                            >
                                                {item.note ?? '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {activity.last_page > 1 && (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '13px',
                        }}
                    >
                        <span style={{ color: 'var(--muted-foreground)' }}>
                            {activity.total} riwayat tersimpan
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {activity.current_page > 1 && (
                                <Link
                                    href={buildUrl(
                                        `/product-promotions/${promotion.id}/history?page=${activity.current_page - 1}`,
                                        teamSlug,
                                    )}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--background)',
                                        color: 'var(--foreground)',
                                        textDecoration: 'none',
                                        fontSize: '12px',
                                    }}
                                >
                                    ← Sebelumnya
                                </Link>
                            )}
                            {activity.current_page < activity.last_page && (
                                <Link
                                    href={buildUrl(
                                        `/product-promotions/${promotion.id}/history?page=${activity.current_page + 1}`,
                                        teamSlug,
                                    )}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--background)',
                                        color: 'var(--foreground)',
                                        textDecoration: 'none',
                                        fontSize: '12px',
                                    }}
                                >
                                    Selanjutnya →
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}