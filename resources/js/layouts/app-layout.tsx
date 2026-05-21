import { PropsWithChildren, ReactNode } from 'react';
import { usePage } from '@inertiajs/react';
import Sidebar from '@/components/ui/sidebar';
import { AppHeader } from '@/components/app-header';
import {
    AlertCircle,
    CheckCircle2,
    Info,
    X,
    AlertTriangle,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface FlashMessage {
    success?: string;
    error?: string;
    warning?: string;
    info?: string;
}

function FlashBanner({ flash }: { flash: FlashMessage }) {
    const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setDismissed({});
    }, [flash]);

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
    ].filter((m) => m.message && !dismissed[m.key]);

    if (messages.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 w-full max-w-sm space-y-2">
            {messages.map(({ key, message, icon: Icon, color }) => (
                <div
                    key={key}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm ${color}`}
                >
                    <Icon size={16} className="mt-0.5 shrink-0" />
                    <p className="flex-1 text-sm">{message}</p>
                    <button
                        onClick={() =>
                            setDismissed((d) => ({ ...d, [key]: true }))
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
        <div className="flex h-screen bg-(--color-background-tertiary)">
            <Sidebar />

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <AppHeader />

                {header && (
                    <header className="shrink-0 border-b border-(--color-border-tertiary) bg-(--color-background-primary) px-6 py-4">
                        {header}
                    </header>
                )}

                <main className="flex-1 overflow-y-auto px-6 py-6">
                    {children}
                </main>
            </div>

            <FlashBanner flash={flash} />
        </div>
    );
}
