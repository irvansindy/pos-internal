import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    CalendarDays,
    ChevronDown,
    ChevronUp,
    Edit2,
    Gift,
    History,
    Plus,
    Search,
    ShoppingCart,
    Tag,
    Trash2,
    X,
    Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

// ─── Types ────────────────────────────────────────────────

interface Product {
    id: number;
    name: string;
    sku: string;
    price: string;
}

interface Trigger {
    id?: number;
    product_id: number;
    min_quantity: number;
}

interface Reward {
    id?: number;
    product_id: number;
    quantity: number;
    extra_charge: number;
}

interface PromotionData {
    id: number;
    name: string;
    description: string | null;
    type: 'bxgy';
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    triggers_count: number;
    rewards_count: number;
    triggers: Array<{
        id: number;
        product_id: number;
        min_quantity: number;
        product: Pick<Product, 'id' | 'name' | 'sku'>;
    }>;
    rewards: Array<{
        id: number;
        product_id: number;
        quantity: number;
        extra_charge: string;
        product: Pick<Product, 'id' | 'name' | 'sku'>;
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
    promotions: {
        data: PromotionData[];
        current_page: number;
        last_page: number;
        total: number;
    };
    recentActivity: RecentActivity[];
    products: Product[];
    teamSlug: string;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

interface FormData {
    name: string;
    description: string;
    type: 'bxgy';
    is_active: boolean;
    starts_at: string;
    ends_at: string;
    triggers: Trigger[];
    rewards: Reward[];
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

function formatDateShort(value: string | null): string {
    if (!value) return '∞';
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
        new Date(value),
    );
}

function activityLabel(action: RecentActivity['action']): string {
    return { created: 'Dibuat', updated: 'Diperbarui', deleted: 'Dihapus' }[
        action
    ];
}

function activityColor(
    action: RecentActivity['action'],
): 'green' | 'blue' | 'red' {
    return action === 'created'
        ? 'green'
        : action === 'deleted'
          ? 'red'
          : 'blue';
}

function promotionStatus(promo: PromotionData): {
    label: string;
    color: BadgeColor;
} {
    if (!promo.is_active) return { label: 'Nonaktif', color: 'default' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (promo.starts_at && new Date(promo.starts_at) > today) {
        return { label: 'Terjadwal', color: 'amber' };
    }

    if (promo.ends_at && new Date(promo.ends_at) < today) {
        return { label: 'Kedaluwarsa', color: 'red' };
    }

    return { label: 'Aktif', color: 'green' };
}

// ─── Shared UI ────────────────────────────────────────────

type BadgeColor = 'default' | 'blue' | 'green' | 'amber' | 'red' | 'purple';

const BADGE_COLORS: Record<BadgeColor, { bg: string; text: string }> = {
    default: { bg: 'var(--muted)', text: 'var(--muted-foreground)' },
    blue:    { bg: 'hsl(214 100% 95%)', text: 'hsl(214 100% 40%)' },
    green:   { bg: 'hsl(142 76% 92%)',  text: 'hsl(142 76% 30%)' },
    amber:   { bg: 'hsl(43 96% 92%)',   text: 'hsl(43 96% 30%)' },
    red:     { bg: 'hsl(0 72% 94%)',    text: 'hsl(0 72% 40%)' },
    purple:  { bg: 'hsl(270 60% 94%)',  text: 'hsl(270 60% 40%)' },
};

function Badge({
    children,
    color = 'default',
}: {
    children: React.ReactNode;
    color?: BadgeColor;
}) {
    const c = BADGE_COLORS[color];
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
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </span>
    );
}

function Modal({
    onClose,
    children,
    maxWidth = '580px',
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
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '24px 16px',
                overflowY: 'auto',
            }}
        >
            <div
                style={{
                    position: 'fixed',
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
                    maxWidth,
                    borderRadius: '16px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
                    padding: '28px',
                    marginTop: '20px',
                    marginBottom: '20px',
                }}
            >
                {children}
            </div>
        </div>
    );
}

