import { usePage } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Info,
    X,
} from 'lucide-react';
import type { PropsWithChildren, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import Sidebar from '@/components/ui/sidebar';

interface FlashMessage {
    success?: string;
    error?: string;
    warning?: string;
    info?: string;
}

function FlashBanner({ flash }: { flash: FlashMessage }) {
    const flashKey = useMemo(() => JSON.stringify(flash), [flash]);
    const [dismissed, setDismissed] = useState<{
        key: string;
        items: Record<string, boolean>;
    }>({ key: flashKey, items: {} });
    const dismissedItems = dismissed.key === flashKey ? dismissed.items : {};

    const messages = [
        {
            key: 'success',
            message: flash.success,
            icon: CheckCircle2,
            color: 'text-[var(--color-text-success)] bg-[var(--color-background-success)] border-[var(--color-border-success)]',
        },
        {
            key: 'error',
            message: flash.error,
            icon: AlertCircle,
            color: 'text-[var(--color-text-danger)] bg-[var(--color-background-danger)] border-[var(--color-border-danger)]',
        },
        {
            key: 'warning',
            message: flash.warning,
            icon: AlertTriangle,
            color: 'text-[var(--color-text-warning)] bg-[var(--color-background-warning)] border-[var(--color-border-warning)]',
        },
        {
            key: 'info',
            message: flash.info,
            icon: Info,
            color: 'text-[var(--color-text-info)] bg-[var(--color-background-info)] border-[var(--color-border-info)]',
        },
    ].filter((m) => m.message && !dismissedItems[m.key]);

    if (messages.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-3 right-3 left-3 z-50 space-y-2 sm:top-4 sm:right-4 sm:left-auto sm:w-full sm:max-w-sm">
            {messages.map(({ key, message, icon: Icon, color }) => (
                <div
                    key={key}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm ${color}`}
                >
                    <Icon size={16} className="mt-0.5 shrink-0" />
                    <p className="flex-1 text-sm">{message}</p>
                    <button
                        onClick={() =>
                            setDismissed((current) => ({
                                key: flashKey,
                                items: {
                                    ...(current.key === flashKey
                                        ? current.items
                                        : {}),
                                    [key]: true,
                                },
                            }))
                        }
                        className="shrink-0 opacity-60 hover:opacity-100"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}

interface AppLayoutProps extends PropsWithChildren {
    header?: ReactNode;
}

export default function AppLayout({ children, header }: AppLayoutProps) {
    const { flash } = usePage().props as any;

    return (
        <div className="flex h-dvh min-w-0 bg-(--color-background-tertiary)">
            <Sidebar className="hidden lg:flex" />

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <AppHeader />

                {header && (
                    <header className="shrink-0 border-b border-(--color-border-tertiary) bg-(--color-background-primary) px-4 py-4 sm:px-6">
                        {header}
                    </header>
                )}

                <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                    <div className="mx-auto w-full max-w-screen-2xl">
                        {children}
                    </div>
                </main>
            </div>

            <FlashBanner flash={flash} />
        </div>
    );
}
