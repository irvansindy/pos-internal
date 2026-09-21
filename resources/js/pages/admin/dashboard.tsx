import { Head, Link } from '@inertiajs/react';
import { Building2, CircleAlert, CreditCard, Store } from 'lucide-react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Metrics = {
    organizations: number;
    stores: number;
    active_subscriptions: number;
    attention_subscriptions: number;
    paid_revenue_this_month: number;
    pending_invoices: number;
    pending_custom_requests: number;
};

type RecentOrganization = {
    id: number;
    name: string;
    slug: string;
    stores_count: number;
    owners_count: number;
    plan: string | null;
    subscription_status: string | null;
    created_at: string;
};

const rupiah = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

const statusLabels: Record<string, string> = {
    trial: 'Trial',
    active: 'Aktif',
    past_due: 'Menunggak',
    suspended: 'Ditangguhkan',
    canceled: 'Dibatalkan',
};

export default function PlatformDashboard({
    metrics,
    subscriptionStatusCounts,
    recentOrganizations,
}: {
    metrics: Metrics;
    subscriptionStatusCounts: Record<string, number>;
    recentOrganizations: RecentOrganization[];
}) {
    return (
        <>
            <Head title="Control Plane" />
            <div className="space-y-6">
                <Heading
                    title="Kondisi layanan"
                    description="Ringkasan lintas organisasi untuk keputusan operasional penyedia SaaS."
                />

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm text-muted-foreground">
                                Jejak layanan saat ini
                            </p>
                            <p className="mt-2 text-4xl font-semibold tabular-nums">
                                {metrics.organizations.toLocaleString('id-ID')}
                            </p>
                            <p className="mt-1 text-sm">
                                organisasi menggunakan platform
                            </p>
                            <div className="mt-6 grid gap-3 border-t pt-5 sm:grid-cols-3">
                                <MetricLine
                                    icon={Store}
                                    label="Toko"
                                    value={metrics.stores}
                                />
                                <MetricLine
                                    icon={CreditCard}
                                    label="Subscription aktif"
                                    value={metrics.active_subscriptions}
                                />
                                <MetricLine
                                    icon={Building2}
                                    label="Pendapatan lunas bulan ini"
                                    value={rupiah.format(
                                        metrics.paid_revenue_this_month,
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-700/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <CircleAlert
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Perlu ditindak
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <AttentionRow
                                label="Menunggak atau ditangguhkan"
                                value={metrics.attention_subscriptions}
                                href="/admin/organizations?status=attention"
                            />
                            <AttentionRow
                                label="Invoice menunggu pembayaran"
                                value={metrics.pending_invoices}
                                href="/admin/organizations"
                            />
                            <AttentionRow
                                label="Permintaan paket custom"
                                value={metrics.pending_custom_requests}
                                href="/admin/custom-plan-requests"
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.42fr)_minmax(0,1fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Sebaran subscription
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {Object.entries(subscriptionStatusCounts).map(
                                ([status, count]) => (
                                    <div
                                        key={status}
                                        className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"
                                    >
                                        <span className="text-sm text-muted-foreground">
                                            {statusLabels[status] ?? status}
                                        </span>
                                        <span className="font-semibold tabular-nums">
                                            {count}
                                        </span>
                                    </div>
                                ),
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex-row items-center justify-between gap-4">
                            <CardTitle className="text-base">
                                Organisasi terbaru
                            </CardTitle>
                            <Button asChild variant="outline" className="h-11">
                                <Link href="/admin/organizations">
                                    Lihat semua
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {recentOrganizations.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    Belum ada organisasi yang terdaftar.
                                </p>
                            ) : (
                                <div className="divide-y">
                                    {recentOrganizations.map((organization) => (
                                        <Link
                                            key={organization.id}
                                            href={`/admin/organizations/${organization.slug}`}
                                            className="flex min-h-16 items-center justify-between gap-4 py-3 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none"
                                        >
                                            <span className="min-w-0">
                                                <span className="block truncate font-medium">
                                                    {organization.name}
                                                </span>
                                                <span className="block text-sm text-muted-foreground">
                                                    {organization.stores_count}{' '}
                                                    toko,{' '}
                                                    {organization.owners_count}{' '}
                                                    owner
                                                </span>
                                            </span>
                                            <span className="shrink-0 text-right text-sm">
                                                <span className="block">
                                                    {organization.plan ??
                                                        'Tanpa paket'}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {statusLabels[
                                                        organization.subscription_status ??
                                                            ''
                                                    ] ?? 'Tanpa subscription'}
                                                </span>
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

function MetricLine({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Store;
    label: string;
    value: number | string;
}) {
    return (
        <div className="flex items-start gap-3">
            <Icon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
            />
            <div>
                <p className="font-semibold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </div>
        </div>
    );
}

function AttentionRow({
    label,
    value,
    href,
}: {
    label: string;
    value: number;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="flex min-h-11 items-center justify-between gap-4 rounded-md focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none"
        >
            <span className="text-sm">{label}</span>
            <span className="font-semibold tabular-nums">{value}</span>
        </Link>
    );
}
