import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowDown, ArrowUp, SlidersHorizontal } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    sku: string;
    stock: number;
    min_stock: number;
    category?: {
        id: number;
        name: string;
    } | null;
}

interface Movement {
    id: number;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    stock_before: number;
    stock_after: number;
    note: string | null;
    created_at: string;
    user?: {
        id: number;
        name: string;
    } | null;
}

interface Props {
    product: Product;
    movements: {
        data: Movement[];
        total: number;
    };
    teamSlug: string;
}

function buildUrl(path: string, teamSlug: string): string {
    return `/${teamSlug}${path}`;
}

function label(type: Movement['type']): string {
    return {
        in: 'Stok Masuk',
        out: 'Stok Keluar',
        adjustment: 'Set Stok',
    }[type];
}

function icon(type: Movement['type']) {
    if (type === 'in') {
        return <ArrowUp size={14} />;
    }

    if (type === 'out') {
        return <ArrowDown size={14} />;
    }

    return <SlidersHorizontal size={14} />;
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

export default function ProductStockHistory({ product, movements, teamSlug }: Props) {
    return (
        <>
            <Head title={`Histori Stok ${product.name}`} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Link
                    href={buildUrl('/product-stocks', teamSlug)}
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
                    Kembali ke Manajemen Stok
                </Link>

                <div>
                    <h1 style={{ margin: '0 0 6px 0', color: 'var(--foreground)', fontSize: '28px' }}>
                        Histori Stok
                    </h1>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '14px' }}>
                        {product.name} ({product.sku}) saat ini {product.stock} unit
                    </p>
                </div>

                <div
                    style={{
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--card)',
                        overflow: 'hidden',
                    }}
                >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Tanggal', 'Tipe', 'Jumlah', 'Sebelum', 'Sesudah', 'User', 'Catatan'].map((heading) => (
                                    <th
                                        key={heading}
                                        style={{
                                            padding: '12px 16px',
                                            textAlign: 'left',
                                            color: 'var(--muted-foreground)',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            letterSpacing: '0.04em',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {heading}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {movements.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                                        Belum ada histori stok untuk produk ini
                                    </td>
                                </tr>
                            ) : (
                                movements.data.map((movement) => (
                                    <tr key={movement.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 16px' }}>{formatDate(movement.created_at)}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                {icon(movement.type)}
                                                {label(movement.type)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>{movement.quantity}</td>
                                        <td style={{ padding: '12px 16px' }}>{movement.stock_before}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: 700 }}>{movement.stock_after}</td>
                                        <td style={{ padding: '12px 16px' }}>{movement.user?.name ?? '-'}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--muted-foreground)' }}>
                                            {movement.note ?? '-'}
                                        </td>
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
