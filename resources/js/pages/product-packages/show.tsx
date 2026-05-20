
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Box,
    Edit2,
    History,
    Tag,
    Trash2,
    Zap,
} from 'lucide-react';
import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────
interface Category {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    price: string;
}

interface PackageItem {
    id: number;
    product_id: number;
    quantity: number;
    note: string | null;
    product: Product;
}

interface AddonOption {
    id: number;
    product_id: number;
    extra_charge: string;
    sort_order: number;
    product: Product;
}

interface AddonGroup {
    id: number;
    name: string;
    default_product_id: number | null;
    is_required: boolean;
    sort_order: number;
    default_product: Product | null;
    options: AddonOption[];
}

interface PackageDetail {
    id: number;
    sku: string;
    name: string;
    description: string | null;
    base_price: string;
    is_active: boolean;
    category_id: number | null;
    category: Category | null;
    created_at: string;
    updated_at: string;
    items: PackageItem[];
    addon_groups: AddonGroup[];
}

interface Props {
    package: PackageDetail;
    teamSlug: string;
    canUpdate: boolean;
    canDelete: boolean;
}

// ─── Helpers ──────────────────────────────────────────────
function buildUrl(path: string, teamSlug: string): string {
    return `/${teamSlug}${path}`;
}

function formatCurrency(value: string | number): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'long',
        timeStyle: 'short',
    }).format(new Date(value));
}

// ─── Shared UI ────────────────────────────────────────────
const COLORS = {
    blue:    { bg: 'hsl(214 100% 95%)', text: 'hsl(214 100% 40%)' },
    green:   { bg: 'hsl(142 76% 92%)',  text: 'hsl(142 76% 30%)' },
    red:     { bg: 'hsl(0 72% 94%)',    text: 'hsl(0 72% 40%)' },
    amber:   { bg: 'hsl(43 96% 92%)',   text: 'hsl(43 96% 30%)' },
    default: { bg: 'var(--muted)',       text: 'var(--muted-foreground)' },
} as const;

function Badge({
    children,
    color = 'default',
}: {
    children: React.ReactNode;
    color?: keyof typeof COLORS;
}) {
    const c = COLORS[color];
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: c.bg,
                color: c.text,
            }}
        >
            {children}
        </span>
    );
}

function SectionCard({
    title,
    icon,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
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
                    padding: '14px 18px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}
            >
                <span style={{ color: 'hsl(214 100% 50%)' }}>{icon}</span>
                <h2
                    style={{
                        margin: 0,
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--card-foreground)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}
                >
                    {title}
                </h2>
            </div>
            <div style={{ padding: '18px' }}>{children}</div>
        </div>
    );
}

