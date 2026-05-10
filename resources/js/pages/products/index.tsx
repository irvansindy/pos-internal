import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Edit2,
    History,
    Package,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

// ─── Types ───────────────────────────────────────────────
interface Category {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    description: string | null;
    price: string;
    cost: string | null;
    stock: number;
    min_stock: number;
    is_active: boolean;
    category_id: number | null;
    category?: Category;
    activity_logs_count?: number;
}

interface ProductActivity {
    id: number;
    action: 'created' | 'updated' | 'deleted';
    subject_name: string | null;
    note: string | null;
    created_at: string;
    user?: {
        id: number;
        name: string;
    } | null;
}

interface PaginatedProducts {
    data: Product[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Props {
    products: PaginatedProducts;
    recentActivity: ProductActivity[];
    categories: Category[];
    teamSlug: string;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

type SortKey = 'name' | 'sku' | 'price' | 'stock';
type SortDirection = 'asc' | 'desc';

// ─── Helpers ─────────────────────────────────────────────
function buildUrl(path: string, teamSlug: string): string {
    return `/${teamSlug}${path}`;
}

function formatCurrency(value: string | null): string {
    if (!value) {
        return 'Rp 0';
    }

    const num = parseFloat(value);

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

function getSortValue(product: Product, key: SortKey): string | number {
    if (key === 'name') {
        return product.name;
    }

    if (key === 'sku') {
        return product.sku;
    }

    if (key === 'price') {
        return parseFloat(product.price);
    }

    if (key === 'stock') {
        return product.stock;
    }

    return product.name;
}

function getStockBadgeColor(
    stock: number,
    minStock: number,
): 'blue' | 'amber' | 'green' | 'red' {
    if (stock <= 0) {
        return 'red';
    }

    if (stock <= minStock) {
        return 'amber';
    }

    return 'green';
}

function activityLabel(action: ProductActivity['action']): string {
    return {
        created: 'Dibuat',
        updated: 'Diperbarui',
        deleted: 'Dihapus',
    }[action];
}

function activityColor(
    action: ProductActivity['action'],
): 'blue' | 'green' | 'red' {
    if (action === 'created') {
        return 'green';
    }

    if (action === 'deleted') {
        return 'red';
    }

    return 'blue';
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

// ─── Badge Component ──────────────────────────────────────
function Badge({
    children,
    color = 'default',
}: {
    children: React.ReactNode;
    color?: 'default' | 'blue' | 'green' | 'amber' | 'red';
}) {
    const colors = {
        default: { bg: 'var(--muted)', text: 'var(--muted-foreground)' },
        blue: { bg: 'hsl(214 100% 95%)', text: 'hsl(214 100% 40%)' },
        green: { bg: 'hsl(142 76% 92%)', text: 'hsl(142 76% 30%)' },
        amber: { bg: 'hsl(43 96% 92%)', text: 'hsl(43 96% 30%)' },
        red: { bg: 'hsl(0 72% 94%)', text: 'hsl(0 72% 40%)' },
    };
    const c = colors[color];

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: c.bg,
                color: c.text,
            }}
        >
            {children}
        </span>
    );
}

// ─── Modal Base ───────────────────────────────────────────
function Modal({
    onClose,
    children,
    maxWidth = '440px',
}: {
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
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
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)',
                }}
                onClick={onClose}
            />
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth,
                    borderRadius: '16px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                    padding: '24px',
                }}
            >
                {children}
            </div>
        </div>
    );
}

// ─── Field Component ──────────────────────────────────────
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
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--card-foreground)',
                    marginBottom: '6px',
                }}
            >
                {label} <span style={{ color: 'hsl(0 72% 50%)' }}>*</span>
            </label>
            {children}
            {error && (
                <p
                    style={{
                        fontSize: '12px',
                        color: 'hsl(0 72% 50%)',
                        marginTop: '4px',
                    }}
                >
                    {error}
                </p>
            )}
        </div>
    );
}

const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%',
    height: '38px',
    borderRadius: '8px',
    border: hasError ? '1px solid hsl(0 72% 50%)' : '1px solid var(--border)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: '14px',
    padding: '0 12px',
    outline: 'none',
    boxSizing: 'border-box',
});

