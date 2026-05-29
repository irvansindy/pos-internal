import { Head, router } from '@inertiajs/react';
import { PackageOpen, Plus, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface ReturnRecord {
    id: number;
    return_number: string;
    quantity: number;
    refund_amount: string;
    restock: boolean;
    status: string;
    reason: string | null;
    created_at: string;
    transaction: { invoice_number: string; customer_name: string | null };
    transaction_item: {
        product_name: string;
        product_sku: string | null;
        quantity: number;
    };
    product?: { stock: number } | null;
}

interface ItemOption {
    id: number;
    invoice_number: string;
    customer_name: string | null;
    product_name: string;
    product_sku: string | null;
    unit_price: string;
    quantity: number;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PageProps {
    returns: { data: ReturnRecord[]; links: PaginationLink[] };
    filters: {
        search: string;
        status: string;
        date_from: string;
        date_to: string;
    };
    summary: {
        total: number;
        approved: number;
        quantity: number;
        amount: string;
    };
    transactionItems: ItemOption[];
    teamSlug: string;
    canManage: boolean;
}

function currency(value: string | number | null): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function buildUrl(teamSlug: string, path: string): string {
    return `/${teamSlug}${path}`;
}

function statusTone(status: string): string {
    if (status === 'approved') {
        return 'bg-emerald-100 text-emerald-700';
    }

    if (status === 'pending') {
        return 'bg-amber-100 text-amber-700';
    }

    return 'bg-rose-100 text-rose-700';
}

function ReturnModal({
    open,
    onClose,
    teamSlug,
    items,
}: {
    open: boolean;
    onClose: () => void;
    teamSlug: string;
    items: ItemOption[];
}) {
    const [form, setForm] = useState({
        transaction_item_id: '',
        quantity: '1',
        refund_amount: '',
        restock: true,
        status: 'approved',
        reason: '',
    });

    if (!open) {
        return null;
    }

    const selected = items.find(
        (item) => String(item.id) === form.transaction_item_id,
    );

    const submit = () => {
        router.post(buildUrl(teamSlug, '/transactions/returns'), form, {
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
                            Return barang
                        </p>
                        <h2 className="text-lg font-semibold text-slate-900">
                            Catat barang kembali
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
                        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                            Item transaksi
                            <select
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.transaction_item_id}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        transaction_item_id: event.target.value,
                                    }))
                                }
                            >
                                <option value="">Pilih item</option>
                                {items.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.invoice_number} -{' '}
                                        {item.product_name} ({item.quantity} x{' '}
                                        {currency(item.unit_price)})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Jumlah return
                            <input
                                type="number"
                                min="1"
                                max={selected?.quantity ?? undefined}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.quantity}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        quantity: event.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Nominal refund
                            <input
                                type="number"
                                min="0"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.refund_amount}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        refund_amount: event.target.value,
                                    }))
                                }
                                placeholder={
                                    selected
                                        ? currency(
                                              Number(selected.unit_price) *
                                                  Number(form.quantity || 0),
                                          )
                                        : 'Otomatis'
                                }
                            />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Status
                            <select
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.status}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        status: event.target.value,
                                    }))
                                }
                            >
                                <option value="approved">Disetujui</option>
                                <option value="pending">Menunggu</option>
                                <option value="rejected">Ditolak</option>
                            </select>
                        </label>

                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                            <input
                                type="checkbox"
                                checked={form.restock}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        restock: event.target.checked,
                                    }))
                                }
                            />
                            Kembalikan stok produk
                        </label>
                    </div>

                    <label className="mt-4 block space-y-2 text-sm font-medium text-slate-700">
                        Alasan
                        <textarea
                            rows={4}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                            value={form.reason}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    reason: event.target.value,
                                }))
                            }
                        />
                    </label>
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
                        Simpan return
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ReturnsIndex(props: PageProps) {
    const [filters, setFilters] = useState(props.filters);
    const [modalOpen, setModalOpen] = useState(false);

    const applyFilters = () => {
        router.get(buildUrl(props.teamSlug, '/transactions/returns'), filters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        const next = { search: '', status: '', date_from: '', date_to: '' };
        setFilters(next);
        router.get(buildUrl(props.teamSlug, '/transactions/returns'), next, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const destroy = (record: ReturnRecord) => {
        if (!window.confirm(`Hapus return ${record.return_number}?`)) {
            return;
        }

        router.delete(
            buildUrl(props.teamSlug, `/transactions/returns/${record.id}`),
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <>
            <Head title="Return Barang" />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">
                            Modul transaksi tim
                        </p>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Return Barang
                        </h1>
                    </div>

                    {props.canManage && (
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            <Plus className="h-4 w-4" />
                            Tambah return
                        </button>
                    )}
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Summary label="Total return" value={props.summary.total} />
                    <Summary
                        label="Disetujui"
                        value={props.summary.approved}
                        tone="text-emerald-600"
                    />
                    <Summary
                        label="Qty kembali"
                        value={props.summary.quantity}
                        tone="text-amber-600"
                    />
                    <Summary
                        label="Nominal refund"
                        value={currency(props.summary.amount)}
                    />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="flex min-w-[240px] flex-1 flex-col gap-2 text-sm text-slate-700">
                            Cari return
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
                                    placeholder="Nomor, invoice, produk"
                                />
                            </div>
                        </label>
                        <SelectFilter
                            label="Status"
                            value={filters.status}
                            onChange={(value) =>
                                setFilters((current) => ({
                                    ...current,
                                    status: value,
                                }))
                            }
                        />
                        <DateFilter
                            label="Dari tanggal"
                            value={filters.date_from}
                            onChange={(value) =>
                                setFilters((current) => ({
                                    ...current,
                                    date_from: value,
                                }))
                            }
                        />
                        <DateFilter
                            label="Sampai tanggal"
                            value={filters.date_to}
                            onChange={(value) =>
                                setFilters((current) => ({
                                    ...current,
                                    date_to: value,
                                }))
                            }
                        />
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

                {props.returns.data.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                        <PackageOpen className="mx-auto h-8 w-8 text-slate-400" />
                        <p className="mt-3 text-lg font-semibold text-slate-900">
                            Belum ada return barang
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                            Barang kembali akan muncul setelah dicatat.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Return
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Transaksi
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Produk
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-right font-semibold text-slate-700">
                                            Qty
                                        </th>
                                        <th className="px-4 py-3 text-right font-semibold text-slate-700">
                                            Refund
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Tanggal
                                        </th>
                                        {props.canManage && (
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">
                                                Aksi
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {props.returns.data.map((record) => (
                                        <tr
                                            key={record.id}
                                            className="align-top"
                                        >
                                            <td className="px-4 py-3 font-semibold text-slate-900">
                                                {record.return_number}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                <p className="font-semibold text-slate-900">
                                                    {
                                                        record.transaction
                                                            .invoice_number
                                                    }
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {record.transaction
                                                        .customer_name ??
                                                        'Tanpa nama'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                <p>
                                                    {
                                                        record.transaction_item
                                                            .product_name
                                                    }
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {record.transaction_item
                                                        .product_sku ?? '-'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(record.status)}`}
                                                >
                                                    {record.status}
                                                </span>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {record.restock
                                                        ? 'Restock'
                                                        : 'Tanpa restock'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                                {record.quantity}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                                {currency(record.refund_amount)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {formatDate(record.created_at)}
                                            </td>
                                            {props.canManage && (
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            destroy(record)
                                                        }
                                                        className="rounded-full border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                                                        aria-label={`Hapus ${record.return_number}`}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <Pagination links={props.returns.links} />
            </div>

            <ReturnModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                teamSlug={props.teamSlug}
                items={props.transactionItems}
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

function SelectFilter({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="flex min-w-[160px] flex-col gap-2 text-sm text-slate-700">
            {label}
            <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                <option value="">Semua</option>
                <option value="approved">Disetujui</option>
                <option value="pending">Menunggu</option>
                <option value="rejected">Ditolak</option>
            </select>
        </label>
    );
}

function DateFilter({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="flex min-w-[180px] flex-col gap-2 text-sm text-slate-700">
            {label}
            <input
                type="date"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
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