// ─── Delete Confirmation Modal ────────────────────────────
function DeleteModal({
    name,
    onClose,
    onConfirm,
    deleting,
}: {
    name: string;
    onClose: () => void;
    onConfirm: () => void;
    deleting: boolean;
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
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(4px)',
                }}
                onClick={onClose}
            />
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '380px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
                    padding: '28px',
                    textAlign: 'center',
                }}
            >
                <div
                    style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        backgroundColor: 'hsl(0 72% 94%)',
                        color: 'hsl(0 72% 45%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 14px',
                    }}
                >
                    <AlertCircle size={26} />
                </div>
                <h3
                    style={{
                        margin: '0 0 6px 0',
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--card-foreground)',
                    }}
                >
                    Hapus Paket
                </h3>
                <p
                    style={{
                        margin: '0 0 6px 0',
                        fontSize: '12px',
                        color: 'var(--muted-foreground)',
                    }}
                >
                    Aksi ini tidak dapat dibatalkan
                </p>
                <p
                    style={{
                        margin: '0 0 22px 0',
                        fontSize: '13px',
                        color: 'var(--card-foreground)',
                    }}
                >
                    Hapus paket <strong>"{name}"</strong>? Semua item dan addon
                    grup di dalamnya juga akan dihapus.
                </p>
                <div
                    style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'center',
                    }}
                >
                    <button
                        onClick={onClose}
                        disabled={deleting}
                        style={{
                            padding: '9px 20px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--background)',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                        }}
                    >
                        Batal
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        style={{
                            padding: '9px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'hsl(0 72% 50%)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                        }}
                    >
                        {deleting ? 'Menghapus...' : 'Hapus Paket'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────
export default function ProductPackageShow({
    package: pkg,
    teamSlug,
    canUpdate,
    canDelete,
}: Props) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    function handleDelete() {
        setDeleting(true);
        router.delete(buildUrl(`/product-packages/${pkg.id}`, teamSlug), {
            onFinish: () => setDeleting(false),
        });
    }

    const totalItemPrice = pkg.items.reduce(
        (sum, item) => sum + parseFloat(item.product.price) * item.quantity,
        0,
    );
    const savings = totalItemPrice - parseFloat(pkg.base_price);

    return (
        <>
            <Head title={`Paket: ${pkg.name}`} />

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                }}
            >
                {/* Back nav */}
                <Link
                    href={buildUrl('/product-packages', teamSlug)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'hsl(214 100% 50%)',
                        textDecoration: 'none',
                        fontSize: '13px',
                        width: 'fit-content',
                    }}
                >
                    <ArrowLeft size={16} />
                    Kembali ke Paket Produk
                </Link>

                {/* ── Hero Header ─────────────────────────── */}
                <div
                    style={{
                        borderRadius: '14px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--card)',
                        padding: '24px',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            gap: '18px',
                            alignItems: 'flex-start',
                        }}
                    >
                        {/* Icon */}
                        <div
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '14px',
                                backgroundColor: 'hsl(214 100% 95%)',
                                color: 'hsl(214 100% 45%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <Box size={26} />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    flexWrap: 'wrap',
                                    marginBottom: '6px',
                                }}
                            >
                                <h1
                                    style={{
                                        margin: 0,
                                        fontSize: '22px',
                                        fontWeight: 800,
                                        color: 'var(--card-foreground)',
                                    }}
                                >
                                    {pkg.name}
                                </h1>
                                <Badge color={pkg.is_active ? 'green' : 'default'}>
                                    {pkg.is_active ? 'Aktif' : 'Nonaktif'}
                                </Badge>
                                {pkg.category && (
                                    <Badge color="blue">
                                        <Tag size={9} />
                                        {pkg.category.name}
                                    </Badge>
                                )}
                            </div>

                            <p
                                style={{
                                    margin: '0 0 14px 0',
                                    fontSize: '12px',
                                    color: 'var(--muted-foreground)',
                                    fontFamily: 'monospace',
                                }}
                            >
                                SKU: {pkg.sku}
                            </p>

                            {pkg.description && (
                                <p
                                    style={{
                                        margin: '0 0 16px 0',
                                        fontSize: '13px',
                                        color: 'var(--muted-foreground)',
                                        lineHeight: '1.6',
                                    }}
                                >
                                    {pkg.description}
                                </p>
                            )}

                            {/* Price row */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: '12px',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '28px',
                                        fontWeight: 800,
                                        color: 'hsl(142 76% 30%)',
                                    }}
                                >
                                    {formatCurrency(pkg.base_price)}
                                </span>
                                {savings > 0 && (
                                    <>
                                        <span
                                            style={{
                                                fontSize: '14px',
                                                color: 'var(--muted-foreground)',
                                                textDecoration: 'line-through',
                                            }}
                                        >
                                            {formatCurrency(totalItemPrice)}
                                        </span>
                                        <Badge color="red">
                                            Hemat {formatCurrency(savings)}
                                        </Badge>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '8px',
                                flexShrink: 0,
                            }}
                        >
                            <Link
                                href={buildUrl(
                                    `/product-packages/${pkg.id}/history`,
                                    teamSlug,
                                )}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--background)',
                                    color: 'var(--foreground)',
                                    textDecoration: 'none',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                }}
                            >
                                <History size={14} />
                                Riwayat
                            </Link>
                            {canUpdate && (
                                <Link
                                    href={buildUrl(
                                        `/product-packages/${pkg.id}/edit`,
                                        teamSlug,
                                    )}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: 'hsl(214 100% 50%)',
                                        color: 'white',
                                        textDecoration: 'none',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                    }}
                                >
                                    <Edit2 size={14} />
                                    Edit
                                </Link>
                            )}
                            {canDelete && (
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: 'hsl(0 72% 94%)',
                                        color: 'hsl(0 72% 45%)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                    }}
                                >
                                    <Trash2 size={14} />
                                    Hapus
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Meta */}
                    <div
                        style={{
                            marginTop: '20px',
                            paddingTop: '16px',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            gap: '24px',
                            flexWrap: 'wrap',
                        }}
                    >
                        <MetaItem label="Dibuat" value={formatDate(pkg.created_at)} />
                        <MetaItem label="Diperbarui" value={formatDate(pkg.updated_at)} />
                        <MetaItem label="Jumlah Item" value={`${pkg.items.length} produk`} />
                        <MetaItem
                            label="Grup Addon"
                            value={
                                pkg.addon_groups.length > 0
                                    ? `${pkg.addon_groups.length} grup`
                                    : 'Tidak ada'
                            }
                        />
                    </div>
                </div>

                {/* ── Two-column body ──────────────────────── */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: pkg.addon_groups.length > 0 ? '1fr 1fr' : '1fr',
                        gap: '20px',
                        alignItems: 'start',
                    }}
                >
                    {/* Isi Paket */}
                    <SectionCard title="Isi Paket" icon={<Box size={16} />}>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                            }}
                        >
                            {pkg.items.map((item, idx) => (
                                <div
                                    key={item.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        backgroundColor: 'var(--muted)',
                                    }}
                                >
                                    {/* Index number */}
                                    <span
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '6px',
                                            backgroundColor: 'var(--background)',
                                            color: 'var(--muted-foreground)',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {idx + 1}
                                    </span>

                                    {/* Product info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontWeight: 600,
                                                fontSize: '13px',
                                                color: 'var(--card-foreground)',
                                            }}
                                        >
                                            {item.product.name}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: 'var(--muted-foreground)',
                                                marginTop: '2px',
                                                display: 'flex',
                                                gap: '8px',
                                            }}
                                        >
                                            <span style={{ fontFamily: 'monospace' }}>
                                                {item.product.sku}
                                            </span>
                                            {item.note && (
                                                <span
                                                    style={{
                                                        fontStyle: 'italic',
                                                    }}
                                                >
                                                    · {item.note}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Qty & price */}
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                padding: '2px 8px',
                                                borderRadius: '6px',
                                                backgroundColor: 'hsl(214 100% 95%)',
                                                color: 'hsl(214 100% 40%)',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                marginBottom: '3px',
                                            }}
                                        >
                                            ×{item.quantity}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: 'var(--muted-foreground)',
                                            }}
                                        >
                                            {formatCurrency(item.product.price)}
                                            {item.quantity > 1 && (
                                                <span>/pcs</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Subtotal row */}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    border: '1px dashed var(--border)',
                                    marginTop: '4px',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '12px',
                                        color: 'var(--muted-foreground)',
                                    }}
                                >
                                    Total harga satuan
                                </span>
                                <span
                                    style={{
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: 'var(--card-foreground)',
                                    }}
                                >
                                    {formatCurrency(totalItemPrice)}
                                </span>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    backgroundColor: 'hsl(142 76% 92%)',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: 'hsl(142 76% 25%)',
                                    }}
                                >
                                    Harga Paket
                                </span>
                                <span
                                    style={{
                                        fontSize: '15px',
                                        fontWeight: 800,
                                        color: 'hsl(142 76% 25%)',
                                    }}
                                >
                                    {formatCurrency(pkg.base_price)}
                                </span>
                            </div>
                            {savings > 0 && (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px 14px',
                                        borderRadius: '10px',
                                        backgroundColor: 'hsl(0 72% 94%)',
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: '12px',
                                            color: 'hsl(0 72% 40%)',
                                        }}
                                    >
                                        Pelanggan hemat
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            color: 'hsl(0 72% 40%)',
                                        }}
                                    >
                                        {formatCurrency(savings)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    {/* Addon Groups */}
                    {pkg.addon_groups.length > 0 && (
                        <SectionCard
                            title="Addon / Substitusi"
                            icon={<Zap size={16} />}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px',
                                }}
                            >
                                {pkg.addon_groups.map((group) => (
                                    <AddonGroupCard
                                        key={group.id}
                                        group={group}
                                    />
                                ))}
                            </div>
                        </SectionCard>
                    )}
                </div>
            </div>

            {showDeleteModal && (
                <DeleteModal
                    name={pkg.name}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleDelete}
                    deleting={deleting}
                />
            )}
        </>
    );
}

