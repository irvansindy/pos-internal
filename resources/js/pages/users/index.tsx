import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Crown,
    KeyRound,
    Mail,
    MoreVertical,
    Search,
    Shield,
    Trash2,
    UserPlus,
    Users,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

// ─── Types ───────────────────────────────────────────────
interface Member {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    team_role: string | null;
    team_role_label: string | null;
    is_owner: boolean;
    roles: string[];
    joined_at: string | null;
}

interface RoleOption {
    value: string;
    label: string;
}

interface Props {
    members: Member[];
    availableRoles: RoleOption[];
    teamRoles: RoleOption[];
    canInvite: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

type SortKey = 'member' | 'team_role' | 'system_role' | 'joined_at';
type SortDirection = 'asc' | 'desc';

const pageSizeOptions = [5, 10, 25, 50];

// ─── Helpers ─────────────────────────────────────────────
function buildUrl(path: string, teamSlug: string): string {
    return `/${teamSlug}${path}`;
}

function formatDate(date: string | null): string {
    if (!date) {
        return '-';
    }

    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
        new Date(date),
    );
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function getSortValue(member: Member, key: SortKey): string | number {
    if (key === 'member') {
        return `${member.name} ${member.email}`;
    }

    if (key === 'team_role') {
        return member.team_role_label ?? member.team_role ?? '';
    }

    if (key === 'system_role') {
        return member.roles.join(' ');
    }

    return member.joined_at
        ? new Date(member.joined_at).getTime()
        : Number.MAX_SAFE_INTEGER;
}

// ─── Avatar ──────────────────────────────────────────────
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
    const colors = [
        '#3b82f6',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#8b5cf6',
        '#ec4899',
        '#06b6d4',
        '#84cc16',
    ];
    const color = colors[name.charCodeAt(0) % colors.length];

    return (
        <div
            style={{
                height: size,
                width: size,
                borderRadius: '50%',
                backgroundColor: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: size * 0.35,
                fontWeight: 600,
                color: '#fff',
                flexShrink: 0,
                userSelect: 'none',
            }}
        >
            {getInitials(name)}
        </div>
    );
}

// ─── Badge ───────────────────────────────────────────────
function Badge({
    children,
    color = 'default',
}: {
    children: React.ReactNode;
    color?: 'default' | 'blue' | 'green' | 'amber' | 'red';
}) {
    const colors = {
        default: { bg: 'var(--muted)', text: 'var(--muted-foreground)' },
        blue: { bg: 'hsl(214 100% 95%)', text: 'hsl(214 100% 40%)' },
        green: { bg: 'hsl(142 76% 92%)', text: 'hsl(142 76% 30%)' },
        amber: { bg: 'hsl(43 96% 92%)', text: 'hsl(43 96% 30%)' },
        red: { bg: 'hsl(0 72% 94%)', text: 'hsl(0 72% 40%)' },
    };
    const c = colors[color];

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: c.bg,
                color: c.text,
            }}
        >
            {children}
        </span>
    );
}

// ─── Modal Base ───────────────────────────────────────────
function Modal({
    onClose,
    children,
    maxWidth = '440px',
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

// ─── Input ────────────────────────────────────────────────
function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label
                style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--card-foreground)',
                    marginBottom: '6px',
                }}
            >
                {label} <span style={{ color: 'var(--destructive)' }}>*</span>
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
});

const selectStyle: React.CSSProperties = {
    width: '100%',
    height: '38px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: '14px',
    padding: '0 12px',
    outline: 'none',
};