const selectStyle: React.CSSProperties = {
    width: '100%',
    height: '38px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: '14px',
    padding: '0 12px',
    outline: 'none',
};

// ─── Create Modal ────────────────────────────────────────
function CreateProductModal({
    onClose,
    categories,
    teamSlug,
}: {
    onClose: () => void;
    categories: Category[];
    teamSlug: string;
}) {
    const { data, setData, post, errors, processing, reset } = useForm({
        category_id: '',
        sku: '',
        name: '',
        description: '',
        price: '',
        cost: '',
        stock: '0',
        min_stock: '0',
        is_active: true,
    });

    function submit() {
        post(buildUrl('/products', teamSlug), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    }

    return (
        <Modal onClose={onClose} maxWidth="480px">
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '20px',
                }}
            >
                <div
                    style={{
                        height: '40px',
                        width: '40px',
                        borderRadius: '10px',
                        backgroundColor: 'hsl(214 100% 95%)',
                        color: 'hsl(214 100% 40%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Package size={18} />
                </div>
                <div>
                    <h3
                        style={{
                            margin: '0 0 2px 0',
                            fontSize: '15px',
                            fontWeight: 600,
                            color: 'var(--card-foreground)',
                        }}
                    >
                        Buat Produk Baru
                    </h3>
                    <p
                        style={{
                            margin: 0,
                            fontSize: '12px',
                            color: 'var(--muted-foreground)',
                        }}
                    >
                        Tambahkan produk ke inventaris tim Anda
                    </p>
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                }}
            >
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                    }}
                >
                    <Field label="SKU" error={(errors as any).sku}>
                        <input
                            type="text"
                            value={data.sku}
                            onChange={(e) => setData('sku', e.target.value)}
                            placeholder="SKU001"
                            autoFocus
                            style={inputStyle(!!errors.sku)}
                            disabled={processing}
                        />
                    </Field>
                    <Field label="Nama Produk" error={(errors as any).name}>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Nama produk"
                            style={inputStyle(!!errors.name)}
                            disabled={processing}
                        />
                    </Field>
                </div>

                <Field label="Deskripsi">
                    <textarea
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        placeholder="Deskripsi produk (opsional)"
                        style={{
                            ...inputStyle(),
                            height: 'auto',
                            minHeight: '70px',
                            padding: '8px 12px',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                        }}
                        disabled={processing}
                    />
                </Field>

                <Field label="Kategori">
                    <select
                        value={data.category_id}
                        onChange={(e) => setData('category_id', e.target.value)}
                        style={selectStyle}
                        disabled={processing}
                    >
                        <option value="">-- Pilih Kategori --</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </Field>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                    }}
                >
                    <Field label="Harga" error={(errors as any).price}>
                        <input
                            type="number"
                            value={data.price}
                            onChange={(e) => setData('price', e.target.value)}
                            placeholder="0"
                            style={inputStyle(!!errors.price)}
                            disabled={processing}
                        />
                    </Field>
                    <Field label="Biaya">
                        <input
                            type="number"
                            value={data.cost}
                            onChange={(e) => setData('cost', e.target.value)}
                            placeholder="0"
                            style={inputStyle()}
                            disabled={processing}
                        />
                    </Field>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                    }}
                >
                    <Field label="Stok" error={(errors as any).stock}>
                        <input
                            type="number"
                            value={data.stock}
                            onChange={(e) => setData('stock', e.target.value)}
                            placeholder="0"
                            style={inputStyle(!!errors.stock)}
                            disabled={processing}
                        />
                    </Field>
                    <Field label="Stok Minimum">
                        <input
                            type="number"
                            value={data.min_stock}
                            onChange={(e) =>
                                setData('min_stock', e.target.value)
                            }
                            placeholder="0"
                            style={inputStyle()}
                            disabled={processing}
                        />
                    </Field>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--muted)',
                    }}
                >
                    <input
                        type="checkbox"
                        id="is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer',
                        }}
                        disabled={processing}
                    />
                    <label
                        htmlFor="is_active"
                        style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            margin: 0,
                            color: 'var(--card-foreground)',
                        }}
                    >
                        Aktifkan produk ini
                    </label>
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'flex-end',
                        marginTop: '4px',
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--background)',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                        }}
                        disabled={processing}
                    >
                        Batal
                    </button>
                    <button
                        onClick={submit}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'hsl(214 100% 50%)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                        }}
                        disabled={processing}
                    >
                        {processing ? 'Menyimpan...' : 'Buat Produk'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Edit Modal ──────────────────────────────────────────
function EditProductModal({
    product,
    onClose,
    categories,
    teamSlug,
}: {
    product: Product | null;
    onClose: () => void;
    categories: Category[];
    teamSlug: string;
}) {
    const { data, setData, put, errors, processing } = useForm({
        category_id: product?.category_id || '',
        sku: product?.sku || '',
        name: product?.name || '',
        description: product?.description || '',
        price: product?.price || '',
        cost: product?.cost || '',
        stock: product?.stock.toString() || '0',
        min_stock: product?.min_stock.toString() || '0',
        is_active: product?.is_active ?? true,
    });

    function submit() {
        if (product) {
            put(buildUrl(`/products/${product.id}`, teamSlug), {
                onSuccess: onClose,
            });
        }
    }

    return (
        <Modal onClose={onClose} maxWidth="480px">
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '20px',
                }}
            >
                <div
                    style={{
                        height: '40px',
                        width: '40px',
                        borderRadius: '10px',
                        backgroundColor: 'hsl(214 100% 95%)',
                        color: 'hsl(214 100% 40%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Edit2 size={18} />
                </div>
                <div>
                    <h3
                        style={{
                            margin: '0 0 2px 0',
                            fontSize: '15px',
                            fontWeight: 600,
                            color: 'var(--card-foreground)',
                        }}
                    >
                        Edit Produk
                    </h3>
                    <p
                        style={{
                            margin: 0,
                            fontSize: '12px',
                            color: 'var(--muted-foreground)',
                        }}
                    >
                        Perbarui informasi produk
                    </p>
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                }}
            >
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                    }}
                >
                    <Field label="SKU" error={(errors as any).sku}>
                        <input
                            type="text"
                            value={data.sku}
                            onChange={(e) => setData('sku', e.target.value)}
                            style={inputStyle(!!errors.sku)}
                            disabled={processing}
                        />
                    </Field>
                    <Field label="Nama Produk" error={(errors as any).name}>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            style={inputStyle(!!errors.name)}
                            disabled={processing}
                        />
                    </Field>
                </div>

                <Field label="Deskripsi">
                    <textarea
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        style={{
                            ...inputStyle(),
                            height: 'auto',
                            minHeight: '70px',
                            padding: '8px 12px',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                        }}
                        disabled={processing}
                    />
                </Field>

                <Field label="Kategori">
                    <select
                        value={data.category_id}
                        onChange={(e) => setData('category_id', e.target.value)}
                        style={selectStyle}
                        disabled={processing}
                    >
                        <option value="">-- Pilih Kategori --</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </Field>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                    }}
                >
                    <Field label="Harga" error={(errors as any).price}>
                        <input
                            type="number"
                            value={data.price}
                            onChange={(e) => setData('price', e.target.value)}
                            style={inputStyle(!!errors.price)}
                            disabled={processing}
                        />
                    </Field>
                    <Field label="Biaya">
                        <input
                            type="number"
                            value={data.cost}
                            onChange={(e) => setData('cost', e.target.value)}
                            style={inputStyle()}
                            disabled={processing}
                        />
                    </Field>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                    }}
                >
                    <Field label="Stok" error={(errors as any).stock}>
                        <input
                            type="number"
                            value={data.stock}
                            onChange={(e) => setData('stock', e.target.value)}
                            style={inputStyle(!!errors.stock)}
                            disabled={processing}
                        />
                    </Field>
                    <Field label="Stok Minimum">
                        <input
                            type="number"
                            value={data.min_stock}
                            onChange={(e) =>
                                setData('min_stock', e.target.value)
                            }
                            style={inputStyle()}
                            disabled={processing}
                        />
                    </Field>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--muted)',
                    }}
                >
                    <input
                        type="checkbox"
                        id="edit_is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer',
                        }}
                        disabled={processing}
                    />
                    <label
                        htmlFor="edit_is_active"
                        style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            margin: 0,
                            color: 'var(--card-foreground)',
                        }}
                    >
                        Produk aktif
                    </label>
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'flex-end',
                        marginTop: '4px',
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--background)',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                        }}
                        disabled={processing}
                    >
                        Batal
                    </button>
                    <button
                        onClick={submit}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'hsl(214 100% 50%)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                        }}
                        disabled={processing}
                    >
                        {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Delete Modal ────────────────────────────────────────
function DeleteProductModal({
    product,
    onClose,
    teamSlug,
}: {
    product: Product | null;
    onClose: () => void;
    teamSlug: string;
}) {
    const [deleting, setDeleting] = useState(false);

    function confirm() {
        if (product) {
            setDeleting(true);
            router.delete(buildUrl(`/products/${product.id}`, teamSlug), {
                onFinish: () => {
                    setDeleting(false);
                    onClose();
                },
            });
        }
    }

    return (
        <Modal onClose={onClose} maxWidth="380px">
            <div style={{ marginBottom: '16px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: 'hsl(0 72% 94%)',
                        color: 'hsl(0 72% 50%)',
                        marginBottom: '12px',
                    }}
                >
                    <AlertCircle size={24} />
                </div>
                <h3
                    style={{
                        margin: '0 0 4px 0',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: 'var(--card-foreground)',
                    }}
                >
                    Hapus Produk
                </h3>
                <p
                    style={{
                        margin: 0,
                        fontSize: '12px',
                        color: 'var(--muted-foreground)',
                    }}
                >
                    Aksi ini tidak dapat dibatalkan
                </p>
            </div>
            <p
                style={{
                    margin: '0 0 16px 0',
                    fontSize: '13px',
                    color: 'var(--card-foreground)',
                }}
            >
                Apakah Anda yakin ingin menghapus produk{' '}
                <strong>{product?.name}</strong>?
            </p>
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'flex-end',
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                    }}
                    disabled={deleting}
                >
                    Batal
                </button>
                <button
                    onClick={confirm}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'hsl(0 72% 50%)',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                    }}
                    disabled={deleting}
                >
                    {deleting ? 'Menghapus...' : 'Hapus Produk'}
                </button>
            </div>
        </Modal>
    );
}

