import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Box,
    ChevronDown,
    ChevronUp,
    Edit2,
    GripVertical,
    History,
    Package,
    Plus,
    Search,
    Trash2,
    X,
    Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

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
    product_id: number;
    quantity: number;
    note: string;
    // UI helper
    _product?: Product;
}

interface AddonOption {
    product_id: number;
    extra_charge: number;
    sort_order: number;
    _product?: Product;
}

interface AddonGroup {
    name: string;
    default_product_id: number | null;
    is_required: boolean;
    sort_order: number;
    options: AddonOption[];
}

interface PackageData {
    id: number;
    sku: string;
    name: string;
    description: string | null;
    base_price: string;
    is_active: boolean;
    category_id: number | null;
    category?: Category | null;
    items_count: number;
    items: Array<{
        id: number;
        product_id: number;
        quantity: number;
        note: string | null;
        product: Product;
    }>;
    addon_groups: Array<{
        id: number;
        name: string;
        default_product_id: number | null;
        is_required: boolean;
        sort_order: number;
        options: Array<{
            id: number;
            product_id: number;
            extra_charge: string;
            sort_order: number;
            product: Product;
        }>;
    }>;
}

interface RecentActivity {
    id: number;
    action: 'created' | 'updated' | 'deleted';
    subject_name: string | null;
    note: string | null;
    created_at: string;
    user?: { id: number; name: string } | null;
}

interface Props {
    packages: {
        data: PackageData[];
        current_page: number;
        last_page: number;
        total: number;
    };
    recentActivity: RecentActivity[];
    categories: Category[];
    products: Product[];
    teamSlug: string;
    canCreate: boolean;
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
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function activityLabel(action: RecentActivity['action']): string {
    return { created: 'Dibuat', updated: 'Diperbarui', deleted: 'Dihapus' }[action];
}

function activityColor(action: RecentActivity['action']): 'green' | 'blue' | 'red' {
    return action === 'created' ? 'green' : action === 'deleted' ? 'red' : 'blue';
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
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '2px 8px', borderRadius: '999px',
                fontSize: '11px', fontWeight: 500,
                backgroundColor: c.bg, color: c.text,
            }}
        >
            {children}
        </span>
    );
}

function Modal({
    onClose,
    children,
    maxWidth = '560px',
}: {
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
}) {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
            <div style={{ position: 'relative', width: '100%', maxWidth, borderRadius: '16px', backgroundColor: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.18)', padding: '28px', marginTop: '20px', marginBottom: '20px' }}>
                {children}
            </div>
        </div>
    );
}

function ModalHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ height: '44px', width: '44px', borderRadius: '12px', backgroundColor: 'hsl(214 100% 95%)', color: 'hsl(214 100% 40%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
            </div>
            <div>
                <h3 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 700, color: 'var(--card-foreground)' }}>{title}</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted-foreground)' }}>{subtitle}</p>
            </div>
        </div>
    );
}

function Field({ label, error, optional, children }: { label: string; error?: string; optional?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--card-foreground)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
                {optional && <span style={{ color: 'var(--muted-foreground)', fontWeight: 400, marginLeft: '4px', textTransform: 'none' }}>(opsional)</span>}
                {!optional && <span style={{ color: 'hsl(0 72% 50%)', marginLeft: '2px' }}>*</span>}
            </label>
            {children}
            {error && <p style={{ fontSize: '11px', color: 'hsl(0 72% 50%)', marginTop: '3px' }}>{error}</p>}
        </div>
    );
}

const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', height: '38px', borderRadius: '8px',
    border: hasError ? '1px solid hsl(0 72% 50%)' : '1px solid var(--border)',
    backgroundColor: 'var(--background)', color: 'var(--foreground)',
    fontSize: '13px', padding: '0 10px', outline: 'none', boxSizing: 'border-box',
});

const selectStyle = (hasError?: boolean): React.CSSProperties => ({
    ...inputStyle(hasError), cursor: 'pointer',
});

function SectionDivider({ label }: { label: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{label}</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
        </div>
    );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: '1px dashed var(--border)', backgroundColor: 'transparent', color: 'hsl(214 100% 50%)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, width: '100%', justifyContent: 'center' }}
        >
            <Plus size={14} />
            {label}
        </button>
    );
}

