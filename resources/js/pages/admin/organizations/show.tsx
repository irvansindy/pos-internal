import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarClock,
    CreditCard,
    Store,
    Users,
} from 'lucide-react';
import type { FormEvent } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Subscription = {
    id: number;
    status: string;
    status_label: string;
    plan: { id: number; name: string; code: string };
    pending_plan: { id: number; name: string } | null;
    effective_max_stores: number | null;
    effective_max_owners: number | null;
    trial_ends_at: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
};

type Organization = {
    id: number;
    name: string;
    slug: string;
    created_at: string;
    members: { id: number; name: string; email: string; role: string }[];
    teams: { id: number; name: string; slug: string; created_at: string }[];
    subscription: Subscription | null;
    invoices: {
        id: number;
        order_id: string;
        amount: string;
        billing_period: string;
        status: string;
        paid_at: string | null;
        created_at: string;
        plan: { name: string };
    }[];
    audits: {
        id: number;
        action: string;
        reason: string;
        before: Record<string, unknown> | null;
        after: Record<string, unknown> | null;
        created_at: string;
        actor: { name: string; email: string } | null;
    }[];
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

export default function PlatformOrganizationShow({
    organization,
    statusOptions,
}: {
    organization: Organization;
    statusOptions: { value: string; label: string }[];
}) {
    const statusForm = useForm({
        status: organization.subscription?.status ?? 'active',
        reason: '',
    });

    const submitStatus = (event: FormEvent) => {
        event.preventDefault();
        statusForm.put(
            `/admin/organizations/${organization.slug}/subscription-status`,
            {
                preserveScroll: true,
                onSuccess: () => statusForm.reset('reason'),
            },
        );
    };

    const ownerCount = organization.members.filter(
        (member) => member.role === 'owner',
    ).length;

    return (
        <>
            <Head title={organization.name} />
            <div className="space-y-6">
                <Button asChild variant="ghost" className="h-11 px-0 sm:px-3">
                    <Link href="/admin/organizations">
                        <ArrowLeft aria-hidden="true" />
                        Kembali ke organisasi
                    </Link>
                </Button>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title={organization.name}
                        description={`Tenant ${organization.slug}, bergabung ${dateTime.format(new Date(organization.created_at))}.`}
                    />
                    <span className="inline-flex min-h-8 w-fit items-center rounded-md border px-3 text-sm font-medium">
                        {organization.subscription?.status_label ??
                            'Tanpa subscription'}
                    </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Fact
                        icon={CreditCard}
                        label="Paket aktif"
                        value={
                            organization.subscription?.plan.name ??
                            'Tanpa paket'
                        }
                    />
                    <Fact
                        icon={Store}
                        label="Pemakaian toko"
                        value={`${organization.teams.length} / ${organization.subscription?.effective_max_stores ?? 'Tanpa batas'}`}
                    />
                    <Fact
                        icon={Users}
                        label="Pemakaian owner"
                        value={`${ownerCount} / ${organization.subscription?.effective_max_owners ?? 'Tanpa batas'}`}
                    />
                    <Fact
                        icon={CalendarClock}
                        label="Periode berakhir"
                        value={
                            organization.subscription?.current_period_end
                                ? dateTime.format(
                                      new Date(
                                          organization.subscription
                                              .current_period_end,
                                      ),
                                  )
                                : 'Tidak ditentukan'
                        }
                    />
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.62fr)]">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Toko dan anggota
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-6 md:grid-cols-2">
                                <RecordList
                                    title="Toko"
                                    empty="Belum ada toko."
                                    rows={organization.teams.map((team) => ({
                                        primary: team.name,
                                        secondary: team.slug,
                                    }))}
                                />
                                <RecordList
                                    title="Anggota organisasi"
                                    empty="Belum ada anggota."
                                    rows={organization.members.map(
                                        (member) => ({
                                            primary: member.name,
                                            secondary: `${member.email}, ${member.role}`,
                                        }),
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Invoice subscription terbaru
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {organization.invoices.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-muted-foreground">
                                        Belum ada invoice subscription.
                                    </p>
                                ) : (
                                    <div className="divide-y">
                                        {organization.invoices.map(
                                            (invoice) => (
                                                <div
                                                    key={invoice.id}
                                                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div>
                                                        <p className="font-medium">
                                                            {invoice.order_id}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {invoice.plan.name},{' '}
                                                            {
                                                                invoice.billing_period
                                                            }
                                                        </p>
                                                    </div>
                                                    <div className="sm:text-right">
                                                        <p className="font-medium tabular-nums">
                                                            {rupiah.format(
                                                                Number(
                                                                    invoice.amount,
                                                                ),
                                                            )}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {invoice.status}
                                                        </p>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Intervensi subscription
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {organization.subscription ? (
                                    <form
                                        className="space-y-4"
                                        onSubmit={submitStatus}
                                    >
                                        <div className="space-y-2">
                                            <Label htmlFor="subscription_status">
                                                Status baru
                                            </Label>
                                            <select
                                                id="subscription_status"
                                                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none"
                                                value={statusForm.data.status}
                                                onChange={(event) =>
                                                    statusForm.setData(
                                                        'status',
                                                        event.target.value,
                                                    )
                                                }
                                            >
                                                {statusOptions.map((option) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            {statusForm.errors.status && (
                                                <p
                                                    className="text-sm text-destructive"
                                                    role="alert"
                                                >
                                                    {statusForm.errors.status}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="status_reason">
                                                Alasan perubahan
                                            </Label>
                                            <Textarea
                                                id="status_reason"
                                                value={statusForm.data.reason}
                                                onChange={(event) =>
                                                    statusForm.setData(
                                                        'reason',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Jelaskan tiket, pembayaran, atau keputusan provider"
                                            />
                                            {statusForm.errors.reason && (
                                                <p
                                                    className="text-sm text-destructive"
                                                    role="alert"
                                                >
                                                    {statusForm.errors.reason}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            className="h-11 w-full"
                                            disabled={statusForm.processing}
                                        >
                                            {statusForm.processing
                                                ? 'Menyimpan perubahan...'
                                                : 'Perbarui Status'}
                                        </Button>
                                    </form>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Intervensi tidak tersedia karena
                                        organization belum memiliki
                                        subscription.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Audit provider terakhir
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {organization.audits.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Belum ada tindakan provider untuk
                                        organisasi ini.
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {organization.audits.map((audit) => (
                                            <div
                                                key={audit.id}
                                                className="border-b pb-4 last:border-0 last:pb-0"
                                            >
                                                <p className="text-sm font-medium">
                                                    {audit.action}
                                                </p>
                                                <p className="mt-1 text-sm">
                                                    {audit.reason}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {audit.actor?.name ??
                                                        'Akun dihapus'}
                                                    ,{' '}
                                                    {dateTime.format(
                                                        new Date(
                                                            audit.created_at,
                                                        ),
                                                    )}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}

function Fact({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Store;
    label: string;
    value: string;
}) {
    return (
        <Card>
            <CardContent className="flex gap-3 pt-5">
                <Icon
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                />
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 truncate font-semibold">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function RecordList({
    title,
    rows,
    empty,
}: {
    title: string;
    rows: { primary: string; secondary: string }[];
    empty: string;
}) {
    return (
        <div>
            <h3 className="text-sm font-medium">{title}</h3>
            {rows.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
            ) : (
                <div className="mt-3 divide-y">
                    {rows.map((row, index) => (
                        <div
                            key={`${row.primary}-${index}`}
                            className="py-3 text-sm"
                        >
                            <p className="font-medium">{row.primary}</p>
                            <p className="text-muted-foreground">
                                {row.secondary}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
