import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Edit3,
    KeyRound,
    Plus,
    Search,
    Shield,
    Trash2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface PermissionItem {
    id: number;
    name: string;
    label: string;
    description: string | null;
    module: string;
}

interface RoleItem {
    id: number;
    name: string;
    label: string;
    description: string | null;
    is_system: boolean;
    is_global?: boolean;
    team?: {
        id: number;
        name: string;
        slug: string;
    } | null;
    permissions_count: number;
    users_count: number;
    permissions: string[];
}

interface Props {
    roles: RoleItem[];
    allPermissions: Record<string, PermissionItem[]>;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canAssignPermission: boolean;
}

type SortKey = 'label' | 'name' | 'permissions_count' | 'users_count';
type SortDirection = 'asc' | 'desc';

const pageSizeOptions = [5, 10, 25, 50];

function buildUrl(path: string, teamSlug: string): string {
    return `/${teamSlug}${path}`;
}

function getSortValue(role: RoleItem, key: SortKey): string | number {
    return role[key] ?? '';
}

function Badge({
    children,
    color = 'default',
}: {
    children: React.ReactNode;
    color?: 'default' | 'blue' | 'amber' | 'green';
}) {
    const colors = {
        default: { bg: 'var(--muted)', text: 'var(--muted-foreground)' },
        blue: { bg: 'hsl(214 100% 95%)', text: 'hsl(214 100% 40%)' },
        amber: { bg: 'hsl(43 96% 92%)', text: 'hsl(43 96% 30%)' },
        green: { bg: 'hsl(142 76% 92%)', text: 'hsl(142 76% 30%)' },
    };
    const c = colors[color];

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: c.bg,
                color: c.text,
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </span>
    );
}

function Modal({
    children,
    onClose,
    maxWidth = '720px',
}: {
    children: React.ReactNode;
    onClose: () => void;
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
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(4px)',
                }}
            />
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth,
                    maxHeight: '90vh',
                    overflow: 'auto',
                    borderRadius: '12px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.16)',
                    padding: '24px',
                }}
            >
                {children}
            </div>
        </div>
    );
}