// ─── Package Form (shared by Create & Edit) ───────────────
interface PackageFormData {
    category_id: string;
    sku: string;
    name: string;
    description: string;
    base_price: string;
    is_active: boolean;
    items: PackageItem[];
    addon_groups: AddonGroup[];
}

function PackageFormFields({
    data,
    errors,
    setData,
    processing,
    categories,
    products,
}: {
    data: PackageFormData;
    errors: Partial<Record<string, string>>;
    setData: (key: string, value: any) => void;
    processing: boolean;
    categories: Category[];
    products: Product[];
}) {
    const productMap = useMemo(() => {
        const m: Record<number, Product> = {};
        products.forEach((p) => { m[p.id] = p; });
        return m;
    }, [products]);

    // ── Items ──────────────────────────────────────────────
    function addItem() {
        setData('items', [...data.items, { product_id: 0, quantity: 1, note: '' }]);
    }

    function removeItem(idx: number) {
        setData('items', data.items.filter((_, i) => i !== idx));
    }

    function updateItem(idx: number, field: keyof PackageItem, value: any) {
        const updated = data.items.map((item, i) => i === idx ? { ...item, [field]: value } : item);
        setData('items', updated);
    }

    // ── Addon Groups ───────────────────────────────────────
    function addAddonGroup() {
        const newGroup: AddonGroup = { name: '', default_product_id: null, is_required: false, sort_order: data.addon_groups.length, options: [] };
        setData('addon_groups', [...data.addon_groups, newGroup]);
    }

    function removeAddonGroup(gIdx: number) {
        setData('addon_groups', data.addon_groups.filter((_, i) => i !== gIdx));
    }

    function updateAddonGroup(gIdx: number, field: keyof AddonGroup, value: any) {
        const updated = data.addon_groups.map((g, i) => i === gIdx ? { ...g, [field]: value } : g);
        setData('addon_groups', updated);
    }

    function addAddonOption(gIdx: number) {
        const updated = data.addon_groups.map((g, i) => {
            if (i !== gIdx) return g;
            return { ...g, options: [...g.options, { product_id: 0, extra_charge: 0, sort_order: g.options.length }] };
        });
        setData('addon_groups', updated);
    }

    function removeAddonOption(gIdx: number, oIdx: number) {
        const updated = data.addon_groups.map((g, i) => {
            if (i !== gIdx) return g;
            return { ...g, options: g.options.filter((_, j) => j !== oIdx) };
        });
        setData('addon_groups', updated);
    }

    function updateAddonOption(gIdx: number, oIdx: number, field: keyof AddonOption, value: any) {
        const updated = data.addon_groups.map((g, i) => {
            if (i !== gIdx) return g;
            const opts = g.options.map((o, j) => j === oIdx ? { ...o, [field]: value } : o);
            return { ...g, options: opts };
        });
        setData('addon_groups', updated);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="SKU Paket" error={(errors as any)['sku']}>
                    <input type="text" value={data.sku} onChange={(e) => setData('sku', e.target.value)} placeholder="PKG-001" style={inputStyle(!!(errors as any)['sku'])} disabled={processing} />
                </Field>
                <Field label="Nama Paket" error={(errors as any)['name']}>
                    <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Paket Hemat 1" style={inputStyle(!!(errors as any)['name'])} disabled={processing} />
                </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Harga Paket" error={(errors as any)['base_price']}>
                    <input type="number" min="0" value={data.base_price} onChange={(e) => setData('base_price', e.target.value)} placeholder="25000" style={inputStyle(!!(errors as any)['base_price'])} disabled={processing} />
                </Field>
                <Field label="Kategori" optional>
                    <select value={data.category_id} onChange={(e) => setData('category_id', e.target.value)} style={selectStyle()} disabled={processing}>
                        <option value="">-- Tanpa Kategori --</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </Field>
            </div>

            <Field label="Deskripsi" optional>
                <textarea value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder="Deskripsi paket (opsional)" disabled={processing} style={{ ...inputStyle(), height: 'auto', minHeight: '64px', padding: '8px 10px', fontFamily: 'inherit', resize: 'vertical' }} />
            </Field>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--muted)' }}>
                <input type="checkbox" id="pkg_is_active" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} style={{ width: '15px', height: '15px', cursor: 'pointer' }} disabled={processing} />
                <label htmlFor="pkg_is_active" style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer', margin: 0, color: 'var(--card-foreground)' }}>Aktifkan paket ini</label>
            </div>

            {/* Items Section */}
            <SectionDivider label="Isi Paket" />

            {(errors as any)['items'] && (
                <p style={{ fontSize: '12px', color: 'hsl(0 72% 50%)', margin: '-8px 0 0 0' }}>{(errors as any)['items']}</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '8px', alignItems: 'flex-start', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <select value={item.product_id || ''} onChange={(e) => updateItem(idx, 'product_id', Number(e.target.value))} style={selectStyle(!!(errors as any)[`items.${idx}.product_id`])} disabled={processing}>
                                <option value="">-- Pilih Produk --</option>
                                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                            </select>
                            <input type="text" value={item.note} onChange={(e) => updateItem(idx, 'note', e.target.value)} placeholder="Keterangan, mis: bagian paha atas (opsional)" style={{ ...inputStyle(), height: '32px', fontSize: '12px', color: 'var(--muted-foreground)' }} disabled={processing} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '10px', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase' }}>Qty</label>
                            <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} style={{ ...inputStyle(), width: '64px' }} disabled={processing} />
                        </div>
                        {item.product_id > 0 && productMap[item.product_id] && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase' }}>Harga</label>
                                <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', height: '38px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                    {formatCurrency(productMap[item.product_id].price)}
                                </span>
                            </div>
                        )}
                        <button type="button" onClick={() => removeItem(idx)} style={{ marginTop: item.product_id > 0 ? '22px' : '0px', padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'hsl(0 72% 94%)', color: 'hsl(0 72% 45%)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <X size={14} />
                        </button>
                    </div>
                ))}
                <AddButton onClick={addItem} label="Tambah Item ke Paket" />
            </div>

            {/* Addon Groups Section */}
            <SectionDivider label="Grup Addon / Substitusi" />
            <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', margin: '-8px 0 0 0' }}>
                Buat grup pilihan yang bisa diganti oleh pelanggan, misalnya "Pilihan Minuman" dengan opsi pengganti beserta biaya tambahan.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.addon_groups.map((group, gIdx) => (
                    <div key={gIdx} style={{ borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                        {/* Group Header */}
                        <div style={{ padding: '12px 14px', backgroundColor: 'var(--muted)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <GripVertical size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <input type="text" value={group.name} onChange={(e) => updateAddonGroup(gIdx, 'name', e.target.value)} placeholder="Nama grup, mis: Pilihan Minuman" style={inputStyle()} disabled={processing} />
                                <select value={group.default_product_id ?? ''} onChange={(e) => updateAddonGroup(gIdx, 'default_product_id', e.target.value ? Number(e.target.value) : null)} style={selectStyle()} disabled={processing}>
                                    <option value="">-- Produk Default (opsional) --</option>
                                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                <input type="checkbox" checked={group.is_required} onChange={(e) => updateAddonGroup(gIdx, 'is_required', e.target.checked)} disabled={processing} />
                                Wajib pilih
                            </label>
                            <button type="button" onClick={() => removeAddonGroup(gIdx)} style={{ padding: '6px', borderRadius: '6px', border: 'none', backgroundColor: 'hsl(0 72% 94%)', color: 'hsl(0 72% 45%)', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                <X size={14} />
                            </button>
                        </div>

                        {/* Group Options */}
                        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {group.options.length === 0 && (
                                <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', textAlign: 'center', padding: '8px 0' }}>Belum ada opsi. Tambahkan opsi pengganti di bawah.</p>
                            )}
                            {group.options.map((opt, oIdx) => (
                                <div key={oIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: '8px', alignItems: 'center' }}>
                                    <select value={opt.product_id || ''} onChange={(e) => updateAddonOption(gIdx, oIdx, 'product_id', Number(e.target.value))} style={selectStyle()} disabled={processing}>
                                        <option value="">-- Pilih Produk Pengganti --</option>
                                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                    </select>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--muted-foreground)', pointerEvents: 'none' }}>+Rp</span>
                                        <input type="number" min="0" value={opt.extra_charge} onChange={(e) => updateAddonOption(gIdx, oIdx, 'extra_charge', Number(e.target.value))} style={{ ...inputStyle(), paddingLeft: '36px' }} placeholder="0" disabled={processing} />
                                    </div>
                                    <button type="button" onClick={() => removeAddonOption(gIdx, oIdx)} style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'hsl(0 72% 94%)', color: 'hsl(0 72% 45%)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={() => addAddonOption(gIdx)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px dashed var(--border)', backgroundColor: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '12px', justifyContent: 'center' }}>
                                <Plus size={12} />
                                Tambah Opsi
                            </button>
                        </div>
                    </div>
                ))}
                <AddButton onClick={addAddonGroup} label="Tambah Grup Addon" />
            </div>
        </div>
    );
}

// ─── Create Modal ─────────────────────────────────────────
function CreatePackageModal({ onClose, categories, products, teamSlug }: { onClose: () => void; categories: Category[]; products: Product[]; teamSlug: string }) {
    const { data, setData, post, errors, processing, reset } = useForm<PackageFormData>({
        category_id: '',
        sku: '',
        name: '',
        description: '',
        base_price: '',
        is_active: true,
        items: [],
        addon_groups: [],
    });

    function submit() {
        post(buildUrl('/product-packages', teamSlug), {
            onSuccess: () => { reset(); onClose(); },
        });
    }

    return (
        <Modal onClose={onClose} maxWidth="640px">
            <ModalHeader icon={<Package size={20} />} title="Buat Paket Produk Baru" subtitle="Susun paket beserta isi dan opsi addon/substitusi" />
            <PackageFormFields data={data} errors={errors} setData={(k, v) => setData(k as any, v)} processing={processing} categories={categories} products={products} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }} disabled={processing}>Batal</button>
                <button onClick={submit} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: 'hsl(214 100% 50%)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }} disabled={processing}>{processing ? 'Menyimpan...' : 'Buat Paket'}</button>
            </div>
        </Modal>
    );
}

