import { Head, router } from '@inertiajs/react';
import { Edit2, Plus, Search, Ticket, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Voucher {
    id: number;
    code: string;
    name: string;
    type: string;
    value: string;
    min_purchase: string;
    max_discount: string | null;
    usage_limit: number | null;
    used_count: number;
    starts_at: string | null;
    expires_at: string | null;
    is_active: boolean;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PageProps {
    vouchers: { data: Voucher[]; links: PaginationLink[] };
    filters: { search: string; type: string; status: string };
    summary: {
        total: number;
        active: number;
        used: number;
        transactions: number;
    };
    teamSlug: string;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

interface VoucherForm {
    code: string;
    name: string;
    type: string;
    value: string;
    min_purchase: string;
    max_discount: string;
    usage_limit: string;
    starts_at: string;
    expires_at: string;
    is_active: boolean;
}

const defaultForm = (): VoucherForm => ({
    code: '',
    name: '',
    type: 'fixed',
    value: '',
    min_purchase: '0',
    max_discount: '',
    usage_limit: '',
    starts_at: '',
    expires_at: '',
    is_active: true,
});

function currency(value: string | number | null): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));
}

function buildUrl(teamSlug: string, path: string): string {
    return `/${teamSlug}${path}`;
}

function dateValue(value: string | null): string {
    return value ? value.slice(0, 10) : '';
}

function discountLabel(voucher: Voucher): string {
    if (voucher.type === 'percent') {
        return `${Number(voucher.value)}%`;
    }

    return currency(voucher.value);
}

