import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    Boxes,
    ClipboardList,
    History,
    Package,
    Search,
    SlidersHorizontal,
    Warehouse,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface Category {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    stock: number;
    min_stock: number;
    is_active: boolean;
    category?: Category | null;
    stock_movements_count: number;
}

interface PaginatedProducts {
    data: Product[];
    current_page: number;
    last_page: number;
    total: number;
}

interface StockMovement {
    id: number;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    stock_before: number;
    stock_after: number;
    note: string | null;
    created_at: string;
    product: Pick<Product, 'id' | 'name' | 'sku'>;
    user?: {
        id: number;
        name: string;
    } | null;
}

interface Props {
    products: PaginatedProducts;
    recentMovements: StockMovement[];
    stats: {
        totalProducts: number;
        totalStockUnits: number;
        lowStockProducts: number;
        outOfStockProducts: number;
    };
    teamSlug: string;
    canAdjust: boolean;
}

type MovementType = 'in' | 'out' | 'adjustment';

function buildUrl(path: string, teamSlug: string): string {
    return `/${teamSlug}${path}`;
}

function movementLabel(type: MovementType): string {
    const labels = {
        in: 'Stok Masuk',
        out: 'Stok Keluar',
        adjustment: 'Set Stok',
    };

    return labels[type];
}

function movementIcon(type: MovementType) {
    if (type === 'in') {
        return <ArrowUp size={14} />;
    }

    if (type === 'out') {
        return <ArrowDown size={14} />;
    }

    return <SlidersHorizontal size={14} />;
}

function stockStatus(product: Product): { label: string; color: string; bg: string } {
    if (product.stock <= 0) {
        return { label: 'Habis', color: 'hsl(0 72% 40%)', bg: 'hsl(0 72% 94%)' };
    }

    if (product.stock <= product.min_stock) {
        return { label: 'Stok Rendah', color: 'hsl(43 96% 30%)', bg: 'hsl(43 96% 92%)' };
    }

    return { label: 'Aman', color: 'hsl(142 76% 30%)', bg: 'hsl(142 76% 92%)' };
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function Modal({
    children,
    onClose,
}: {
    children: React.ReactNode;
    onClose: () => void;
}) {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
            }}
        >
            <div
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(4px)',
                }}
            />
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '460px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card)',
                    padding: '24px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                }}
            >
                {children}
            </div>
        </div>
    );
}

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label
                style={{
                    display: 'block',
                    marginBottom: '6px',
                    color: 'var(--card-foreground)',
                    fontSize: '13px',
                    fontWeight: 500,
                }}
            >
                {label}
            </label>
            {children}
            {error && (
                <p style={{ margin: '4px 0 0 0', color: 'hsl(0 72% 50%)', fontSize: '12px' }}>
                    {error}
                </p>
            )}
        </div>
    );
}

const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%',
    minHeight: '38px',
    borderRadius: '8px',
    border: hasError ? '1px solid hsl(0 72% 50%)' : '1px solid var(--border)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
});

