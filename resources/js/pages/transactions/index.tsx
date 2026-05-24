import { Head, router } from '@inertiajs/react';
import {
    CalendarDays,
    Download,
    Edit2,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface Transaction {
    id: number;
    invoice_number: string;
    customer_name: string | null;
    status: string;
    payment_status: string;
    payment_method: string | null;
    grand_total: string;
    paid_amount: string;
    change_amount: string;
    note: string | null;
    created_at: string;
    cashier?: {
        name: string;
    } | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface TransactionsPageProps {
    transactions: {
        data: Transaction[];
        links: PaginationLink[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: {
        search: string;
        date_from: string;
        date_to: string;
        status: string;
        payment_status: string;
        amount_min: string;
        amount_max: string;
    };
    summary: {
        total: number;
        completed: number;
        pending: number;
        void: number;
        revenue: string;
    };
    teamSlug: string;
    canManage: boolean;
    canExport: boolean;
    paymentMethods: Array<{ value: string; label: string }>;
}

function currency(value: string | number | null): string {
    const amount = Number(value ?? 0);

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function statusTone(status: string): string {
    if (status === 'completed') {
        return 'bg-emerald-100 text-emerald-700';
    }

    if (status === 'pending') {
        return 'bg-amber-100 text-amber-700';
    }

    return 'bg-slate-100 text-slate-700';
}

function paymentTone(paymentStatus: string): string {
    if (paymentStatus === 'paid') {
        return 'bg-emerald-100 text-emerald-700';
    }

    if (paymentStatus === 'partial') {
        return 'bg-amber-100 text-amber-700';
    }

    return 'bg-slate-100 text-slate-700';
}

function buildUrl(teamSlug: string, path: string): string {
    return `/${teamSlug}${path}`;
}

function EmptyState() {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-lg font-semibold text-slate-900">
                Belum ada transaksi
            </p>
            <p className="mt-2 text-sm text-slate-500">
                Transaksi akan muncul di sini setelah owner menambahkan catatan
                baru.
            </p>
        </div>
    );
}

interface TransactionFormState {
    customer_name: string;
    grand_total: string;
    transaction_date: string;
    payment_method: string;
    payment_status: string;
    paid_amount: string;
    note: string;
}

const defaultForm = (): TransactionFormState => ({
    customer_name: '',
    grand_total: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
    payment_status: 'paid',
    paid_amount: '',
    note: '',
});

function TransactionModal({
    open,
    onClose,
    teamSlug,
    editing,
    paymentMethods,
}: {
    open: boolean;
    onClose: () => void;
    teamSlug: string;
    editing: Transaction | null;
    paymentMethods: Array<{ value: string; label: string }>;
}) {
    const [form, setForm] = useState<TransactionFormState>(defaultForm());

    useEffect(() => {
        if (!open) {
            return;
        }

        if (!editing) {
            setForm(defaultForm());
            return;
        }

        setForm({
            customer_name: editing.customer_name ?? '',
            grand_total: editing.grand_total ?? '0',
            transaction_date: editing.created_at.slice(0, 10),
            payment_method: editing.payment_method ?? 'cash',
            payment_status: editing.payment_status,
            paid_amount: editing.paid_amount ?? '0',
            note: editing.note ?? '',
        });
    }, [editing, open]);

    if (!open) {
        return null;
    }

    const submit = () => {
        const payload = {
            customer_name: form.customer_name,
            grand_total: form.grand_total,
            transaction_date: form.transaction_date,
            payment_method: form.payment_method,
            payment_status: form.payment_status,
            paid_amount: form.paid_amount,
            note: form.note,
        };

        if (editing) {
            router.put(
                buildUrl(teamSlug, `/transactions/${editing.id}`),
                payload,
                {
                    preserveScroll: true,
                    onSuccess: onClose,
                },
            );
            return;
        }

        router.post(buildUrl(teamSlug, '/transactions'), payload, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    const isEdit = !!editing;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/30 px-4 py-8">
            <div className="mx-auto flex h-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <p className="text-sm font-medium text-slate-500">
                            {isEdit ? 'Edit transaksi' : 'Tambah transaksi'}
                        </p>
                        <h2 className="text-lg font-semibold text-slate-900">
                            {isEdit
                                ? 'Perbarui data transaksi'
                                : 'Catat transaksi tim'}
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
                            Nama transaksi
                            <input
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition outline-none focus:border-slate-400"
                                value={form.customer_name}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        customer_name: event.target.value,
                                    }))
                                }
                                placeholder="Contoh: Pembelian bahan"
                            />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Jumlah transaksi
                            <input
                                type="number"
                                min="0"
                                step="1000"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition outline-none focus:border-slate-400"
                                value={form.grand_total}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        grand_total: event.target.value,
                                    }))
                                }
                                placeholder="150000"
                            />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Tanggal
                            <input
                                type="date"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition outline-none focus:border-slate-400"
                                value={form.transaction_date}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        transaction_date: event.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Metode pembayaran
                            <select
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition outline-none focus:border-slate-400"
                                value={form.payment_method}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        payment_method: event.target.value,
                                    }))
                                }
                            >
                                {paymentMethods.map((method) => (
                                    <option
                                        key={method.value}
                                        value={method.value}
                                    >
                                        {method.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Status pembayaran
                            <select
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition outline-none focus:border-slate-400"
                                value={form.payment_status}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        payment_status: event.target.value,
                                    }))
                                }
                            >
                                <option value="paid">Lunas</option>
                                <option value="partial">Sebagian</option>
                                <option value="unpaid">Belum dibayar</option>
                            </select>
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Jumlah dibayar
                            <input
                                type="number"
                                min="0"
                                step="1000"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition outline-none focus:border-slate-400"
                                value={form.paid_amount}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        paid_amount: event.target.value,
                                    }))
                                }
                                placeholder="0"
                            />
                        </label>
                    </div>

                    <label className="mt-4 block space-y-2 text-sm font-medium text-slate-700">
                        Deskripsi
                        <textarea
                            rows={4}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition outline-none focus:border-slate-400"
                            value={form.note}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    note: event.target.value,
                                }))
                            }
                            placeholder="Tambahkan catatan transaksi"
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
                        {isEdit ? 'Simpan perubahan' : 'Simpan transaksi'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function TransactionsIndex(props: TransactionsPageProps) {
    const [filters, setFilters] = useState(props.filters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Transaction | null>(null);

    const summary = useMemo(() => props.summary, [props.summary]);
    const exportHref = useMemo(() => {
        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            }
        });

        const query = params.toString();

        return query
            ? `${buildUrl(props.teamSlug, '/transactions/export')}?${query}`
            : buildUrl(props.teamSlug, '/transactions/export');
    }, [filters, props.teamSlug]);

    const applyFilters = () => {
        router.get(buildUrl(props.teamSlug, '/transactions'), filters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        const next = {
            search: '',
            date_from: '',
            date_to: '',
            status: '',
            payment_status: '',
            amount_min: '',
            amount_max: '',
        };

        setFilters(next);
        router.get(buildUrl(props.teamSlug, '/transactions'), next, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const openCreate = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (transaction: Transaction) => {
        setEditing(transaction);
        setModalOpen(true);
    };

    const handleDelete = (transaction: Transaction) => {
        if (
            !window.confirm(
                `Yakin ingin menghapus transaksi ${transaction.invoice_number}?`,
            )
        ) {
            return;
        }

        router.delete(
            buildUrl(props.teamSlug, `/transactions/${transaction.id}`),
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <>
            <Head title="Manajemen Transaksi" />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">
                            Modul transaksi tim
                        </p>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Manajemen Transaksi
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {props.canExport && (
                            <a
                                href={exportHref}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                <Download className="h-4 w-4" />
                                Export CSV
                            </a>
                        )}

                        {props.canManage && (
                            <button
                                type="button"
                                onClick={openCreate}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                <Plus className="h-4 w-4" />
                                Tambah transaksi
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-sm text-slate-500">
                            Total transaksi
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-slate-900">
                            {summary.total}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-sm text-slate-500">
                            Transaksi selesai
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-emerald-600">
                            {summary.completed}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-sm text-slate-500">Menunggu</p>
                        <p className="mt-3 text-2xl font-semibold text-amber-600">
                            {summary.pending}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-sm text-slate-500">
                            Total pendapatan
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-slate-900">
                            {currency(summary.revenue)}
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="flex min-w-[220px] flex-1 flex-col gap-2 text-sm text-slate-700">
                            Cari transaksi
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
                                    placeholder="Nama, invoice, atau catatan"
                                />
                            </div>
                        </label>

                        <label className="flex min-w-[180px] flex-col gap-2 text-sm text-slate-700">
                            Dari tanggal
                            <input
                                type="date"
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={filters.date_from}
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        date_from: event.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label className="flex min-w-[180px] flex-col gap-2 text-sm text-slate-700">
                            Sampai tanggal
                            <input
                                type="date"
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={filters.date_to}
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        date_to: event.target.value,
                                    }))
                                }
                            />
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
                                <option value="completed">Selesai</option>
                                <option value="pending">Pending</option>
                                <option value="void">Void</option>
                            </select>
                        </label>

                        <label className="flex min-w-[160px] flex-col gap-2 text-sm text-slate-700">
                            Pembayaran
                            <select
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={filters.payment_status}
                                onChange={(event) =>
                                    setFilters((current) => ({
                                        ...current,
                                        payment_status: event.target.value,
                                    }))
                                }
                            >
                                <option value="">Semua</option>
                                <option value="paid">Lunas</option>
                                <option value="partial">Sebagian</option>
                                <option value="unpaid">Belum dibayar</option>
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

                {props.transactions.data.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Invoice
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Nama
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Tanggal
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Pembayaran
                                        </th>
                                        <th className="px-4 py-3 text-right font-semibold text-slate-700">
                                            Jumlah
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                            Catatan
                                        </th>
                                        {props.canManage && (
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">
                                                Aksi
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {props.transactions.data.map(
                                        (transaction) => (
                                            <tr
                                                key={transaction.id}
                                                className="align-top"
                                            >
                                                <td className="px-4 py-3 font-medium text-slate-900">
                                                    {transaction.invoice_number}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="font-semibold text-slate-900">
                                                            {transaction.customer_name ||
                                                                'Tanpa nama'}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {transaction.cashier
                                                                ?.name ??
                                                                'Owner'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarDays className="h-4 w-4 text-slate-400" />
                                                        {formatDate(
                                                            transaction.created_at,
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(transaction.status)}`}
                                                    >
                                                        {transaction.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-1">
                                                        <span
                                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentTone(transaction.payment_status)}`}
                                                        >
                                                            {
                                                                transaction.payment_status
                                                            }
                                                        </span>
                                                        <p className="text-xs text-slate-500">
                                                            {transaction.payment_method ??
                                                                '—'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                                    {currency(
                                                        transaction.grand_total,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    {transaction.note || '—'}
                                                </td>
                                                {props.canManage && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openEdit(
                                                                        transaction,
                                                                    )
                                                                }
                                                                className="rounded-full border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50"
                                                                aria-label={`Edit ${transaction.invoice_number}`}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        transaction,
                                                                    )
                                                                }
                                                                className="rounded-full border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                                                                aria-label={`Hapus ${transaction.invoice_number}`}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {props.transactions.links.length > 3 && (
                    <div className="flex flex-wrap gap-2">
                        {props.transactions.links.map((link) => (
                            <button
                                key={link.label}
                                type="button"
                                disabled={!link.url}
                                onClick={() =>
                                    link.url &&
                                    router.get(
                                        link.url,
                                        {},
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                        },
                                    )
                                }
                                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${link.active ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                            >
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <TransactionModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                teamSlug={props.teamSlug}
                editing={editing}
                paymentMethods={props.paymentMethods}
            />
        </>
    );
}