function ModalHeader({
    icon,
    title,
    subtitle,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px',
            }}
        >
            <div
                style={{
                    height: '44px',
                    width: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'hsl(270 60% 94%)',
                    color: 'hsl(270 60% 40%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                {icon}
            </div>
            <div>
                <h3
                    style={{
                        margin: '0 0 2px 0',
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--card-foreground)',
                    }}
                >
                    {title}
                </h3>
                <p
                    style={{
                        margin: 0,
                        fontSize: '12px',
                        color: 'var(--muted-foreground)',
                    }}
                >
                    {subtitle}
                </p>
            </div>
        </div>
    );
}

function Field({
    label,
    error,
    optional,
    hint,
    children,
}: {
    label: string;
    error?: string;
    optional?: boolean;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label
                style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--card-foreground)',
                    marginBottom: '5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                }}
            >
                {label}
                {optional && (
                    <span
                        style={{
                            color: 'var(--muted-foreground)',
                            fontWeight: 400,
                            marginLeft: '4px',
                            textTransform: 'none',
                        }}
                    >
                        (opsional)
                    </span>
                )}
                {!optional && (
                    <span style={{ color: 'hsl(0 72% 50%)', marginLeft: '2px' }}>
                        *
                    </span>
                )}
            </label>
            {children}
            {hint && !error && (
                <p
                    style={{
                        fontSize: '11px',
                        color: 'var(--muted-foreground)',
                        marginTop: '3px',
                    }}
                >
                    {hint}
                </p>
            )}
            {error && (
                <p
                    style={{
                        fontSize: '11px',
                        color: 'hsl(0 72% 50%)',
                        marginTop: '3px',
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
    border: hasError
        ? '1px solid hsl(0 72% 50%)'
        : '1px solid var(--border)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: '13px',
    padding: '0 10px',
    outline: 'none',
    boxSizing: 'border-box',
});

function SectionDivider({ label }: { label: string }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: '4px 0',
            }}
        >
            <div
                style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}
            />
            <span
                style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--muted-foreground)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
            </span>
            <div
                style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}
            />
        </div>
    );
}

function AddRowButton({
    onClick,
    label,
}: {
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px dashed var(--border)',
                backgroundColor: 'transparent',
                color: 'hsl(270 60% 45%)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                width: '100%',
                justifyContent: 'center',
            }}
        >
            <Plus size={13} />
            {label}
        </button>
    );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'hsl(0 72% 94%)',
                color: 'hsl(0 72% 45%)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
            }}
        >
            <X size={14} />
        </button>
    );
}

// ─── Promotion Form Fields (shared Create & Edit) ─────────

