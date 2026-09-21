import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    ClipboardList,
    Gauge,
    History,
    Package,
    Store,
} from 'lucide-react';
import type { PropsWithChildren } from 'react';
import ThemeToggle from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const navigation = [
    { label: 'Ringkasan', href: '/admin', icon: Gauge },
    { label: 'Organisasi', href: '/admin/organizations', icon: Building2 },
    { label: 'Paket', href: '/admin/plans', icon: Package },
    {
        label: 'Permintaan Custom',
        href: '/admin/custom-plan-requests',
        icon: ClipboardList,
    },
    { label: 'Audit Provider', href: '/admin/audits', icon: History },
];

export default function AdminLayout({ children }: PropsWithChildren) {
    const page = usePage();
    const { auth, flash } = page.props as any;
    const team = auth?.user?.current_team;
    const appUrl = team ? `/${team.slug}/dashboard` : '/';

    return (
        <div className="min-h-dvh bg-background text-foreground [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:focus-visible:ring-foreground [&_input]:border-foreground/50 [&_select]:border-foreground/50">
            <header className="border-b bg-card">
                <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
                        <Store className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-semibold">
                            POS Control Plane
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {auth?.user?.name}
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <ThemeToggle compact />
                        <Link
                            href={appUrl}
                            className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none"
                        >
                            Kembali ke aplikasi
                        </Link>
                    </div>
                </div>
                <nav
                    aria-label="Navigasi control plane"
                    className="mx-auto grid max-w-screen-2xl grid-cols-2 gap-1 px-4 pb-3 sm:flex sm:px-6 lg:px-8"
                >
                    {navigation.map((item) => {
                        const active =
                            item.href === '/admin'
                                ? page.url === '/admin'
                                : page.url.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none',
                                    active
                                        ? 'bg-foreground text-background'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                <item.icon
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </header>

            {(flash?.success || flash?.error || flash?.warning) && (
                <div className="mx-auto max-w-screen-2xl px-4 pt-4 sm:px-6 lg:px-8">
                    <div
                        className="rounded-md border bg-card px-4 py-3 text-sm"
                        role="status"
                    >
                        {flash.success ?? flash.error ?? flash.warning}
                    </div>
                </div>
            )}

            <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
