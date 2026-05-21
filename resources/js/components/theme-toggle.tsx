import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance } from '@/hooks/use-appearance';

type ThemeToggleProps = {
    compact?: boolean;
    className?: string;
};

const themeOptions: {
    value: Exclude<Appearance, 'system'>;
    label: string;
    Icon: typeof Moon;
}[] = [
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
];

export default function ThemeToggle({
    compact = false,
    className = '',
}: ThemeToggleProps) {
    const { appearance, resolvedAppearance, updateAppearance } =
        useAppearance();
    const activeAppearance =
        appearance === 'system' ? resolvedAppearance : appearance;

    return (
        <div
            className={cn(
                'inline-flex rounded-full bg-neutral-100 p-1 dark:bg-neutral-800',
                className,
            )}
            role="group"
            aria-label="Toggle theme"
        >
            {themeOptions.map(({ value, label, Icon }) => {
                const isActive = activeAppearance === value;
                return (
                    <Button
                        key={value}
                        type="button"
                        variant="ghost"
                        size={compact ? 'icon-sm' : 'sm'}
                        onClick={() => updateAppearance(value)}
                        aria-pressed={isActive}
                        title={label}
                        className={cn(
                            'flex items-center justify-center gap-2 rounded-full transition-colors',
                            compact ? 'h-9 w-9 p-0' : 'px-3.5 py-1.5',
                            isActive
                                ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-700 dark:text-neutral-100'
                                : 'text-neutral-500 hover:bg-neutral-200/60 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-700/60',
                        )}
                    >
                        <Icon className={compact ? 'h-4 w-4' : 'h-4 w-4'} />
                        {!compact && <span className="text-sm">{label}</span>}
                    </Button>
                );
            })}
        </div>
    );
}
