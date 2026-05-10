import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Check,
    ChevronDown,
    ChevronUp,
    Edit2,
    GripVertical,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

// ─── Types ───────────────────────────────────────────────
interface Menu {
    id: number;
    name: string;
    label: string;
    route: string | null;
    icon: string | null;
    module: string | null;
    sort_order: number;
    is_active: boolean;
    parent_id: number | null;
    permissions: string[];
    children: Menu[];
}

interface Props {
    menus: Menu[];
    allPermissions: string[];
    availableParents: Array<{ value: number; label: string }>;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

// ─── Helpers ─────────────────────────────────────────────
function buildUrl(path: string, teamSlug: string): string {
    return `/${teamSlug}${path}`;
}

function flattenMenus(menus: Menu[]): Menu[] {
    let flattened: Menu[] = [];
    for (const menu of menus) {
        flattened.push(menu);
        flattened = flattened.concat(flattenMenus(menu.children || []));
    }
    return flattened;
}

// ─── Modal Base ───────────────────────────────────────────
function Modal({
    onClose,
    children,
    maxWidth = '500px',
}: {
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
}) {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)',
                }}
                onClick={onClose}
            />
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth,
                    borderRadius: '16px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                    padding: '24px',
                }}
            >
                {children}
            </div>
        </div>
    );
}

// ─── Input Field ──────────────────────────────────────────
function Field({
    label,
    error,
    children,
    optional = false,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
    optional?: boolean;
}) {
    return (
        <div style={{ marginBottom: '16px' }}>
            <label
                style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--card-foreground)',
                    marginBottom: '6px',
                }}
            >
                {label}{' '}
                {!optional && (
                    <span style={{ color: 'var(--destructive)' }}>*</span>
                )}
            </label>
            {children}
            {error && (
                <p
                    style={{
                        fontSize: '12px',
                        color: 'var(--destructive)',
                        marginTop: '4px',
                    }}
                >
                    {error}
                </p>
            )}
        </div>
    );
}

const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%',
    height: '38px',
    borderRadius: '8px',
    border: hasError
        ? '1px solid var(--destructive)'
        : '1px solid var(--border)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: '14px',
    padding: '0 12px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
});

const selectStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%',
    height: '38px',
    borderRadius: '8px',
    border: hasError
        ? '1px solid var(--destructive)'
        : '1px solid var(--border)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: '14px',
    padding: '0 12px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
});

// ─── Create Menu Modal ─────────────────────────────────────
function CreateMenuModal({
    onClose,
    availableParents,
    teamSlug,
}: {
    onClose: () => void;
    availableParents: Array<{ value: number; label: string }>;
    teamSlug: string;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        label: '',
        route: '',
        icon: '',
        parent_id: '',
        module: '',
    });

    function submit() {
        post(buildUrl('/menus', teamSlug), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    }

    return (
        <Modal onClose={onClose} maxWidth="500px">
            <h2
                style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    marginBottom: '20px',
                    color: 'var(--foreground)',
                }}
            >
                Buat Menu Baru
            </h2>

            <Field label="Nama Menu" error={errors.name}>
                <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder="e.g., dashboard"
                    style={inputStyle(!!errors.name)}
                />
            </Field>

            <Field label="Label Menu" error={errors.label}>
                <input
                    type="text"
                    value={data.label}
                    onChange={(e) => setData('label', e.target.value)}
                    placeholder="e.g., Dashboard"
                    style={inputStyle(!!errors.label)}
                />
            </Field>

            <Field label="Route" error={errors.route} optional>
                <input
                    type="text"
                    value={data.route}
                    onChange={(e) => setData('route', e.target.value)}
                    placeholder="e.g., dashboard"
                    style={inputStyle(!!errors.route)}
                />
            </Field>

            <Field label="Icon" error={errors.icon} optional>
                <input
                    type="text"
                    value={data.icon}
                    onChange={(e) => setData('icon', e.target.value)}
                    placeholder="e.g., LayoutDashboard"
                    style={inputStyle(!!errors.icon)}
                />
            </Field>

            <Field label="Parent Menu" error={errors.parent_id} optional>
                <select
                    value={data.parent_id}
                    onChange={(e) => setData('parent_id', e.target.value)}
                    style={selectStyle(!!errors.parent_id)}
                >
                    <option value="">Tidak ada (Root Menu)</option>
                    {availableParents.map((p) => (
                        <option key={p.value} value={p.value}>
                            {p.label}
                        </option>
                    ))}
                </select>
            </Field>

            <Field label="Module" error={errors.module} optional>
                <input
                    type="text"
                    value={data.module}
                    onChange={(e) => setData('module', e.target.value)}
                    placeholder="e.g., user"
                    style={inputStyle(!!errors.module)}
                />
            </Field>

            <div
                style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '24px',
                    justifyContent: 'flex-end',
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                    }}
                >
                    Batal
                </button>
                <button
                    onClick={submit}
                    disabled={processing}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'hsl(214 100% 52%)',
                        color: 'white',
                        cursor: processing ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        opacity: processing ? 0.6 : 1,
                    }}
                >
                    {processing ? 'Menyimpan...' : 'Buat Menu'}
                </button>
            </div>
        </Modal>
    );
}