// ─── Sub-components ───────────────────────────────────────
function MetaItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div
                style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--muted-foreground)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '2px',
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: '13px',
                    color: 'var(--card-foreground)',
                    fontWeight: 500,
                }}
            >
                {value}
            </div>
        </div>
    );
}

function AddonGroupCard({ group }: { group: AddonGroup }) {
    function formatCurrency(value: string | number): string {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num);
    }

    return (
        <div
            style={{
                borderRadius: '10px',
                border: '1px solid var(--border)',
                overflow: 'hidden',
            }}
        >
            {/* Group header */}
            <div
                style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <Zap
                        size={13}
                        style={{ color: 'hsl(43 96% 40%)', flexShrink: 0 }}
                    />
                    <span
                        style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: 'var(--card-foreground)',
                        }}
                    >
                        {group.name}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {group.is_required && (
                        <span
                            style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '999px',
                                backgroundColor: 'hsl(43 96% 92%)',
                                color: 'hsl(43 96% 30%)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                            }}
                        >
                            Wajib
                        </span>
                    )}
                    {group.default_product && (
                        <span
                            style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: '999px',
                                backgroundColor: 'hsl(214 100% 95%)',
                                color: 'hsl(214 100% 40%)',
                            }}
                        >
                            Default: {group.default_product.name}
                        </span>
                    )}
                </div>
            </div>

            {/* Options */}
            <div style={{ padding: '10px 14px' }}>
                {group.options.length === 0 ? (
                    <p
                        style={{
                            margin: 0,
                            fontSize: '12px',
                            color: 'var(--muted-foreground)',
                            fontStyle: 'italic',
                        }}
                    >
                        Tidak ada opsi tersedia.
                    </p>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                        }}
                    >
                        {group.options.map((opt) => {
                            const isFree = parseFloat(opt.extra_charge) === 0;
                            return (
                                <div
                                    key={opt.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--background)',
                                        border: '1px solid var(--border)',
                                    }}
                                >
                                    <div>
                                        <span
                                            style={{
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                color: 'var(--card-foreground)',
                                            }}
                                        >
                                            {opt.product.name}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '11px',
                                                color: 'var(--muted-foreground)',
                                                marginLeft: '6px',
                                                fontFamily: 'monospace',
                                            }}
                                        >
                                            {opt.product.sku}
                                        </span>
                                    </div>
                                    <span
                                        style={{
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            color: isFree
                                                ? 'hsl(142 76% 30%)'
                                                : 'hsl(0 72% 40%)',
                                            backgroundColor: isFree
                                                ? 'hsl(142 76% 92%)'
                                                : 'hsl(0 72% 94%)',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {isFree
                                            ? 'Gratis'
                                            : `+${formatCurrency(opt.extra_charge)}`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}