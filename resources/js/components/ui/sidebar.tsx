import { Link, usePage, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    ShoppingCart, Store, User, LogOut, ChevronsUpDown, Check,
    ChevronDown, ChevronRight, LayoutDashboard, Users, Package,
    Receipt, BarChart2, Settings,
} from 'lucide-react';

// Ziggy - sudah global via Laravel starter kit
declare function route(name: string, params?: Record<string, unknown>): string;

const iconMap: Record<string, React.ElementType> = {
    LayoutDashboard, Users, Package, ShoppingCart, Receipt,
    BarChart2, Settings, Store, User,
};

interface NavChild {
    name: string;
    label: string;
    route: string;
    icon?: string;
}

interface NavItem {
    name: string;
    label: string;
    route: string | null;
    icon: string;
    module: string | null;
    children: NavChild[];
}

// ─── NavLink ─────────────────────────────────────────────
function NavLink({ item, currentUrl }: { item: NavChild; currentUrl: string }) {
    const Icon = iconMap[item.icon ?? ''];
    // Deteksi active berdasarkan nama route (lebih reliable)
    const isActive = currentUrl.includes(item.route?.replace('.', '/').replace('.', '/') ?? '__never__');

    const base: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderRadius: '8px',
        padding: '7px 12px',
        fontSize: '14px',
        textDecoration: 'none',
        transition: 'all 0.15s',
        cursor: 'pointer',
    };

    const active: React.CSSProperties = {
        ...base,
        backgroundColor: 'var(--color-background-info)',
        color: 'var(--color-text-info)',
        fontWeight: 500,
    };

    const inactive: React.CSSProperties = {
        ...base,
        color: 'var(--color-text-secondary)',
        fontWeight: 400,
    };

    return (
        <Link
            href={route(item.route)}
            style={isActive ? active : inactive}
            onMouseEnter={e => {
                if (!isActive) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.backgroundColor = 'var(--color-background-secondary)';
                    el.style.color = 'var(--color-text-primary)';
                }
            }}
            onMouseLeave={e => {
                if (!isActive) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.backgroundColor = 'transparent';
                    el.style.color = 'var(--color-text-secondary)';
                }
            }}
        >
            {Icon && <Icon size={15} style={{ opacity: 0.7, flexShrink: 0 }} />}
            <span>{item.label}</span>
        </Link>
    );
}