// ─── Invite Modal ─────────────────────────────────────────
function InviteModal({
    onClose,
    teamRoles,
}: {
    onClose: () => void;
    teamRoles: RoleOption[];
}) {
    const { auth } = usePage().props as any;
    const teamSlug = auth?.user?.current_team?.slug ?? '';
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        role: 'member',
    });

    function submit() {
        post(buildUrl('/invitations', teamSlug), {
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
                    <UserPlus size={18} />
                </div>
                <div>
                    <h2
                        style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            margin: 0,
                            color: 'var(--card-foreground)',
                        }}
                    >
                        Undang Anggota
                    </h2>
                    <p
                        style={{
                            fontSize: '13px',
                            color: 'var(--muted-foreground)',
                            margin: 0,
                        }}
                    >
                        Kirim undangan via email
                    </p>
                </div>
            </div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                }}
            >
                <Field label="Email" error={errors.email}>
                    <input
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="user@example.com"
                        autoFocus
                        style={inputStyle(!!errors.email)}
                    />
                </Field>
                <Field label="Role">
                    <select
                        value={data.role}
                        onChange={(e) => setData('role', e.target.value)}
                        style={selectStyle}
                    >
                        {teamRoles.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                </Field>
                <div
                    style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'flex-end',
                        marginTop: '4px',
                    }}
                >
                    <button
                        onClick={onClose}
                        disabled={processing}
                        style={{
                            height: '38px',
                            padding: '0 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'transparent',
                            color: 'var(--foreground)',
                            fontSize: '14px',
                            cursor: 'pointer',
                        }}
                    >
                        Batal
                    </button>
                    <button
                        onClick={submit}
                        disabled={processing}
                        style={{
                            height: '38px',
                            padding: '0 20px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'var(--primary)',
                            color: 'var(--primary-foreground)',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: processing ? 0.6 : 1,
                        }}
                    >
                        <Mail size={14} />
                        {processing ? 'Mengirim...' : 'Kirim Undangan'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Edit Role Modal ──────────────────────────────────────
function EditRoleModal({
    member,
    teamSlug,
    teamRoles,
    availableRoles,
    onClose,
}: {
    member: Member;
    teamSlug: string;
    teamRoles: RoleOption[];
    availableRoles: RoleOption[];
    onClose: () => void;
}) {
    const { data, setData, put, processing, errors } = useForm({
        team_role: member.team_role ?? 'member',
        role: member.roles[0] ?? '',
    });

    function submit() {
        put(buildUrl(`/users/${member.id}`, teamSlug), { onSuccess: onClose });
    }

    return (
        <Modal onClose={onClose} maxWidth="420px">
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
                            color: 'var(--card-foreground)',
                        }}
                    >
                        Edit Role
                    </h2>
                    <p
                        style={{
                            fontSize: '13px',
                            color: 'var(--muted-foreground)',
                            margin: 0,
                        }}
                    >
                        Ubah role untuk <strong>{member.name}</strong>
                    </p>
                </div>
            </div>

            {/* Member info */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--muted)',
                    marginBottom: '20px',
                }}
            >
                <Avatar name={member.name} size={32} />
                <div>
                    <div
                        style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'var(--card-foreground)',
                        }}
                    >
                        {member.name}
                    </div>
                    <div
                        style={{
                            fontSize: '12px',
                            color: 'var(--muted-foreground)',
                        }}
                    >
                        {member.email}
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                }}
            >
                <Field label="Role Tim" error={errors.team_role}>
                    <select
                        value={data.team_role}
                        onChange={(e) => setData('team_role', e.target.value)}
                        style={selectStyle}
                    >
                        {teamRoles.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                </Field>

                {availableRoles.length > 0 && (
                    <Field label="Role Sistem" error={errors.role}>
                        <select
                            value={data.role}
                            onChange={(e) => setData('role', e.target.value)}
                            style={selectStyle}
                        >
                            <option value="">-- Tidak ada --</option>
                            {availableRoles.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}

                <div
                    style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'flex-end',
                        marginTop: '4px',
                    }}
                >
                    <button
                        onClick={onClose}
                        disabled={processing}
                        style={{
                            height: '38px',
                            padding: '0 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'transparent',
                            color: 'var(--foreground)',
                            fontSize: '14px',
                            cursor: 'pointer',
                        }}
                    >
                        Batal
                    </button>
                    <button
                        onClick={submit}
                        disabled={processing}
                        style={{
                            height: '38px',
                            padding: '0 20px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'var(--primary)',
                            color: 'var(--primary-foreground)',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
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

// ─── Reset Password Modal ─────────────────────────────────
function ResetPasswordModal({
    member,
    teamSlug,
    onClose,
}: {
    member: Member;
    teamSlug: string;
    onClose: () => void;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
        password_confirmation: '',
    });

    function submit() {
        post(buildUrl(`/users/${member.id}/set-password`, teamSlug), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    }

    return (
        <Modal onClose={onClose} maxWidth="400px">
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
                        backgroundColor: 'hsl(43 96% 92%)',
                        color: 'hsl(43 96% 30%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <KeyRound size={18} />
                </div>
                <div>
                    <h2
                        style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            margin: '0 0 4px',
                            color: 'var(--card-foreground)',
                        }}
                    >
                        Reset Password
                    </h2>
                    <p
                        style={{
                            fontSize: '13px',
                            color: 'var(--muted-foreground)',
                            margin: 0,
                        }}
                    >
                        Reset password untuk <strong>{member.name}</strong>
                    </p>
                </div>
            </div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                }}
            >
                <Field label="Password Baru" error={errors.password}>
                    <input
                        type="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="Minimal 8 karakter"
                        autoFocus
                        style={inputStyle(!!errors.password)}
                    />
                </Field>
                <Field label="Konfirmasi Password">
                    <input
                        type="password"
                        value={data.password_confirmation}
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        placeholder="Ulangi password"
                        style={inputStyle()}
                    />
                </Field>
                <div
                    style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'flex-end',
                        marginTop: '8px',
                    }}
                >
                    <button
                        onClick={onClose}
                        disabled={processing}
                        style={{
                            height: '38px',
                            padding: '0 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'transparent',
                            color: 'var(--foreground)',
                            fontSize: '14px',
                            cursor: 'pointer',
                        }}
                    >
                        Batal
                    </button>
                    <button
                        onClick={submit}
                        disabled={processing}
                        style={{
                            height: '38px',
                            padding: '0 20px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'var(--primary)',
                            color: 'var(--primary-foreground)',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            opacity: processing ? 0.6 : 1,
                        }}
                    >
                        {processing ? 'Menyimpan...' : 'Reset Password'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Confirm Delete Modal ─────────────────────────────────
function ConfirmDeleteModal({
    member,
    teamSlug,
    onClose,
}: {
    member: Member;
    teamSlug: string;
    onClose: () => void;
}) {
    const [deleting, setDeleting] = useState(false);

    function confirm() {
        setDeleting(true);
        router.delete(buildUrl(`/users/${member.id}`, teamSlug), {
            onFinish: () => {
                setDeleting(false);
                onClose();
            },
        });
    }

    return (
        <Modal onClose={onClose} maxWidth="380px">
            <div style={{ marginBottom: '16px' }}>
                <h2
                    style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        margin: '0 0 6px',
                        color: 'var(--card-foreground)',
                    }}
                >
                    Hapus Anggota
                </h2>
                <p
                    style={{
                        fontSize: '13px',
                        color: 'var(--muted-foreground)',
                        margin: 0,
                    }}
                >
                    Apakah Anda yakin ingin menghapus{' '}
                    <strong>{member.name}</strong> dari tim? Tindakan ini tidak
                    dapat dibatalkan.
                </p>
            </div>
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'flex-end',
                }}
            >
                <button
                    onClick={onClose}
                    disabled={deleting}
                    style={{
                        height: '38px',
                        padding: '0 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--foreground)',
                        fontSize: '14px',
                        cursor: 'pointer',
                    }}
                >
                    Batal
                </button>
                <button
                    onClick={confirm}
                    disabled={deleting}
                    style={{
                        height: '38px',
                        padding: '0 20px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'hsl(0 72% 50%)',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        opacity: deleting ? 0.6 : 1,
                    }}
                >
                    {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
            </div>
        </Modal>
    );
}