// ─── Edit Menu Modal ───────────────────────────────────────
function EditMenuModal({
    menu,
    onClose,
    availableParents,
    teamSlug,
}: {
    menu: Menu;
    onClose: () => void;
    availableParents: Array<{ value: number; label: string }>;
    teamSlug: string;
}) {
    const { data, setData, put, processing, errors } = useForm({
        label: menu.label,
        route: menu.route || '',
        icon: menu.icon || '',
        parent_id: menu.parent_id || '',
        sort_order: menu.sort_order,
        is_active: menu.is_active,
    });

    function submit() {
        put(buildUrl(`/menus/${menu.id}`, teamSlug), {
            onSuccess: () => {
                onClose();
            },
        });
    }

    return (
        <Modal onClose={onClose} maxWidth="500px">
            <h2
                style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    marginBottom: '20px',
                    color: 'var(--foreground)',
                }}
            >
                Edit Menu: {menu.label}
            </h2>

            <Field label="Label Menu" error={errors.label}>
                <input
                    type="text"
                    value={data.label}
                    onChange={(e) => setData('label', e.target.value)}
                    style={inputStyle(!!errors.label)}
                />
            </Field>

            <Field label="Route" error={errors.route} optional>
                <input
                    type="text"
                    value={data.route}
                    onChange={(e) => setData('route', e.target.value)}
                    style={inputStyle(!!errors.route)}
                />
            </Field>

            <Field label="Icon" error={errors.icon} optional>
                <input
                    type="text"
                    value={data.icon}
                    onChange={(e) => setData('icon', e.target.value)}
                    style={inputStyle(!!errors.icon)}
                />
            </Field>

            <Field label="Parent Menu" error={errors.parent_id} optional>
                <select
                    value={data.parent_id}
                    onChange={(e) => setData('parent_id', e.target.value)}
                    style={selectStyle(!!errors.parent_id)}
                >
                    <option value="">Tidak ada (Root Menu)</option>
                    {availableParents
                        .filter((p) => p.value !== menu.id)
                        .map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                            </option>
                        ))}
                </select>
            </Field>

            <Field label="Sort Order" error={errors.sort_order} optional>
                <input
                    type="number"
                    value={data.sort_order}
                    onChange={(e) =>
                        setData('sort_order', parseInt(e.target.value))
                    }
                    style={inputStyle(!!errors.sort_order)}
                />
            </Field>

            <Field label="Status Aktif" optional>
                <input
                    type="checkbox"
                    checked={data.is_active}
                    onChange={(e) => setData('is_active', e.target.checked)}
                    style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                    }}
                />
            </Field>

            <div
                style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '24px',
                    justifyContent: 'flex-end',
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                    }}
                >
                    Batal
                </button>
                <button
                    onClick={submit}
                    disabled={processing}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'hsl(214 100% 52%)',
                        color: 'white',
                        cursor: processing ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        opacity: processing ? 0.6 : 1,
                    }}
                >
                    {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
            </div>
        </Modal>
    );
}

// ─── Delete Confirmation Modal ─────────────────────────────
function DeleteConfirmModal({
    menu,
    onClose,
    teamSlug,
}: {
    menu: Menu;
    onClose: () => void;
    teamSlug: string;
}) {
    const [processing, setProcessing] = useState(false);

    function handleDelete() {
        setProcessing(true);
        router.delete(buildUrl(`/menus/${menu.id}`, teamSlug), {
            onSuccess: () => {
                onClose();
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    }

    return (
        <Modal onClose={onClose} maxWidth="400px">
            <h2
                style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    marginBottom: '12px',
                    color: 'var(--foreground)',
                }}
            >
                Hapus Menu?
            </h2>
            <p
                style={{
                    fontSize: '14px',
                    color: 'var(--muted-foreground)',
                    marginBottom: '24px',
                    lineHeight: '1.5',
                }}
            >
                Anda akan menghapus menu "<strong>{menu.label}</strong>"
                {menu.children && menu.children.length > 0 && (
                    <>
                        {' '}
                        beserta <strong>{menu.children.length}</strong> sub-menu
                    </>
                )}
                . Tindakan ini tidak dapat dibatalkan.
            </p>

            <div
                style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                }}
            >
                <button
                    onClick={onClose}
                    disabled={processing}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--foreground)',
                        cursor: processing ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        opacity: processing ? 0.6 : 1,
                    }}
                >
                    Batal
                </button>
                <button
                    onClick={handleDelete}
                    disabled={processing}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'hsl(0 84% 60%)',
                        color: 'white',
                        cursor: processing ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        opacity: processing ? 0.6 : 1,
                    }}
                >
                    {processing ? 'Menghapus...' : 'Hapus Menu'}
                </button>
            </div>
        </Modal>
    );
}