// ─── Edit Modal ───────────────────────────────────────────
function EditPackageModal({ pkg, onClose, categories, products, teamSlug }: { pkg: PackageData; onClose: () => void; categories: Category[]; products: Product[]; teamSlug: string }) {
    const { data, setData, put, errors, processing } = useForm<PackageFormData>({
        category_id: pkg.category_id?.toString() ?? '',
        sku: pkg.sku,
        name: pkg.name,
        description: pkg.description ?? '',
        base_price: pkg.base_price,
        is_active: pkg.is_active,
        items: pkg.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, note: i.note ?? '' })),
        addon_groups: pkg.addon_groups.map((g) => ({
            name: g.name,
            default_product_id: g.default_product_id,
            is_required: g.is_required,
            sort_order: g.sort_order,
            options: g.options.map((o) => ({ product_id: o.product_id, extra_charge: parseFloat(o.extra_charge), sort_order: o.sort_order })),
        })),
    });

    function submit() {
        put(buildUrl(`/product-packages/${pkg.id}`, teamSlug), { onSuccess: onClose });
    }

    return (
        <Modal onClose={onClose} maxWidth="640px">
            <ModalHeader icon={<Edit2 size={20} />} title="Edit Paket Produk" subtitle={`Perbarui informasi paket "${pkg.name}"`} />
            <PackageFormFields data={data} errors={errors} setData={(k, v) => setData(k as any, v)} processing={processing} categories={categories} products={products} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }} disabled={processing}>Batal</button>
                <button onClick={submit} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: 'hsl(214 100% 50%)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }} disabled={processing}>{processing ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
        </Modal>
    );
}