// ─── Member Row Actions ───────────────────────────────────
function MemberActions({
    member,
    teamSlug,
    teamRoles,
    availableRoles,
    canUpdate,
    canDelete,
    authUserId,
}: {
    member: Member;
    teamSlug: string;
    teamRoles: RoleOption[];
    availableRoles: RoleOption[];
    canUpdate: boolean;
    canDelete: boolean;
    authUserId: number;
}) {
    const [open, setOpen] = useState(false);
    const [modal, setModal] = useState<'edit' | 'reset' | 'delete' | null>(
        null,
    );
    const isSelf = member.id === authUserId;

    if ((!canUpdate && !canDelete) || member.is_owner) {
        return null;
    }

    return (
        <>
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setOpen((o) => !o)}
                    style={{
                        height: '32px',
                        width: '32px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--muted-foreground)',
                    }}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                            'var(--accent)')
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                >
                    <MoreVertical size={15} />
                </button>

                {open && (
                    <>
                        <div
                            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                            onClick={() => setOpen(false)}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                marginTop: '4px',
                                width: '180px',
                                zIndex: 20,
                                borderRadius: '10px',
                                backgroundColor: 'var(--popover)',
                                border: '1px solid var(--border)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                overflow: 'hidden',
                                padding: '4px',
                            }}
                        >
                            {canUpdate && (
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        setModal('edit');
                                    }}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        fontSize: '13px',
                                        color: 'var(--popover-foreground)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        borderRadius: '6px',
                                        textAlign: 'left',
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                            'var(--accent)')
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                            'transparent')
                                    }
                                >
                                    <Shield size={13} />
                                    Edit Role
                                </button>
                            )}
                            {canUpdate && (
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        setModal('reset');
                                    }}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        fontSize: '13px',
                                        color: 'var(--popover-foreground)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        borderRadius: '6px',
                                        textAlign: 'left',
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                            'var(--accent)')
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                            'transparent')
                                    }
                                >
                                    <KeyRound size={13} />
                                    Reset Password
                                </button>
                            )}
                            {canDelete && !isSelf && (
                                <>
                                    <div
                                        style={{
                                            height: '1px',
                                            backgroundColor: 'var(--border)',
                                            margin: '4px 0',
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            setOpen(false);
                                            setModal('delete');
                                        }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            color: 'hsl(0 72% 50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            textAlign: 'left',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                'hsl(0 72% 94%)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                'transparent';
                                        }}
                                    >
                                        <Trash2 size={13} />
                                        Hapus dari Tim
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {modal === 'edit' && (
                <EditRoleModal
                    member={member}
                    teamSlug={teamSlug}
                    teamRoles={teamRoles}
                    availableRoles={availableRoles}
                    onClose={() => setModal(null)}
                />
            )}
            {modal === 'reset' && (
                <ResetPasswordModal
                    member={member}
                    teamSlug={teamSlug}
                    onClose={() => setModal(null)}
                />
            )}
            {modal === 'delete' && (
                <ConfirmDeleteModal
                    member={member}
                    teamSlug={teamSlug}
                    onClose={() => setModal(null)}
                />
            )}
        </>
    );
}

