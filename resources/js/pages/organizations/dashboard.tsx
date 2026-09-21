import { Head, Link } from '@inertiajs/react';
import { ArrowUpRight, BarChart3, Store } from 'lucide-react';
import { useMemo } from 'react';
import Heading from '@/components/heading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Trend = { date: string; revenue: number; transactions: number };
type StoreRow = {
    id: number;
    name: string;
    slug: string;
    revenue: string;
    transaction_count: number;
};

export default function OrganizationDashboard({
    organization,
    summary,
    stores,
    trend,
}: {
    organization: { name: string };
    summary: {
        today: number;
        week: number;
        month: number;
        transactions_today: number;
    };
    stores: StoreRow[];
    trend: Trend[];
}) {
    const max = useMemo(
        () => Math.max(...trend.map((row) => Number(row.revenue)), 1),
        [trend],
    );
    const money = (value: number | string) =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(Number(value));

    return (
        <>
            <Head title="Dashboard Organization" />
            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Dashboard Semua Toko"
                    description={`Ringkasan konsolidasi ${organization.name}`}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                    <Metric
                        label="Omzet hari ini"
                        value={money(summary.today)}
                    />
                    <Metric
                        label="Transaksi hari ini"
                        value={summary.transactions_today.toLocaleString(
                            'id-ID',
                        )}
                    />
                    <Metric
                        label="Omzet minggu ini"
                        value={money(summary.week)}
                    />
                    <Metric
                        label="Omzet bulan ini"
                        value={money(summary.month)}
                    />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BarChart3 className="size-4" /> Tren 30 Hari
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex h-44 items-end gap-1 overflow-x-auto">
                            {trend.map((row) => (
                                <div
                                    key={row.date}
                                    title={`${row.date}: ${money(row.revenue)}`}
                                    className="group flex min-w-2 flex-1 items-end"
                                >
                                    <div
                                        className="w-full rounded-t bg-primary/70 group-hover:bg-primary"
                                        style={{
                                            height: `${Math.max((Number(row.revenue) / max) * 100, 2)}%`,
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                            <span>{trend[0]?.date}</span>
                            <span>{trend.at(-1)?.date}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Store className="size-4" /> Ranking Toko Bulan Ini
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {stores.map((store, index) => (
                            <div
                                key={store.id}
                                className="flex items-center justify-between rounded-lg border p-3"
                            >
                                <div>
                                    <span className="mr-3 text-muted-foreground">
                                        #{index + 1}
                                    </span>
                                    <strong>{store.name}</strong>
                                    <p className="ml-8 text-xs text-muted-foreground">
                                        {store.transaction_count} transaksi
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <strong>{money(store.revenue)}</strong>
                                    <Link
                                        href={`/${store.slug}/dashboard`}
                                        className="text-primary"
                                    >
                                        <ArrowUpRight className="size-4" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <Card className="gap-2 py-4">
            <CardContent>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-semibold">{value}</p>
            </CardContent>
        </Card>
    );
}