// ─── Menu Row ──────────────────────────────────────────────
function MenuRow({
    menu,
    expanded,
    onToggleExpand,
    onEdit,
    onDelete,
    searchQuery,
}: {
    menu: Menu;
    expanded: boolean;
    onToggleExpand: () => void;
    onEdit: () => void;
    onDelete: () => void;
    searchQuery: string;
}) {
    const hasChildren = menu.children && menu.children.length > 0;
    const isSearchHighlight =
        searchQuery &&
        (menu.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            menu.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div
            style={{
                backgroundColor: isSearchHighlight
                    ? 'rgba(59, 130, 246, 0.05)'
                    : 'transparent',
                borderRadius: '8px',
                marginBottom: '4px',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: 'transparent',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                }}
            >
                {/* Expand/Collapse Button */}
                <button
                    onClick={onToggleExpand}
                    style={{
                        display: hasChildren ? 'flex' : 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'var(--secondary)',
                        cursor: 'pointer',
                        color: 'var(--secondary-foreground)',
                    }}
                >
                    {expanded ? (
                        <ChevronDown size={18} />
                    ) : (
                        <ChevronUp size={18} />
                    )}
                </button>

                {/* Drag Handle */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        color: 'var(--muted-foreground)',
                        cursor: 'grab',
                    }}
                >
                    <GripVertical size={18} />
                </div>

                {/* Menu Icon */}
                {menu.icon && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--secondary)',
                            color: 'var(--secondary-foreground)',
                            fontSize: '12px',
                            fontWeight: 600,
                        }}
                    >
                        {menu.icon.substring(0, 2).toUpperCase()}
                    </div>
                )}

                {/* Menu Name & Label */}
                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--foreground)',
                        }}
                    >
                        {menu.label}
                    </div>
                    <div
                        style={{
                            fontSize: '12px',
                            color: 'var(--muted-foreground)',
                            marginTop: '2px',
                        }}
                    >
                        {menu.route || 'No route'}
                    </div>
                </div>

                {/* Permission Badge */}
                {menu.permissions && menu.permissions.length > 0 && (
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'hsl(142 76% 92%)',
                            color: 'hsl(142 76% 30%)',
                            fontSize: '11px',
                            fontWeight: 500,
                        }}
                    >
                        <Check size={12} />
                        {menu.permissions[0]}
                    </div>
                )}

                {/* Status Badge */}
                {!menu.is_active && (
                    <div
                        style={{
                            display: 'inline-flex',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(107, 114, 128, 0.1)',
                            color: 'rgb(107, 114, 128)',
                            fontSize: '11px',
                            fontWeight: 500,
                        }}
                    >
                        Inactive
                    </div>
                )}

                {/* Action Buttons */}
                <button
                    onClick={onEdit}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--muted-foreground)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        (
                            e.currentTarget as HTMLButtonElement
                        ).style.backgroundColor = 'var(--secondary)';
                        (e.currentTarget as HTMLButtonElement).style.color =
                            'var(--secondary-foreground)';
                    }}
                    onMouseLeave={(e) => {
                        (
                            e.currentTarget as HTMLButtonElement
                        ).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.color =
                            'var(--muted-foreground)';
                    }}
                >
                    <Edit2 size={16} />
                </button>

                <button
                    onClick={onDelete}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--muted-foreground)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        (
                            e.currentTarget as HTMLButtonElement
                        ).style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        (e.currentTarget as HTMLButtonElement).style.color =
                            'hsl(0 84% 60%)';
                    }}
                    onMouseLeave={(e) => {
                        (
                            e.currentTarget as HTMLButtonElement
                        ).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.color =
                            'var(--muted-foreground)';
                    }}
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Children */}
            {expanded &&
                hasChildren &&
                menu.children.map((child) => (
                    <div
                        key={child.id}
                        style={{ paddingLeft: '32px', marginTop: '4px' }}
                    >
                        <MenuTreeNode
                            menu={child}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            searchQuery={searchQuery}
                        />
                    </div>
                ))}
        </div>
    );
}