function PermissionPicker({
    permissions,
    value,
    onChange,
}: {
    permissions: Record<string, PermissionItem[]>;
    value: string[];
    onChange: (value: string[]) => void;
}) {
    function toggle(permission: string) {
        onChange(
            value.includes(permission)
                ? value.filter((item) => item !== permission)
                : [...value, permission],
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(permissions).map(([module, items]) => (
                <div
                    key={module}
                    style={{
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            padding: '10px 12px',
                            backgroundColor: 'var(--muted)',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--muted-foreground)',
                            textTransform: 'uppercase',
                        }}
                    >
                        {module}
                    </div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '1px',
                            backgroundColor: 'var(--border)',
                        }}
                    >
                        {items.map((permission) => (
                            <label
                                key={permission.name}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    padding: '10px 12px',
                                    backgroundColor: 'var(--card)',
                                    cursor: 'pointer',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={value.includes(permission.name)}
                                    onChange={() => toggle(permission.name)}
                                    style={{ marginTop: '2px' }}
                                />
                                <span>
                                    <span
                                        style={{
                                            display: 'block',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            color: 'var(--foreground)',
                                        }}
                                    >
                                        {permission.label}
                                    </span>
                                    <span
                                        style={{
                                            display: 'block',
                                            fontSize: '12px',
                                            color: 'var(--muted-foreground)',
                                        }}
                                    >
                                        {permission.name}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function RoleFormModal({
    role,
    allPermissions,
    teamSlug,
    canUpdate,
    canAssignPermission,
    onClose,
}: {
    role?: RoleItem;
    allPermissions: Record<string, PermissionItem[]>;
    teamSlug: string;
    canUpdate: boolean;
    canAssignPermission: boolean;
    onClose: () => void;
}) {
    const isEdit = Boolean(role);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: role?.name ?? '',
        label: role?.label ?? '',
        description: role?.description ?? '',
        permissions: role?.permissions ?? [],
    });

    function submit() {
        if (isEdit && role) {
            if (!canUpdate && canAssignPermission) {
                router.post(
                    buildUrl(`/roles/${role.id}/permissions`, teamSlug),
                    { permissions: data.permissions },
                    { onSuccess: onClose },
                );

                return;
            }

            put(buildUrl(`/roles/${role.id}`, teamSlug), {
                onSuccess: onClose,
            });

            return;
        }

        post(buildUrl('/roles', teamSlug), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    }

    return (
        <Modal onClose={onClose}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '20px',
                }}
            >
                <div
                    style={{
                        height: '40px',
                        width: '40px',
                        borderRadius: '10px',
                        backgroundColor: 'hsl(214 100% 95%)',
                        color: 'hsl(214 100% 40%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Shield size={18} />
                </div>
                <div>
                    <h2
                        style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            margin: 0,
                            color: 'var(--foreground)',
                        }}
                    >
                        {isEdit ? 'Edit Role' : 'Buat Role'}
                    </h2>
                    <p
                        style={{
                            fontSize: '13px',
                            color: 'var(--muted-foreground)',
                            margin: 0,
                        }}
                    >
                        Atur role dan permission Spatie untuk tim ini
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '12px',
                    }}
                >
                    <div>
                        <label style={labelStyle}>Nama Role</label>
                        <input
                            value={data.name}
                            onChange={(event) =>
                                setData('name', event.target.value)
                            }
                            disabled={isEdit}
                            placeholder="contoh: supervisor"
                            style={inputStyle(Boolean(errors.name), isEdit)}
                        />
                        {errors.name && <p style={errorStyle}>{errors.name}</p>}
                    </div>
                    <div>
                        <label style={labelStyle}>Label</label>
                        <input
                            value={data.label}
                            onChange={(event) =>
                                setData('label', event.target.value)
                            }
                            disabled={isEdit && !canUpdate}
                            placeholder="contoh: Supervisor"
                            style={inputStyle(
                                Boolean(errors.label),
                                isEdit && !canUpdate,
                            )}
                        />
                        {errors.label && (
                            <p style={errorStyle}>{errors.label}</p>
                        )}
                    </div>
                </div>

                <div>
                    <label style={labelStyle}>Deskripsi</label>
                    <textarea
                        value={data.description}
                        onChange={(event) =>
                            setData('description', event.target.value)
                        }
                        disabled={isEdit && !canUpdate}
                        rows={3}
                        style={{
                            ...inputStyle(
                                Boolean(errors.description),
                                isEdit && !canUpdate,
                            ),
                            height: 'auto',
                            padding: '10px 12px',
                            resize: 'vertical',
                        }}
                    />
                    {errors.description && (
                        <p style={errorStyle}>{errors.description}</p>
                    )}
                </div>

                {canAssignPermission && (
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '8px',
                            }}
                        >
                            <label style={{ ...labelStyle, marginBottom: 0 }}>
                                Permissions
                            </label>
                            <Badge color="blue">
                                {data.permissions.length} dipilih
                            </Badge>
                        </div>
                        <PermissionPicker
                            permissions={allPermissions}
                            value={data.permissions}
                            onChange={(value) => setData('permissions', value)}
                        />
                        {errors.permissions && (
                            <p style={errorStyle}>{errors.permissions}</p>
                        )}
                    </div>
                )}

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '8px',
                        marginTop: '4px',
                    }}
                >
                    <button
                        onClick={onClose}
                        disabled={processing}
                        style={secondaryButtonStyle}
                    >
                        Batal
                    </button>
                    <button
                        onClick={submit}
                        disabled={processing}
                        style={{
                            ...primaryButtonStyle,
                            opacity: processing ? 0.6 : 1,
                        }}
                    >
                        {processing ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function DeleteRoleModal({
    role,
    teamSlug,
    onClose,
}: {
    role: RoleItem;
    teamSlug: string;
    onClose: () => void;
}) {
    const [deleting, setDeleting] = useState(false);

    function confirm() {
        setDeleting(true);
        router.delete(buildUrl(`/roles/${role.id}`, teamSlug), {
            onFinish: () => {
                setDeleting(false);
                onClose();
            },
        });
    }

    return (
        <Modal onClose={onClose} maxWidth="420px">
            <h2
                style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    margin: '0 0 6px',
                    color: 'var(--foreground)',
                }}
            >
                Hapus Role
            </h2>
            <p
                style={{
                    fontSize: '13px',
                    color: 'var(--muted-foreground)',
                    margin: '0 0 18px',
                }}
            >
                Hapus role <strong>{role.label}</strong>? Tindakan ini tidak
                dapat dibatalkan.
            </p>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                }}
            >
                <button
                    onClick={onClose}
                    disabled={deleting}
                    style={secondaryButtonStyle}
                >
                    Batal
                </button>
                <button
                    onClick={confirm}
                    disabled={deleting}
                    style={{
                        ...dangerButtonStyle,
                        opacity: deleting ? 0.6 : 1,
                    }}
                >
                    {deleting ? 'Menghapus...' : 'Hapus'}
                </button>
            </div>
        </Modal>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--foreground)',
};