function PromotionFormFields({
    data,
    errors,
    setData,
    processing,
    products,
}: {
    data: FormData;
    errors: Partial<Record<string, string>>;
    setData: (key: string, value: any) => void;
    processing: boolean;
    products: Product[];
}) {
    // ── Trigger helpers ────────────────────────────────────
    function addTrigger() {
        setData('triggers', [
            ...data.triggers,
            { product_id: 0, min_quantity: 1 },
        ]);
    }

    function removeTrigger(idx: number) {
        setData(
            'triggers',
            data.triggers.filter((_, i) => i !== idx),
        );
    }

    function updateTrigger(idx: number, field: keyof Trigger, value: any) {
        setData(
            'triggers',
            data.triggers.map((t, i) =>
                i === idx ? { ...t, [field]: value } : t,
            ),
        );
    }

    // ── Reward helpers ─────────────────────────────────────
    function addReward() {
        setData('rewards', [
            ...data.rewards,
            { product_id: 0, quantity: 1, extra_charge: 0 },
        ]);
    }

    function removeReward(idx: number) {
        setData(
            'rewards',
            data.rewards.filter((_, i) => i !== idx),
        );
    }

    function updateReward(idx: number, field: keyof Reward, value: any) {
        setData(
            'rewards',
            data.rewards.map((r, i) =>
                i === idx ? { ...r, [field]: value } : r,
            ),
        );
    }

    const err = errors as Record<string, string>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Basic info */}
            <Field label="Nama Promosi" error={err['name']}>
                <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="Beli Ayam 2 Gratis 1"
                    autoFocus
                    style={inputStyle(!!err['name'])}
                    disabled={processing}
                />
            </Field>

            <Field label="Deskripsi" optional>
                <textarea
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Keterangan promosi (opsional)"
                    disabled={processing}
                    style={{
                        ...inputStyle(),
                        height: 'auto',
                        minHeight: '60px',
                        padding: '8px 10px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                    }}
                />
            </Field>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                }}
            >
                <Field
                    label="Berlaku Mulai"
                    optional
                    hint="Kosongkan jika tidak dibatasi tanggal mulai"
                >
                    <input
                        type="date"
                        value={data.starts_at}
                        onChange={(e) => setData('starts_at', e.target.value)}
                        style={inputStyle(!!err['starts_at'])}
                        disabled={processing}
                    />
                    {err['starts_at'] && (
                        <p
                            style={{
                                fontSize: '11px',
                                color: 'hsl(0 72% 50%)',
                                marginTop: '3px',
                            }}
                        >
                            {err['starts_at']}
                        </p>
                    )}
                </Field>

                <Field
                    label="Berlaku Sampai"
                    optional
                    hint="Kosongkan jika tidak dibatasi tanggal akhir"
                >
                    <input
                        type="date"
                        value={data.ends_at}
                        onChange={(e) => setData('ends_at', e.target.value)}
                        style={inputStyle(!!err['ends_at'])}
                        disabled={processing}
                    />
                    {err['ends_at'] && (
                        <p
                            style={{
                                fontSize: '11px',
                                color: 'hsl(0 72% 50%)',
                                marginTop: '3px',
                            }}
                        >
                            {err['ends_at']}
                        </p>
                    )}
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
                    id="promo_is_active"
                    checked={data.is_active}
                    onChange={(e) => setData('is_active', e.target.checked)}
                    style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                    disabled={processing}
                />
                <label
                    htmlFor="promo_is_active"
                    style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        margin: 0,
                        color: 'var(--card-foreground)',
                    }}
                >
                    Aktifkan promosi ini
                </label>
            </div>

            {/* Triggers */}
            <SectionDivider label="Syarat Pembelian (Jika Beli...)" />

            {err['triggers'] && (
                <p
                    style={{
                        fontSize: '12px',
                        color: 'hsl(0 72% 50%)',
                        margin: '-8px 0 0 0',
                    }}
                >
                    {err['triggers']}
                </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.triggers.length === 0 && (
                    <p
                        style={{
                            fontSize: '12px',
                            color: 'var(--muted-foreground)',
                            textAlign: 'center',
                            padding: '12px',
                            border: '1px dashed var(--border)',
                            borderRadius: '8px',
                        }}
                    >
                        Belum ada syarat. Tambahkan produk yang harus dibeli.
                    </p>
                )}

                {data.triggers.map((trigger, idx) => (
                    <div
                        key={idx}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 110px auto',
                            gap: '8px',
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--background)',
                        }}
                    >
                        <div>
                            <select
                                value={trigger.product_id || ''}
                                onChange={(e) =>
                                    updateTrigger(
                                        idx,
                                        'product_id',
                                        Number(e.target.value),
                                    )
                                }
                                style={inputStyle(
                                    !!err[`triggers.${idx}.product_id`],
                                )}
                                disabled={processing}
                            >
                                <option value="">-- Pilih Produk --</option>
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.sku})
                                    </option>
                                ))}
                            </select>
                            {err[`triggers.${idx}.product_id`] && (
                                <p
                                    style={{
                                        fontSize: '11px',
                                        color: 'hsl(0 72% 50%)',
                                        marginTop: '3px',
                                    }}
                                >
                                    {err[`triggers.${idx}.product_id`]}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    fontSize: '10px',
                                    color: 'var(--muted-foreground)',
                                    fontWeight: 600,
                                    marginBottom: '4px',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Min. Beli
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={trigger.min_quantity}
                                onChange={(e) =>
                                    updateTrigger(
                                        idx,
                                        'min_quantity',
                                        Number(e.target.value),
                                    )
                                }
                                style={inputStyle(
                                    !!err[`triggers.${idx}.min_quantity`],
                                )}
                                disabled={processing}
                            />
                        </div>

                        <RemoveButton onClick={() => removeTrigger(idx)} />
                    </div>
                ))}

                <AddRowButton
                    onClick={addTrigger}
                    label="Tambah Syarat Produk"
                />
            </div>

            {/* Rewards */}
            <SectionDivider label="Hadiah yang Didapat (Maka Dapat...)" />

            {err['rewards'] && (
                <p
                    style={{
                        fontSize: '12px',
                        color: 'hsl(0 72% 50%)',
                        margin: '-8px 0 0 0',
                    }}
                >
                    {err['rewards']}
                </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.rewards.length === 0 && (
                    <p
                        style={{
                            fontSize: '12px',
                            color: 'var(--muted-foreground)',
                            textAlign: 'center',
                            padding: '12px',
                            border: '1px dashed var(--border)',
                            borderRadius: '8px',
                        }}
                    >
                        Belum ada hadiah. Tambahkan produk yang akan diberikan.
                    </p>
                )}

                {data.rewards.map((reward, idx) => (
                    <div
                        key={idx}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 90px 130px auto',
                            gap: '8px',
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid hsl(142 76% 85%)',
                            backgroundColor: 'hsl(142 76% 97%)',
                        }}
                    >
                        <div>
                            <select
                                value={reward.product_id || ''}
                                onChange={(e) =>
                                    updateReward(
                                        idx,
                                        'product_id',
                                        Number(e.target.value),
                                    )
                                }
                                style={{
                                    ...inputStyle(
                                        !!err[`rewards.${idx}.product_id`],
                                    ),
                                    backgroundColor: 'var(--background)',
                                }}
                                disabled={processing}
                            >
                                <option value="">-- Produk Hadiah --</option>
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.sku})
                                    </option>
                                ))}
                            </select>
                            {err[`rewards.${idx}.product_id`] && (
                                <p
                                    style={{
                                        fontSize: '11px',
                                        color: 'hsl(0 72% 50%)',
                                        marginTop: '3px',
                                    }}
                                >
                                    {err[`rewards.${idx}.product_id`]}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    fontSize: '10px',
                                    color: 'var(--muted-foreground)',
                                    fontWeight: 600,
                                    marginBottom: '4px',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Jumlah
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={reward.quantity}
                                onChange={(e) =>
                                    updateReward(
                                        idx,
                                        'quantity',
                                        Number(e.target.value),
                                    )
                                }
                                style={{
                                    ...inputStyle(
                                        !!err[`rewards.${idx}.quantity`],
                                    ),
                                    backgroundColor: 'var(--background)',
                                }}
                                disabled={processing}
                            />
                        </div>

                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    fontSize: '10px',
                                    color: 'var(--muted-foreground)',
                                    fontWeight: 600,
                                    marginBottom: '4px',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Biaya Tambahan
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span
                                    style={{
                                        position: 'absolute',
                                        left: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: '11px',
                                        color: 'var(--muted-foreground)',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    Rp
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    value={reward.extra_charge}
                                    onChange={(e) =>
                                        updateReward(
                                            idx,
                                            'extra_charge',
                                            Number(e.target.value),
                                        )
                                    }
                                    placeholder="0 = gratis"
                                    style={{
                                        ...inputStyle(
                                            !!err[`rewards.${idx}.extra_charge`],
                                        ),
                                        paddingLeft: '28px',
                                        backgroundColor: 'var(--background)',
                                    }}
                                    disabled={processing}
                                />
                            </div>
                            {err[`rewards.${idx}.extra_charge`] && (
                                <p
                                    style={{
                                        fontSize: '11px',
                                        color: 'hsl(0 72% 50%)',
                                        marginTop: '3px',
                                    }}
                                >
                                    {err[`rewards.${idx}.extra_charge`]}
                                </p>
                            )}
                        </div>

                        <RemoveButton onClick={() => removeReward(idx)} />
                    </div>
                ))}

                <AddRowButton onClick={addReward} label="Tambah Hadiah" />
            </div>
        </div>
    );
}

