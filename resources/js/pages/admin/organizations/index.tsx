import { Head, Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type OrganizationRow = {
    id: number;
    name: string;
    slug: string;
    stores_count: number;
    members_count: number;
    owner: { name: string; email: string } | null;
    plan: { code: string; name: string } | null;
    subscription_status: string | null;
    period_end: string | null;
    created_at: string;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

const statusLabels: Record<string, string> = {
    trial: 'Trial',
    active: 'Aktif',
    past_due: 'Menunggak',
    suspended: 'Ditangguhkan',
    canceled: 'Dibatalkan',
};

export default function PlatformOrganizationsIndex({
    organizations,
    filters,
    plans,
    statuses,
}: {
    organizations: {
        data: OrganizationRow[];
        links: PaginationLink[];
        total: number;
    };
    filters: { search: string; status: string; plan: string };
    plans: { code: string; name: string }[];
    statuses: { value: string; label: string }[];
}) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [plan, setPlan] = useState(filters.plan);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/admin/organizations',
            { search, status, plan },
            { preserveState: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Organisasi" />
            <div className="space-y-6">
                <Heading
                    title="Organisasi pelanggan"
                    description={`${organizations.total.toLocaleString('id-ID')} organisasi terdaftar pada platform.`}
                />

                <Card>
                    <CardContent className="pt-6">
                        <form
                            onSubmit={submit}
                            className="grid gap-4 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto] md:items-end"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="organization_search">
                                    Cari organisasi
                                </Label>
                                <Input
                                    id="organization_search"
                                    className="h-11"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Nama, slug, owner, atau email"
                                />
                            </div>
                            <FilterSelect
                                id="subscription_status"
                                label="Status"
                                value={status}
                                onChange={setStatus}
                                options={statuses}
                                emptyLabel="Semua status"
                            />
                            <FilterSelect
                                id="subscription_plan"
                                label="Paket"
                                value={plan}
                                onChange={setPlan}
                                options={plans.map((item) => ({
                                    value: item.code,
                                    label: item.name,
                                }))}
                                emptyLabel="Semua paket"
                            />
                            <Button className="h-11">
                                <Search aria-hidden="true" />
                                Terapkan
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {organizations.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="font-medium">
                                Organisasi tidak ditemukan
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Ubah kata pencarian atau filter subscription.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-3 lg:hidden">
                                {organizations.data.map((organization) => (
                                    <OrganizationCard
                                        key={organization.id}
                                        organization={organization}
                                    />
                                ))}
                            </div>
                            <div className="hidden overflow-x-auto lg:block">
                                <table className="w-full min-w-[900px] text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="pb-3 font-medium">
                                                Organisasi
                                            </th>
                                            <th className="pb-3 font-medium">
                                                Owner
                                            </th>
                                            <th className="pb-3 font-medium">
                                                Paket
                                            </th>
                                            <th className="pb-3 font-medium">
                                                Status
                                            </th>
                                            <th className="pb-3 text-right font-medium">
                                                Toko
                                            </th>
                                            <th className="pb-3 text-right font-medium">
                                                Anggota
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {organizations.data.map(
                                            (organization) => (
                                                <tr key={organization.id}>
                                                    <td className="py-4">
                                                        <Link
                                                            href={`/admin/organizations/${organization.slug}`}
                                                            className="font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none"
                                                        >
                                                            {organization.name}
                                                        </Link>
                                                        <p className="text-xs text-muted-foreground">
                                                            {organization.slug}
                                                        </p>
                                                    </td>
                                                    <td className="py-4">
                                                        {organization.owner
                                                            ?.name ??
                                                            'Belum ada owner'}
                                                        <p className="text-xs text-muted-foreground">
                                                            {
                                                                organization
                                                                    .owner
                                                                    ?.email
                                                            }
                                                        </p>
                                                    </td>
                                                    <td className="py-4">
                                                        {organization.plan
                                                            ?.name ??
                                                            'Tanpa paket'}
                                                    </td>
                                                    <td className="py-4">
                                                        <StatusLabel
                                                            status={
                                                                organization.subscription_status
                                                            }
                                                        />
                                                    </td>
                                                    <td className="py-4 text-right tabular-nums">
                                                        {
                                                            organization.stores_count
                                                        }
                                                    </td>
                                                    <td className="py-4 text-right tabular-nums">
                                                        {
                                                            organization.members_count
                                                        }
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Pagination links={organizations.links} />
            </div>
        </>
    );
}

function OrganizationCard({ organization }: { organization: OrganizationRow }) {
    return (
        <Link
            href={`/admin/organizations/${organization.slug}`}
            className="block rounded-md border p-4 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate font-medium">{organization.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                        {organization.owner?.email ?? 'Belum ada owner'}
                    </p>
                </div>
                <StatusLabel status={organization.subscription_status} />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t pt-3 text-sm">
                <div>
                    <dt className="text-xs text-muted-foreground">Paket</dt>
                    <dd className="mt-1 font-medium">
                        {organization.plan?.name ?? '-'}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">Toko</dt>
                    <dd className="mt-1 font-medium tabular-nums">
                        {organization.stores_count}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">Anggota</dt>
                    <dd className="mt-1 font-medium tabular-nums">
                        {organization.members_count}
                    </dd>
                </div>
            </dl>
        </Link>
    );
}

function StatusLabel({ status }: { status: string | null }) {
    return (
        <span className="inline-flex min-h-7 shrink-0 items-center rounded-md border px-2 text-xs font-medium">
            {status ? (statusLabels[status] ?? status) : 'Tanpa subscription'}
        </span>
    );
}

function FilterSelect({
    id,
    label,
    value,
    onChange,
    options,
    emptyLabel,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    emptyLabel: string;
}) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <select
                id={id}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                <option value="">{emptyLabel}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

function Pagination({ links }: { links: PaginationLink[] }) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <nav aria-label="Halaman organisasi" className="flex flex-wrap gap-2">
            {links.map((link, index) =>
                link.url ? (
                    <Link
                        key={`${link.label}-${index}`}
                        href={link.url}
                        preserveScroll
                        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm ${
                            link.active
                                ? 'bg-foreground text-background'
                                : 'bg-card'
                        }`}
                    >
                        {paginationLabel(link.label)}
                    </Link>
                ) : (
                    <span
                        key={`${link.label}-${index}`}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm opacity-50"
                    >
                        {paginationLabel(link.label)}
                    </span>
                ),
            )}
        </nav>
    );
}

function paginationLabel(label: string) {
    if (label.includes('Previous')) {
        return 'Sebelumnya';
    }

    if (label.includes('Next')) {
        return 'Berikutnya';
    }

    return label;
}
