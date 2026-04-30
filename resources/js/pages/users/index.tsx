import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    Users, UserPlus, MoreVertical, Shield, Trash2,
    KeyRound, Mail, Check, Clock, Ban, Crown,
} from 'lucide-react';

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

// ─── Helpers ─────────────────────────────────────────────
function buildUrl(path: string, teamSlug: string): string {
    return `/${teamSlug}${path}`;
}

function formatDate(date: string | null): string {
    if (!date) return '-';
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(date));
}

function getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Avatar ──────────────────────────────────────────────
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    ];
    const color = colors[name.charCodeAt(0) % colors.length];

    return (
        <div style={{
            height: size, width: size, borderRadius: '50%',
            backgroundColor: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.35, fontWeight: 600, color: '#fff',
            flexShrink: 0, userSelect: 'none',
        }}>
            {getInitials(name)}
        </div>
    );
}

// ─── Badge ───────────────────────────────────────────────
function Badge({ children, color = 'default' }: { children: React.ReactNode; color?: 'default' | 'blue' | 'green' | 'amber' | 'red' }) {
    const colors = {
        default: { bg: 'var(--muted)', text: 'var(--muted-foreground)' },
        blue:    { bg: 'hsl(214 100% 95%)', text: 'hsl(214 100% 40%)' },
        green:   { bg: 'hsl(142 76% 92%)', text: 'hsl(142 76% 30%)' },
        amber:   { bg: 'hsl(43 96% 92%)', text: 'hsl(43 96% 30%)' },
        red:     { bg: 'hsl(0 72% 94%)', text: 'hsl(0 72% 40%)' },
    };
    const c = colors[color];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '999px',
            fontSize: '11px', fontWeight: 500,
            backgroundColor: c.bg, color: c.text,
        }}>
            {children}
        </span>
    );
}