// ─── Create Modal ─────────────────────────────────────────

function CreatePromotionModal({
    onClose,
    products,
    teamSlug,
}: {
    onClose: () => void;
    products: Product[];
    teamSlug: string;
}) {
    const { data, setData, post, errors, processing, reset } =
        useForm<FormData>({
            name: '',
            description: '',
            type: 'bxgy',
            is_active: true,
            starts_at: '',
            ends_at: '',
            triggers: [],
            rewards: [],
        });

    function submit() {
        post(buildUrl('/product-promotions', teamSlug), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    }

    return (
        <Modal onClose={onClose} maxWidth="620px">
            <ModalHeader
                icon={<Zap size={20} />}
                title="Buat Promosi Baru"
                subtitle='Atur syarat pembelian dan hadiah otomatis (Buy X Get Y)'
            />
            <PromotionFormFields
                data={data}
                errors={errors}
                setData={(k, v) => setData(k as any, v)}
                processing={processing}
                products={products}
            />
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'flex-end',
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border)',
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        padding: '9px 18px',
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
                        padding: '9px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'hsl(270 60% 50%)',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                    }}
                    disabled={processing}
                >
                    {processing ? 'Menyimpan...' : 'Buat Promosi'}
                </button>
            </div>
        </Modal>
    );
}