// ─── NavGroup ────────────────────────────────────────────
function NavGroup({ item, currentUrl }: { item: NavItem; currentUrl: string }) {
    const Icon = iconMap[item.icon];
    const hasActiveChild = item.children.some(c =>
        currentUrl.includes(c.route?.replace('.', '/').replace('.', '/') ?? '__never__')
    );
    const [open, setOpen] = useState(hasActiveChild);

    if (item.children.length === 0 && item.route) {
        return (
            <NavLink
                item={{ name: item.name, label: item.label, route: item.route, icon: item.icon }}
                currentUrl={currentUrl}
            />
        );
    }

    return (
        <div>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontSize: '14px',
                    color: hasActiveChild ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    fontWeight: hasActiveChild ? 500 : 400,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {Icon && <Icon size={15} style={{ opacity: 0.7, flexShrink: 0 }} />}
                    {item.label}
                </span>
                {open
                    ? <ChevronDown size={13} style={{ opacity: 0.5 }} />
                    : <ChevronRight size={13} style={{ opacity: 0.5 }} />
                }
            </button>

            {open && (
                <div style={{
                    marginTop: '2px',
                    marginLeft: '16px',
                    paddingLeft: '12px',
                    borderLeft: '1px solid var(--color-border-tertiary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                }}>
                    {item.children.map(child => (
                        <NavLink key={child.name} item={child} currentUrl={currentUrl} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── TeamSwitcher ────────────────────────────────────────
function TeamSwitcher() {
    const { auth } = usePage().props as any;
    const [open, setOpen] = useState(false);
    const teams = (auth?.user?.teams ?? []) as Array<{
        id: number; name: string; slug: string;
        role_label: string | null; is_current: boolean;
    }>;
    const current = auth?.user?.current_team;

    if (teams.length <= 1) return null;

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    borderRadius: '8px', padding: '7px 12px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    transition: 'background-color 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
                {/* Team icon */}
                <div style={{
                    height: '28px', width: '28px', borderRadius: '8px',
                    backgroundColor: 'var(--color-background-info)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <Store size={14} style={{ color: 'var(--color-text-info)' }} />
                </div>
                {/* Team info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: '14px', fontWeight: 500,
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {current?.name ?? 'Pilih Tim'}
                    </div>
                    <div style={{
                        fontSize: '12px', color: 'var(--color-text-tertiary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {current?.role_label ?? ''}
                    </div>
                </div>
                <ChevronsUpDown size={13} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
            </button>

            {open && (
                <>
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                        onClick={() => setOpen(false)}
                    />
                    <div style={{
                        position: 'absolute', left: 0, top: '100%', marginTop: '4px',
                        width: '224px', zIndex: 20, borderRadius: '12px',
                        border: '1px solid var(--color-border-tertiary)',
                        backgroundColor: 'var(--color-background-primary)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        overflow: 'hidden',
                    }}>
                        <div style={{ padding: '10px 12px 6px' }}>
                            <p style={{
                                fontSize: '11px', color: 'var(--color-text-tertiary)',
                                fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em',
                                margin: 0,
                            }}>
                                Pilih Tim
                            </p>
                        </div>
                        {teams.map(team => (
                            <button
                                key={team.id}
                                onClick={() => {
                                    setOpen(false);
                                    router.post(route('teams.switch', { team: team.slug }));
                                }}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '8px 12px', fontSize: '14px',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    transition: 'background-color 0.15s', textAlign: 'left',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)')}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                                <div style={{
                                    height: '24px', width: '24px', borderRadius: '6px',
                                    backgroundColor: 'var(--color-background-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    <Store size={12} style={{ color: 'var(--color-text-secondary)' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: 500, color: 'var(--color-text-primary)',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {team.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                                        {team.role_label}
                                    </div>
                                </div>
                                {team.is_current && (
                                    <Check size={13} style={{ color: 'var(--color-text-info)', flexShrink: 0 }} />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main Sidebar ────────────────────────────────────────
export default function Sidebar() {
    const { auth, navigation, url } = usePage().props as any;
    const navItems: NavItem[] = navigation ?? [];
    const currentUrl: string = url ?? '';

    return (
        <aside style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '256px',
            flexShrink: 0,
            borderRight: '1px solid var(--color-border-tertiary)',
            backgroundColor: 'var(--color-background-primary)',
        }}>
            {/* Logo */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border-tertiary)' }}>
                <Link
                    href={route('dashboard')}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
                >
                    <div style={{
                        height: '32px', width: '32px', borderRadius: '8px',
                        backgroundColor: 'var(--color-text-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <ShoppingCart size={16} style={{ color: 'var(--color-background-primary)' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                            POS System
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                            Point of Sale
                        </div>
                    </div>
                </Link>
            </div>

            {/* Team Switcher */}
            <div style={{ padding: '12px 8px 4px' }}>
                <TeamSwitcher />
            </div>

            {/* Navigation */}
            <nav style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
            }}>
                {navItems.map(item => (
                    <NavGroup key={item.name} item={item} currentUrl={currentUrl} />
                ))}
            </nav>

            {/* User Profile */}
            <div style={{ padding: '8px', borderTop: '1px solid var(--color-border-tertiary)' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 12px',
                }}>
                    <div style={{
                        height: '28px', width: '28px', borderRadius: '50%',
                        backgroundColor: 'var(--color-background-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <User size={14} style={{ color: 'var(--color-text-secondary)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontSize: '14px', fontWeight: 500,
                            color: 'var(--color-text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {auth?.user?.name}
                        </div>
                        <div style={{
                            fontSize: '12px', color: 'var(--color-text-tertiary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {auth?.user?.email}
                        </div>
                    </div>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        style={{
                            color: 'var(--color-text-tertiary)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '4px', borderRadius: '6px', transition: 'color 0.15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-danger)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)')}
                        title="Logout"
                    >
                        <LogOut size={14} />
                    </Link>
                </div>
            </div>
        </aside>
    );
}