function VoucherModal({
    open,
    onClose,
    teamSlug,
    editing,
}: {
    open: boolean;
    onClose: () => void;
    teamSlug: string;
    editing: Voucher | null;
}) {
    const [form, setForm] = useState<VoucherForm>(defaultForm());

    useEffect(() => {
        if (!open) {
            return;
        }

        if (!editing) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setForm(defaultForm());

            return;
        }

        setForm({
            code: editing.code,
            name: editing.name,
            type: editing.type,
            value: editing.value,
            min_purchase: editing.min_purchase,
            max_discount: editing.max_discount ?? '',
            usage_limit: editing.usage_limit ? String(editing.usage_limit) : '',
            starts_at: dateValue(editing.starts_at),
            expires_at: dateValue(editing.expires_at),
            is_active: editing.is_active,
        });
    }, [editing, open]);

    if (!open) {
        return null;
    }

    const submit = () => {
        const payload = {
            ...form,
            max_discount: form.max_discount || null,
            usage_limit: form.usage_limit || null,
            starts_at: form.starts_at || null,
            expires_at: form.expires_at || null,
        };

        if (editing) {
            router.put(buildUrl(teamSlug, `/vouchers/${editing.id}`), payload, {
                preserveScroll: true,
                onSuccess: onClose,
            });

            return;
        }

        router.post(buildUrl(teamSlug, '/vouchers'), payload, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/30 px-4 py-8">
            <div className="mx-auto flex h-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <p className="text-sm font-medium text-slate-500">
                            {editing ? 'Edit voucher' : 'Voucher diskon'}
                        </p>
                        <h2 className="text-lg font-semibold text-slate-900">
                            {editing ? 'Perbarui voucher' : 'Buat voucher baru'}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Kode
                            <input
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase outline-none"
                                value={form.code}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        code: event.target.value.toUpperCase(),
                                    }))
                                }
                                placeholder="HEMAT10"
                            />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Nama voucher
                            <input
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.name}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                                placeholder="Diskon pelanggan loyal"
                            />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Tipe
                            <select
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.type}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        type: event.target.value,
                                    }))
                                }
                            >
                                <option value="fixed">Nominal</option>
                                <option value="percent">Persen</option>
                            </select>
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Nilai diskon
                            <input
                                type="number"
                                min="0"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.value}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        value: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Minimal belanja
                            <input
                                type="number"
                                min="0"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.min_purchase}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        min_purchase: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Maksimal diskon
                            <input
                                type="number"
                                min="0"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.max_discount}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        max_discount: event.target.value,
                                    }))
                                }
                                placeholder="Opsional"
                            />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Batas penggunaan
                            <input
                                type="number"
                                min="1"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.usage_limit}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        usage_limit: event.target.value,
                                    }))
                                }
                                placeholder="Tanpa batas"
                            />
                        </label>
                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        is_active: event.target.checked,
                                    }))
                                }
                            />
                            Voucher aktif
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Mulai
                            <input
                                type="date"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.starts_at}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        starts_at: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Berakhir
                            <input
                                type="date"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.expires_at}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        expires_at: event.target.value,
                                    }))
                                }
                            />
                        </label>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        {editing ? 'Simpan perubahan' : 'Simpan voucher'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function VouchersIndex(props: PageProps) {
    const [filters, setFilters] = useState(props.filters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Voucher | null>(null);

    const applyFilters = () => {
        router.get(buildUrl(props.teamSlug, '/vouchers'), filters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        const next = { search: '', type: '', status: '' };
        setFilters(next);
        router.get(buildUrl(props.teamSlug, '/vouchers'), next, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const openCreate = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (voucher: Voucher) => {
        setEditing(voucher);
        setModalOpen(true);
    };

    const destroy = (voucher: Voucher) => {
        if (!window.confirm(`Hapus voucher ${voucher.code}?`)) {
            return;
        }

        router.delete(buildUrl(props.teamSlug, `/vouchers/${voucher.id}`), {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Voucher Diskon" />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">
                            Modul transaksi tim
                        </p>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Voucher Diskon
                        </h1>
                    </div>

                    {props.canCreate && (
                        <button
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            <Plus className="h-4 w-4" />
                            Tambah voucher
                        </button>
                    )}
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Summary
                        label="Total voucher"
                        value={props.summary.total}
                    />
                    <Summary
                        label="Aktif"
                        value={props.summary.active}
                        tone="text-emerald-600"
                    />
                    <Summary
                        label="Dipakai"
                        value={props.summary.used}
                        tone="text-amber-600"
                    />
                    <Summary
                        label="Transaksi voucher"
                        value={props.summary.transactions}
                    />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="flex min-w-[240px] flex-1 flex-col gap-2 text-sm text-slate-700">
                            Cari voucher
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                                <Search className="h-4 w-4 text-slate-400" />
                                <input
                                    className="w-full border-0 bg-transparent p-0 text-sm outline-none"
                                    value={filters.search}
                                    onChange={(event) =>
                                        setFilters((current) => ({
                                            ...current,
                                            search: event.target.value,
                                        }))
                                    }
                                    placeholder="Kode atau nama voucher"
                                />
                            </div>
                        </label>
                        <label className="flex min-w-[160px] flex-col gap-2 text-sm text-slate-700">
                            Tipe
                            <select
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={filters.type}
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        type: event.target.value,
                                    }))
                                }
                            >
                                <option value="">Semua</option>
                                <option value="fixed">Nominal</option>
                                <option value="percent">Persen</option>
                            </select>
                        </label>
                        <label className="flex min-w-[160px] flex-col gap-2 text-sm text-slate-700">
                            Status
                            <select
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={filters.status}
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        status: event.target.value,
                                    }))
                                }
                            >
                                <option value="">Semua</option>
                                <option value="active">Aktif</option>
                                <option value="inactive">Nonaktif</option>
                            </select>
                        </label>
                        <div className="flex flex-wrap gap-2 pt-6">
                            <button
                                type="button"
                                onClick={applyFilters}
                                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Terapkan
                            </button>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {props.vouchers.data.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                        <Ticket className="mx-auto h-8 w-8 text-slate-400" />
                        <p className="mt-3 text-lg font-semibold text-slate-900">
                            Belum ada voucher
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                            Voucher POS akan muncul setelah dibuat.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Voucher
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Diskon
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Syarat
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Pemakaian
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Status
                                        </th>
                                        {(props.canUpdate ||
                                            props.canDelete) && (
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">
                                                Aksi
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {props.vouchers.data.map((voucher) => (
                                        <tr
                                            key={voucher.id}
                                            className="align-top"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-slate-900">
                                                    {voucher.code}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {voucher.name}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                <p className="font-semibold text-slate-900">
                                                    {discountLabel(voucher)}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {voucher.type === 'percent'
                                                        ? 'Persen'
                                                        : 'Nominal'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                <p>
                                                    Min.{' '}
                                                    {currency(
                                                        voucher.min_purchase,
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Maks.{' '}
                                                    {voucher.max_discount
                                                        ? currency(
                                                              voucher.max_discount,
                                                          )
                                                        : '-'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                <p>
                                                    {voucher.used_count} dipakai
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Limit{' '}
                                                    {voucher.usage_limit ??
                                                        'tanpa batas'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${voucher.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}
                                                >
                                                    {voucher.is_active
                                                        ? 'Aktif'
                                                        : 'Nonaktif'}
                                                </span>
                                            </td>
                                            {(props.canUpdate ||
                                                props.canDelete) && (
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        {props.canUpdate && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openEdit(
                                                                        voucher,
                                                                    )
                                                                }
                                                                className="rounded-full border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50"
                                                                aria-label={`Edit ${voucher.code}`}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {props.canDelete && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    destroy(
                                                                        voucher,
                                                                    )
                                                                }
                                                                className="rounded-full border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                                                                aria-label={`Hapus ${voucher.code}`}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <Pagination links={props.vouchers.links} />
            </div>

            <VoucherModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                teamSlug={props.teamSlug}
                editing={editing}
            />
        </>
    );
}

function Summary({
    label,
    value,
    tone = 'text-slate-900',
}: {
    label: string;
    value: string | number;
    tone?: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`mt-3 text-2xl font-semibold ${tone}`}>{value}</p>
        </div>
    );
}

function Pagination({ links }: { links: PaginationLink[] }) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {links.map((link) => (
                <button
                    key={link.label}
                    type="button"
                    disabled={!link.url}
                    onClick={() =>
                        link.url &&
                        router.get(
                            link.url,
                            {},
                            { preserveState: true, preserveScroll: true },
                        )
                    }
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${link.active ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                </button>
            ))}
        </div>
    );
}