function AdjustStockModal({
    product,
    teamSlug,
    onClose,
}: {
    product: Product;
    teamSlug: string;
    onClose: () => void;
}) {
    const { data, setData, post, errors, processing, reset } = useForm({
        type: 'in' as MovementType,
        quantity: '',
        final_stock: product.stock.toString(),
        note: '',
    });

    function submit() {
        post(buildUrl(`/product-stocks/${product.id}/adjust`, teamSlug), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    }

    return (
        <Modal onClose={onClose}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <div
                    style={{
                        alignItems: 'center',
                        backgroundColor: 'hsl(214 100% 95%)',
                        borderRadius: '8px',
                        color: 'hsl(214 100% 40%)',
                        display: 'flex',
                        height: '40px',
                        justifyContent: 'center',
                        width: '40px',
                    }}
                >
                    <Warehouse size={18} />
                </div>
                <div>
                    <h3 style={{ margin: '0 0 3px 0', fontSize: '16px', fontWeight: 600 }}>
                        Adjust Stok
                    </h3>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '12px' }}>
                        {product.name} saat ini memiliki {product.stock} unit
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
                <Field label="Tipe" error={(errors as any).type}>
                    <select
                        value={data.type}
                        onChange={(event) => setData('type', event.target.value as MovementType)}
                        disabled={processing}
                        style={inputStyle(!!errors.type)}
                    >
                        <option value="in">Stok Masuk</option>
                        <option value="out">Stok Keluar</option>
                        <option value="adjustment">Set Stok Akhir</option>
                    </select>
                </Field>

                {data.type === 'adjustment' ? (
                    <Field label="Stok Akhir" error={(errors as any).final_stock}>
                        <input
                            type="number"
                            min="0"
                            value={data.final_stock}
                            onChange={(event) => setData('final_stock', event.target.value)}
                            disabled={processing}
                            style={inputStyle(!!errors.final_stock)}
                        />
                    </Field>
                ) : (
                    <Field label="Jumlah" error={(errors as any).quantity}>
                        <input
                            type="number"
                            min="1"
                            value={data.quantity}
                            onChange={(event) => setData('quantity', event.target.value)}
                            disabled={processing}
                            style={inputStyle(!!errors.quantity)}
                        />
                    </Field>
                )}

                <Field label="Catatan" error={(errors as any).note}>
                    <textarea
                        value={data.note}
                        onChange={(event) => setData('note', event.target.value)}
                        disabled={processing}
                        placeholder="Contoh: restock supplier, retur barang, koreksi opname"
                        style={{ ...inputStyle(!!errors.note), minHeight: '78px', resize: 'vertical' }}
                    />
                </Field>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                    <button
                        onClick={onClose}
                        disabled={processing}
                        style={{
                            backgroundColor: 'var(--background)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                            padding: '8px 16px',
                        }}
                    >
                        Batal
                    </button>
                    <button
                        onClick={submit}
                        disabled={processing}
                        style={{
                            backgroundColor: 'hsl(214 100% 50%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            padding: '8px 16px',
                        }}
                    >
                        {processing ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function StatCard({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
}) {
    return (
        <div
            style={{
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: 'var(--card)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ color: 'hsl(214 100% 50%)' }}>{icon}</div>
                <div>
                    <p style={{ margin: '0 0 3px 0', color: 'var(--muted-foreground)', fontSize: '12px' }}>
                        {label}
                    </p>
                    <p style={{ margin: 0, color: 'var(--card-foreground)', fontSize: '22px', fontWeight: 700 }}>
                        {value.toLocaleString('id-ID')}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function ProductStocksIndex({
    products,
    recentMovements,
    stats,
    teamSlug,
    canAdjust,
}: Props) {
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const filteredProducts = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return products.data.filter((product) => {
            if (!keyword) {
                return true;
            }

            return (
                product.name.toLowerCase().includes(keyword) ||
                product.sku.toLowerCase().includes(keyword) ||
                (product.category?.name.toLowerCase() ?? '').includes(keyword)
            );
        });
    }, [products.data, search]);

    return (
        <>
            <Head title="Manajemen Stok" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div>
                        <h1 style={{ margin: '0 0 6px 0', color: 'var(--foreground)', fontSize: '28px' }}>
                            Manajemen Stok
                        </h1>
                        <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '14px' }}>
                            Kontrol stok masuk, stok keluar, dan koreksi opname produk
                        </p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                    <StatCard icon={<Package size={20} />} label="Total Produk" value={stats.totalProducts} />
                    <StatCard icon={<Boxes size={20} />} label="Total Unit" value={stats.totalStockUnits} />
                    <StatCard icon={<AlertCircle size={20} />} label="Stok Rendah" value={stats.lowStockProducts} />
                    <StatCard icon={<Warehouse size={20} />} label="Stok Habis" value={stats.outOfStockProducts} />
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--background)',
                        padding: '0 12px',
                    }}
                >
                    <Search size={18} color="var(--muted-foreground)" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari produk, SKU, atau kategori..."
                        style={{
                            width: '100%',
                            height: '46px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: 'var(--foreground)',
                            fontSize: '14px',
                            outline: 'none',
                            padding: '0 12px',
                        }}
                    />
                </div>

                <div
                    style={{
                        overflowX: 'auto',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--card)',
                    }}
                >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Produk', 'SKU', 'Kategori', 'Stok', 'Minimum', 'Status', 'Riwayat', 'Aksi'].map(
                                    (heading) => (
                                        <th
                                            key={heading}
                                            style={{
                                                padding: '12px 16px',
                                                textAlign: heading === 'Aksi' ? 'center' : 'left',
                                                color: 'var(--muted-foreground)',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                letterSpacing: '0.04em',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            {heading}
                                        </th>
                                    ),
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center' }}>
                                        <ClipboardList size={32} color="var(--muted-foreground)" />
                                        <p style={{ margin: '8px 0 0 0', color: 'var(--muted-foreground)' }}>
                                            Tidak ada produk yang cocok
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => {
                                    const status = stockStatus(product);

                                    return (
                                        <tr key={product.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '13px 16px', color: 'var(--card-foreground)' }}>
                                                <div style={{ fontWeight: 600 }}>{product.name}</div>
                                                <div style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}>
                                                    {product.is_active ? 'Aktif' : 'Nonaktif'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '13px 16px', fontFamily: 'monospace' }}>
                                                {product.sku}
                                            </td>
                                            <td style={{ padding: '13px 16px' }}>{product.category?.name ?? '-'}</td>
                                            <td style={{ padding: '13px 16px', fontWeight: 700 }}>
                                                {product.stock.toLocaleString('id-ID')}
                                            </td>
                                            <td style={{ padding: '13px 16px' }}>{product.min_stock}</td>
                                            <td style={{ padding: '13px 16px' }}>
                                                <span
                                                    style={{
                                                        backgroundColor: status.bg,
                                                        borderRadius: '999px',
                                                        color: status.color,
                                                        display: 'inline-flex',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        padding: '3px 8px',
                                                    }}
                                                >
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '13px 16px' }}>
                                                <Link
                                                    href={buildUrl(`/product-stocks/${product.id}/history`, teamSlug)}
                                                    style={{
                                                        alignItems: 'center',
                                                        color: 'hsl(214 100% 50%)',
                                                        display: 'inline-flex',
                                                        gap: '6px',
                                                        textDecoration: 'none',
                                                    }}
                                                >
                                                    <History size={14} />
                                                    {product.stock_movements_count}
                                                </Link>
                                            </td>
                                            <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                                                {canAdjust && (
                                                    <button
                                                        onClick={() => setSelectedProduct(product)}
                                                        style={{
                                                            alignItems: 'center',
                                                            backgroundColor: 'hsl(214 100% 50%)',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            color: 'white',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            gap: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            padding: '7px 10px',
                                                        }}
                                                    >
                                                        <SlidersHorizontal size={14} />
                                                        Adjust
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {products.last_page > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: 'var(--muted-foreground)' }}>
                            Menampilkan {products.data.length} dari {products.total} produk
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {products.current_page > 1 && (
                                <button
                                    onClick={() =>
                                        router.get(buildUrl(`/product-stocks?page=${products.current_page - 1}`, teamSlug))
                                    }
                                    style={{ ...inputStyle(), width: 'auto', cursor: 'pointer' }}
                                >
                                    Sebelumnya
                                </button>
                            )}
                            {products.current_page < products.last_page && (
                                <button
                                    onClick={() =>
                                        router.get(buildUrl(`/product-stocks?page=${products.current_page + 1}`, teamSlug))
                                    }
                                    style={{ ...inputStyle(), width: 'auto', cursor: 'pointer' }}
                                >
                                    Selanjutnya
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div
                    style={{
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--card)',
                        padding: '16px',
                    }}
                >
                    <h2 style={{ margin: '0 0 12px 0', color: 'var(--card-foreground)', fontSize: '16px' }}>
                        Aktivitas Stok Terbaru
                    </h2>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {recentMovements.length === 0 ? (
                            <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>
                                Belum ada aktivitas stok
                            </p>
                        ) : (
                            recentMovements.map((movement) => (
                                <div
                                    key={movement.id}
                                    style={{
                                        alignItems: 'center',
                                        borderBottom: '1px solid var(--border)',
                                        display: 'grid',
                                        gap: '10px',
                                        gridTemplateColumns: '1fr auto',
                                        paddingBottom: '10px',
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {movementIcon(movement.type)}
                                            <strong style={{ color: 'var(--card-foreground)', fontSize: '13px' }}>
                                                {movementLabel(movement.type)}
                                            </strong>
                                            <span style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}>
                                                {movement.product.name}
                                            </span>
                                        </div>
                                        <p style={{ margin: '4px 0 0 22px', color: 'var(--muted-foreground)', fontSize: '12px' }}>
                                            {movement.stock_before} ke {movement.stock_after}
                                            {movement.user?.name ? ` oleh ${movement.user.name}` : ''}
                                        </p>
                                    </div>
                                    <span style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}>
                                        {formatDate(movement.created_at)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {selectedProduct && (
                <AdjustStockModal
                    product={selectedProduct}
                    teamSlug={teamSlug}
                    onClose={() => setSelectedProduct(null)}
                />
            )}
        </>
    );
}
