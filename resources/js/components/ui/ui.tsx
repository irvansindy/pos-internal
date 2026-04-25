// ─── Button ──────────────────────────────────────────────
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2, XIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--color-text-primary)] text-[var(--color-background-primary)] hover:opacity-90',
    secondary: 'bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)] border border-[var(--color-border-tertiary)]',
    danger: 'bg-[var(--color-background-danger)] text-[var(--color-text-danger)] hover:opacity-90 border border-[var(--color-border-danger)]',
    ghost: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background-secondary)] hover:text-[var(--color-text-primary)]',
    outline: 'border border-[var(--color-border-primary)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-secondary)]',
};

const sizeClass: Record<ButtonSize, string> = {
    sm: 'h-7 px-2.5 text-xs rounded-md gap-1.5',
    md: 'h-9 px-4 text-sm rounded-lg gap-2',
    lg: 'h-11 px-6 text-sm rounded-xl gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props }, ref) => (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center font-medium transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${variantClass[variant]} ${sizeClass[size]} ${className}`}
            {...props}
        >
            {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
            {children}
        </button>
    )
);
Button.displayName = 'Button';

// ─── Badge ───────────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'outline';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

const badgeVariant: Record<BadgeVariant, string> = {
    default: 'bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)]',
    success: 'bg-[var(--color-background-success)] text-[var(--color-text-success)]',
    danger: 'bg-[var(--color-background-danger)] text-[var(--color-text-danger)]',
    warning: 'bg-[var(--color-background-warning)] text-[var(--color-text-warning)]',
    info: 'bg-[var(--color-background-info)] text-[var(--color-text-info)]',
    outline: 'border border-[var(--color-border-secondary)] text-[var(--color-text-secondary)]',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeVariant[variant]} ${className}`}>
            {children}
        </span>
    );
}

// ─── Input ───────────────────────────────────────────────
import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
}

export function Input({ label, error, hint, leftIcon, className = '', id, ...props }: InputProps) {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-');
    return (
        <div className="space-y-1.5">
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-(--color-text-primary)">
                    {label}
                    {props.required && <span className="text-(--color-text-danger) ml-0.5">*</span>}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-tertiary)">
                        {leftIcon}
                    </div>
                )}
                <input
                    id={inputId}
                    className={`w-full h-9 rounded-lg border text-sm transition-colors placeholder:text-(--color-text-tertiary) bg-(--color-background-primary) text-(--color-text-primary) ${
                        leftIcon ? 'pl-9 pr-3' : 'px-3'
                    } ${
                        error
                            ? 'border-(--color-border-danger) focus:border-(--color-border-danger) focus:ring-1 focus:ring-(--color-border-danger)'
                            : 'border-(--color-border-tertiary) focus:border-(--color-border-primary) focus:ring-1 focus:ring-(--color-border-primary)'
                    } outline-none ${className}`}
                    {...props}
                />
            </div>
            {error && <p className="text-xs text-(--color-text-danger)">{error}</p>}
            {hint && !error && <p className="text-xs text-(--color-text-tertiary)">{hint}</p>}
        </div>
    );
}

// ─── Select ──────────────────────────────────────────────
import { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    hint?: string;
    options: { value: string; label: string }[];
    placeholder?: string;
}

export function Select({ label, error, hint, options, placeholder, className = '', id, ...props }: SelectProps) {
    const selectId = id ?? label?.toLowerCase().replace(/\s/g, '-');
    return (
        <div className="space-y-1.5">
            {label && (
                <label htmlFor={selectId} className="block text-sm font-medium text-(--color-text-primary)">
                    {label}
                    {props.required && <span className="text-(--color-text-danger) ml-0.5">*</span>}
                </label>
            )}
            <select
                id={selectId}
                className={`w-full h-9 rounded-lg border text-sm transition-colors placeholder:text-(--color-text-tertiary) bg-(--color-background-primary) text-(--color-text-primary) px-3 outline-none ${
                    error
                        ? 'border-(--color-border-danger)'
                        : 'border-(--color-border-tertiary) focus:border-(--color-border-primary)'
                } ${className}`}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <p className="text-xs text-(--color-text-danger)">{error}</p>}
            {hint && !error && <p className="text-xs text-(--color-text-tertiary)">{hint}</p>}
        </div>
    );
}

// ─── Textarea ────────────────────────────────────────────
import { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export function Textarea({ label, error, hint, className = '', id, ...props }: TextareaProps) {
    const areaId = id ?? label?.toLowerCase().replace(/\s/g, '-');
    return (
        <div className="space-y-1.5">
            {label && (
                <label htmlFor={areaId} className="block text-sm font-medium text-(--color-text-primary)">
                    {label}
                </label>
            )}
            <textarea
                id={areaId}
                className={`w-full rounded-lg border text-sm transition-colors bg-(--color-background-primary) text-(--color-text-primary) px-3 py-2 outline-none resize-none ${
                    error
                        ? 'border-(--color-border-danger)'
                        : 'border-(--color-border-tertiary) focus:border-(--color-border-primary)'
                } ${className}`}
                {...props}
            />
            {error && <p className="text-xs text-(--color-text-danger)">{error}</p>}
            {hint && !error && <p className="text-xs text-(--color-text-tertiary)">{hint}</p>}
        </div>
    );
}

// ─── Modal ───────────────────────────────────────────────
interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const modalSize = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full ${modalSize[size]} rounded-2xl bg-(--color-background-primary) border border-(--color-border-tertiary) shadow-2xl`}>
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-(--color-border-tertiary)">
                    <div>
                        <h3 className="text-base font-medium text-(--color-text-primary)">{title}</h3>
                        {description && <p className="mt-0.5 text-sm text-(--color-text-secondary)">{description}</p>}
                    </div>
                    <button onClick={onClose} className="text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors ml-4 shrink-0">
                        <XIcon size={18} />
                    </button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