// ─── Menu Tree Node ────────────────────────────────────────
function MenuTreeNode({
    menu,
    onEdit,
    onDelete,
    searchQuery,
}: {
    menu: Menu;
    onEdit: () => void;
    onDelete: () => void;
    searchQuery: string;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <MenuRow
            menu={menu}
            expanded={expanded}
            onToggleExpand={() => setExpanded(!expanded)}
            onEdit={onEdit}
            onDelete={onDelete}
            searchQuery={searchQuery}
        />
    );
}

// ─── Main Component ────────────────────────────────────────
export default function MenuManagementIndex({
    menus,
    allPermissions,
    availableParents,
    canCreate,
    canUpdate,
    canDelete,
}: Props) {
    const { auth } = usePage().props as any;
    const teamSlug = auth?.user?.current_team?.slug ?? '';

    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
    const [deletingMenu, setDeletingMenu] = useState<Menu | null>(null);
    const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());

    // Filter menus based on search
    const filteredMenus = useMemo(() => {
        if (!searchQuery) return menus;

        const search = searchQuery.toLowerCase();
        const allFlat = flattenMenus(menus);
        const matchingIds = new Set(
            allFlat
                .filter(
                    (m) =>
                        m.label.toLowerCase().includes(search) ||
                        m.name.toLowerCase().includes(search),
                )
                .map((m) => m.id),
        );

        // If no matches, return original
        if (matchingIds.size === 0) return menus;

        // Rebuild tree showing only matching and their parents
        function filterTree(items: Menu[]): Menu[] {
            return items
                .map((item) => ({
                    ...item,
                    children: filterTree(item.children || []),
                }))
                .filter(
                    (item) =>
                        matchingIds.has(item.id) || item.children.length > 0,
                );
        }

        return filterTree(menus);
    }, [menus, searchQuery]);

    return (
        <>
            <Head title="Manajemen Menu" />

            <div style={{ padding: '24px' }}>
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '24px',
                    }}
                >
                    <div>
                        <h1
                            style={{
                                fontSize: '28px',
                                fontWeight: 700,
                                color: 'var(--foreground)',
                                margin: 0,
                            }}
                        >
                            Manajemen Menu
                        </h1>
                        <p
                            style={{
                                fontSize: '14px',
                                color: 'var(--muted-foreground)',
                                marginTop: '4px',
                                margin: 0,
                            }}
                        >
                            Kelola menu aplikasi dan permissions secara hierarki
                        </p>
                    </div>

                    {canCreate && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'hsl(214 100% 52%)',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 500,
                            }}
                        >
                            <Plus size={18} />
                            Buat Menu
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                <div
                    style={{
                        position: 'relative',
                        marginBottom: '24px',
                    }}
                >
                    <Search
                        size={18}
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--muted-foreground)',
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Cari menu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            maxWidth: '400px',
                            height: '40px',
                            paddingLeft: '40px',
                            paddingRight: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--background)',
                            color: 'var(--foreground)',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* Menu List */}
                <div
                    style={{
                        backgroundColor: 'var(--card)',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        padding: '16px',
                    }}
                >
                    {filteredMenus.length === 0 ? (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '32px',
                                color: 'var(--muted-foreground)',
                            }}
                        >
                            <p style={{ fontSize: '14px', margin: 0 }}>
                                {searchQuery
                                    ? 'Tidak ada menu yang sesuai dengan pencarian'
                                    : 'Belum ada menu. Buat menu baru untuk memulai.'}
                            </p>
                        </div>
                    ) : (
                        filteredMenus.map((menu) => (
                            <MenuTreeNode
                                key={menu.id}
                                menu={menu}
                                onEdit={() => setEditingMenu(menu)}
                                onDelete={() => setDeletingMenu(menu)}
                                searchQuery={searchQuery}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Modals */}
            {showCreateModal && (
                <CreateMenuModal
                    onClose={() => setShowCreateModal(false)}
                    availableParents={availableParents}
                    teamSlug={teamSlug}
                />
            )}

            {editingMenu && (
                <EditMenuModal
                    menu={editingMenu}
                    onClose={() => setEditingMenu(null)}
                    availableParents={availableParents}
                    teamSlug={teamSlug}
                />
            )}

            {deletingMenu && (
                <DeleteConfirmModal
                    menu={deletingMenu}
                    onClose={() => setDeletingMenu(null)}
                    teamSlug={teamSlug}
                />
            )}
        </>
    );
}
