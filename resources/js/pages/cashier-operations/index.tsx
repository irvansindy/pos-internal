import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Banknote,
    Calculator,
    Clock3,
    ShoppingCart,
} from 'lucide-react';
import type { FormEvent } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type CashMovement = {
    id: number;
    type: 'cash_in' | 'cash_out';
    amount: string;
    category: string;
    note: string | null;
    occurred_at: string;
};

type ShiftSummary = {
    sales_cash_amount: number;
    refunds_cash_amount: number;
    cash_in_amount: number;
    cash_out_amount: number;
    expected_amount: number;
};

type CashierShift = {
    id: number;
    status: 'open' | 'closed';
    opening_amount: string;
    expected_amount: string | null;
    counted_amount: string | null;
    difference_amount: string | null;
    opened_at: string;
    closed_at: string | null;
    user: { id: number; name: string } | null;
    movements?: CashMovement[];
    live_summary?: ShiftSummary;
};

type PaginatedShifts = {
    data: CashierShift[];
};

const rupiah = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

export default function CashierOperations({
    teamSlug,
    activeShift,
    history,
    canViewAll,
}: {
    teamSlug: string;
    activeShift: CashierShift | null;
    history: PaginatedShifts;
    canViewAll: boolean;
}) {
    const opening = useForm({ opening_amount: '', opening_note: '' });
    const movement = useForm({
        type: 'cash_out' as 'cash_in' | 'cash_out',
        amount: '',
        category: '',
        note: '',
    });
    const closing = useForm({ counted_amount: '', closing_note: '' });

    const submitOpening = (event: FormEvent) => {
        event.preventDefault();
        opening.post(`/${teamSlug}/cashier-operations/open`, {
            preserveScroll: true,
            onSuccess: () => opening.reset(),
        });
    };

    const submitMovement = (event: FormEvent) => {
        event.preventDefault();

        if (!activeShift) {
            return;
        }

        movement.post(
            `/${teamSlug}/cashier-operations/${activeShift.id}/movements`,
            {
                preserveScroll: true,
                onSuccess: () => movement.reset('amount', 'category', 'note'),
            },
        );
    };

    const submitClosing = (event: FormEvent) => {
        event.preventDefault();

        if (!activeShift) {
            return;
        }

        closing.post(
            `/${teamSlug}/cashier-operations/${activeShift.id}/close`,
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Operasional Kasir" />
            <div className="space-y-6">
                <Heading
                    title="Operasional Kasir"
                    description="Buka shift, catat pergerakan uang, lalu cocokkan kas fisik sebelum pulang."
                />

                {activeShift ? (
                    <ActiveShiftPanel
                        activeShift={activeShift}
                        teamSlug={teamSlug}
                        movement={movement}
                        closing={closing}
                        onSubmitMovement={submitMovement}
                        onSubmitClosing={submitClosing}
                    />
                ) : (
                    <Card className="border-foreground/20">
                        <CardHeader>
                            <div className="flex items-start gap-3">
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
                                    <Banknote
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </div>
                                <div>
                                    <CardTitle>Mulai shift kasir</CardTitle>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Belum ada shift aktif. Masukkan uang
                                        modal yang benar-benar ada di laci kas.
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid max-w-3xl gap-4 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)_auto] md:items-end"
                                onSubmit={submitOpening}
                            >
                                <Field
                                    htmlFor="opening_amount"
                                    label="Modal awal"
                                    error={opening.errors.opening_amount}
                                >
                                    <Input
                                        id="opening_amount"
                                        className="h-11"
                                        inputMode="numeric"
                                        placeholder="Contoh: 500000"
                                        value={opening.data.opening_amount}
                                        onChange={(event) =>
                                            opening.setData(
                                                'opening_amount',
                                                event.target.value,
                                            )
                                        }
                                        aria-invalid={Boolean(
                                            opening.errors.opening_amount,
                                        )}
                                    />
                                </Field>
                                <Field
                                    htmlFor="opening_note"
                                    label="Catatan pembukaan"
                                    error={opening.errors.opening_note}
                                >
                                    <Input
                                        id="opening_note"
                                        className="h-11"
                                        placeholder="Opsional, misalnya pecahan modal"
                                        value={opening.data.opening_note}
                                        onChange={(event) =>
                                            opening.setData(
                                                'opening_note',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Button
                                    className="h-11"
                                    disabled={opening.processing}
                                >
                                    {opening.processing
                                        ? 'Membuka shift...'
                                        : 'Buka Shift'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <ShiftHistory shifts={history.data} canViewAll={canViewAll} />
            </div>
        </>
    );
}

function ActiveShiftPanel({
    activeShift,
    teamSlug,
    movement,
    closing,
    onSubmitMovement,
    onSubmitClosing,
}: {
    activeShift: CashierShift;
    teamSlug: string;
    movement: ReturnType<
        typeof useForm<{
            type: 'cash_in' | 'cash_out';
            amount: string;
            category: string;
            note: string;
        }>
    >;
    closing: ReturnType<
        typeof useForm<{ counted_amount: string; closing_note: string }>
    >;
    onSubmitMovement: (event: FormEvent) => void;
    onSubmitClosing: (event: FormEvent) => void;
}) {
    const summary = activeShift.live_summary!;

    return (
        <div className="space-y-4">
            <Card className="border-foreground/25">
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <span
                                    className="size-2 rounded-full bg-emerald-600"
                                    aria-hidden="true"
                                />
                                Shift aktif
                            </div>
                            <p className="mt-2 text-2xl font-semibold tabular-nums">
                                {rupiah.format(summary.expected_amount)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Perkiraan uang tunai di laci
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock3 className="size-4" aria-hidden="true" />
                                Dibuka{' '}
                                {dateTime.format(
                                    new Date(activeShift.opened_at),
                                )}
                            </p>
                            <Button className="h-11" asChild>
                                <Link href={`/${teamSlug}/pos`}>
                                    <ShoppingCart
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Buka POS
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryItem
                    label="Modal awal"
                    value={Number(activeShift.opening_amount)}
                />
                <SummaryItem
                    label="Penjualan tunai"
                    value={summary.sales_cash_amount}
                />
                <SummaryItem label="Kas masuk" value={summary.cash_in_amount} />
                <SummaryItem
                    label="Refund tunai"
                    value={summary.refunds_cash_amount}
                    negative
                />
                <SummaryItem
                    label="Kas keluar"
                    value={summary.cash_out_amount}
                    negative
                />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Kas masuk atau keluar
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            className="grid gap-4"
                            onSubmit={onSubmitMovement}
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    htmlFor="movement_type"
                                    label="Jenis"
                                    error={movement.errors.type}
                                >
                                    <select
                                        id="movement_type"
                                        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                        value={movement.data.type}
                                        onChange={(event) =>
                                            movement.setData(
                                                'type',
                                                event.target.value as
                                                    | 'cash_in'
                                                    | 'cash_out',
                                            )
                                        }
                                    >
                                        <option value="cash_in">
                                            Kas masuk
                                        </option>
                                        <option value="cash_out">
                                            Kas keluar
                                        </option>
                                    </select>
                                </Field>
                                <Field
                                    htmlFor="movement_amount"
                                    label="Nominal"
                                    error={movement.errors.amount}
                                >
                                    <Input
                                        id="movement_amount"
                                        className="h-11"
                                        inputMode="numeric"
                                        placeholder="Contoh: 50000"
                                        value={movement.data.amount}
                                        onChange={(event) =>
                                            movement.setData(
                                                'amount',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            </div>
                            <Field
                                htmlFor="movement_category"
                                label="Keperluan"
                                error={movement.errors.category}
                            >
                                <Input
                                    id="movement_category"
                                    className="h-11"
                                    placeholder="Contoh: belanja es batu"
                                    value={movement.data.category}
                                    onChange={(event) =>
                                        movement.setData(
                                            'category',
                                            event.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <Field
                                htmlFor="movement_note"
                                label="Catatan"
                                error={movement.errors.note}
                            >
                                <Textarea
                                    id="movement_note"
                                    placeholder="Keterangan tambahan jika diperlukan"
                                    value={movement.data.note}
                                    onChange={(event) =>
                                        movement.setData(
                                            'note',
                                            event.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <Button
                                className="h-11 sm:w-fit"
                                disabled={movement.processing}
                            >
                                {movement.data.type === 'cash_in' ? (
                                    <ArrowDownToLine aria-hidden="true" />
                                ) : (
                                    <ArrowUpFromLine aria-hidden="true" />
                                )}
                                {movement.processing
                                    ? 'Menyimpan...'
                                    : 'Catat Pergerakan'}
                            </Button>
                        </form>

                        <div className="mt-6 border-t pt-5">
                            <h3 className="text-sm font-medium">
                                Pergerakan pada shift ini
                            </h3>
                            {activeShift.movements?.length ? (
                                <ul className="mt-3 divide-y">
                                    {activeShift.movements.map((item) => (
                                        <li
                                            key={item.id}
                                            className="flex gap-3 py-3 text-sm"
                                        >
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-medium">
                                                    {item.category}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {dateTime.format(
                                                        new Date(
                                                            item.occurred_at,
                                                        ),
                                                    )}
                                                    {item.note
                                                        ? `, ${item.note}`
                                                        : ''}
                                                </span>
                                            </span>
                                            <span className="shrink-0 font-medium tabular-nums">
                                                {item.type === 'cash_in'
                                                    ? '+'
                                                    : '-'}
                                                {rupiah.format(
                                                    Number(item.amount),
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-3 text-sm text-muted-foreground">
                                    Belum ada kas masuk atau kas keluar pada
                                    shift ini.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Calculator className="size-4" aria-hidden="true" />
                            Tutup dan cocokkan kas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4 text-sm text-muted-foreground">
                            Hitung seluruh uang fisik di laci. Selisih akan
                            disimpan sebagai bagian dari laporan shift.
                        </p>
                        <form className="space-y-4" onSubmit={onSubmitClosing}>
                            <Field
                                htmlFor="counted_amount"
                                label="Kas fisik terhitung"
                                error={closing.errors.counted_amount}
                            >
                                <Input
                                    id="counted_amount"
                                    className="h-11"
                                    inputMode="numeric"
                                    placeholder="Masukkan hasil hitung"
                                    value={closing.data.counted_amount}
                                    onChange={(event) =>
                                        closing.setData(
                                            'counted_amount',
                                            event.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <Field
                                htmlFor="closing_note"
                                label="Catatan penutupan"
                                error={closing.errors.closing_note}
                            >
                                <Textarea
                                    id="closing_note"
                                    placeholder="Wajib dijelaskan jika ada selisih"
                                    value={closing.data.closing_note}
                                    onChange={(event) =>
                                        closing.setData(
                                            'closing_note',
                                            event.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <Button
                                type="submit"
                                variant="destructive"
                                className="h-11 w-full"
                                disabled={closing.processing}
                            >
                                {closing.processing
                                    ? 'Menutup shift...'
                                    : 'Tutup Shift'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function SummaryItem({
    label,
    value,
    negative = false,
}: {
    label: string;
    value: number;
    negative?: boolean;
}) {
    return (
        <Card>
            <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-semibold tabular-nums">
                    {negative && value > 0 ? '-' : ''}
                    {rupiah.format(value)}
                </p>
            </CardContent>
        </Card>
    );
}

function ShiftHistory({
    shifts,
    canViewAll,
}: {
    shifts: CashierShift[];
    canViewAll: boolean;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    {canViewAll ? 'Riwayat shift toko' : 'Riwayat shift saya'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {shifts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        Belum ada shift. Buka shift pertama untuk mulai mencatat
                        kas harian.
                    </p>
                ) : (
                    <>
                        <div className="space-y-3 md:hidden">
                            {shifts.map((shift) => (
                                <div
                                    key={shift.id}
                                    className="rounded-md border p-4 text-sm"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium">
                                                {shift.user?.name ??
                                                    'Pengguna dihapus'}
                                            </p>
                                            <p className="mt-1 text-muted-foreground">
                                                {dateTime.format(
                                                    new Date(shift.opened_at),
                                                )}
                                            </p>
                                        </div>
                                        <ShiftStatus status={shift.status} />
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3">
                                        <HistoryAmount
                                            label="Kas terhitung"
                                            value={shift.counted_amount}
                                        />
                                        <HistoryAmount
                                            label="Selisih"
                                            value={shift.difference_amount}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-3 font-medium">
                                            Kasir
                                        </th>
                                        <th className="pb-3 font-medium">
                                            Dibuka
                                        </th>
                                        <th className="pb-3 font-medium">
                                            Ditutup
                                        </th>
                                        <th className="pb-3 font-medium">
                                            Status
                                        </th>
                                        <th className="pb-3 text-right font-medium">
                                            Kas terhitung
                                        </th>
                                        <th className="pb-3 text-right font-medium">
                                            Selisih
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {shifts.map((shift) => (
                                        <tr key={shift.id}>
                                            <td className="py-3 font-medium">
                                                {shift.user?.name ??
                                                    'Pengguna dihapus'}
                                            </td>
                                            <td className="py-3">
                                                {dateTime.format(
                                                    new Date(shift.opened_at),
                                                )}
                                            </td>
                                            <td className="py-3">
                                                {shift.closed_at
                                                    ? dateTime.format(
                                                          new Date(
                                                              shift.closed_at,
                                                          ),
                                                      )
                                                    : '-'}
                                            </td>
                                            <td className="py-3">
                                                <ShiftStatus
                                                    status={shift.status}
                                                />
                                            </td>
                                            <td className="py-3 text-right tabular-nums">
                                                {shift.counted_amount === null
                                                    ? '-'
                                                    : rupiah.format(
                                                          Number(
                                                              shift.counted_amount,
                                                          ),
                                                      )}
                                            </td>
                                            <td className="py-3 text-right font-medium tabular-nums">
                                                {shift.difference_amount ===
                                                null
                                                    ? '-'
                                                    : rupiah.format(
                                                          Number(
                                                              shift.difference_amount,
                                                          ),
                                                      )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function ShiftStatus({ status }: { status: CashierShift['status'] }) {
    return (
        <span className="inline-flex min-h-7 items-center rounded-md border px-2 text-xs font-medium">
            {status === 'open' ? 'Aktif' : 'Ditutup'}
        </span>
    );
}

function HistoryAmount({
    label,
    value,
}: {
    label: string;
    value: string | null;
}) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-medium tabular-nums">
                {value === null ? '-' : rupiah.format(Number(value))}
            </p>
        </div>
    );
}

function Field({
    htmlFor,
    label,
    error,
    children,
}: {
    htmlFor: string;
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {error && (
                <p className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
