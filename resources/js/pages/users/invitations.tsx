import { Head, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { useForm } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Mail,
    MoreVertical,
    Search,
    UserPlus,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

// ─── Types ───────────────────────────────────────────────
interface TeamInvitation {
    id: number;
    email: string;
    role: string | null;
    role_label: string | null;
    invited_by: string | null;
    expires_at: string | null;
    accepted_at: string | null;
    status: 'pending' | 'accepted' | 'expired';
}

interface RoleOption {
    value: string;
    label: string;
}

interface Props {
    invitations: TeamInvitation[];
    teamRoles: RoleOption[];
    canInvite: boolean;
}

type SortKey = 'email' | 'role' | 'invited_by' | 'status' | 'expires_at';
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

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(date));
}

function getStatusBadge(status: string): {
    color: 'default' | 'blue' | 'green' | 'amber' | 'red';
    label: string;
} {
    switch (status) {
        case 'accepted':
            return { color: 'green', label: 'Diterima' };
        case 'expired':
            return { color: 'red', label: 'Kedaluwarsa' };
        case 'pending':
        default:
            return { color: 'amber', label: 'Pending' };
    }
}

function getSortValue(
    invitation: TeamInvitation,
    key: SortKey,
): string | number {
    if (key === 'expires_at') {
        return invitation.expires_at
            ? new Date(invitation.expires_at).getTime()
            : Number.MAX_SAFE_INTEGER;
    }

    if (key === 'role') {
        return invitation.role_label ?? invitation.role ?? '';
    }

    return invitation[key] ?? '';
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
                    maxWidth: '440px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                    padding: '24px',
                }}
            >
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
                    {/* Email */}
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
                            Email{' '}
                            <span style={{ color: 'hsl(0 72% 50%)' }}>*</span>
                        </label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="user@example.com"
                            autoFocus
                            style={{
                                width: '100%',
                                height: '38px',
                                borderRadius: '8px',
                                border: errors.email
                                    ? '1px solid var(--destructive)'
                                    : '1px solid var(--border)',
                                backgroundColor: 'var(--background)',
                                color: 'var(--foreground)',
                                fontSize: '14px',
                                padding: '0 12px',
                                outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                        {errors.email && (
                            <p
                                style={{
                                    fontSize: '12px',
                                    color: 'var(--destructive)',
                                    marginTop: '4px',
                                    margin: '4px 0 0 0',
                                }}
                            >
                                {errors.email}
                            </p>
                        )}
                    </div>

                    {/* Role */}
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
                            Role{' '}
                            <span style={{ color: 'hsl(0 72% 50%)' }}>*</span>
                        </label>
                        <select
                            value={data.role}
                            onChange={(e) => setData('role', e.target.value)}
                            style={{
                                width: '100%',
                                height: '38px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--background)',
                                color: 'var(--foreground)',
                                fontSize: '14px',
                                padding: '0 12px',
                                outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        >
                            {teamRoles.map((role) => (
                                <option key={role.value} value={role.value}>
                                    {role.label}
                                </option>
                            ))}
                        </select>
                        {errors.role && (
                            <p
                                style={{
                                    fontSize: '12px',
                                    color: 'var(--destructive)',
                                    marginTop: '4px',
                                }}
                            >
                                {errors.role}
                            </p>
                        )}
                    </div>

                    {/* Buttons */}
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
                                backgroundColor: 'hsl(214 100% 50%)',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                opacity: processing ? 0.6 : 1,
                            }}
                        >
                            {processing ? 'Mengirim...' : 'Kirim Undangan'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Resend Invitation Modal ──────────────────────────────
function ResendModal({
    invitation,
    teamSlug,
    onClose,
}: {
    invitation: TeamInvitation;
    teamSlug: string;
    onClose: () => void;
}) {
    const [sending, setSending] = useState(false);

    function confirm() {
        setSending(true);
        router.post(
            buildUrl(`/invitations/resend/${invitation.id}`, teamSlug),
            {},
            {
                onFinish: () => {
                    setSending(false);
                    onClose();
                },
            },
        );
    }

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
                    maxWidth: '380px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                    padding: '24px',
                }}
            >
                <div style={{ marginBottom: '16px' }}>
                    <h2
                        style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            margin: '0 0 6px',
                            color: 'var(--card-foreground)',
                        }}
                    >
                        Kirim Ulang Undangan
                    </h2>
                    <p
                        style={{
                            fontSize: '13px',
                            color: 'var(--muted-foreground)',
                            margin: 0,
                        }}
                    >
                        Kirim ulang undangan ke{' '}
                        <strong>{invitation.email}</strong>?
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
                        disabled={sending}
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
                        disabled={sending}
                        style={{
                            height: '38px',
                            padding: '0 20px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'hsl(214 100% 50%)',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            opacity: sending ? 0.6 : 1,
                        }}
                    >
                        {sending ? 'Mengirim...' : 'Kirim Ulang'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Cancel Invitation Modal ──────────────────────────────
function CancelModal({
    invitation,
    teamSlug,
    onClose,
}: {
    invitation: TeamInvitation;
    teamSlug: string;
    onClose: () => void;
}) {
    const [deleting, setDeleting] = useState(false);

    function confirm() {
        setDeleting(true);
        router.delete(buildUrl(`/invitations/${invitation.id}`, teamSlug), {
            onFinish: () => {
                setDeleting(false);
                onClose();
            },
        });
    }

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
                    maxWidth: '380px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                    padding: '24px',
                }}
            >
                <div style={{ marginBottom: '16px' }}>
                    <h2
                        style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            margin: '0 0 6px',
                            color: 'var(--card-foreground)',
                        }}
                    >
                        Batalkan Undangan
                    </h2>
                    <p
                        style={{
                            fontSize: '13px',
                            color: 'var(--muted-foreground)',
                            margin: 0,
                        }}
                    >
                        Batalkan undangan ke <strong>{invitation.email}</strong>
                        ? Tindakan ini tidak dapat dibatalkan.
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
                        {deleting ? 'Membatalkan...' : 'Batalkan'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Invitation Row Actions ───────────────────────────────
function InvitationActions({
    invitation,
    teamSlug,
}: {
    invitation: TeamInvitation;
    teamSlug: string;
}) {
    const [open, setOpen] = useState(false);
    const [modal, setModal] = useState<'resend' | 'cancel' | null>(null);

    if (invitation.status === 'accepted') {
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
                                top: '36px',
                                right: 0,
                                zIndex: 20,
                                minWidth: '160px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--popover)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                overflow: 'hidden',
                            }}
                        >
                            {invitation.status === 'pending' && (
                                <>
                                    <button
                                        onClick={() => {
                                            setModal('resend');
                                            setOpen(false);
                                        }}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: '8px 12px',
                                            border: 'none',
                                            backgroundColor: 'transparent',
                                            color: 'var(--foreground)',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            borderBottom:
                                                '1px solid var(--border)',
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
                                        Kirim Ulang
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => {
                                    setModal('cancel');
                                    setOpen(false);
                                }}
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '8px 12px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: 'hsl(0 72% 50%)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        'hsl(0 72% 95%)')
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        'transparent')
                                }
                            >
                                Batalkan
                            </button>
                        </div>
                    </>
                )}
            </div>

            {modal === 'resend' && (
                <ResendModal
                    invitation={invitation}
                    teamSlug={teamSlug}
                    onClose={() => setModal(null)}
                />
            )}
            {modal === 'cancel' && (
                <CancelModal
                    invitation={invitation}
                    teamSlug={teamSlug}
                    onClose={() => setModal(null)}
                />
            )}
        </>
    );
}