// ─── Edit Modal ───────────────────────────────────────────

function EditPromotionModal({
    promotion,
    onClose,
    products,
    teamSlug,
}: {
    promotion: PromotionData;
    onClose: () => void;
    products: Product[];
    teamSlug: string;
}) {
    const { data, setData, put, errors, processing } = useForm<FormData>({
        name: promotion.name,
        description: promotion.description ?? '',
        type: promotion.type,
        is_active: promotion.is_active,
        starts_at: promotion.starts_at ?? '',
        ends_at: promotion.ends_at ?? '',
        triggers: promotion.triggers.map((t) => ({
            product_id: t.product_id,
            min_quantity: t.min_quantity,
        })),
        rewards: promotion.rewards.map((r) => ({
            product_id: r.product_id,
            quantity: r.quantity,
            extra_charge: parseFloat(r.extra_charge),
        })),
    });

    function submit() {
        put(buildUrl(`/product-promotions/${promotion.id}`, teamSlug), {
            onSuccess: onClose,
        });
    }

    return (
        <Modal onClose={onClose} maxWidth="620px">
            <ModalHeader
                icon={<Edit2 size={20} />}
                title="Edit Promosi"
                subtitle={`Perbarui promosi "${promotion.name}"`}
            />
            <PromotionFormFields
                data={data}
                errors={errors}
                setData={(k, v) => setData(k as any, v)}
                processing={processing}
                products={products}
            />
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'flex-end',
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border)',
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        padding: '9px 18px',
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
                        padding: '9px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'hsl(270 60% 50%)',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                    }}
                    disabled={processing}
                >
                    {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
            </div>
        </Modal>
    );
}

// ─── Delete Modal ─────────────────────────────────────────

