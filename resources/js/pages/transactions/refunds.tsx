import { Head, router } from '@inertiajs/react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

interface Refund {
    id: number;
    refund_number: string;
    amount: string;
    method: string;
    status: string;
    reason: string | null;
    created_at: string;
    transaction: {
        invoice_number: string;
        customer_name: string | null;
        grand_total: string;
    };
    user?: { name: string } | null;
}

interface TransactionOption {
    id: number;
    invoice_number: string;
    customer_name: string | null;
    grand_total: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PageProps {
    refunds: {
        data: Refund[];
        links: PaginationLink[];
    };
    filters: {
        search: string;
        status: string;
        method: string;
        date_from: string;
        date_to: string;
    };
    summary: {
        total: number;
        approved: number;
        pending: number;
        amount: string;
    };
    transactions: TransactionOption[];
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

function RefundModal({
    open,
    onClose,
    teamSlug,
    transactions,
}: {
    open: boolean;
    onClose: () => void;
    teamSlug: string;
    transactions: TransactionOption[];
}) {
    const [form, setForm] = useState({
        transaction_id: '',
        amount: '',
        method: 'cash',
        status: 'approved',
        reason: '',
    });

    if (!open) {
        return null;
    }

    const submit = () => {
        router.post(buildUrl(teamSlug, '/transactions/refunds'), form, {
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
                            Refund transaksi
                        </p>
                        <h2 className="text-lg font-semibold text-slate-900">
                            Catat refund baru
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
                            Transaksi
                            <select
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.transaction_id}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        transaction_id: event.target.value,
                                    }))
                                }
                            >
                                <option value="">Pilih transaksi</option>
                                {transactions.map((transaction) => (
                                    <option
                                        key={transaction.id}
                                        value={transaction.id}
                                    >
                                        {transaction.invoice_number} -{' '}
                                        {transaction.customer_name ??
                                            'Tanpa nama'}{' '}
                                        ({currency(transaction.grand_total)})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Nominal refund
                            <input
                                type="number"
                                min="1"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.amount}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        amount: event.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            Metode
                            <select
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                                value={form.method}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        method: event.target.value,
                                    }))
                                }
                            >
                                <option value="cash">Tunai</option>
                                <option value="card">Kartu</option>
                                <option value="transfer">Transfer</option>
                                <option value="qris">QRIS</option>
                            </select>
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
                        Simpan refund
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function RefundsIndex(props: PageProps) {
    const [filters, setFilters] = useState(props.filters);
    const [modalOpen, setModalOpen] = useState(false);

    const applyFilters = () => {
        router.get(buildUrl(props.teamSlug, '/transactions/refunds'), filters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        const next = {
            search: '',
            status: '',
            method: '',
            date_from: '',
            date_to: '',
        };
        setFilters(next);
        router.get(buildUrl(props.teamSlug, '/transactions/refunds'), next, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const destroy = (refund: Refund) => {
        if (!window.confirm(`Hapus refund ${refund.refund_number}?`)) {
            return;
        }

        router.delete(
            buildUrl(props.teamSlug, `/transactions/refunds/${refund.id}`),
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <>
            <Head title="Refund" />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">
                            Modul transaksi tim
                        </p>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Refund
                        </h1>
                    </div>

                    {props.canManage && (
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            <Plus className="h-4 w-4" />
                            Tambah refund
                        </button>
                    )}
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Summary label="Total refund" value={props.summary.total} />
                    <Summary
                        label="Disetujui"
                        value={props.summary.approved}
                        tone="text-emerald-600"
                    />
                    <Summary
                        label="Menunggu"
                        value={props.summary.pending}
                        tone="text-amber-600"
                    />
                    <Summary
                        label="Nominal refund"
                        value={currency(props.summary.amount)}
                    />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="flex min-w-[220px] flex-1 flex-col gap-2 text-sm text-slate-700">
                            Cari refund
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
                                    placeholder="Nomor, invoice, alasan"
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
                            options={[
                                ['', 'Semua'],
                                ['approved', 'Disetujui'],
                                ['pending', 'Menunggu'],
                                ['rejected', 'Ditolak'],
                            ]}
                        />
                        <SelectFilter
                            label="Metode"
                            value={filters.method}
                            onChange={(value) =>
                                setFilters((current) => ({
                                    ...current,
                                    method: value,
                                }))
                            }
                            options={[
                                ['', 'Semua'],
                                ['cash', 'Tunai'],
                                ['card', 'Kartu'],
                                ['transfer', 'Transfer'],
                                ['qris', 'QRIS'],
                            ]}
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

                {props.refunds.data.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                        <p className="text-lg font-semibold text-slate-900">
                            Belum ada refund
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                            Refund transaksi akan muncul setelah dicatat.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <Th>Refund</Th>
                                        <Th>Transaksi</Th>
                                        <Th>Tanggal</Th>
                                        <Th>Status</Th>
                                        <Th align="right">Nominal</Th>
                                        <Th>Alasan</Th>
                                        {props.canManage && (
                                            <Th align="right">Aksi</Th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {props.refunds.data.map((refund) => (
                                        <tr
                                            key={refund.id}
                                            className="align-top"
                                        >
                                            <Td strong>
                                                {refund.refund_number}
                                            </Td>
                                            <Td>
                                                <p className="font-semibold text-slate-900">
                                                    {
                                                        refund.transaction
                                                            .invoice_number
                                                    }
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {refund.transaction
                                                        .customer_name ??
                                                        'Tanpa nama'}
                                                </p>
                                            </Td>
                                            <Td>
                                                {formatDate(refund.created_at)}
                                            </Td>
                                            <Td>
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(refund.status)}`}
                                                >
                                                    {refund.status}
                                                </span>
                                            </Td>
                                            <Td align="right" strong>
                                                {currency(refund.amount)}
                                            </Td>
                                            <Td>{refund.reason || '-'}</Td>
                                            {props.canManage && (
                                                <Td align="right">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            destroy(refund)
                                                        }
                                                        className="rounded-full border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                                                        aria-label={`Hapus ${refund.refund_number}`}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </Td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <Pagination links={props.refunds.links} />
            </div>

            <RefundModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                teamSlug={props.teamSlug}
                transactions={props.transactions}
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
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[][];
}) {
    return (
        <label className="flex min-w-[160px] flex-col gap-2 text-sm text-slate-700">
            {label}
            <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                {options.map(([optionValue, optionLabel]) => (
                    <option key={optionValue} value={optionValue}>
                        {optionLabel}
                    </option>
                ))}
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

function Th({
    children,
    align = 'left',
}: {
    children: ReactNode;
    align?: 'left' | 'right';
}) {
    return (
        <th
            className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'} font-semibold text-slate-700`}
        >
            {children}
        </th>
    );
}

function Td({
    children,
    align = 'left',
    strong = false,
}: {
    children: ReactNode;
    align?: 'left' | 'right';
    strong?: boolean;
}) {
    return (
        <td
            className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'} ${strong ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
        >
            {children}
        </td>
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