// ─── Main Page ────────────────────────────────────────────
export default function ProductsIndex({
    products: initialProducts,
    recentActivity,
    categories,
    teamSlug,
    canCreate,
    canUpdate,
    canDelete,
}: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const filteredProducts = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return initialProducts.data.filter((p) =>
            keyword
                ? p.name.toLowerCase().includes(keyword) ||
                  p.sku.toLowerCase().includes(keyword)
                : true,
        );
    }, [initialProducts.data, search]);

    const sortedProducts = useMemo(() => {
        return [...filteredProducts].sort((a, b) => {
            const aVal = getSortValue(a, sortKey);
            const bVal = getSortValue(b, sortKey);
            const compare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;

            return sortDirection === 'asc' ? compare : -compare;
        });
    }, [filteredProducts, sortKey, sortDirection]);

    function toggleSort(key: SortKey) {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');

            return;
        }

        setSortKey(key);
        setSortDirection('asc');
    }

    return (
        <>
            <Head title="Produk" />

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div>
                        <h1
                            style={{
                                margin: '0 0 4px 0',
                                fontSize: '24px',
                                fontWeight: 700,
                                color: 'var(--card-foreground)',
                            }}
                        >
                            Manajemen Produk
                        </h1>
                        <p
                            style={{
                                margin: 0,
                                fontSize: '13px',
                                color: 'var(--muted-foreground)',
                            }}
                        >
                            Kelola semua produk inventaris Anda di sini
                        </p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setShowCreate(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'hsl(214 100% 50%)',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                            }}
                        >
                            <Plus size={16} />
                            Tambah Produk
                        </button>
                    )}
                </div>

                {/* Search */}
                <div style={{ position: 'relative' }}>
                    <Search
                        size={16}
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--muted-foreground)',
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Cari produk berdasarkan nama atau SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            height: '38px',
                            paddingLeft: '40px',
                            paddingRight: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--background)',
                            color: 'var(--foreground)',
                            fontSize: '13px',
                            outline: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* Table */}
                <div
                    style={{
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--card)',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ overflowX: 'auto' }}>
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
                                    <th
                                        style={{
                                            padding: '12px 16px',
                                            textAlign: 'left',
                                            fontWeight: 600,
                                            color: 'var(--muted-foreground)',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                        }}
                                        onClick={() => toggleSort('name')}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            Produk
                                            {sortKey === 'name' &&
                                                (sortDirection === 'asc' ? (
                                                    <ChevronUp size={14} />
                                                ) : (
                                                    <ChevronDown size={14} />
                                                ))}
                                        </div>
                                    </th>
                                    <th
                                        style={{
                                            padding: '12px 16px',
                                            textAlign: 'left',
                                            fontWeight: 600,
                                            color: 'var(--muted-foreground)',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                        }}
                                        onClick={() => toggleSort('sku')}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            SKU
                                            {sortKey === 'sku' &&
                                                (sortDirection === 'asc' ? (
                                                    <ChevronUp size={14} />
                                                ) : (
                                                    <ChevronDown size={14} />
                                                ))}
                                        </div>
                                    </th>
                                    <th
                                        style={{
                                            padding: '12px 16px',
                                            textAlign: 'left',
                                            fontWeight: 600,
                                            color: 'var(--muted-foreground)',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}
                                    >
                                        Kategori
                                    </th>
                                    <th
                                        style={{
                                            padding: '12px 16px',
                                            textAlign: 'right',
                                            fontWeight: 600,
                                            color: 'var(--muted-foreground)',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                        }}
                                        onClick={() => toggleSort('price')}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end',
                                                gap: '6px',
                                            }}
                                        >
                                            Harga
                                            {sortKey === 'price' &&
                                                (sortDirection === 'asc' ? (
                                                    <ChevronUp size={14} />
                                                ) : (
                                                    <ChevronDown size={14} />
                                                ))}
                                        </div>
                                    </th>
                                    <th
                                        style={{
                                            padding: '12px 16px',
                                            textAlign: 'right',
                                            fontWeight: 600,
                                            color: 'var(--muted-foreground)',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                        }}
                                        onClick={() => toggleSort('stock')}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end',
                                                gap: '6px',
                                            }}
                                        >
                                            Stok
                                            {sortKey === 'stock' &&
                                                (sortDirection === 'asc' ? (
                                                    <ChevronUp size={14} />
                                                ) : (
                                                    <ChevronDown size={14} />
                                                ))}
                                        </div>
                                    </th>
                                    <th
                                        style={{
                                            padding: '12px 16px',
                                            textAlign: 'center',
                                            fontWeight: 600,
                                            color: 'var(--muted-foreground)',
                                            fontSize: '11px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}
                                    >
                                        Status
                                    </th>
                                    {(canUpdate || canDelete) && (
                                        <th
                                            style={{
                                                padding: '12px 16px',
                                                textAlign: 'center',
                                                fontWeight: 600,
                                                color: 'var(--muted-foreground)',
                                                fontSize: '11px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }}
                                        >
                                            Aksi
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedProducts.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={
                                                canUpdate || canDelete ? 8 : 7
                                            }
                                            style={{
                                                padding: '48px 16px',
                                                textAlign: 'center',
                                                color: 'var(--muted-foreground)',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                }}
                                            >
                                                <Package
                                                    size={32}
                                                    opacity={0.5}
                                                />
                                                <div>
                                                    <p
                                                        style={{
                                                            margin: '0 0 4px 0',
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        Tidak ada produk
                                                    </p>
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            fontSize: '12px',
                                                        }}
                                                    >
                                                        Mulai dengan menambahkan
                                                        produk pertama Anda
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    sortedProducts.map((product) => (
                                        <tr
                                            key={product.id}
                                            style={{
                                                borderBottom:
                                                    '1px solid var(--border)',
                                                transition:
                                                    'background-color 0.2s',
                                            }}
                                            onMouseEnter={(e) => {
                                                (
                                                    e.currentTarget as HTMLTableRowElement
                                                ).style.backgroundColor =
                                                    'var(--muted)';
                                            }}
                                            onMouseLeave={(e) => {
                                                (
                                                    e.currentTarget as HTMLTableRowElement
                                                ).style.backgroundColor =
                                                    'transparent';
                                            }}
                                        >
                                            <td
                                                style={{
                                                    padding: '12px 16px',
                                                    color: 'var(--card-foreground)',
                                                }}
                                            >
                                                <div>
                                                    <div
                                                        style={{
                                                            fontWeight: 500,
                                                            marginBottom: '2px',
                                                        }}
                                                    >
                                                        {product.name}
                                                    </div>
                                                    {product.description && (
                                                        <div
                                                            style={{
                                                                fontSize:
                                                                    '11px',
                                                                color: 'var(--muted-foreground)',
                                                            }}
                                                        >
                                                            {product.description.substring(
                                                                0,
                                                                50,
                                                            )}
                                                            {product.description
                                                                .length > 50
                                                                ? '...'
                                                                : ''}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td
                                                style={{
                                                    padding: '12px 16px',
                                                    fontFamily: 'monospace',
                                                    fontSize: '12px',
                                                    color: 'var(--card-foreground)',
                                                }}
                                            >
                                                {product.sku}
                                            </td>
                                            <td
                                                style={{
                                                    padding: '12px 16px',
                                                    color: 'var(--card-foreground)',
                                                }}
                                            >
                                                {product.category?.name || '-'}
                                            </td>
                                            <td
                                                style={{
                                                    padding: '12px 16px',
                                                    textAlign: 'right',
                                                    fontWeight: 500,
                                                    color: 'var(--card-foreground)',
                                                }}
                                            >
                                                {formatCurrency(product.price)}
                                            </td>
                                            <td
                                                style={{
                                                    padding: '12px 16px',
                                                    textAlign: 'right',
                                                }}
                                            >
                                                <Badge
                                                    color={getStockBadgeColor(
                                                        product.stock,
                                                        product.min_stock,
                                                    )}
                                                >
                                                    {product.stock} unit
                                                </Badge>
                                            </td>
                                            <td
                                                style={{
                                                    padding: '12px 16px',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                <Badge
                                                    color={
                                                        product.is_active
                                                            ? 'green'
                                                            : 'default'
                                                    }
                                                >
                                                    {product.is_active
                                                        ? 'Aktif'
                                                        : 'Nonaktif'}
                                                </Badge>
                                            </td>
                                            {(canUpdate || canDelete) && (
                                                <td
                                                    style={{
                                                        padding: '12px 16px',
                                                        textAlign: 'center',
                                                        display: 'flex',
                                                        justifyContent:
                                                            'center',
                                                        gap: '8px',
                                                    }}
                                                >
                                                    <Link
                                                        href={buildUrl(
                                                            `/products/${product.id}/history`,
                                                            teamSlug,
                                                        )}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            color: 'var(--muted-foreground)',
                                                            padding: '4px',
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                            textDecoration:
                                                                'none',
                                                            transition:
                                                                'opacity 0.2s',
                                                        }}
                                                        title="Riwayat"
                                                    >
                                                        <History size={16} />
                                                    </Link>
                                                    {canUpdate && (
                                                        <button
                                                            onClick={() =>
                                                                setEditingProduct(
                                                                    product,
                                                                )
                                                            }
                                                            style={{
                                                                background:
                                                                    'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: 'hsl(214 100% 50%)',
                                                                padding: '4px',
                                                                display: 'flex',
                                                                alignItems:
                                                                    'center',
                                                                transition:
                                                                    'opacity 0.2s',
                                                            }}
                                                            onMouseEnter={(
                                                                e,
                                                            ) => {
                                                                (
                                                                    e.currentTarget as HTMLButtonElement
                                                                ).style.opacity =
                                                                    '0.7';
                                                            }}
                                                            onMouseLeave={(
                                                                e,
                                                            ) => {
                                                                (
                                                                    e.currentTarget as HTMLButtonElement
                                                                ).style.opacity =
                                                                    '1';
                                                            }}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() =>
                                                                setDeleteProduct(
                                                                    product,
                                                                )
                                                            }
                                                            style={{
                                                                background:
                                                                    'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: 'hsl(0 72% 50%)',
                                                                padding: '4px',
                                                                display: 'flex',
                                                                alignItems:
                                                                    'center',
                                                                transition:
                                                                    'opacity 0.2s',
                                                            }}
                                                            onMouseEnter={(
                                                                e,
                                                            ) => {
                                                                (
                                                                    e.currentTarget as HTMLButtonElement
                                                                ).style.opacity =
                                                                    '0.7';
                                                            }}
                                                            onMouseLeave={(
                                                                e,
                                                            ) => {
                                                                (
                                                                    e.currentTarget as HTMLButtonElement
                                                                ).style.opacity =
                                                                    '1';
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {initialProducts.last_page > 1 && (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '13px',
                        }}
                    >
                        <div style={{ color: 'var(--muted-foreground)' }}>
                            Menampilkan {initialProducts.data.length} dari{' '}
                            {initialProducts.total} produk
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {initialProducts.current_page > 1 && (
                                <button
                                    onClick={() =>
                                        router.get(
                                            buildUrl(
                                                `/products?page=${initialProducts.current_page - 1}`,
                                                teamSlug,
                                            ),
                                        )
                                    }
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--background)',
                                        color: 'var(--foreground)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                    }}
                                >
                                    ← Sebelumnya
                                </button>
                            )}
                            {initialProducts.current_page <
                                initialProducts.last_page && (
                                <button
                                    onClick={() =>
                                        router.get(
                                            buildUrl(
                                                `/products?page=${initialProducts.current_page + 1}`,
                                                teamSlug,
                                            ),
                                        )
                                    }
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--background)',
                                        color: 'var(--foreground)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                    }}
                                >
                                    Selanjutnya →
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div
                    style={{
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--card)',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            padding: '16px',
                            borderBottom: '1px solid var(--border)',
                        }}
                    >
                        <h2
                            style={{
                                margin: 0,
                                fontSize: '15px',
                                fontWeight: 700,
                            }}
                        >
                            Riwayat Perubahan Produk
                        </h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {recentActivity.length === 0 ? (
                            <div
                                style={{
                                    padding: '24px 16px',
                                    color: 'var(--muted-foreground)',
                                    fontSize: '13px',
                                }}
                            >
                                Belum ada riwayat perubahan produk.
                            </div>
                        ) : (
                            recentActivity.map((activity) => (
                                <div
                                    key={activity.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        gap: '16px',
                                        padding: '12px 16px',
                                        borderBottom: '1px solid var(--border)',
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                            }}
                                        >
                                            <Badge
                                                color={activityColor(
                                                    activity.action,
                                                )}
                                            >
                                                {activityLabel(activity.action)}
                                            </Badge>
                                            <strong>
                                                {activity.subject_name ??
                                                    'Produk'}
                                            </strong>
                                        </div>
                                        <div
                                            style={{
                                                marginTop: '4px',
                                                color: 'var(--muted-foreground)',
                                                fontSize: '12px',
                                            }}
                                        >
                                            {activity.note ?? '-'}
                                            {activity.user?.name
                                                ? ` oleh ${activity.user.name}`
                                                : ''}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            color: 'var(--muted-foreground)',
                                            fontSize: '12px',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {formatDate(activity.created_at)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showCreate && (
                <CreateProductModal
                    onClose={() => setShowCreate(false)}
                    categories={categories}
                    teamSlug={teamSlug}
                />
            )}
            {editingProduct && (
                <EditProductModal
                    product={editingProduct}
                    onClose={() => setEditingProduct(null)}
                    categories={categories}
                    teamSlug={teamSlug}
                />
            )}
            {deleteProduct && (
                <DeleteProductModal
                    product={deleteProduct}
                    onClose={() => setDeleteProduct(null)}
                    teamSlug={teamSlug}
                />
            )}
        </>
    );
}