// ─── Delete Modal ─────────────────────────────────────────
function DeletePackageModal({ pkg, onClose, teamSlug }: { pkg: PackageData; onClose: () => void; teamSlug: string }) {
    const [deleting, setDeleting] = useState(false);

    function confirm() {
        setDeleting(true);
        router.delete(buildUrl(`/product-packages/${pkg.id}`, teamSlug), {
            onFinish: () => { setDeleting(false); onClose(); },
        });
    }

    return (
        <Modal onClose={onClose} maxWidth="380px">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'hsl(0 72% 94%)', color: 'hsl(0 72% 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <AlertCircle size={26} />
                </div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700 }}>Hapus Paket</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted-foreground)' }}>Aksi ini tidak dapat dibatalkan</p>
            </div>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', textAlign: 'center', color: 'var(--card-foreground)' }}>
                Hapus paket <strong>"{pkg.name}"</strong>? Semua item dan addon grup di dalamnya juga akan dihapus.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }} disabled={deleting}>Batal</button>
                <button onClick={confirm} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'hsl(0 72% 50%)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }} disabled={deleting}>{deleting ? 'Menghapus...' : 'Hapus Paket'}</button>
            </div>
        </Modal>
    );
}

// ─── Package Card (expanded detail) ──────────────────────
function PackageCard({ pkg, onEdit, onDelete, canUpdate, canDelete: canDel, teamSlug }: { pkg: PackageData; onEdit: () => void; onDelete: () => void; canUpdate: boolean; canDelete: boolean; teamSlug: string }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div style={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', overflow: 'hidden' }}>
            {/* Card Header */}
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'hsl(214 100% 95%)', color: 'hsl(214 100% 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Box size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--card-foreground)' }}>{pkg.name}</span>
                        <Badge color={pkg.is_active ? 'green' : 'default'}>{pkg.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                        {pkg.category && <Badge color="blue">{pkg.category.name}</Badge>}
                        {pkg.addon_groups.length > 0 && (
                            <Badge color="amber">
                                <Zap size={9} />
                                {pkg.addon_groups.length} addon grup
                            </Badge>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>{pkg.sku}</span>
                        <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{pkg.items_count} item produk</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'hsl(142 76% 30%)' }}>{formatCurrency(pkg.base_price)}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button onClick={() => setExpanded(!expanded)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        Detail
                    </button>
                    <Link href={buildUrl(`/product-packages/${pkg.id}/history`, teamSlug)} style={{ padding: '7px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', textDecoration: 'none' }} title="Riwayat">
                        <History size={14} />
                    </Link>
                    {canUpdate && (
                        <button onClick={onEdit} style={{ padding: '7px', borderRadius: '8px', border: 'none', backgroundColor: 'hsl(214 100% 95%)', color: 'hsl(214 100% 45%)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Edit2 size={14} />
                        </button>
                    )}
                    {canDel && (
                        <button onClick={onDelete} style={{ padding: '7px', borderRadius: '8px', border: 'none', backgroundColor: 'hsl(0 72% 94%)', color: 'hsl(0 72% 45%)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded Detail */}
            {expanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px', display: 'grid', gridTemplateColumns: pkg.addon_groups.length > 0 ? '1fr 1fr' : '1fr', gap: '16px' }}>
                    {/* Items */}
                    <div>
                        <p style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Isi Paket</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {pkg.items.map((item) => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', backgroundColor: 'var(--muted)' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'hsl(214 100% 50%)', minWidth: '24px', textAlign: 'center', backgroundColor: 'hsl(214 100% 95%)', borderRadius: '6px', padding: '2px 6px' }}>×{item.quantity}</span>
                                    <div>
                                        <span style={{ fontSize: '13px', color: 'var(--card-foreground)', fontWeight: 500 }}>{item.product.name}</span>
                                        {item.note && <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginLeft: '6px' }}>({item.note})</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Addon Groups */}
                    {pkg.addon_groups.length > 0 && (
                        <div>
                            <p style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Addon / Substitusi</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {pkg.addon_groups.map((group) => (
                                    <div key={group.id} style={{ borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                        <div style={{ padding: '7px 10px', backgroundColor: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Zap size={11} style={{ color: 'hsl(43 96% 40%)' }} />
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--card-foreground)' }}>{group.name}</span>
                                            {group.is_required && <Badge color="amber">Wajib</Badge>}
                                        </div>
                                        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {group.options.map((opt) => (
                                                <div key={opt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                                                    <span style={{ color: 'var(--card-foreground)' }}>{opt.product.name}</span>
                                                    <span style={{ color: opt.extra_charge === '0' || parseFloat(opt.extra_charge) === 0 ? 'hsl(142 76% 30%)' : 'hsl(0 72% 40%)', fontWeight: 600 }}>
                                                        {parseFloat(opt.extra_charge) === 0 ? 'Gratis' : `+${formatCurrency(opt.extra_charge)}`}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────
export default function ProductPackagesIndex({ packages, recentActivity, categories, products, teamSlug, canCreate, canUpdate, canDelete }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingPkg, setEditingPkg] = useState<PackageData | null>(null);
    const [deletingPkg, setDeletingPkg] = useState<PackageData | null>(null);
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const kw = search.trim().toLowerCase();
        if (!kw) return packages.data;
        return packages.data.filter((p) =>
            p.name.toLowerCase().includes(kw) ||
            p.sku.toLowerCase().includes(kw) ||
            p.category?.name.toLowerCase().includes(kw),
        );
    }, [packages.data, search]);

    return (
        <>
            <Head title="Paket Produk" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 700, color: 'var(--card-foreground)' }}>Paket Produk</h1>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted-foreground)' }}>
                            Kelola bundle / paket produk beserta opsi addon dan substitusi
                        </p>
                    </div>
                    {canCreate && (
                        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'hsl(214 100% 50%)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                            <Plus size={16} />
                            Buat Paket
                        </button>
                    )}
                </div>

                {/* Search */}
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                    <input type="text" placeholder="Cari paket berdasarkan nama, SKU, atau kategori..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', height: '40px', paddingLeft: '40px', paddingRight: '12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {/* Package List */}
                {filtered.length === 0 ? (
                    <div style={{ padding: '60px 16px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--muted-foreground)' }}>
                        <Box size={36} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
                        <p style={{ margin: '0 0 4px 0', fontWeight: 500, fontSize: '14px' }}>Tidak ada paket produk</p>
                        <p style={{ margin: 0, fontSize: '12px' }}>
                            {search ? 'Tidak ada paket yang cocok dengan pencarian.' : 'Mulai dengan membuat paket pertama Anda.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filtered.map((pkg) => (
                            <PackageCard key={pkg.id} pkg={pkg} onEdit={() => setEditingPkg(pkg)} onDelete={() => setDeletingPkg(pkg)} canUpdate={canUpdate} canDelete={canDelete} teamSlug={teamSlug} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {packages.last_page > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                        <span style={{ color: 'var(--muted-foreground)' }}>Menampilkan {packages.data.length} dari {packages.total} paket</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {packages.current_page > 1 && (
                                <button onClick={() => router.get(buildUrl(`/product-packages?page=${packages.current_page - 1}`, teamSlug))} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer', fontSize: '12px' }}>← Sebelumnya</button>
                            )}
                            {packages.current_page < packages.last_page && (
                                <button onClick={() => router.get(buildUrl(`/product-packages?page=${packages.current_page + 1}`, teamSlug))} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer', fontSize: '12px' }}>Selanjutnya →</button>
                            )}
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
                <div style={{ borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Riwayat Perubahan Paket</h2>
                    </div>
                    <div>
                        {recentActivity.length === 0 ? (
                            <p style={{ padding: '20px 16px', margin: 0, color: 'var(--muted-foreground)', fontSize: '13px' }}>Belum ada riwayat perubahan.</p>
                        ) : (
                            recentActivity.map((a) => (
                                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Badge color={activityColor(a.action)}>{activityLabel(a.action)}</Badge>
                                            <strong style={{ fontSize: '13px' }}>{a.subject_name ?? 'Paket'}</strong>
                                        </div>
                                        <div style={{ marginTop: '3px', color: 'var(--muted-foreground)', fontSize: '12px' }}>
                                            {a.note ?? '-'}{a.user?.name ? ` oleh ${a.user.name}` : ''}
                                        </div>
                                    </div>
                                    <div style={{ color: 'var(--muted-foreground)', fontSize: '12px', whiteSpace: 'nowrap' }}>{formatDate(a.created_at)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showCreate && <CreatePackageModal onClose={() => setShowCreate(false)} categories={categories} products={products} teamSlug={teamSlug} />}
            {editingPkg && <EditPackageModal pkg={editingPkg} onClose={() => setEditingPkg(null)} categories={categories} products={products} teamSlug={teamSlug} />}
            {deletingPkg && <DeletePackageModal pkg={deletingPkg} onClose={() => setDeletingPkg(null)} teamSlug={teamSlug} />}
        </>
    );
}