// ─── Invite Modal ─────────────────────────────────────────
function InviteModal({ onClose, teamRoles }: { onClose: () => void; teamRoles: RoleOption[] }) {
    const { auth } = usePage().props as any;
    const teamSlug = auth?.user?.current_team?.slug ?? '';

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        role: 'member',
    });

    function submit() {
        post(buildUrl('/invitations', teamSlug), {
            onSuccess: () => { reset(); onClose(); },
        });
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
            <div style={{
                position: 'relative', width: '100%', maxWidth: '440px',
                borderRadius: '16px', backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                padding: '24px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{
                        height: '40px', width: '40px', borderRadius: '10px',
                        backgroundColor: 'hsl(214 100% 95%)', color: 'hsl(214 100% 40%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <UserPlus size={18} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--card-foreground)' }}>
                            Undang Anggota
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', margin: 0 }}>
                            Kirim undangan via email
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Email */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--card-foreground)', marginBottom: '6px' }}>
                            Email <span style={{ color: 'var(--destructive)' }}>*</span>
                        </label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            placeholder="user@example.com"
                            autoFocus
                            style={{
                                width: '100%', height: '38px', borderRadius: '8px',
                                border: errors.email ? '1px solid var(--destructive)' : '1px solid var(--border)',
                                backgroundColor: 'var(--background)',
                                color: 'var(--foreground)', fontSize: '14px',
                                padding: '0 12px', outline: 'none', boxSizing: 'border-box',
                            }}
                        />
                        {errors.email && <p style={{ fontSize: '12px', color: 'var(--destructive)', marginTop: '4px' }}>{errors.email}</p>}
                    </div>

                    {/* Role */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--card-foreground)', marginBottom: '6px' }}>
                            Role <span style={{ color: 'var(--destructive)' }}>*</span>
                        </label>
                        <select
                            value={data.role}
                            onChange={e => setData('role', e.target.value)}
                            style={{
                                width: '100%', height: '38px', borderRadius: '8px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--background)',
                                color: 'var(--foreground)', fontSize: '14px',
                                padding: '0 12px', outline: 'none',
                            }}
                        >
                            {teamRoles.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button
                            onClick={onClose}
                            disabled={processing}
                            style={{
                                height: '38px', padding: '0 16px', borderRadius: '8px',
                                border: '1px solid var(--border)', backgroundColor: 'transparent',
                                color: 'var(--foreground)', fontSize: '14px', cursor: 'pointer',
                            }}
                        >
                            Batal
                        </button>
                        <button
                            onClick={submit}
                            disabled={processing}
                            style={{
                                height: '38px', padding: '0 20px', borderRadius: '8px',
                                border: 'none', backgroundColor: 'var(--primary)',
                                color: 'var(--primary-foreground)', fontSize: '14px',
                                fontWeight: 500, cursor: 'pointer', display: 'flex',
                                alignItems: 'center', gap: '6px',
                                opacity: processing ? 0.6 : 1,
                            }}
                        >
                            <Mail size={14} />
                            {processing ? 'Mengirim...' : 'Kirim Undangan'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Reset Password Modal ─────────────────────────────────
function ResetPasswordModal({ member, teamSlug, onClose }: { member: Member; teamSlug: string; onClose: () => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
        password_confirmation: '',
    });

    function submit() {
        post(buildUrl(`/users/${member.id}/reset-password`, teamSlug), {
            onSuccess: () => { reset(); onClose(); },
        });
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
            <div style={{
                position: 'relative', width: '100%', maxWidth: '400px',
                borderRadius: '16px', backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                padding: '24px',
            }}>
                <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px', color: 'var(--card-foreground)' }}>
                        Reset Password
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', margin: 0 }}>
                        Reset password untuk <strong>{member.name}</strong>
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--card-foreground)' }}>
                            Password Baru *
                        </label>
                        <input
                            type="password"
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                            placeholder="Minimal 8 karakter"
                            autoFocus
                            style={{
                                width: '100%', height: '38px', borderRadius: '8px',
                                border: errors.password ? '1px solid var(--destructive)' : '1px solid var(--border)',
                                backgroundColor: 'var(--background)', color: 'var(--foreground)',
                                fontSize: '14px', padding: '0 12px', outline: 'none', boxSizing: 'border-box',
                            }}
                        />
                        {errors.password && <p style={{ fontSize: '12px', color: 'var(--destructive)', marginTop: '4px' }}>{errors.password}</p>}
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--card-foreground)' }}>
                            Konfirmasi Password *
                        </label>
                        <input
                            type="password"
                            value={data.password_confirmation}
                            onChange={e => setData('password_confirmation', e.target.value)}
                            placeholder="Ulangi password"
                            style={{
                                width: '100%', height: '38px', borderRadius: '8px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--background)', color: 'var(--foreground)',
                                fontSize: '14px', padding: '0 12px', outline: 'none', boxSizing: 'border-box',
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button onClick={onClose} disabled={processing}
                            style={{ height: '38px', padding: '0 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--foreground)', fontSize: '14px', cursor: 'pointer' }}>
                            Batal
                        </button>
                        <button onClick={submit} disabled={processing}
                            style={{ height: '38px', padding: '0 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', opacity: processing ? 0.6 : 1 }}>
                            {processing ? 'Menyimpan...' : 'Reset Password'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Confirm Delete Modal ─────────────────────────────────
function ConfirmDeleteModal({ member, teamSlug, onClose }: { member: Member; teamSlug: string; onClose: () => void }) {
    const [deleting, setDeleting] = useState(false);

    function confirm() {
        setDeleting(true);
        router.delete(buildUrl(`/users/${member.id}`, teamSlug), {
            onFinish: () => { setDeleting(false); onClose(); },
        });
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
            <div style={{
                position: 'relative', width: '100%', maxWidth: '380px',
                borderRadius: '16px', backgroundColor: 'var(--card)',
                border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                padding: '24px',
            }}>
                <div style={{ marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px', color: 'var(--card-foreground)' }}>Hapus Anggota</h2>
                    <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', margin: 0 }}>
                        Apakah Anda yakin ingin menghapus <strong>{member.name}</strong> dari tim?
                        Tindakan ini tidak dapat dibatalkan.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={deleting}
                        style={{ height: '38px', padding: '0 16px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--foreground)', fontSize: '14px', cursor: 'pointer' }}>
                        Batal
                    </button>
                    <button onClick={confirm} disabled={deleting}
                        style={{ height: '38px', padding: '0 20px', borderRadius: '8px', border: 'none', backgroundColor: 'hsl(0 72% 50%)', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}>
                        {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Member Row Actions ───────────────────────────────────
function MemberActions({ member, teamSlug, canUpdate, canDelete, authUserId }: {
    member: Member; teamSlug: string; canUpdate: boolean; canDelete: boolean; authUserId: number;
}) {
    const [open, setOpen] = useState(false);
    const [modal, setModal] = useState<'reset' | 'delete' | null>(null);
    const isSelf = member.id === authUserId;

    if ((!canUpdate && !canDelete) || member.is_owner) return null;

    return (
        <>
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setOpen(o => !o)}
                    style={{ height: '32px', width: '32px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                    <MoreVertical size={15} />
                </button>

                {open && (
                    <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
                        <div style={{
                            position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                            width: '180px', zIndex: 20, borderRadius: '10px',
                            backgroundColor: 'var(--popover)', border: '1px solid var(--border)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden', padding: '4px',
                        }}>
                            {canUpdate && (
                                <a
                                    href={buildUrl(`/users/${member.id}/edit`, teamSlug)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '13px', color: 'var(--popover-foreground)', textDecoration: 'none', borderRadius: '6px' }}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    onClick={() => setOpen(false)}
                                >
                                    <Shield size={13} />
                                    Edit Role
                                </a>
                            )}
                            {canUpdate && (
                                <button
                                    onClick={() => { setOpen(false); setModal('reset'); }}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '13px', color: 'var(--popover-foreground)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', textAlign: 'left' }}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                    <KeyRound size={13} />
                                    Reset Password
                                </button>
                            )}
                            {canDelete && !isSelf && (
                                <>
                                    <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />
                                    <button
                                        onClick={() => { setOpen(false); setModal('delete'); }}
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '13px', color: 'hsl(0 72% 50%)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', textAlign: 'left' }}
                                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'hsl(0 72% 94%)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
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

            {modal === 'reset' && (
                <ResetPasswordModal member={member} teamSlug={teamSlug} onClose={() => setModal(null)} />
            )}
            {modal === 'delete' && (
                <ConfirmDeleteModal member={member} teamSlug={teamSlug} onClose={() => setModal(null)} />
            )}
        </>
    );
}

// ─── Main Page ────────────────────────────────────────────
export default function UsersIndex({ members, availableRoles, teamRoles, canInvite, canUpdate, canDelete }: Props) {
    const { auth } = usePage().props as any;
    const teamSlug: string = auth?.user?.current_team?.slug ?? '';
    const teamName: string = auth?.user?.current_team?.name ?? '';
    const authUserId: number = auth?.user?.id;
    const [showInvite, setShowInvite] = useState(false);

    return (
        <>
            <Head title="Manajemen User" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0, color: 'var(--foreground)' }}>
                            Manajemen User
                        </h1>
                        <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', margin: '4px 0 0' }}>
                            {members.length} anggota di tim <strong>{teamName}</strong>
                        </p>
                    </div>
                    {canInvite && (
                        <button
                            onClick={() => setShowInvite(true)}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                height: '38px', padding: '0 18px', borderRadius: '10px',
                                border: 'none', backgroundColor: 'var(--primary)',
                                color: 'var(--primary-foreground)', fontSize: '14px',
                                fontWeight: 500, cursor: 'pointer',
                            }}
                        >
                            <UserPlus size={16} />
                            Undang Anggota
                        </button>
                    )}
                </div>

                {/* Table */}
                <div style={{ borderRadius: '12px', border: '1px solid var(--border)', overflow: 'visible', backgroundColor: 'var(--card)' }}>
                    {members.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                            <div style={{ height: '48px', width: '48px', borderRadius: '12px', backgroundColor: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--muted-foreground)' }}>
                                <Users size={24} />
                            </div>
                            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--foreground)', margin: 0 }}>Belum ada anggota</p>
                            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', margin: '4px 0 0' }}>Undang anggota pertama ke tim ini.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {['Anggota', 'Role Tim', 'Role Sistem', 'Bergabung', ''].map((h, i) => (
                                        <th key={i} style={{
                                            padding: '12px 16px', textAlign: 'left',
                                            fontSize: '12px', fontWeight: 600,
                                            color: 'var(--muted-foreground)',
                                            textTransform: 'uppercase', letterSpacing: '0.04em',
                                            backgroundColor: 'var(--muted)',
                                            ...(i === 0 ? { borderTopLeftRadius: '12px' } : {}),
                                            ...(i === 4 ? { borderTopRightRadius: '12px', width: '40px' } : {}),
                                        }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member, i) => {
                                    const isLast = i === members.length - 1;
                                    return (
                                        <tr
                                            key={member.id}
                                            style={{
                                                borderBottom: !isLast ? '1px solid var(--border)' : 'none',
                                                transition: 'background-color 0.1s',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            {/* Anggota */}
                                            <td style={{
                                                padding: '14px 16px',
                                                ...(isLast ? { borderBottomLeftRadius: '12px' } : {}),
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <Avatar name={member.name} />
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--card-foreground)' }}>
                                                                {member.name}
                                                            </span>
                                                            {member.is_owner && (
                                                                <Crown size={12} style={{ color: '#f59e0b' }} />
                                                            )}
                                                        </div>
                                                        <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                                                            {member.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role Tim */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <Badge color={member.is_owner ? 'amber' : 'default'}>
                                                    {member.team_role_label ?? '-'}
                                                </Badge>
                                            </td>

                                            {/* Role Sistem */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    {member.roles.length > 0
                                                        ? member.roles.map(r => (
                                                            <Badge key={r} color="blue">{r}</Badge>
                                                        ))
                                                        : <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>-</span>
                                                    }
                                                </div>
                                            </td>

                                            {/* Bergabung */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                                                    {formatDate(member.joined_at)}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td style={{
                                                padding: '14px 16px',
                                                textAlign: 'right',
                                                ...(isLast ? { borderBottomRightRadius: '12px' } : {}),
                                            }}>
                                                <MemberActions
                                                    member={member}
                                                    teamSlug={teamSlug}
                                                    canUpdate={canUpdate}
                                                    canDelete={canDelete}
                                                    authUserId={authUserId}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showInvite && <InviteModal onClose={() => setShowInvite(false)} teamRoles={teamRoles} />}
        </>
    );
}