// ─── Main Page ────────────────────────────────────────────
export default function InvitationsIndex({
    invitations,
    teamRoles,
    canInvite,
}: Props) {
    const { auth } = usePage().props as any;
    const teamSlug: string = auth?.user?.current_team?.slug ?? '';
    const [showInvite, setShowInvite] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<
        'all' | TeamInvitation['status']
    >('all');
    const [sortKey, setSortKey] = useState<SortKey>('expires_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);

    const filteredInvitations = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return invitations.filter((invitation) => {
            const matchesStatus =
                statusFilter === 'all' || invitation.status === statusFilter;
            const searchableText = [
                invitation.email,
                invitation.role_label,
                invitation.role,
                invitation.invited_by,
                getStatusBadge(invitation.status).label,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return (
                matchesStatus && (!keyword || searchableText.includes(keyword))
            );
        });
    }, [invitations, search, statusFilter]);

    const sortedInvitations = useMemo(() => {
        return [...filteredInvitations].sort((a, b) => {
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
    }, [filteredInvitations, sortDirection, sortKey]);

    const totalPages = Math.max(
        1,
        Math.ceil(sortedInvitations.length / pageSize),
    );
    const currentPage = Math.min(page, totalPages);
    const pageStart = (currentPage - 1) * pageSize;
    const paginatedInvitations = sortedInvitations.slice(
        pageStart,
        pageStart + pageSize,
    );
    const fromItem = sortedInvitations.length === 0 ? 0 : pageStart + 1;
    const toItem = Math.min(pageStart + pageSize, sortedInvitations.length);

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
            <Head title="Undangan Anggota" />

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
                                fontSize: '24px',
                                fontWeight: 700,
                                margin: 0,
                                color: 'var(--foreground)',
                            }}
                        >
                            Undangan Anggota
                        </h1>
                        <p
                            style={{
                                fontSize: '14px',
                                color: 'var(--muted-foreground)',
                                marginTop: '4px',
                                margin: '4px 0 0 0',
                            }}
                        >
                            Kelola undangan anggota tim
                        </p>
                    </div>
                    {canInvite && (
                        <button
                            onClick={() => setShowInvite(true)}
                            style={{
                                height: '38px',
                                padding: '0 16px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'hsl(214 100% 50%)',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
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
                        overflow: 'hidden',
                        backgroundColor: 'var(--card)',
                    }}
                >
                    {invitations.length === 0 ? (
                        <div
                            style={{
                                padding: '48px 24px',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px',
                            }}
                        >
                            <div
                                style={{
                                    height: '56px',
                                    width: '56px',
                                    borderRadius: '12px',
                                    backgroundColor: 'var(--muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--muted-foreground)',
                                }}
                            >
                                <Mail size={24} />
                            </div>
                            <div>
                                <h3
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        margin: 0,
                                        color: 'var(--foreground)',
                                    }}
                                >
                                    Tidak ada undangan
                                </h3>
                                <p
                                    style={{
                                        fontSize: '13px',
                                        color: 'var(--muted-foreground)',
                                        marginTop: '4px',
                                        margin: '4px 0 0 0',
                                    }}
                                >
                                    Mulai undang anggota baru ke tim
                                </p>
                            </div>
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
                                        placeholder="Cari email, role, atau pengundang"
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
                                        value={statusFilter}
                                        onChange={(event) => {
                                            setStatusFilter(
                                                event.target.value as
                                                    | 'all'
                                                    | TeamInvitation['status'],
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
                                            Semua status
                                        </option>
                                        <option value="pending">Pending</option>
                                        <option value="accepted">
                                            Diterima
                                        </option>
                                        <option value="expired">
                                            Kedaluwarsa
                                        </option>
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
                                        borderCollapse: 'collapse',
                                        minWidth: '840px',
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
                                                ['email', 'Email'],
                                                ['role', 'Role'],
                                                ['invited_by', 'Diundang Oleh'],
                                                ['status', 'Status'],
                                                ['expires_at', 'Berakhir'],
                                            ].map(([key, label]) => (
                                                <th
                                                    key={key}
                                                    style={{
                                                        textAlign: 'left',
                                                        padding: '12px 16px',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        color: 'var(--muted-foreground)',
                                                        textTransform:
                                                            'uppercase',
                                                        letterSpacing: '0.5px',
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
                                                    textAlign: 'right',
                                                    padding: '12px 16px',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    color: 'var(--muted-foreground)',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedInvitations.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    style={{
                                                        padding: '40px 16px',
                                                        textAlign: 'center',
                                                        color: 'var(--muted-foreground)',
                                                        fontSize: '14px',
                                                    }}
                                                >
                                                    Tidak ada undangan yang
                                                    cocok dengan filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedInvitations.map(
                                                (inv, idx) => {
                                                    const statusBadge =
                                                        getStatusBadge(
                                                            inv.status,
                                                        );

                                                    return (
                                                        <tr
                                                            key={inv.id}
                                                            style={{
                                                                borderBottom:
                                                                    idx <
                                                                    paginatedInvitations.length -
                                                                        1
                                                                        ? '1px solid var(--border)'
                                                                        : 'none',
                                                                backgroundColor:
                                                                    idx % 2
                                                                        ? 'var(--muted)'
                                                                        : 'transparent',
                                                            }}
                                                        >
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        '12px 16px',
                                                                    fontSize:
                                                                        '14px',
                                                                    color: 'var(--foreground)',
                                                                    fontWeight: 500,
                                                                }}
                                                            >
                                                                {inv.email}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        '12px 16px',
                                                                    fontSize:
                                                                        '14px',
                                                                    color: 'var(--foreground)',
                                                                }}
                                                            >
                                                                {inv.role_label ||
                                                                    '-'}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        '12px 16px',
                                                                    fontSize:
                                                                        '14px',
                                                                    color: 'var(--muted-foreground)',
                                                                }}
                                                            >
                                                                {inv.invited_by ||
                                                                    '-'}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        '12px 16px',
                                                                    fontSize:
                                                                        '14px',
                                                                }}
                                                            >
                                                                <Badge
                                                                    color={
                                                                        statusBadge.color
                                                                    }
                                                                >
                                                                    {
                                                                        statusBadge.label
                                                                    }
                                                                </Badge>
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        '12px 16px',
                                                                    fontSize:
                                                                        '13px',
                                                                    color: 'var(--muted-foreground)',
                                                                    whiteSpace:
                                                                        'nowrap',
                                                                }}
                                                            >
                                                                {formatDate(
                                                                    inv.expires_at,
                                                                )}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    padding:
                                                                        '12px 16px',
                                                                    textAlign:
                                                                        'right',
                                                                }}
                                                            >
                                                                <InvitationActions
                                                                    invitation={
                                                                        inv
                                                                    }
                                                                    teamSlug={
                                                                        teamSlug
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
                                    {sortedInvitations.length} undangan
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