function DeletePromotionModal({
    promotion,
    onClose,
    teamSlug,
}: {
    promotion: PromotionData;
    onClose: () => void;
    teamSlug: string;
}) {
    const [deleting, setDeleting] = useState(false);

    function confirm() {
        setDeleting(true);
        router.delete(
            buildUrl(`/product-promotions/${promotion.id}`, teamSlug),
            {
                onFinish: () => {
                    setDeleting(false);
                    onClose();
                },
            },
        );
    }

    return (
        <Modal onClose={onClose} maxWidth="380px">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
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
                        margin: '0 auto 12px',
                    }}
                >
                    <AlertCircle size={26} />
                </div>
                <h3
                    style={{
                        margin: '0 0 4px 0',
                        fontSize: '16px',
                        fontWeight: 700,
                    }}
                >
                    Hapus Promosi
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
                    margin: '0 0 20px 0',
                    fontSize: '13px',
                    textAlign: 'center',
                    color: 'var(--card-foreground)',
                }}
            >
                Hapus promosi <strong>"{promotion.name}"</strong>? Semua syarat
                dan hadiah di dalamnya juga akan dihapus.
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
                        fontWeight: 600,
                    }}
                    disabled={deleting}
                >
                    {deleting ? 'Menghapus...' : 'Hapus Promosi'}
                </button>
            </div>
        </Modal>
    );
}

// ─── Promotion Card ───────────────────────────────────────