// ─── ConfirmDialog ───────────────────────────────────────
interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    variant?: 'danger' | 'primary';
    loading?: boolean;
}

export function ConfirmDialog({
    open, onClose, onConfirm, title, description,
    confirmLabel = 'Konfirmasi', variant = 'danger', loading,
}: ConfirmDialogProps) {
    if (!open) return null;
    return (
        <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
            <div className="flex gap-2 justify-end mt-2">
                <Button variant="secondary" onClick={onClose} disabled={loading}>Batal</Button>
                <Button
                    variant={variant === 'danger' ? 'danger' : 'primary'}
                    onClick={onConfirm}
                    loading={loading}
                >
                    {confirmLabel}
                </Button>
            </div>
        </Modal>
    );
}

// ─── PageHeader ──────────────────────────────────────────
interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    breadcrumbs?: { label: string; href?: string }[];
}

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
    return (
        <div className="flex items-start justify-between">
            <div>
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav className="mb-1 flex items-center gap-1.5 text-xs text-(--color-text-tertiary)">
                        {breadcrumbs.map((crumb, i) => (
                            <span key={i} className="flex items-center gap-1.5">
                                {i > 0 && <span>/</span>}
                                {crumb.href
                                    ? <a href={crumb.href} className="hover:text-(--color-text-primary) transition-colors">{crumb.label}</a>
                                    : <span className="text-(--color-text-secondary)">{crumb.label}</span>
                                }
                            </span>
                        ))}
                    </nav>
                )}
                <h1 className="text-lg font-medium text-(--color-text-primary)">{title}</h1>
                {description && <p className="mt-0.5 text-sm text-(--color-text-secondary)">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2 ml-4 shrink-0">{actions}</div>}
        </div>
    );
}

// ─── Card ────────────────────────────────────────────────
interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: boolean;
}

export function Card({ children, className = '', padding = true }: CardProps) {
    return (
        <div className={`rounded-xl border border-(--color-border-tertiary) bg-(--color-background-primary) ${padding ? 'p-5' : ''} ${className}`}>
            {children}
        </div>
    );
}

// ─── Stat Card ───────────────────────────────────────────
interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    change?: string;
    changeType?: 'up' | 'down' | 'neutral';
    description?: string;
}

export function StatCard({ title, value, icon, change, changeType = 'neutral', description }: StatCardProps) {
    const changeColor = changeType === 'up' ? 'text-[var(--color-text-success)]' : changeType === 'down' ? 'text-[var(--color-text-danger)]' : 'text-[var(--color-text-tertiary)]';
    return (
        <Card>
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-(--color-text-secondary)">{title}</p>
                    <p className="mt-1 text-2xl font-medium text-(--color-text-primary)">{value}</p>
                    {change && <p className={`mt-1 text-xs ${changeColor}`}>{change}</p>}
                    {description && <p className="mt-1 text-xs text-(--color-text-tertiary)">{description}</p>}
                </div>
                <div className="h-10 w-10 rounded-xl bg-(--color-background-secondary) flex items-center justify-center shrink-0 ml-3">
                    {icon}
                </div>
            </div>
        </Card>
    );
}

// ─── EmptyState ──────────────────────────────────────────
interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            {icon && <div className="h-12 w-12 rounded-2xl bg-(--color-background-secondary) flex items-center justify-center mb-4 text-(--color-text-tertiary)">{icon}</div>}
            <p className="text-sm font-medium text-(--color-text-primary)">{title}</p>
            {description && <p className="mt-1 text-sm text-(--color-text-secondary) max-w-xs">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

// Re-export X for use in other files
export { XIcon as X };