// ─── Main Page ────────────────────────────────────────────
export default function UsersIndex({
    members,
    availableRoles,
    teamRoles,
    canInvite,
    canUpdate,
    canDelete,
}: Props) {
    const { auth } = usePage().props as any;
    const teamSlug: string = auth?.user?.current_team?.slug ?? '';
    const teamName: string = auth?.user?.current_team?.name ?? '';
    const authUserId: number = auth?.user?.id;
    const [showInvite, setShowInvite] = useState(false);
    const [search, setSearch] = useState('');
    const [teamRoleFilter, setTeamRoleFilter] = useState('all');
    const [sortKey, setSortKey] = useState<SortKey>('member');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);

    const filteredMembers = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return members.filter((member) => {
            const matchesRole =
                teamRoleFilter === 'all' || member.team_role === teamRoleFilter;
            const searchableText = [
                member.name,
                member.email,
                member.team_role,
                member.team_role_label,
                ...member.roles,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return (
                matchesRole && (!keyword || searchableText.includes(keyword))
            );
        });
    }, [members, search, teamRoleFilter]);

    const sortedMembers = useMemo(() => {
        return [...filteredMembers].sort((a, b) => {
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
    }, [filteredMembers, sortDirection, sortKey]);

    const totalPages = Math.max(1, Math.ceil(sortedMembers.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageStart = (currentPage - 1) * pageSize;
    const paginatedMembers = sortedMembers.slice(
        pageStart,
        pageStart + pageSize,
    );
    const fromItem = sortedMembers.length === 0 ? 0 : pageStart + 1;
    const toItem = Math.min(pageStart + pageSize, sortedMembers.length);

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
            <Head title="Manajemen User" />

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                    }}
                >
                    <div>
                        <h1
                            style={{
                                fontSize: '20px',
                                fontWeight: 600,
                                margin: 0,
                                color: 'var(--foreground)',
                            }}
                        >
                            Manajemen User
                        </h1>
                        <p
                            style={{
                                fontSize: '14px',
                                color: 'var(--muted-foreground)',
                                margin: '4px 0 0',
                            }}
                        >
                            {members.length} anggota di tim{' '}
                            <strong>{teamName}</strong>
                        </p>
                    </div>
                    {canInvite && (
                        <button
                            onClick={() => setShowInvite(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                height: '38px',
                                padding: '0 18px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: 'var(--primary)',
                                color: 'var(--primary-foreground)',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            <UserPlus size={16} />
                            Undang Anggota
                        </button>
                    )}
                </div>

                {/* Data Table */}
                <div
                    style={{
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        overflow: 'visible',
                        backgroundColor: 'var(--card)',
                    }}
                >
                    {members.length === 0 ? (
                        <div
                            style={{
                                padding: '60px 20px',
                                textAlign: 'center',
                            }}
                        >
                            <div
                                style={{
                                    height: '48px',
                                    width: '48px',
                                    borderRadius: '12px',
                                    backgroundColor: 'var(--muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 16px',
                                    color: 'var(--muted-foreground)',
                                }}
                            >
                                <Users size={24} />
                            </div>
                            <p
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: 'var(--foreground)',
                                    margin: 0,
                                }}
                            >
                                Belum ada anggota
                            </p>
                            <p
                                style={{
                                    fontSize: '13px',
                                    color: 'var(--muted-foreground)',
                                    margin: '4px 0 0',
                                }}
                            >
                                Undang anggota pertama ke tim ini.
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
                                            pointerEvents: 'none',
                                        }}
                                    />
                                    <input
                                        value={search}
                                        onChange={(event) => {
                                            setSearch(event.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Cari nama, email, atau role"
                                        style={{
                                            width: '100%',
                                            height: '38px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            backgroundColor:
                                                'var(--background)',
                                            color: 'var(--foreground)',
                                            fontSize: '14px',
                                            outline: 'none',
                                            padding: '0 12px 0 36px',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <select
                                        value={teamRoleFilter}
                                        onChange={(event) => {
                                            setTeamRoleFilter(
                                                event.target.value,
                                            );
                                            setPage(1);
                                        }}
                                        style={{
                                            height: '38px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            backgroundColor:
                                                'var(--background)',
                                            color: 'var(--foreground)',
                                            fontSize: '14px',
                                            padding: '0 12px',
                                            outline: 'none',
                                        }}
                                    >
                                        <option value="all">
                                            Semua role tim
                                        </option>
                                        {teamRoles.map((role) => (
                                            <option
                                                key={role.value}
                                                value={role.value}
                                            >
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={pageSize}
                                        onChange={(event) => {
                                            setPageSize(
                                                Number(event.target.value),
                                            );
                                            setPage(1);
                                        }}
                                        style={{
                                            height: '38px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            backgroundColor:
                                                'var(--background)',
                                            color: 'var(--foreground)',
                                            fontSize: '14px',
                                            padding: '0 12px',
                                            outline: 'none',
                                        }}
                                    >
                                        {pageSizeOptions.map((size) => (
                                            <option key={size} value={size}>
                                                {size} / halaman
                                            </option>
                                        ))}
                                    </select>
                                </div>
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
                                                borderBottom:
                                                    '1px solid var(--border)',
                                            }}
                                        >
                                            {[
                                                ['member', 'Anggota'],
                                                ['team_role', 'Role Tim'],
                                                ['system_role', 'Role Sistem'],
                                                ['joined_at', 'Bergabung'],
                                            ].map(([key, label]) => (
                                                <th
                                                    key={key}
                                                    style={{
                                                        padding: '12px 16px',
                                                        textAlign: 'left',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        color: 'var(--muted-foreground)',
                                                        textTransform:
                                                            'uppercase',
                                                        letterSpacing: '0.04em',
                                                        backgroundColor:
                                                            'var(--muted)',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    <button
                                                        onClick={() =>
                                                            toggleSort(
                                                                key as SortKey,
                                                            )
                                                        }
                                                        style={{
                                                            display:
                                                                'inline-flex',
                                                            alignItems:
                                                                'center',
                                                            gap: '6px',
                                                            border: 'none',
                                                            backgroundColor:
                                                                'transparent',
                                                            color: 'inherit',
                                                            fontSize: 'inherit',
                                                            fontWeight:
                                                                'inherit',
                                                            textTransform:
                                                                'inherit',
                                                            letterSpacing:
                                                                'inherit',
                                                            padding: 0,
                                                            cursor: 'pointer',
                                                        }}
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
                                                    padding: '12px 16px',
                                                    textAlign: 'right',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    color: 'var(--muted-foreground)',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.04em',
                                                    backgroundColor:
                                                        'var(--muted)',
                                                    width: '40px',
                                                }}
                                            >
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedMembers.length === 0 ? (
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
                                                    Tidak ada anggota yang cocok
                                                    dengan filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedMembers.map(
                                                (member, i) => {
                                                    const isLast =
                                                        i ===
                                                        paginatedMembers.length -
                                                            1;

                                                    return (
                                                        <tr
                                                            key={member.id}
                                                            style={{
                                                                borderBottom:
                                                                    !isLast
                                                                        ? '1px solid var(--border)'
                                                                        : 'none',
                                                                transition:
                                                                    'background-color 0.1s',
                                                            }}
                                                            onMouseEnter={(e) =>
                                                                (e.currentTarget.style.backgroundColor =
                                                                    'var(--accent)')
                                                            }
                                                            onMouseLeave={(e) =>
                                                                (e.currentTarget.style.backgroundColor =
                                                                    'transparent')
                                                            }
                                                        >
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        '14px 16px',
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            'flex',
                                                                        alignItems:
                                                                            'center',
                                                                        gap: '12px',
                                                                    }}
                                                                >
                                                                    <Avatar
                                                                        name={
                                                                            member.name
                                                                        }
                                                                    />
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
                                                                                    fontWeight: 500,
                                                                                    color: 'var(--card-foreground)',
                                                                                }}
                                                                            >
                                                                                {
                                                                                    member.name
                                                                                }
                                                                            </span>
                                                                            {member.is_owner && (
                                                                                <Crown
                                                                                    size={
                                                                                        12
                                                                                    }
                                                                                    style={{
                                                                                        color: '#f59e0b',
                                                                                    }}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                        <span
                                                                            style={{
                                                                                fontSize:
                                                                                    '12px',
                                                                                color: 'var(--muted-foreground)',
                                                                            }}
                                                                        >
                                                                            {
                                                                                member.email
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        '14px 16px',
                                                                }}
                                                            >
                                                                <Badge
                                                                    color={
                                                                        member.is_owner
                                                                            ? 'amber'
                                                                            : 'default'
                                                                    }
                                                                >
                                                                    {member.team_role_label ??
                                                                        '-'}
                                                                </Badge>
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        '14px 16px',
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            'flex',
                                                                        gap: '4px',
                                                                        flexWrap:
                                                                            'wrap',
                                                                    }}
                                                                >
                                                                    {member
                                                                        .roles
                                                                        .length >
                                                                    0 ? (
                                                                        member.roles.map(
                                                                            (
                                                                                role,
                                                                            ) => (
                                                                                <Badge
                                                                                    key={
                                                                                        role
                                                                                    }
                                                                                    color="blue"
                                                                                >
                                                                                    {
                                                                                        role
                                                                                    }
                                                                                </Badge>
                                                                            ),
                                                                        )
                                                                    ) : (
                                                                        <span
                                                                            style={{
                                                                                fontSize:
                                                                                    '12px',
                                                                                color: 'var(--muted-foreground)',
                                                                            }}
                                                                        >
                                                                            -
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        '14px 16px',
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        fontSize:
                                                                            '13px',
                                                                        color: 'var(--muted-foreground)',
                                                                        whiteSpace:
                                                                            'nowrap',
                                                                    }}
                                                                >
                                                                    {formatDate(
                                                                        member.joined_at,
                                                                    )}
                                                                </span>
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        '14px 16px',
                                                                    textAlign:
                                                                        'right',
                                                                }}
                                                            >
                                                                <MemberActions
                                                                    member={
                                                                        member
                                                                    }
                                                                    teamSlug={
                                                                        teamSlug
                                                                    }
                                                                    teamRoles={
                                                                        teamRoles
                                                                    }
                                                                    availableRoles={
                                                                        availableRoles
                                                                    }
                                                                    canUpdate={
                                                                        canUpdate
                                                                    }
                                                                    canDelete={
                                                                        canDelete
                                                                    }
                                                                    authUserId={
                                                                        authUserId
                                                                    }
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                },
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
                                    {sortedMembers.length} anggota
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
                                            height: '34px',
                                            width: '34px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            backgroundColor:
                                                'var(--background)',
                                            color: 'var(--foreground)',
                                            cursor:
                                                currentPage === 1
                                                    ? 'not-allowed'
                                                    : 'pointer',
                                            opacity:
                                                currentPage === 1 ? 0.5 : 1,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
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
                                            height: '34px',
                                            width: '34px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            backgroundColor:
                                                'var(--background)',
                                            color: 'var(--foreground)',
                                            cursor:
                                                currentPage === totalPages
                                                    ? 'not-allowed'
                                                    : 'pointer',
                                            opacity:
                                                currentPage === totalPages
                                                    ? 0.5
                                                    : 1,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
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

            {showInvite && (
                <InviteModal
                    onClose={() => setShowInvite(false)}
                    teamRoles={teamRoles}
                />
            )}
        </>
    );
}