function PromotionCard({
    promotion,
    onEdit,
    onDelete,
    canUpdate,
    canDelete,
    teamSlug,
}: {
    promotion: PromotionData;
    onEdit: () => void;
    onDelete: () => void;
    canUpdate: boolean;
    canDelete: boolean;
    teamSlug: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const status = promotionStatus(promotion);

    return (
        <div
            style={{
                borderRadius: '12px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}
            >
                {/* Icon */}
                <div
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: 'hsl(270 60% 94%)',
                        color: 'hsl(270 60% 40%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <Tag size={18} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                        }}
                    >
                        <span
                            style={{
                                fontWeight: 700,
                                fontSize: '14px',
                                color: 'var(--card-foreground)',
                            }}
                        >
                            {promotion.name}
                        </span>
                        <Badge color={status.color}>{status.label}</Badge>
                        <Badge color="purple">Buy X Get Y</Badge>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            gap: '12px',
                            marginTop: '4px',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                        }}
                    >
                        <span
                            style={{
                                fontSize: '12px',
                                color: 'var(--muted-foreground)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <ShoppingCart size={11} />
                            {promotion.triggers_count} syarat beli
                        </span>
                        <span
                            style={{
                                fontSize: '12px',
                                color: 'var(--muted-foreground)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <Gift size={11} />
                            {promotion.rewards_count} hadiah
                        </span>
                        {(promotion.starts_at || promotion.ends_at) && (
                            <span
                                style={{
                                    fontSize: '12px',
                                    color: 'var(--muted-foreground)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}
                            >
                                <CalendarDays size={11} />
                                {formatDateShort(promotion.starts_at)} —{' '}
                                {formatDateShort(promotion.ends_at)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div
                    style={{
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center',
                        flexShrink: 0,
                    }}
                >
                    <button
                        onClick={() => setExpanded(!expanded)}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--background)',
                            color: 'var(--foreground)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12px',
                        }}
                    >
                        {expanded ? (
                            <ChevronUp size={14} />
                        ) : (
                            <ChevronDown size={14} />
                        )}
                        Detail
                    </button>

                    <Link
                        href={buildUrl(
                            `/product-promotions/${promotion.id}/history`,
                            teamSlug,
                        )}
                        style={{
                            padding: '7px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'var(--muted)',
                            color: 'var(--muted-foreground)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            textDecoration: 'none',
                        }}
                        title="Riwayat"
                    >
                        <History size={14} />
                    </Link>

                    {canUpdate && (
                        <button
                            onClick={onEdit}
                            style={{
                                padding: '7px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'hsl(270 60% 94%)',
                                color: 'hsl(270 60% 40%)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <Edit2 size={14} />
                        </button>
                    )}

                    {canDelete && (
                        <button
                            onClick={onDelete}
                            style={{
                                padding: '7px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'hsl(0 72% 94%)',
                                color: 'hsl(0 72% 45%)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded Detail */}
            {expanded && (
                <div
                    style={{
                        borderTop: '1px solid var(--border)',
                        padding: '16px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                    }}
                >
                    {/* Triggers */}
                    <div>
                        <p
                            style={{
                                margin: '0 0 10px 0',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: 'var(--muted-foreground)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                            }}
                        >
                            <ShoppingCart size={12} />
                            Jika Membeli
                        </p>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                            }}
                        >
                            {promotion.triggers.map((trigger) => (
                                <div
                                    key={trigger.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--muted)',
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: 'hsl(214 100% 45%)',
                                            backgroundColor:
                                                'hsl(214 100% 95%)',
                                            borderRadius: '6px',
                                            padding: '2px 7px',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        min. {trigger.min_quantity} pcs
                                    </span>
                                    <div>
                                        <div
                                            style={{
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                color: 'var(--card-foreground)',
                                            }}
                                        >
                                            {trigger.product.name}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: 'var(--muted-foreground)',
                                                fontFamily: 'monospace',
                                            }}
                                        >
                                            {trigger.product.sku}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rewards */}
                    <div>
                        <p
                            style={{
                                margin: '0 0 10px 0',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: 'var(--muted-foreground)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                            }}
                        >
                            <Gift size={12} />
                            Maka Mendapatkan
                        </p>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                            }}
                        >
                            {promotion.rewards.map((reward) => {
                                const isFree =
                                    parseFloat(reward.extra_charge) === 0;
                                return (
                                    <div
                                        key={reward.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 10px',
                                            borderRadius: '8px',
                                            backgroundColor: isFree
                                                ? 'hsl(142 76% 95%)'
                                                : 'hsl(43 96% 95%)',
                                            border: `1px solid ${isFree ? 'hsl(142 76% 85%)' : 'hsl(43 96% 80%)'}`,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                color: isFree
                                                    ? 'hsl(142 76% 30%)'
                                                    : 'hsl(43 96% 30%)',
                                                backgroundColor: isFree
                                                    ? 'hsl(142 76% 88%)'
                                                    : 'hsl(43 96% 88%)',
                                                borderRadius: '6px',
                                                padding: '2px 7px',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {reward.quantity} pcs
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    color: 'var(--card-foreground)',
                                                }}
                                            >
                                                {reward.product.name}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '11px',
                                                    fontFamily: 'monospace',
                                                    color: 'var(--muted-foreground)',
                                                }}
                                            >
                                                {reward.product.sku}
                                            </div>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                color: isFree
                                                    ? 'hsl(142 76% 30%)'
                                                    : 'hsl(43 96% 30%)',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {isFree
                                                ? 'GRATIS'
                                                : `+${formatCurrency(reward.extra_charge)}`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Description */}
                    {promotion.description && (
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '13px',
                                    color: 'var(--muted-foreground)',
                                    fontStyle: 'italic',
                                    paddingTop: '8px',
                                    borderTop: '1px solid var(--border)',
                                }}
                            >
                                {promotion.description}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────

export default function ProductPromotionsIndex({
    promotions,
    recentActivity,
    products,
    teamSlug,
    canCreate,
    canUpdate,
    canDelete,
}: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editingPromo, setEditingPromo] = useState<PromotionData | null>(
        null,
    );
    const [deletingPromo, setDeletingPromo] = useState<PromotionData | null>(
        null,
    );
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const kw = search.trim().toLowerCase();
        if (!kw) return promotions.data;
        return promotions.data.filter((p) =>
            p.name.toLowerCase().includes(kw),
        );
    }, [promotions.data, search]);

    return (
        <>
            <Head title="Promosi Produk" />

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
                            Promosi Produk
                        </h1>
                        <p
                            style={{
                                margin: 0,
                                fontSize: '13px',
                                color: 'var(--muted-foreground)',
                            }}
                        >
                            Kelola promosi Buy X Get Y — beli sejumlah produk
                            dan dapatkan hadiah otomatis
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
                                backgroundColor: 'hsl(270 60% 50%)',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                            }}
                        >
                            <Plus size={16} />
                            Buat Promosi
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
                        placeholder="Cari promosi berdasarkan nama..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            height: '40px',
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

                {/* Promotion List */}
                {filtered.length === 0 ? (
                    <div
                        style={{
                            padding: '60px 16px',
                            textAlign: 'center',
                            border: '1px dashed var(--border)',
                            borderRadius: '12px',
                            color: 'var(--muted-foreground)',
                        }}
                    >
                        <Tag
                            size={36}
                            style={{ opacity: 0.4, margin: '0 auto 12px' }}
                        />
                        <p
                            style={{
                                margin: '0 0 4px 0',
                                fontWeight: 500,
                                fontSize: '14px',
                            }}
                        >
                            Tidak ada promosi
                        </p>
                        <p style={{ margin: 0, fontSize: '12px' }}>
                            {search
                                ? 'Tidak ada promosi yang cocok dengan pencarian.'
                                : 'Mulai dengan membuat promosi pertama Anda.'}
                        </p>
                    </div>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                        }}
                    >
                        {filtered.map((promo) => (
                            <PromotionCard
                                key={promo.id}
                                promotion={promo}
                                onEdit={() => setEditingPromo(promo)}
                                onDelete={() => setDeletingPromo(promo)}
                                canUpdate={canUpdate}
                                canDelete={canDelete}
                                teamSlug={teamSlug}
                            />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {promotions.last_page > 1 && (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '13px',
                        }}
                    >
                        <span style={{ color: 'var(--muted-foreground)' }}>
                            Menampilkan {promotions.data.length} dari{' '}
                            {promotions.total} promosi
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {promotions.current_page > 1 && (
                                <button
                                    onClick={() =>
                                        router.get(
                                            buildUrl(
                                                `/product-promotions?page=${promotions.current_page - 1}`,
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
                                    }}
                                >
                                    ← Sebelumnya
                                </button>
                            )}
                            {promotions.current_page <
                                promotions.last_page && (
                                <button
                                    onClick={() =>
                                        router.get(
                                            buildUrl(
                                                `/product-promotions?page=${promotions.current_page + 1}`,
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
                                    }}
                                >
                                    Selanjutnya →
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
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
                            padding: '14px 16px',
                            borderBottom: '1px solid var(--border)',
                        }}
                    >
                        <h2
                            style={{
                                margin: 0,
                                fontSize: '14px',
                                fontWeight: 700,
                            }}
                        >
                            Riwayat Perubahan Promosi
                        </h2>
                    </div>
                    <div>
                        {recentActivity.length === 0 ? (
                            <p
                                style={{
                                    padding: '20px 16px',
                                    margin: 0,
                                    color: 'var(--muted-foreground)',
                                    fontSize: '13px',
                                }}
                            >
                                Belum ada riwayat perubahan.
                            </p>
                        ) : (
                            recentActivity.map((a) => (
                                <div
                                    key={a.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        gap: '16px',
                                        padding: '11px 16px',
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
                                                color={activityColor(a.action)}
                                            >
                                                {activityLabel(a.action)}
                                            </Badge>
                                            <strong style={{ fontSize: '13px' }}>
                                                {a.subject_name ?? 'Promosi'}
                                            </strong>
                                        </div>
                                        <div
                                            style={{
                                                marginTop: '3px',
                                                color: 'var(--muted-foreground)',
                                                fontSize: '12px',
                                            }}
                                        >
                                            {a.note ?? '-'}
                                            {a.user?.name
                                                ? ` oleh ${a.user.name}`
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
                                        {formatDate(a.created_at)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showCreate && (
                <CreatePromotionModal
                    onClose={() => setShowCreate(false)}
                    products={products}
                    teamSlug={teamSlug}
                />
            )}
            {editingPromo && (
                <EditPromotionModal
                    promotion={editingPromo}
                    onClose={() => setEditingPromo(null)}
                    products={products}
                    teamSlug={teamSlug}
                />
            )}
            {deletingPromo && (
                <DeletePromotionModal
                    promotion={deletingPromo}
                    onClose={() => setDeletingPromo(null)}
                    teamSlug={teamSlug}
                />
            )}
        </>
    );
}