const errorStyle: React.CSSProperties = {
    margin: '4px 0 0',
    fontSize: '12px',
    color: 'var(--destructive)',
};

function inputStyle(
    hasError?: boolean,
    disabled?: boolean,
): React.CSSProperties {
    return {
        width: '100%',
        minHeight: '38px',
        borderRadius: '8px',
        border: hasError
            ? '1px solid var(--destructive)'
            : '1px solid var(--border)',
        backgroundColor: disabled ? 'var(--muted)' : 'var(--background)',
        color: 'var(--foreground)',
        fontSize: '14px',
        padding: '0 12px',
        outline: 'none',
        boxSizing: 'border-box',
    };
}

const primaryButtonStyle: React.CSSProperties = {
    height: '38px',
    padding: '0 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--primary)',
    color: 'var(--primary-foreground)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
};

const secondaryButtonStyle: React.CSSProperties = {
    height: '38px',
    padding: '0 16px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--foreground)',
    fontSize: '14px',
    cursor: 'pointer',
};

const dangerButtonStyle: React.CSSProperties = {
    ...primaryButtonStyle,
    backgroundColor: 'hsl(0 72% 50%)',
    color: '#fff',
};

export default function RolesIndex({
    roles,
    allPermissions,
    canCreate,
    canUpdate,
    canDelete,
    canAssignPermission,
}: Props) {
    const { auth } = usePage().props as any;
    const teamSlug: string = auth?.user?.current_team?.slug ?? '';
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('label');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
    const [deletingRole, setDeletingRole] = useState<RoleItem | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const filteredRoles = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return roles.filter((role) => {
            const searchableText = [
                role.name,
                role.label,
                role.description,
                role.team?.name,
                ...role.permissions,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return !keyword || searchableText.includes(keyword);
        });
    }, [roles, search]);

    const sortedRoles = useMemo(() => {
        return [...filteredRoles].sort((a, b) => {
            const aValue = getSortValue(a, sortKey);
            const bValue = getSortValue(b, sortKey);

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortDirection === 'asc'
                    ? aValue - bValue
                    : bValue - aValue;
            }

            const compared = String(aValue).localeCompare(
                String(bValue),
                'id-ID',
                {
                    sensitivity: 'base',
                },
            );

            return sortDirection === 'asc' ? compared : -compared;
        });
    }, [filteredRoles, sortDirection, sortKey]);

    const totalPages = Math.max(1, Math.ceil(sortedRoles.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageStart = (currentPage - 1) * pageSize;
    const paginatedRoles = sortedRoles.slice(pageStart, pageStart + pageSize);
    const fromItem = sortedRoles.length === 0 ? 0 : pageStart + 1;
    const toItem = Math.min(pageStart + pageSize, sortedRoles.length);

    function toggleSort(key: SortKey) {
        setPage(1);

        if (sortKey === key) {
            setSortDirection((direction) =>
                direction === 'asc' ? 'desc' : 'asc',
            );

            return;
        }

        setSortKey(key);
        setSortDirection('asc');
    }

    return (
        <>
            <Head title="Role & Permission" />

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                        flexWrap: 'wrap',
                    }}
                >
                    <div>
                        <h1
                            style={{
                                fontSize: '24px',
                                fontWeight: 700,
                                margin: 0,
                                color: 'var(--foreground)',
                            }}
                        >
                            Role & Permission
                        </h1>
                        <p
                            style={{
                                margin: '4px 0 0',
                                fontSize: '14px',
                                color: 'var(--muted-foreground)',
                            }}
                        >
                            Kelola role dan permission Spatie untuk tim aktif
                        </p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setShowCreate(true)}
                            style={primaryButtonStyle}
                        >
                            <Plus size={16} />
                            Buat Role
                        </button>
                    )}
                </div>

                <div
                    style={{
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--card)',
                        overflow: 'hidden',
                    }}
                >
                    {roles.length === 0 ? (
                        <div
                            style={{
                                padding: '56px 20px',
                                textAlign: 'center',
                                color: 'var(--muted-foreground)',
                            }}
                        >
                            <KeyRound size={28} />
                            <p
                                style={{
                                    margin: '12px 0 4px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                }}
                            >
                                Belum ada role
                            </p>
                            <p style={{ margin: 0, fontSize: '13px' }}>
                                Buat role pertama untuk mengatur akses user.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    flexWrap: 'wrap',
                                    padding: '14px 16px',
                                    borderBottom: '1px solid var(--border)',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'relative',
                                        flex: '1 1 260px',
                                        maxWidth: '360px',
                                    }}
                                >
                                    <Search
                                        size={16}
                                        style={{
                                            position: 'absolute',
                                            left: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'var(--muted-foreground)',
                                        }}
                                    />
                                    <input
                                        value={search}
                                        onChange={(event) => {
                                            setSearch(event.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Cari role atau permission"
                                        style={{
                                            ...inputStyle(),
                                            paddingLeft: '36px',
                                        }}
                                    />
                                </div>
                                <select
                                    value={pageSize}
                                    onChange={(event) => {
                                        setPageSize(Number(event.target.value));
                                        setPage(1);
                                    }}
                                    style={{
                                        height: '38px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--background)',
                                        color: 'var(--foreground)',
                                        fontSize: '14px',
                                        padding: '0 12px',
                                    }}
                                >
                                    {pageSizeOptions.map((size) => (
                                        <option key={size} value={size}>
                                            {size} / halaman
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table
                                    style={{
                                        width: '100%',
                                        minWidth: '820px',
                                        borderCollapse: 'collapse',
                                    }}
                                >
                                    <thead>
                                        <tr
                                            style={{
                                                backgroundColor: 'var(--muted)',
                                                borderBottom:
                                                    '1px solid var(--border)',
                                            }}
                                        >
                                            {[
                                                ['label', 'Role'],
                                                ['name', 'Nama'],
                                                [
                                                    'permissions_count',
                                                    'Permission',
                                                ],
                                                ['users_count', 'User'],
                                            ].map(([key, label]) => (
                                                <th key={key} style={thStyle}>
                                                    <button
                                                        onClick={() =>
                                                            toggleSort(
                                                                key as SortKey,
                                                            )
                                                        }
                                                        style={sortButtonStyle}
                                                    >
                                                        {label}
                                                        <ChevronsUpDown
                                                            size={13}
                                                        />
                                                        {sortKey === key && (
                                                            <span
                                                                style={{
                                                                    fontSize:
                                                                        '10px',
                                                                    color: 'var(--foreground)',
                                                                }}
                                                            >
                                                                {sortDirection ===
                                                                'asc'
                                                                    ? 'ASC'
                                                                    : 'DESC'}
                                                            </span>
                                                        )}
                                                    </button>
                                                </th>
                                            ))}
                                            <th
                                                style={{
                                                    ...thStyle,
                                                    textAlign: 'right',
                                                }}
                                            >
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedRoles.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    style={{
                                                        padding: '40px 16px',
                                                        textAlign: 'center',
                                                        color: 'var(--muted-foreground)',
                                                        fontSize: '14px',
                                                    }}
                                                >
                                                    Tidak ada role yang cocok
                                                    dengan pencarian.
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedRoles.map(
                                                (role, index) => (
                                                    <tr
                                                        key={role.id}
                                                        style={{
                                                            borderBottom:
                                                                index <
                                                                paginatedRoles.length -
                                                                    1
                                                                    ? '1px solid var(--border)'
                                                                    : 'none',
                                                        }}
                                                    >
                                                        <td style={tdStyle}>
                                                            <div
                                                                style={{
                                                                    display:
                                                                        'flex',
                                                                    alignItems:
                                                                        'center',
                                                                    gap: '10px',
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        height: '34px',
                                                                        width: '34px',
                                                                        borderRadius:
                                                                            '8px',
                                                                        backgroundColor:
                                                                            'hsl(214 100% 95%)',
                                                                        color: 'hsl(214 100% 40%)',
                                                                        display:
                                                                            'flex',
                                                                        alignItems:
                                                                            'center',
                                                                        justifyContent:
                                                                            'center',
                                                                    }}
                                                                >
                                                                    <Shield
                                                                        size={
                                                                            16
                                                                        }
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <div
                                                                        style={{
                                                                            display:
                                                                                'flex',
                                                                            alignItems:
                                                                                'center',
                                                                            gap: '6px',
                                                                        }}
                                                                    >
                                                                        <span
                                                                            style={{
                                                                                fontSize:
                                                                                    '14px',
                                                                                fontWeight: 600,
                                                                                color: 'var(--foreground)',
                                                                            }}
                                                                        >
                                                                            {
                                                                                role.label
                                                                            }
                                                                        </span>
                                                                        {role.is_system && (
                                                                            <Badge color="amber">
                                                                                Sistem
                                                                            </Badge>
                                                                        )}
                                                                        {role.is_global && (
                                                                            <Badge color="blue">
                                                                                Global
                                                                            </Badge>
                                                                        )}
                                                                        {role.team && (
                                                                            <Badge>
                                                                                {
                                                                                    role
                                                                                        .team
                                                                                        .name
                                                                                }
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <span
                                                                        style={{
                                                                            fontSize:
                                                                                '12px',
                                                                            color: 'var(--muted-foreground)',
                                                                        }}
                                                                    >
                                                                        {role.description ??
                                                                            '-'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={tdStyle}>
                                                            <Badge>
                                                                {role.name}
                                                            </Badge>
                                                        </td>
                                                        <td style={tdStyle}>
                                                            {role.permissions
                                                                .length > 0 ? (
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            'flex',
                                                                        flexWrap:
                                                                            'wrap',
                                                                        gap: '6px',
                                                                        maxWidth:
                                                                            '420px',
                                                                    }}
                                                                >
                                                                    {role.permissions.map(
                                                                        (
                                                                            permission,
                                                                        ) => (
                                                                            <Badge
                                                                                key={
                                                                                    permission
                                                                                }
                                                                                color="blue"
                                                                            >
                                                                                {
                                                                                    permission
                                                                                }
                                                                            </Badge>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span
                                                                    style={{
                                                                        color: 'var(--muted-foreground)',
                                                                        fontSize:
                                                                            '13px',
                                                                    }}
                                                                >
                                                                    -
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={tdStyle}>
                                                            <Badge color="green">
                                                                {
                                                                    role.users_count
                                                                }{' '}
                                                                user
                                                            </Badge>
                                                        </td>
                                                        <td
                                                            style={{
                                                                ...tdStyle,
                                                                textAlign:
                                                                    'right',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display:
                                                                        'inline-flex',
                                                                    gap: '6px',
                                                                }}
                                                            >
                                                                {(canUpdate ||
                                                                    canAssignPermission) && (
                                                                    <button
                                                                        onClick={() =>
                                                                            setEditingRole(
                                                                                role,
                                                                            )
                                                                        }
                                                                        style={
                                                                            iconButtonStyle
                                                                        }
                                                                    >
                                                                        <Edit3
                                                                            size={
                                                                                15
                                                                            }
                                                                        />
                                                                    </button>
                                                                )}
                                                                {canDelete &&
                                                                    !role.is_system &&
                                                                    !role.is_global && (
                                                                        <button
                                                                            onClick={() =>
                                                                                setDeletingRole(
                                                                                    role,
                                                                                )
                                                                            }
                                                                            style={{
                                                                                ...iconButtonStyle,
                                                                                color: 'hsl(0 72% 50%)',
                                                                            }}
                                                                        >
                                                                            <Trash2
                                                                                size={
                                                                                    15
                                                                                }
                                                                            />
                                                                        </button>
                                                                    )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ),
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    flexWrap: 'wrap',
                                    padding: '12px 16px',
                                    borderTop: '1px solid var(--border)',
                                    fontSize: '13px',
                                    color: 'var(--muted-foreground)',
                                }}
                            >
                                <span>
                                    Menampilkan {fromItem}-{toItem} dari{' '}
                                    {sortedRoles.length} role
                                </span>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    <button
                                        onClick={() =>
                                            setPage(
                                                Math.max(1, currentPage - 1),
                                            )
                                        }
                                        disabled={currentPage === 1}
                                        style={{
                                            ...pagerButtonStyle,
                                            opacity:
                                                currentPage === 1 ? 0.5 : 1,
                                        }}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span>
                                        Halaman {currentPage} dari {totalPages}
                                    </span>
                                    <button
                                        onClick={() =>
                                            setPage(
                                                Math.min(
                                                    totalPages,
                                                    currentPage + 1,
                                                ),
                                            )
                                        }
                                        disabled={currentPage === totalPages}
                                        style={{
                                            ...pagerButtonStyle,
                                            opacity:
                                                currentPage === totalPages
                                                    ? 0.5
                                                    : 1,
                                        }}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showCreate && (
                <RoleFormModal
                    allPermissions={allPermissions}
                    teamSlug={teamSlug}
                    canUpdate={canUpdate}
                    canAssignPermission={canAssignPermission}
                    onClose={() => setShowCreate(false)}
                />
            )}
            {editingRole && (
                <RoleFormModal
                    role={editingRole}
                    allPermissions={allPermissions}
                    teamSlug={teamSlug}
                    canUpdate={canUpdate}
                    canAssignPermission={canAssignPermission}
                    onClose={() => setEditingRole(null)}
                />
            )}
            {deletingRole && (
                <DeleteRoleModal
                    role={deletingRole}
                    teamSlug={teamSlug}
                    onClose={() => setDeletingRole(null)}
                />
            )}
        </>
    );
}

const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--muted-foreground)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
    padding: '14px 16px',
    fontSize: '14px',
    color: 'var(--foreground)',
};

const sortButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    textTransform: 'inherit',
    letterSpacing: 'inherit',
    padding: 0,
    cursor: 'pointer',
};

const iconButtonStyle: React.CSSProperties = {
    height: '32px',
    width: '32px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const pagerButtonStyle: React.CSSProperties = {
    ...iconButtonStyle,
    height: '34px',
    width: '34px',
};
