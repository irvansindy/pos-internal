import { Head, Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Audit = {
    id: number;
    action: string;
    target_type: string;
    target_id: number;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    reason: string;
    ip_address: string | null;
    created_at: string;
    actor: { name: string; email: string } | null;
    organization: { name: string; slug: string } | null;
};

type PageLink = { url: string | null; label: string; active: boolean };

const dateTime = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

export default function PlatformAuditsIndex({
    audits,
    filters,
    actions,
    organizations,
}: {
    audits: { data: Audit[]; links: PageLink[] };
    filters: { search: string; action: string; organization: string | number };
    actions: string[];
    organizations: { id: number; name: string }[];
}) {
    const [search, setSearch] = useState(filters.search);
    const [action, setAction] = useState(filters.action);
    const [organization, setOrganization] = useState(
        String(filters.organization),
    );

    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/admin/audits',
            { search, action, organization },
            { preserveState: true },
        );
    };

    return (
        <>
            <Head title="Audit Provider" />
            <div className="space-y-6">
                <Heading
                    title="Audit provider"
                    description="Jejak perubahan sensitif yang dilakukan oleh platform admin."
                />

                <Card>
                    <CardContent className="pt-6">
                        <form
                            onSubmit={submit}
                            className="grid gap-4 md:grid-cols-[minmax(220px,1fr)_220px_220px_auto] md:items-end"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="audit_search">Cari audit</Label>
                                <Input
                                    id="audit_search"
                                    className="h-11"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Alasan, admin, atau organisasi"
                                />
                            </div>
                            <AuditSelect
                                id="audit_action"
                                label="Tindakan"
                                value={action}
                                onChange={setAction}
                                options={actions.map((item) => ({
                                    value: item,
                                    label: item,
                                }))}
                                empty="Semua tindakan"
                            />
                            <AuditSelect
                                id="audit_organization"
                                label="Organisasi"
                                value={organization}
                                onChange={setOrganization}
                                options={organizations.map((item) => ({
                                    value: String(item.id),
                                    label: item.name,
                                }))}
                                empty="Semua organisasi"
                            />
                            <Button className="h-11">
                                <Search aria-hidden="true" />
                                Terapkan
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {audits.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-sm text-muted-foreground">
                            Belum ada audit yang sesuai filter.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {audits.data.map((audit) => (
                            <Card key={audit.id}>
                                <CardContent className="pt-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                            <p className="font-medium">
                                                {audit.action}
                                            </p>
                                            <p className="mt-1 text-sm">
                                                {audit.reason}
                                            </p>
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                {audit.actor?.name ??
                                                    'Akun dihapus'}
                                                ,{' '}
                                                {dateTime.format(
                                                    new Date(audit.created_at),
                                                )}
                                                {audit.ip_address
                                                    ? `, IP ${audit.ip_address}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-sm lg:text-right">
                                            {audit.organization ? (
                                                <Link
                                                    href={`/admin/organizations/${audit.organization.slug}`}
                                                    className="font-medium underline-offset-4 hover:underline"
                                                >
                                                    {audit.organization.name}
                                                </Link>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    Katalog platform
                                                </span>
                                            )}
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {audit.target_type
                                                    .split('\\')
                                                    .pop()}{' '}
                                                #{audit.target_id}
                                            </p>
                                        </div>
                                    </div>
                                    {(audit.before || audit.after) && (
                                        <details className="mt-4 rounded-md border p-3 text-sm">
                                            <summary className="min-h-8 cursor-pointer font-medium">
                                                Lihat perubahan data
                                            </summary>
                                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                                <AuditPayload
                                                    label="Sebelum"
                                                    payload={audit.before}
                                                />
                                                <AuditPayload
                                                    label="Sesudah"
                                                    payload={audit.after}
                                                />
                                            </div>
                                        </details>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <Pagination links={audits.links} />
            </div>
        </>
    );
}

function Pagination({ links }: { links: PageLink[] }) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <nav aria-label="Halaman audit" className="flex flex-wrap gap-2">
            {links.map((link, index) => {
                const label = link.label.includes('Previous')
                    ? 'Sebelumnya'
                    : link.label.includes('Next')
                      ? 'Berikutnya'
                      : link.label;

                return link.url ? (
                    <Link
                        key={`${link.label}-${index}`}
                        href={link.url}
                        preserveScroll
                        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm ${link.active ? 'bg-foreground text-background' : 'bg-card'}`}
                    >
                        {label}
                    </Link>
                ) : (
                    <span
                        key={`${link.label}-${index}`}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm opacity-50"
                    >
                        {label}
                    </span>
                );
            })}
        </nav>
    );
}

function AuditSelect({
    id,
    label,
    value,
    onChange,
    options,
    empty,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    empty: string;
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
                <option value="">{empty}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

function AuditPayload({
    label,
    payload,
}: {
    label: string;
    payload: Record<string, unknown> | null;
}) {
    return (
        <div className="min-w-0">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
                {label}
            </p>
            <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs break-words whitespace-pre-wrap">
                {payload ? JSON.stringify(payload, null, 2) : '-'}
            </pre>
        </div>
    );
}
