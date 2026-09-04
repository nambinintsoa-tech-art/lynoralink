"use client";

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  User, Lock, Bell, Palette, ShieldCheck, Database, Camera, ImagePlus,
  Globe2, Users2, ChevronRight, Check, X, Moon, Sun, Monitor,
  Laptop, LogOut, Trash2, Eye, EyeOff, KeyRound, Mail, MapPin, Building2,
  Link2, AlertTriangle, Download, RotateCcw, BadgeCheck, Plus, Briefcase,
  Star, GripVertical, Image as ImageIcon, Search, ThumbsUp, MessageSquare,
  UserX,
} from 'lucide-react';
import { TopNav } from './TopNav';
import { fetchBackendApi } from '@/lib/backend-api';

export const DEFAULT_SETTINGS = {
  profile: {
    name: '', headline: '', birthDate: '', location: '', company: '', website: '', about: '', bio: '', initials: 'U', avatarSrc: null, coverSrc: null,
    experience: [],
    skills: [],
  },
  privacy: { profileVisibility: 'public', showConnections: true, showActivity: true, availability: 'open', searchable: true },
  notifications: { email: { messages: true, connectionRequests: true, endorsements: false, newsletter: true }, push: { messages: true, connectionRequests: true, mentions: true, endorsements: false }, showOnlineStatus: true },
  appearance: { theme: 'system', density: 'comfortable', fontScale: 'medium' },
  account: { email: '', language: 'fr', timezone: 'Africa/Nairobi', twoFactor: false },
  sessions: [],
  removedConnections: [],
};

const NAV_SECTIONS = [
  { key: 'profil', label: 'Profil', icon: User, desc: 'Informations publiques' },
  { key: 'confidentialite', label: 'Confidentialité', icon: Lock, desc: 'Visibilité et découvrabilité' },
  { key: 'messagerie', label: 'Messagerie', icon: MessageSquare, desc: 'Chats et statut en ligne' },
  { key: 'notifications', label: 'Notifications', icon: Bell, desc: 'E-mail et notifications push' },
  { key: 'apparence', label: 'Apparence', icon: Palette, desc: 'Thème et affichage' },
  { key: 'compte', label: 'Compte et sécurité', icon: ShieldCheck, desc: 'Connexion, mot de passe, sessions' },
  { key: 'donnees', label: 'Données', icon: Database, desc: 'Export et suppression du compte' },
];

const VISIBILITY_OPTIONS = [
  { key: 'public', label: 'Public', desc: 'Visible par tout le monde', icon: Globe2 },
  { key: 'connections', label: 'Relations', desc: 'Visible par vos relations uniquement', icon: Users2 },
  { key: 'private', label: 'Privé', desc: 'Visible par vous seul(e)', icon: Lock },
];

/* Status options matching the profile STATUS_META */
const STATUS_OPTIONS = [
  { key: 'open', label: 'Ouverte aux opportunités', color: '#155724', bg: '#d4edda', border: '#c3e6cb' },
  { key: 'mentoring', label: 'Disponible pour du mentorat', color: '#856404', bg: '#fff3cd', border: '#ffeeba' },
  { key: 'unavailable', label: 'Non disponible actuellement', color: '#383d41', bg: '#e2e3e5', border: '#d6d8db' },
];

/* ====== Reusable UI Components (LinkedIn style) ====== */

const COLORS = {
  primary: 'var(--settings-primary)',
  primaryHover: 'var(--navy800)',
  bg: 'var(--settings-bg)',
  cardBg: 'var(--app-surface)',
  border: 'var(--app-border)',
  textPrimary: 'var(--settings-text-primary)',
  textSecondary: 'var(--settings-text-secondary)',
  textMuted: 'var(--settings-text-muted)',
  accent: '#b48c53',
  inputBg: 'var(--app-input)',
  toggleOff: '#C7D0D8',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  success: '#057642',
  successBg: '#D1FAE5',
};

function SectionCard({ title, subtitle, children, action }) {
  return (
    <div className="st-section-card" style={{ background: COLORS.cardBg, borderRadius: 8, border: `1px solid ${COLORS.border}`, marginBottom: 16, overflow: 'hidden' }}>
      {(title || subtitle || action) && (
        <div className="st-section-card-header" style={{ padding: '16px 20px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {title && <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>{title}</h3>}
            {subtitle && <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '4px 0 0' }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, display: 'block' }}>
        {children}
      </label>
      {hint && <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '2px 0 0' }}>{hint}</p>}
    </div>
  );
}

function TextInput({ icon: Icon, value, onChange, placeholder, type = 'text', disabled }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, padding: '10px 14px', border: `1px solid ${COLORS.border}`, background: COLORS.inputBg, transition: 'border-color 150ms' }} className={disabled ? 'opacity-60' : ''}>
      {Icon && <Icon size={16} style={{ color: COLORS.textMuted, flexShrink: 0 }} />}
      <input
        type={isPassword && !show ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ flex: 1, background: 'transparent', outline: 'none', fontSize: 14, color: COLORS.textPrimary, border: 'none', padding: 0 }}
      />
      {isPassword && (
        <button type="button" onClick={() => setShow((s) => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 0 }} aria-label="Afficher le mot de passe">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
    </div>
  );
}

function TextArea({ value, onChange, rows = 4, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      style={{ width: '100%', borderRadius: 8, padding: '10px 14px', border: `1px solid ${COLORS.border}`, background: COLORS.inputBg, color: COLORS.textPrimary, outline: 'none', fontSize: 14, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit' }}
    />
  );
}

function Toggle({ checked, onChange, label, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 0' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{label}</div>
        {desc && <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>{desc}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{ position: 'relative', flexShrink: 0, width: 44, height: 24, borderRadius: 12, background: checked ? COLORS.primary : COLORS.toggleOff, border: 'none', cursor: 'pointer', transition: 'background 200ms', padding: 0 }}
      >
        <span style={{ position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 200ms' }} />
      </button>
    </div>
  );
}

function OptionRow({ active, onClick, icon: Icon, label, desc, colorDot }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 8, padding: '12px 14px', textAlign: 'left', cursor: 'pointer', border: active ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`, background: active ? '#EFF6FF' : COLORS.cardBg, transition: 'all 150ms' }}
    >
      {Icon && <Icon size={16} style={{ color: active ? COLORS.primary : COLORS.textMuted, flexShrink: 0 }} />}
      {colorDot && <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: colorDot, border: active ? `2px solid ${colorDot}` : '2px solid transparent' }} />}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? COLORS.primary : COLORS.textPrimary }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{desc}</div>}
      </div>
      {active && <Check size={16} style={{ color: COLORS.primary, flexShrink: 0 }} />}
    </button>
  );
}

function DangerButton({ children, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 24, padding: '8px 20px', fontSize: 14, fontWeight: 600, border: `1px solid ${COLORS.dangerBorder}`, color: COLORS.danger, background: COLORS.dangerBg, cursor: 'pointer', transition: 'background 150ms' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#FEE2E2')}
      onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.dangerBg)}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled, style: extraStyle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 24, padding: '10px 24px', fontSize: 14, fontWeight: 600, border: 'none', background: disabled ? '#9CA3AF' : COLORS.primary, color: '#fff', cursor: disabled ? 'default' : 'pointer', transition: 'background 150ms', ...extraStyle }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = COLORS.primaryHover; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = COLORS.primary; }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, style: extraStyle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 24, padding: '10px 24px', fontSize: 14, fontWeight: 600, border: `1px solid ${COLORS.border}`, background: '#fff', color: COLORS.textPrimary, cursor: 'pointer', transition: 'all 150ms', ...extraStyle }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F4F6'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
    >
      {children}
    </button>
  );
}

function ConfirmModal({ title, body, confirmLabel, danger, onCancel, onConfirm, children }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '100%', maxWidth: 448, animation: 'st-modal-in 200ms cubic-bezier(0.22,1,0.36,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes st-modal-in { from { opacity:0; transform:translateY(8px) scale(0.98);} to { opacity:1; transform:translateY(0) scale(1); }`}</style>
        <div style={{ padding: '20px 24px 12px' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: danger ? COLORS.danger : COLORS.textPrimary, margin: 0 }}>{title}</h3>
          <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: '8px 0 0', lineHeight: 1.5 }}>{body}</p>
          {children}
        </div>
        <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${COLORS.border}` }}>
          <SecondaryButton onClick={onCancel}>Annuler</SecondaryButton>
          <button
            type="button"
            onClick={onConfirm}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 24, padding: '10px 24px', fontSize: 14, fontWeight: 600, border: 'none', background: danger ? COLORS.danger : COLORS.primary, color: '#fff', cursor: 'pointer' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====== Experience & Skills sub-components ====== */

function ExperienceItemEditor({ item, index, onUpdate, onRemove }) {
  return (
    <div className="st-exp-item" style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: '#FAFAFA', marginBottom: 12, position: 'relative' }}>
      <div style={{ width: 48, height: 48, borderRadius: 8, background: COLORS.inputBg, border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: COLORS.textMuted, flexShrink: 0 }}>
        <Briefcase size={20} color={COLORS.textMuted} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <FieldLabel>Poste</FieldLabel>
            <TextInput value={item.role} onChange={(v) => onUpdate(index, { role: v })} placeholder="Ex: Développeur" />
          </div>
          <div>
            <FieldLabel>Entreprise</FieldLabel>
            <TextInput value={item.company} onChange={(v) => onUpdate(index, { company: v })} placeholder="Ex: Zilo Pay" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <FieldLabel>Période</FieldLabel>
            <TextInput value={item.period} onChange={(v) => onUpdate(index, { period: v })} placeholder="Ex: 2020 – présent" />
          </div>
          <div>
            <FieldLabel>Code / Logo</FieldLabel>
            <TextInput value={item.code} onChange={(v) => onUpdate(index, { code: v })} placeholder="Ex: ZP" />
          </div>
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <TextArea value={item.desc || ''} onChange={(v) => onUpdate(index, { desc: v })} rows={2} placeholder="Décrivez vos responsabilités..." />
        </div>
      </div>
      <button onClick={() => onRemove(index)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 4, borderRadius: 4 }} aria-label="Supprimer">
        <X size={16} />
      </button>
    </div>
  );
}

function SkillItemEditor({ item, index, onUpdate, onRemove }) {
  return (
    <div className="st-skill-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: '#FAFAFA', marginBottom: 8 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#D0E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: COLORS.primary, fontSize: 14, fontWeight: 700 }}>
        {item.name ? item.name[0].toUpperCase() : '?'}
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, alignItems: 'center' }}>
        <TextInput value={item.name} onChange={(v) => onUpdate(index, { name: v })} placeholder="Compétence" />
        <TextInput value={String(item.endorsements)} onChange={(v) => onUpdate(index, { endorsements: parseInt(v) || 0 })} placeholder="0" />
        <TextInput value={String(item.weight)} onChange={(v) => onUpdate(index, { weight: Math.min(100, Math.max(0, parseInt(v) || 0)) })} placeholder="0-100" />
      </div>
      <button onClick={() => onRemove(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 4, borderRadius: 4, flexShrink: 0 }} aria-label="Supprimer">
        <X size={16} />
      </button>
    </div>
  );
}

/* ====== Toast ====== */

function Toast({ message }) {
  React.useEffect(() => { const t = setTimeout(() => {}, 2200); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 70, display: 'flex', alignItems: 'center', gap: 10, borderRadius: 24, padding: '12px 20px', background: COLORS.primary, color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: 14, fontWeight: 500 }}>
      <Check size={16} style={{ flexShrink: 0 }} />
      {message}
    </div>
  );
}

function toBool(v) { return v === true || v === 'true' || v === 1; }

/* ========================================================================
   MAIN SETTINGS COMPONENT
   ======================================================================== */

export default function SettingsLynora({ initialSession, showTopNav = true, initialSection = 'profil' }) {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const appearance = JSON.parse(localStorage.getItem('lynoralink:appearance') || 'null');
      return appearance ? { ...DEFAULT_SETTINGS, appearance: { ...DEFAULT_SETTINGS.appearance, ...appearance } } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [draft, setDraft] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const appearance = JSON.parse(localStorage.getItem('lynoralink:appearance') || 'null');
      return appearance ? { ...DEFAULT_SETTINGS, appearance: { ...DEFAULT_SETTINGS.appearance, ...appearance } } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [activeSection, setActiveSection] = useState(initialSection);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarOffset, setAvatarOffset] = useState({ x: 0, y: 0 });
  const [avatarUploadError, setAvatarUploadError] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '', otp: '' });
  const [passwordTwoFactorRequired, setPasswordTwoFactorRequired] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [emailForm, setEmailForm] = useState({ email: '', currentPassword: '', otp: '' });
  const [emailTwoFactorRequired, setEmailTwoFactorRequired] = useState(false);
  const [emailInfo, setEmailInfo] = useState(null);
  const [emailResending, setEmailResending] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const avatarStageRef = useRef(null);
  const avatarDragRef = useRef(null);

  const isDirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);

  const update = (section, patch) =>
    setDraft((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));

  const updateNested = (section, group, patch) =>
    setDraft((prev) => ({
      ...prev,
      [section]: { ...prev[section], [group]: { ...prev[section][group], ...patch } },
    }));

  /* ---- Load settings ---- */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const cachedAppearance = (() => {
      try { return JSON.parse(localStorage.getItem('lynoralink:appearance') || 'null'); } catch { return null; }
    })();
    fetchBackendApi('/api/settings')
      .then(async (r) => { if (!r.ok) throw new Error('Impossible de charger les paramètres'); return r.json(); })
      .then((data) => {
        if (cancelled) return;
        const next = {
          profile: { ...DEFAULT_SETTINGS.profile, ...data.profile, experience: data.profile?.experience || [], skills: data.profile?.skills || [] },
          privacy: data.privacy || DEFAULT_SETTINGS.privacy,
          notifications: {
            email: { ...DEFAULT_SETTINGS.notifications.email, ...(data.notifications?.email || {}) },
            push: { ...DEFAULT_SETTINGS.notifications.push, ...(data.notifications?.push || {}) },
            showOnlineStatus: data.notifications?.showOnlineStatus ?? DEFAULT_SETTINGS.notifications.showOnlineStatus,
          },
          appearance: { ...DEFAULT_SETTINGS.appearance, ...(data.appearance || {}), ...(cachedAppearance || {}) },
          account: { ...DEFAULT_SETTINGS.account, ...(data.account || {}) },
          sessions: data.sessions || [],
          removedConnections: data.removedConnections || [],
        };
        setSaved(next);
        setDraft(next);
        try { localStorage.setItem('lynoralink:appearance', JSON.stringify(next.appearance)); } catch {}
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (loading) return undefined;
    const root = document.documentElement;
    const appearance = draft.appearance || DEFAULT_SETTINGS.appearance;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyAppearance = () => {
      const resolvedTheme = appearance.theme === 'system'
        ? (mediaQuery.matches ? 'dark' : 'light')
        : appearance.theme;
      root.dataset.theme = resolvedTheme;
      root.dataset.density = appearance.density;
      root.dataset.fontScale = appearance.fontScale;
    };
    applyAppearance();
    window.dispatchEvent(new CustomEvent('lynora:appearance-updated', { detail: appearance }));
    mediaQuery.addEventListener?.('change', applyAppearance);
    return () => {
      mediaQuery.removeEventListener?.('change', applyAppearance);
    };
  }, [draft.appearance]);

  /* ---- Load sessions ---- */
  useEffect(() => {
    fetchBackendApi('/api/sessions')
      .then((r) => r.ok ? r.json() : Promise.resolve({ sessions: [] }))
      .then((data) => {
        if (Array.isArray(data.sessions)) {
          setDraft((prev) => ({ ...prev, sessions: data.sessions }));
          setSaved((prev) => ({ ...prev, sessions: data.sessions }));
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  };

  /* ---- Save all ---- */
  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetchBackendApi('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: draft.profile, privacy: draft.privacy, notifications: draft.notifications, appearance: draft.appearance, account: draft.account }),
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "Erreur lors de l'enregistrement"); }
      setSaved(draft);
      try { localStorage.setItem('lynoralink:appearance', JSON.stringify(draft.appearance)); } catch {}
      window.dispatchEvent(new CustomEvent('lynora:appearance-updated', { detail: draft.appearance }));
      window.dispatchEvent(new CustomEvent('lynora:settings-updated', { detail: { showOnlineStatus: draft.notifications.showOnlineStatus } }));
      showToast('Modifications enregistrées');
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const handleDiscard = () => setDraft(saved);

  const handleUnblock = async (userId) => {
    try {
      const res = await fetchBackendApi(`/api/removed-connections?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Impossible de débloquer cet utilisateur');
      const next = draft.removedConnections.filter((user) => user.id !== userId);
      setDraft((prev) => ({ ...prev, removedConnections: next }));
      setSaved((prev) => ({ ...prev, removedConnections: next }));
      showToast('Utilisateur débloqué');
    } catch (e) {
      setError(e.message);
    }
  };

  /* ---- Cloudinary upload helper ---- */
  const uploadToCloudinary = async (blob, fileName) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (cloudName && preset) {
      const fd = new FormData();
      fd.append('file', blob, fileName);
      fd.append('upload_preset', preset);
      fd.append('folder', 'lynoralink');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || 'Upload échoué'); }
      const data = await res.json();
      return data.secure_url || data.url;
    } else {
      const form = new FormData();
      form.append('file', blob, fileName);
      form.append('type', 'image');
      const res = await fetchBackendApi('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Upload échoué');
      const data = await res.json();
      return data.url;
    }
  };

  /* ---- Avatar ---- */
  const handleAvatarFile = (files) => {
    const file = files && files[0];
    if (file && file.type.startsWith('image/')) {
      setAvatarUploadError('');
      setAvatarPreview(URL.createObjectURL(file));
      setAvatarOffset({ x: 0, y: 0 });
    }
  };

  const moveAvatarCrop = (event) => {
    const drag = avatarDragRef.current;
    if (!drag) return;
    const stageSize = avatarStageRef.current?.clientWidth || 360;
    setAvatarOffset({
      x: Math.max(-50, Math.min(50, drag.offsetX + ((event.clientX - drag.x) / stageSize) * 100)),
      y: Math.max(-50, Math.min(50, drag.offsetY + ((event.clientY - drag.y) / stageSize) * 100)),
    });
  };

  const cropAvatarFile = async (sourceFile) => {
    const image = new Image();
    image.src = URL.createObjectURL(sourceFile);
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
    const stageSize = avatarStageRef.current?.clientWidth || 360;
    const shortSide = Math.min(image.naturalWidth, image.naturalHeight);
    const side = shortSide;
    const sourceX = Math.max(0, Math.min(image.naturalWidth - side, (image.naturalWidth - side) / 2 - avatarOffset.x * shortSide / 100));
    const sourceY = Math.max(0, Math.min(image.naturalHeight - side, (image.naturalHeight - side) / 2 - avatarOffset.y * shortSide / 100));
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Préparation de l’image impossible');
    context.drawImage(image, sourceX, sourceY, side, side, 0, 0, 800, 800);
    URL.revokeObjectURL(image.src);
    const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Export impossible')), 'image/jpeg', 0.92));
    return new File([blob], 'avatar-crop.jpg', { type: 'image/jpeg' });
  };

  const saveAvatar = async () => {
    if (!avatarPreview) return;
    setUploadingAvatar(true);
    try {
      let url = avatarPreview;
      if (!avatarPreview.startsWith('http')) {
        const blob = await (await fetch(avatarPreview)).blob();
        const file = await cropAvatarFile(new File([blob], 'avatar-crop.jpg', { type: blob.type || 'image/jpeg' }));
        url = await uploadToCloudinary(file, 'avatar-crop.jpg');
      }
      const nextProfile = { ...draft.profile, avatarSrc: url };
      update('profile', { avatarSrc: url });
      setSaved((prev) => ({ ...prev, profile: { ...prev.profile, avatarSrc: url } }));
      const saveRes = await fetchBackendApi('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: nextProfile }) });
      if (!saveRes.ok) { const data = await saveRes.json().catch(() => ({})); throw new Error(data.error || 'Impossible de sauvegarder la photo'); }
      if (typeof updateSession === 'function') await updateSession();
      setAvatarModalOpen(false);
      showToast('Photo de profil mise à jour');
    } catch (e) { setAvatarUploadError(e.message || 'Impossible d’importer cette image.'); } finally { setUploadingAvatar(false); }
  };

  /* ---- Cover photo ---- */
  const handleCoverFile = (files) => {
    const file = files && files[0];
    if (file && file.type.startsWith('image/')) setCoverPreview(URL.createObjectURL(file));
  };

  const saveCover = async () => {
    if (!coverPreview) return;
    setUploadingCover(true);
    try {
      let url = coverPreview;
      if (!coverPreview.startsWith('http')) {
        const blob = await (await fetch(coverPreview)).blob();
        url = await uploadToCloudinary(blob, 'cover.jpg');
      }
      const nextProfile = { ...draft.profile, coverSrc: url };
      update('profile', { coverSrc: url });
      setSaved((prev) => ({ ...prev, profile: { ...prev.profile, coverSrc: url } }));
      const saveRes = await fetchBackendApi('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: nextProfile }) });
      if (!saveRes.ok) { const data = await saveRes.json().catch(() => ({})); throw new Error(data.error || 'Impossible de sauvegarder la couverture'); }
      if (typeof updateSession === 'function') await updateSession();
      setCoverModalOpen(false);
      showToast('Photo de couverture mise à jour');
    } catch (e) { setError(e.message); } finally { setUploadingCover(false); }
  };

  /* ---- Experience management ---- */
  const addExperience = () => {
    const newExp = { company: '', code: '', role: '', period: '', desc: '' };
    update('profile', { experience: [...(draft.profile.experience || []), newExp] });
  };

  const updateExperience = (index, patch) => {
    const updated = [...(draft.profile.experience || [])];
    updated[index] = { ...updated[index], ...patch };
    update('profile', { experience: updated });
  };

  const removeExperience = (index) => {
    update('profile', { experience: (draft.profile.experience || []).filter((_, i) => i !== index) });
  };

  /* ---- Skills management ---- */
  const addSkill = () => {
    const newSkill = { name: '', endorsements: 0, weight: 50 };
    update('profile', { skills: [...(draft.profile.skills || []), newSkill] });
  };

  const updateSkill = (index, patch) => {
    const updated = [...(draft.profile.skills || [])];
    updated[index] = { ...updated[index], ...patch };
    update('profile', { skills: updated });
  };

  const removeSkill = (index) => {
    update('profile', { skills: (draft.profile.skills || []).filter((_, i) => i !== index) });
  };

  /* ---- Session / Password / Export / Delete ---- */
  const removeSession = async (id) => {
    try {
      const res = await fetchBackendApi(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Impossible de révoquer la session');
      setDraft((prev) => ({ ...prev, sessions: prev.sessions.filter((s) => s.id !== id) }));
      setSaved((prev) => ({ ...prev, sessions: prev.sessions.filter((s) => s.id !== id) }));
      showToast('Session révoquée');
    } catch (e) { setError(e.message); } finally { setConfirmAction(null); }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (!passwordForm.current || !passwordForm.next) { setPasswordError('Tous les champs sont requis'); return; }
    if (passwordForm.next !== passwordForm.confirm) { setPasswordError('Les mots de passe ne correspondent pas'); return; }
    try {
      const res = await fetchBackendApi('/api/account/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.next, otp: passwordTwoFactorRequired ? passwordForm.otp : undefined }) });
      const data = await res.json();
      if (data.requiresTwoFactor) {
        setPasswordTwoFactorRequired(true);
        setPasswordError('Un code de sécurité a été envoyé à l’adresse e-mail actuelle de votre compte.');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setPasswordForm({ current: '', next: '', confirm: '', otp: '' });
      setPasswordTwoFactorRequired(false);
      showToast('Mot de passe modifié');
    } catch (e) { setPasswordError(e.message); }
  };

  const handleChangeEmail = async () => {
    setEmailError(null);
    setEmailInfo(null);
    if (!emailForm.email || !emailForm.currentPassword) {
      setEmailError('Le nouvel e-mail et le mot de passe sont requis');
      return;
    }
    try {
      const res = await fetchBackendApi('/api/account/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailForm),
      });
      const data = await res.json();
        if (data.requiresTwoFactor) {
          setEmailTwoFactorRequired(true);
          setEmailInfo(`Un code de sécurité a été envoyé à l'adresse actuelle du compte : ${acc.email}. Consultez cette boîte e-mail pour continuer.`);
          return;
        }
      if (!res.ok) throw new Error(data.error || 'Impossible de modifier l’e-mail');
      if (data.pendingVerification) {
        setEmailForm({ email: '', currentPassword: '', otp: '' });
        setEmailTwoFactorRequired(false);
        setEmailInfo(`Un lien de confirmation a été envoyé à ${data.email}. Cliquez dessus pour valider le changement d’adresse e-mail.`);
        showToast('Lien de confirmation envoyé');
        return;
      }
      const nextAccount = { ...draft.account, email: data.email };
      setDraft((prev) => ({ ...prev, account: nextAccount }));
      setSaved((prev) => ({ ...prev, account: nextAccount }));
      setEmailForm({ email: '', currentPassword: '', otp: '' });
      setEmailTwoFactorRequired(false);
      setEmailInfo(null);
      await updateSession?.();
      showToast('E-mail modifié');
    } catch (e) { setEmailError(e.message); }
  };

  const handleResendEmailCode = async () => {
    setEmailError(null);
    setEmailResending(true);
    try {
      const res = await fetchBackendApi('/api/auth/2fa/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: acc.email, password: emailForm.currentPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Impossible de renvoyer le code');
      setEmailInfo(`Un nouveau code a été envoyé à l'adresse actuelle du compte : ${acc.email}. Consultez cette boîte e-mail.`);
    } catch (e) {
      setEmailError(e.message);
    } finally {
      setEmailResending(false);
    }
  };

  const handleExportData = async () => {
    try {
      const exportPayload = { profile: draft.profile, privacy: draft.privacy, notifications: draft.notifications, appearance: draft.appearance, account: draft.account, sessions: draft.sessions };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `lynoralink-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
      showToast('Export de données prêt');
    } catch (e) { setError(e.message); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { setDeleteError('Veuillez entrer votre mot de passe pour confirmer.'); return; }
    setDeleteLoading(true); setDeleteError(null);
    try {
      const res = await fetchBackendApi('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: deletePassword }) });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Suppression impossible'); }
      await signOut({ callbackUrl: '/' });
    } catch (e) { setDeleteError(e.message); } finally { setDeleteLoading(false); }
  };

  const handleLogout = async () => { await signOut({ callbackUrl: '/' }); };

  const p = draft.profile;
  const priv = draft.privacy;
  const notif = draft.notifications;
  const app = draft.appearance;
  const acc = draft.account;
  const currentSession = session || initialSession;
  const topNavProfile = {
    name: p.name || currentSession?.user?.name || 'Utilisateur',
    title: p.headline || currentSession?.user?.title || 'Membre LynoraLink',
    avatarUrl: p.avatarSrc || currentSession?.user?.image || null,
  };
  const handleTopNav = (view) => {
    if (view === 'settings') return;
    if (view === 'dashboard') {
      router.push('/dashboard');
      return;
    }
    router.push(view === 'feed' ? '/feed' : `/feed?view=${encodeURIComponent(view)}`);
  };

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div style={{ width: '100%', maxWidth: 1128, margin: '0 auto', padding: '24px 16px', fontFamily: "-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", background: COLORS.bg, minHeight: '100vh' }}>
        <div style={{ height: 32, width: 200, borderRadius: 6, background: '#E5E7EB', marginBottom: 8 }} />
        <div style={{ height: 16, width: 400, borderRadius: 6, background: '#E5E7EB', marginBottom: 24 }} />
        <div style={{ background: '#fff', borderRadius: 8, border: `1px solid ${COLORS.border}`, height: 400 }} />
      </div>
    );
  }

  /* ---- Error state (no data loaded) ---- */
  if (error && !saved.profile.name) {
    return (
      <div style={{ width: '100%', maxWidth: 1128, margin: '0 auto', padding: '24px 16px', fontFamily: "-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", background: COLORS.bg, minHeight: '100vh' }}>
        <div style={{ borderRadius: 8, padding: 20, background: COLORS.dangerBg, border: `1px solid ${COLORS.dangerBorder}`, color: COLORS.danger }}>
          <p style={{ fontSize: 14, fontWeight: 500 }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 12, borderRadius: 24, padding: '8px 20px', fontSize: 14, fontWeight: 600, color: '#fff', background: COLORS.primary, border: 'none', cursor: 'pointer' }}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================================
      MAIN RENDER
     ===================================================================== */
  return (
    <div className="st-settings-root" style={{ width: '100%', minHeight: '100vh', background: COLORS.bg, fontFamily: "-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", color: COLORS.textPrimary }}>
      {showTopNav && (
        <TopNav
          profile={topNavProfile}
          view="settings"
          onNavigate={handleTopNav}
          onRequestLogout={() => signOut({ callbackUrl: '/login' })}
          unreadMessages={0}
          unreadNotifications={0}
          isAdmin={Boolean(currentSession?.user?.email && currentSession.user.email.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase())}
          onSearch={(query) => {
            if (query.trim()) router.push(`/feed?view=feed&search=${encodeURIComponent(query.trim())}`);
          }}
        />
      )}
      <style>{`
        .st-nav-scroll::-webkit-scrollbar{display:none}
        .st-nav-scroll{-ms-overflow-style:none;scrollbar-width:none}
        @media (max-width: 768px) {
          .st-settings-root { width: 100% !important; min-width: 0 !important; }
          .st-settings-page { width: 100% !important; max-width: none !important; margin: 0 !important; padding: calc(var(--lynora-header-offset, 96px) + 8px) 12px 20px !important; }
          .st-settings-page:not(.st-settings-with-nav) { padding-top: 8px !important; }
          .st-settings-page h1 { font-size: 24px !important; }
          .st-settings-page p { line-height: 1.5; }
          .st-settings-panel,
          .st-settings-shell { width: 100% !important; max-width: none !important; }
          .st-settings-shell { grid-template-columns: 1fr !important; gap: 20px !important; }
          .st-settings-sidebar { border: 0 !important; border-bottom: 1px solid ${COLORS.border} !important; border-radius: 0 !important; padding: 0 0 16px !important; box-shadow: none !important; background: transparent !important; }
          .st-settings-sidebar { position: static !important; }
          .st-settings-nav { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; }
          .st-settings-nav button { width: 100% !important; padding: 10px 8px !important; }
          .st-settings-nav .nav-desc { display: none !important; }
          .st-settings-main { width: 100% !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: transparent !important; overflow: visible !important; }
          .st-two-col-grid,
          .st-form-grid-2,
          .st-compact-grid,
          .st-skills-header,
          .st-status-grid,
          .st-notif-grid,
          .st-appearance-grid,
          .st-account-grid {
            grid-template-columns: 1fr !important; }
          .st-option-grid-3 {
            grid-template-columns: 1fr !important; }
          .st-exp-item,
          .st-skill-item {
            flex-direction: column !important; }
          .st-exp-item > div:first-child,
          .st-skill-item > div:first-child {
            width: 100% !important; }
          .st-exp-item > div:nth-child(2),
          .st-skill-item > div:nth-child(2) {
            width: 100% !important; }
          .st-skill-item > div:nth-child(2) {
            display: grid !important; grid-template-columns: 1fr !important; }
          .st-section-card-header {
            align-items: flex-start !important; flex-direction: column !important; gap: 8px !important; }
          .st-section-card-header > div { width: 100%; }
          .st-save-bar {
            flex-direction: column !important; align-items: stretch !important; }
          .st-save-bar > div:last-child {
            width: 100% !important; justify-content: space-between !important; }
          .st-save-bar button { flex: 1; }
          .st-avatar-row,
          .st-profile-header-row {
            flex-direction: column !important; align-items: flex-start !important; }
          .st-cover-button,
          .st-change-photo-inline {
            width: 100% !important; justify-content: center !important; }
        }
      `}</style>
      <div className={`st-settings-page${showTopNav ? ' st-settings-with-nav' : ''}`} style={{ maxWidth: 1128, margin: '0 auto', padding: `${showTopNav ? 'calc(var(--lynora-header-offset, 96px) + 24px)' : '24px'} 16px 80px` }}>

        {/* Page header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Paramètres</h1>
          <p style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>Gérez votre profil, votre confidentialité et les préférences de l'application</p>
        </div>

        <div className="st-settings-panel" style={{ display: 'grid', gridTemplateColumns: '1fr', background: 'transparent' }}>
          <div className="st-settings-shell" style={{ display: 'grid', gridTemplateColumns: '248px minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>

            {/* ---- Sidebar Navigation ---- */}
            <aside className="st-settings-sidebar" style={{ padding: '18px 12px', border: `1px solid ${COLORS.border}`, borderRadius: 16, background: '#FFFFFF', boxShadow: '0 8px 24px rgba(15,32,52,0.06)', position: 'sticky', top: 20 }}>
              <div style={{ padding: '2px 12px 16px', borderBottom: `1px solid ${COLORS.border}`, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: COLORS.primary }}>Espace personnel</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginTop: 5 }}>Préférences</div>
              </div>
              <nav className="st-settings-nav st-nav-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {NAV_SECTIONS.map(({ key, label, icon: Icon, desc }) => {
                  const active = activeSection === key;
                  return (
                    <button key={key} onClick={() => setActiveSection(key)} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 10, padding: '11px 12px', textAlign: 'left', cursor: 'pointer', border: active ? `1px solid #CFE3FA` : '1px solid transparent', background: active ? '#EFF6FF' : 'transparent', color: active ? COLORS.primary : COLORS.textSecondary, transition: 'all 150ms', width: '100%' }} onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#F3F4F6'; }} onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? '#EFF6FF' : 'transparent'; }}>
                      <Icon size={18} style={{ flexShrink: 0 }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: active ? 600 : 500 }}>{label}</span>
                        <span className="nav-desc" style={{ display: 'block', fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{desc}</span>
                      </span>
                      {active && <span style={{ width: 3, height: 24, borderRadius: 2, background: COLORS.accent, position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }} />}
                    </button>
                  );
                })}
                {/* Logout button at bottom */}
                <div style={{ marginTop: 16, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
                  <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 8, padding: '10px 12px', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent', color: COLORS.danger, width: '100%', fontSize: 14, fontWeight: 500 }} onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.dangerBg)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <LogOut size={18} style={{ flexShrink: 0 }} />
                    Déconnexion
                  </button>
                </div>
              </nav>
            </aside>

            {/* ---- Main Content ---- */}
            <main className="st-settings-main" style={{ padding: '20px 24px', overflowY: 'auto', minWidth: 0, border: `1px solid ${COLORS.border}`, borderRadius: 16, background: '#FFFFFF', boxShadow: '0 8px 24px rgba(15,32,52,0.06)' }}>
              {error && saved.profile.name && (
                <div style={{ marginBottom: 16, borderRadius: 8, padding: '12px 16px', background: COLORS.dangerBg, border: `1px solid ${COLORS.dangerBorder}`, color: COLORS.danger }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{error}</p>
                </div>
              )}

              {/* ======================== PROFIL ======================== */}
              {activeSection === 'profil' && (
                <>
                  {/* Cover photo section */}
                  <SectionCard title="Photo de couverture" subtitle="La bannière en haut de votre profil">
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '3/1', borderRadius: 8, overflow: 'hidden', background: coverPreview || p.coverSrc
                      ? `url(${coverPreview || p.coverSrc}) center/cover no-repeat`
                      : 'linear-gradient(135deg, #B0C4DE 0%, #DCE7F1 40%, #C8D8E8 100%)',
                      border: `1px solid ${COLORS.border}` }}>
                      <button onClick={() => { setCoverPreview(p.coverSrc); setCoverModalOpen(true); }} style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6, borderRadius: 24, padding: '8px 16px', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', backdropFilter: 'blur(4px)' }}>
                        <Camera size={14} /> Changer la couverture
                      </button>
                    </div>
                  </SectionCard>

                  {/* Avatar section */}
                  <SectionCard title="Photo de profil">
                    <div className="st-profile-header-row" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: COLORS.textMuted, background: p.avatarSrc ? 'transparent' : '#E5E7EB', fontSize: 24 }}>
                          {p.avatarSrc ? <img src={p.avatarSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.initials}
                        </div>
                        <button onClick={() => { setAvatarPreview(p.avatarSrc); setAvatarModalOpen(true); }} style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: COLORS.primary, border: '2px solid #fff', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }} aria-label="Changer la photo">
                          <Camera size={12} />
                        </button>
                      </div>
                      <div>
                        <button className="st-change-photo-inline" onClick={() => { setAvatarPreview(p.avatarSrc); setAvatarModalOpen(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 24, padding: '8px 20px', fontSize: 14, fontWeight: 600, border: `1px solid ${COLORS.primary}`, color: COLORS.primary, background: '#fff', cursor: 'pointer' }}>Changer la photo</button>
                        <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6 }}>JPG, PNG ou GIF. Taille recommandée 400×400 px.</p>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Personal info */}
                  <SectionCard title="Informations personnelles" subtitle="Visibles sur votre profil public">
                    <div className="st-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <FieldLabel hint="Prénom et nom tels qu'ils apparaîtront">Nom complet</FieldLabel>
                        <TextInput value={p.name} onChange={(v) => update('profile', { name: v })} placeholder="Votre nom" />
                      </div>
                      <div>
                        <FieldLabel hint="Ex: Développeur Full-Stack">Titre / Headline</FieldLabel>
                        <TextInput value={p.headline} onChange={(v) => update('profile', { headline: v })} placeholder="Votre titre" />
                      </div>
                      <div>
                        <FieldLabel hint="JJ/MM/AAAA">Date de naissance</FieldLabel>
                        <TextInput type="date" value={p.birthDate || ''} onChange={(v) => update('profile', { birthDate: v })} placeholder="JJ/MM/AAAA" />
                      </div>
                      <div>
                        <FieldLabel hint="Ville, pays">Localisation</FieldLabel>
                        <TextInput icon={MapPin} value={p.location} onChange={(v) => update('profile', { location: v })} placeholder="Ex: Antananarivo, Madagascar" />
                      </div>
                      <div>
                        <FieldLabel hint="Entreprise ou organisation">Entreprise</FieldLabel>
                        <TextInput icon={Building2} value={p.company} onChange={(v) => update('profile', { company: v })} placeholder="Ex: Zilo Pay" />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <FieldLabel hint="Votre site web ou portfolio">Site web</FieldLabel>
                        <TextInput icon={Link2} value={p.website} onChange={(v) => update('profile', { website: v })} placeholder="https://..." />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <FieldLabel hint="Texte court sous votre nom sur le profil">Bio</FieldLabel>
                        <TextArea value={p.bio || ''} onChange={(v) => update('profile', { bio: v })} rows={2} placeholder="Une phrase qui vous résume..." />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <FieldLabel hint="Présentez-vous en quelques mots">À propos</FieldLabel>
                        <TextArea value={p.about} onChange={(v) => update('profile', { about: v })} rows={4} placeholder="Parlez de votre parcours, vos passions, vos objectifs..." />
                      </div>
                    </div>
                  </SectionCard>

                  {/* Experience management */}
                  <SectionCard title="Expérience professionnelle" subtitle="Ajoutez vos postes et entreprises" action={
                    <button onClick={addExperience} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1px solid ${COLORS.primary}`, color: COLORS.primary, background: '#fff', cursor: 'pointer' }}>
                      <Plus size={14} /> Ajouter
                    </button>
                  }>
                    {(p.experience || []).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 16px', color: COLORS.textMuted }}>
                        <Briefcase size={32} style={{ color: COLORS.border, margin: '0 auto 12px' }} />
                        <p style={{ fontSize: 14, margin: 0 }}>Aucune expérience ajoutée</p>
                        <p style={{ fontSize: 13, marginTop: 4 }}>Cliquez sur « Ajouter » pour commencer.</p>
                      </div>
                    ) : (
                      (p.experience || []).map((exp, idx) => (
                        <ExperienceItemEditor key={idx} item={exp} index={idx} onUpdate={updateExperience} onRemove={removeExperience} />
                      ))
                    )}
                  </SectionCard>

                  {/* Skills management */}
                  <SectionCard title="Compétences" subtitle="Vos compétences visibles sur le profil" action={
                    <button onClick={addSkill} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1px solid ${COLORS.primary}`, color: COLORS.primary, background: '#fff', cursor: 'pointer' }}>
                      <Plus size={14} /> Ajouter
                    </button>
                  }>
                    <div className="st-skills-header" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12, padding: '0 4px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted }}>Compétence</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted }}>Endorsements</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted }}>Niveau (%)</span>
                    </div>
                    {(p.skills || []).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 16px', color: COLORS.textMuted }}>
                        <Star size={32} style={{ color: COLORS.border, margin: '0 auto 12px' }} />
                        <p style={{ fontSize: 14, margin: 0 }}>Aucune compétence ajoutée</p>
                        <p style={{ fontSize: 13, marginTop: 4 }}>Cliquez sur « Ajouter » pour commencer.</p>
                      </div>
                    ) : (
                      (p.skills || []).map((skill, idx) => (
                        <SkillItemEditor key={idx} item={skill} index={idx} onUpdate={updateSkill} onRemove={removeSkill} />
                      ))
                    )}
                    {/* Live preview */}
                    {(p.skills || []).length > 0 && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMuted, marginBottom: 12 }}>Aperçu sur le profil :</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {(p.skills || []).map((s, i) => (
                            <span key={i} style={{ padding: '6px 14px', borderRadius: 20, background: '#F3F6F8', color: COLORS.textPrimary, fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </SectionCard>
                </>
              )}

              {/* ======================== CONFIDENTIALITÉ ======================== */}
              {activeSection === 'confidentialite' && (
                <>
                  <SectionCard title="Visibilité du profil" subtitle="Contrôlez qui peut voir vos informations">
                    <div className="st-option-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      {VISIBILITY_OPTIONS.map((opt) => (
                        <OptionRow key={opt.key} active={priv.profileVisibility === opt.key} onClick={() => update('privacy', { profileVisibility: opt.key })} icon={opt.icon} label={opt.label} desc={opt.desc} />
                      ))}
                    </div>
                  </SectionCard>
                  <SectionCard title="Activité et relations">
                    <div style={{ maxWidth: 560 }}>
                      <Toggle checked={toBool(priv.showConnections)} onChange={(v) => update('privacy', { showConnections: v })} label="Afficher mes relations" desc="Vos relations pourront voir votre réseau" />
                      <div style={{ borderTop: `1px solid ${COLORS.border}` }} />
                      <Toggle checked={toBool(priv.showActivity)} onChange={(v) => update('privacy', { showActivity: v })} label="Afficher mon activité" desc="Vos publications et interactions apparaissent dans le fil" />
                      <div style={{ borderTop: `1px solid ${COLORS.border}` }} />
                      <Toggle checked={toBool(priv.searchable)} onChange={(v) => update('privacy', { searchable: v })} label="Profil répertoriable" desc="Les moteurs de recherche peuvent indexer votre profil public" />
                    </div>
                  </SectionCard>
                  <SectionCard title="Utilisateurs retirés" subtitle="Gérez les personnes que vous avez retirées de votre réseau">
                    <div style={{ maxWidth: 560 }}>
                      {(draft.removedConnections || []).map((user) => (
                        <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            {user.image ? <img src={user.image} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EAF2F8', color: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><UserX size={16} /></div>}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                              <div style={{ fontSize: 12, color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.title}</div>
                            </div>
                          </div>
                          <SecondaryButton onClick={() => handleUnblock(user.id)}>Débloquer</SecondaryButton>
                        </div>
                      ))}
                      {(!draft.removedConnections || draft.removedConnections.length === 0) && <p style={{ fontSize: 14, color: COLORS.textMuted, margin: 0 }}>Aucun utilisateur retiré.</p>}
                    </div>
                  </SectionCard>
                  <SectionCard title="Disponibilité" subtitle="Statut affiché sur votre profil">
                    <div className="st-option-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      {STATUS_OPTIONS.map((opt) => (
                        <OptionRow key={opt.key} active={priv.availability === opt.key} onClick={() => update('privacy', { availability: opt.key })} label={opt.label} desc={opt.key === 'open' ? 'Recevez des opportunités' : opt.key === 'mentoring' ? 'Mentorat disponible' : 'Non sollicité(e)'} colorDot={opt.color} />
                      ))}
                    </div>
                    {/* Status preview matching profile pill */}
                    <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: '#FAFAFA', border: `1px solid ${COLORS.border}` }}>
                      <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '0 0 8px' }}>Aperçu sur le profil :</p>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 16, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: STATUS_OPTIONS.find(o => o.key === priv.availability)?.color, background: STATUS_OPTIONS.find(o => o.key === priv.availability)?.bg, border: `1px solid ${STATUS_OPTIONS.find(o => o.key === priv.availability)?.border}` }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_OPTIONS.find(o => o.key === priv.availability)?.color, flexShrink: 0 }} />
                        {STATUS_OPTIONS.find(o => o.key === priv.availability)?.label}
                      </span>
                    </div>
                  </SectionCard>
                </>
              )}

              {/* ======================== NOTIFICATIONS ======================== */}
              {activeSection === 'messagerie' && (
                <SectionCard title="Préférences de messagerie" subtitle="Contrôlez votre visibilité dans les conversations">
                  <div style={{ maxWidth: 560 }}>
                    <Toggle checked={toBool(notif.showOnlineStatus)} onChange={(v) => update('notifications', { showOnlineStatus: v })} label="Statut en ligne" desc="Afficher le point vert sur votre avatar dans les conversations et votre profil" />
                  </div>
                </SectionCard>
              )}

              {/* ======================== NOTIFICATIONS ======================== */}
              {activeSection === 'notifications' && (
                <>
                  <SectionCard title="Notifications par e-mail" subtitle="Recevez des alertes directement dans votre boîte mail">
                    <div style={{ maxWidth: 560 }}>
                      <Toggle checked={toBool(notif.email.messages)} onChange={(v) => updateNested('notifications', 'email', { messages: v })} label="Messages" desc="Nouveaux messages et réponses" />
                      <div style={{ borderTop: `1px solid ${COLORS.border}` }} />
                      <Toggle checked={toBool(notif.email.connectionRequests)} onChange={(v) => updateNested('notifications', 'email', { connectionRequests: v })} label="Demandes de relation" desc="Quelqu'un souhaite se connecter à vous" />
                      <div style={{ borderTop: `1px solid ${COLORS.border}` }} />
                      <Toggle checked={toBool(notif.email.endorsements)} onChange={(v) => updateNested('notifications', 'email', { endorsements: v })} label="Validations de compétences" desc="Quelqu'un valide l'une de vos compétences" />
                      <div style={{ borderTop: `1px solid ${COLORS.border}` }} />
                      <Toggle checked={toBool(notif.email.newsletter)} onChange={(v) => updateNested('notifications', 'email', { newsletter: v })} label="Newsletter LynoraLink" desc="Conseils, nouveautés et témoignages" />
                    </div>
                  </SectionCard>
                  <SectionCard title="Notifications push" subtitle="Notifications dans votre navigateur ou mobile">
                    <div style={{ maxWidth: 560 }}>
                      <Toggle checked={toBool(notif.push.messages)} onChange={(v) => updateNested('notifications', 'push', { messages: v })} label="Messages" />
                      <div style={{ borderTop: `1px solid ${COLORS.border}` }} />
                      <Toggle checked={toBool(notif.push.connectionRequests)} onChange={(v) => updateNested('notifications', 'push', { connectionRequests: v })} label="Demandes de relation" />
                      <div style={{ borderTop: `1px solid ${COLORS.border}` }} />
                      <Toggle checked={toBool(notif.push.mentions)} onChange={(v) => updateNested('notifications', 'push', { mentions: v })} label="Mentions" desc="Quelqu'un vous mentionne dans une publication" />
                      <div style={{ borderTop: `1px solid ${COLORS.border}` }} />
                      <Toggle checked={toBool(notif.push.endorsements)} onChange={(v) => updateNested('notifications', 'push', { endorsements: v })} label="Validations de compétences" />
                    </div>
                  </SectionCard>
                </>
              )}

              {/* ======================== APPARENCE ======================== */}
              {activeSection === 'apparence' && (
                <>
                  <SectionCard title="Thème" subtitle="Choisissez l'apparence de l'interface">
                    <div className="st-option-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <OptionRow active={app.theme === 'light'} onClick={() => update('appearance', { theme: 'light' })} icon={Sun} label="Clair" desc="Interface claire" />
                      <OptionRow active={app.theme === 'dark'} onClick={() => update('appearance', { theme: 'dark' })} icon={Moon} label="Sombre" desc="Interface sombre" />
                      <OptionRow active={app.theme === 'system'} onClick={() => update('appearance', { theme: 'system' })} icon={Monitor} label="Système" desc="S'adapte à vos préférences" />
                    </div>
                  </SectionCard>
                  <SectionCard title="Densité d'affichage">
                    <div className="st-compact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <OptionRow active={app.density === 'comfortable'} onClick={() => update('appearance', { density: 'comfortable' })} label="Confortable" desc="Espacement aéré" />
                      <OptionRow active={app.density === 'compact'} onClick={() => update('appearance', { density: 'compact' })} label="Compact" desc="Plus d'informations à l'écran" />
                    </div>
                  </SectionCard>
                  <SectionCard title="Taille du texte">
                    <div className="st-option-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <OptionRow active={app.fontScale === 'small'} onClick={() => update('appearance', { fontScale: 'small' })} label="Petit" />
                      <OptionRow active={app.fontScale === 'medium'} onClick={() => update('appearance', { fontScale: 'medium' })} label="Moyen" />
                      <OptionRow active={app.fontScale === 'large'} onClick={() => update('appearance', { fontScale: 'large' })} label="Grand" />
                    </div>
                  </SectionCard>
                </>
              )}

              {/* ======================== COMPTE ======================== */}
              {activeSection === 'compte' && (
                <>
                  <SectionCard title="Informations du compte">
                    <div className="st-account-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <FieldLabel hint="Cette adresse est utilisée pour la connexion">E-mail</FieldLabel>
                        <TextInput icon={Mail} value={acc.email} onChange={() => {}} placeholder="votre@email.com" disabled />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                          <TextInput icon={Mail} value={emailForm.email} onChange={(value) => setEmailForm((form) => ({ ...form, email: value }))} placeholder="Nouvel e-mail" />
                          <TextInput type="password" value={emailForm.currentPassword} onChange={(value) => setEmailForm((form) => ({ ...form, currentPassword: value }))} placeholder="Mot de passe actuel" />
                          {emailTwoFactorRequired && (
                            <>
                              <TextInput value={emailForm.otp} onChange={(value) => setEmailForm((form) => ({ ...form, otp: value.replace(/\D/g, '').slice(0, 6) }))} placeholder="Code de sécurité à 6 chiffres" />
                              <button type="button" onClick={handleResendEmailCode} disabled={emailResending} style={{ alignSelf: 'flex-start', border: 'none', background: 'none', color: COLORS.primary, padding: 0, fontSize: 12, fontWeight: 600, cursor: emailResending ? 'default' : 'pointer', opacity: emailResending ? 0.6 : 1 }}>
                                {emailResending ? 'Envoi en cours...' : 'Renvoyer le code'}
                              </button>
                            </>
                          )}
                          <PrimaryButton onClick={handleChangeEmail}>Modifier l’e-mail</PrimaryButton>
                          {emailInfo && <p style={{ fontSize: 12, color: COLORS.success, margin: 0 }}>{emailInfo}</p>}
                          {emailError && <p style={{ fontSize: 12, color: COLORS.danger, margin: 0 }}>{emailError}</p>}
                        </div>
                      </div>
                      <div>
                        <FieldLabel hint="Langue de l'interface">Langue</FieldLabel>
                        <TextInput value={acc.language === 'fr' ? 'Français' : acc.language} onChange={() => {}} placeholder="Langue" disabled />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <FieldLabel hint="Fuseau horaire pour les notifications et événements">Fuseau horaire</FieldLabel>
                        <TextInput icon={MapPin} value={acc.timezone} onChange={(v) => update('account', { timezone: v })} placeholder="Ex: Africa/Nairobi" />
                      </div>
                    </div>
                  </SectionCard>
                  <SectionCard title="Double authentification" subtitle="Recevez un code par e-mail à chaque nouvelle connexion">
                    <Toggle
                      checked={toBool(acc.twoFactor)}
                      onChange={(value) => update('account', { twoFactor: value })}
                      label="Code de sécurité par e-mail"
                      desc="Un code à usage unique sera demandé après votre mot de passe."
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 12, borderTop: `1px solid ${COLORS.border}`, fontSize: 12.5, color: toBool(acc.twoFactor) ? COLORS.success : COLORS.textMuted }}>
                      <ShieldCheck size={15} />
                      <span>{toBool(acc.twoFactor) ? 'La double authentification est activée.' : 'La double authentification est désactivée.'}</span>
                      {isDirty && <span style={{ color: COLORS.textMuted }}>Enregistrez vos modifications pour appliquer ce choix.</span>}
                    </div>
                  </SectionCard>
                  <SectionCard title="Mot de passe">
                    <div style={{ maxWidth: 560 }}>
                      {passwordError && (<div style={{ borderRadius: 8, padding: '10px 14px', marginBottom: 12, background: COLORS.dangerBg, border: `1px solid ${COLORS.dangerBorder}`, color: COLORS.danger }}><p style={{ fontSize: 13, margin: 0 }}>{passwordError}</p></div>)}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <FieldLabel>Mot de passe actuel</FieldLabel>
                          <TextInput type="password" value={passwordForm.current} onChange={(v) => setPasswordForm((f) => ({ ...f, current: v }))} placeholder="••••••••" />
                        </div>
                        <div>
                          <FieldLabel hint="Au moins 8 caractères">Nouveau mot de passe</FieldLabel>
                          <TextInput type="password" value={passwordForm.next} onChange={(v) => setPasswordForm((f) => ({ ...f, next: v }))} placeholder="••••••••" />
                        </div>
                        <div>
                          <FieldLabel>Confirmer le nouveau mot de passe</FieldLabel>
                          <TextInput type="password" value={passwordForm.confirm} onChange={(v) => setPasswordForm((f) => ({ ...f, confirm: v }))} placeholder="••••••••" />
                        </div>
                        {passwordTwoFactorRequired && (
                          <div>
                            <FieldLabel>Code de sécurité</FieldLabel>
                            <TextInput value={passwordForm.otp} onChange={(v) => setPasswordForm((f) => ({ ...f, otp: v.replace(/\D/g, '').slice(0, 6) }))} placeholder="Code à 6 chiffres" />
                          </div>
                        )}
                        <PrimaryButton onClick={handleChangePassword}>{passwordTwoFactorRequired ? 'Vérifier le code et modifier' : 'Mettre à jour le mot de passe'}</PrimaryButton>
                      </div>
                    </div>
                  </SectionCard>
                  <SectionCard title="Sessions actives" subtitle="Gérez les appareils connectés à votre compte">
                    <div style={{ maxWidth: 560 }}>
                      {(draft.sessions || []).map((s) => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.inputBg, marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EFF6FF', color: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Laptop size={16} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.device || 'Session'}</div>
                              <div style={{ fontSize: 12, color: COLORS.textMuted }}>{s.location || 'En ligne'}{s.expired ? ' · expirée' : ''}</div>
                            </div>
                          </div>
                          {!s.current && !s.expired && (
                            <DangerButton onClick={() => setConfirmAction(`revoke:${s.id}`)}>Révoquer</DangerButton>
                          )}
                          {s.current && <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: COLORS.successBg, color: COLORS.success }}>Actuelle</span>}
                        </div>
                      ))}
                      {(!draft.sessions || draft.sessions.length === 0) && <p style={{ fontSize: 14, color: COLORS.textMuted }}>Aucune session active.</p>}
                    </div>
                  </SectionCard>
                </>
              )}

              {/* ======================== DONNÉES ======================== */}
              {activeSection === 'donnees' && (
                <>
                  <SectionCard title="Export de données" subtitle="Téléchargez une archive JSON de vos préférences et sessions">
                    <p style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 1.6 }}>
                      Exportez une copie de vos paramètres, profil et sessions actuellement enregistrés.
                    </p>
                    <PrimaryButton icon={Download} onClick={handleExportData}>Exporter mes données</PrimaryButton>
                  </SectionCard>
                  <SectionCard title="Suppression du compte" subtitle="Supprimez définitivement votre compte et vos données">
                    <p style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 1.6 }}>
                      Cette action est irréversible. Toutes vos données LynoraLink seront supprimées définitivement.
                    </p>
                    <DangerButton icon={Trash2} onClick={() => setConfirmAction('delete-account')}>Supprimer mon compte</DangerButton>
                  </SectionCard>
                </>
              )}
            </main>
          </div>
        </div>

        {/* ---- Unsaved changes bar ---- */}
        {isDirty && (
          <div className="st-save-bar" style={{ marginTop: 16, borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 14, color: COLORS.textSecondary }}>
              Vous avez des modifications non enregistrées.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SecondaryButton onClick={handleDiscard}>Annuler</SecondaryButton>
              <PrimaryButton onClick={handleSaveAll} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>

      {/* ======================== MODALS ======================== */}

      {/* Avatar modal */}
      {avatarModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15, 32, 52, 0.58)', backdropFilter: 'blur(8px)' }} onClick={() => { setAvatarModalOpen(false); setAvatarPreview(null); }}>
          <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(15,32,52,0.28)', width: '100%', maxWidth: 440, border: '1px solid rgba(255,255,255,0.7)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EAF3FF', color: COLORS.primary }}><Camera size={19} /></div>
                <div><h3 style={{ fontSize: 17, fontWeight: 750, color: COLORS.textPrimary, margin: 0 }}>Photo de profil</h3>
                <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: '4px 0 0' }}>Une image nette et reconnaissable</p></div>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => { setAvatarModalOpen(false); setAvatarPreview(null); }} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', background: COLORS.inputBg, color: COLORS.textMuted, cursor: 'pointer' }}><X size={17} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, background: '#F8FAFC' }}>
              <div ref={avatarStageRef} style={{ width: 'min(100%, 360px)', aspectRatio: '1', borderRadius: 14, overflow: 'hidden', background: avatarPreview ? '#111827' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #CBD5E1', position: 'relative', cursor: avatarPreview ? 'grab' : 'default', boxShadow: avatarPreview ? '0 10px 24px rgba(15,51,82,0.14)' : 'none' }} onPointerMove={moveAvatarCrop} onPointerUp={() => { avatarDragRef.current = null; }} onPointerCancel={() => { avatarDragRef.current = null; }}>
                {avatarPreview ? <img src={avatarPreview} alt="Aperçu" onPointerDown={(event) => { event.preventDefault(); avatarDragRef.current = { x: event.clientX, y: event.clientY, offsetX: avatarOffset.x, offsetY: avatarOffset.y }; avatarStageRef.current?.setPointerCapture?.(event.pointerId); }} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${50 + avatarOffset.x}% ${50 + avatarOffset.y}%`, userSelect: 'none', pointerEvents: 'auto' }} /> : <span style={{ fontSize: 13, color: COLORS.textMuted }}>Sélectionnez une image</span>}
                {avatarPreview && <><div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #fff', boxShadow: '0 0 0 999px rgba(15,23,42,0.42)', pointerEvents: 'none' }} /><span style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', padding: '5px 10px', borderRadius: 999, background: 'rgba(15,51,82,0.82)', color: '#fff', fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}>ZONE VISIBLE</span></>}
              </div>
              {avatarPreview && <div style={{ width: 'min(100%, 360px)', padding: '11px 13px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0', color: COLORS.textMuted, fontSize: 12, textAlign: 'center' }}>Faites glisser la photo pour ajuster le cadrage circulaire</div>}
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 12, padding: '10px 16px', fontSize: 13.5, fontWeight: 700, border: 'none', color: '#fff', background: COLORS.primary, cursor: 'pointer', boxShadow: '0 6px 14px rgba(10,102,194,0.2)' }}>
                <ImagePlus size={16} /> {avatarPreview ? 'Choisir une autre image' : 'Importer une image'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleAvatarFile(e.target.files)} />
              <p style={{ fontSize: 12, color: COLORS.textMuted, textAlign: 'center', margin: 0 }}>JPG, PNG ou GIF · 400 × 400 px recommandé</p>
              {avatarUploadError && <div role="alert" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 13 }}>{avatarUploadError}</div>}
            </div>
            <div style={{ padding: '16px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${COLORS.border}`, background: '#F8FAFC' }}>
              <SecondaryButton onClick={() => { setAvatarModalOpen(false); setAvatarPreview(null); }}>Annuler</SecondaryButton>
              <PrimaryButton onClick={saveAvatar} disabled={!avatarPreview || uploadingAvatar}>
                {uploadingAvatar ? 'Application...' : 'Appliquer'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Cover modal */}
      {coverModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15, 32, 52, 0.58)', backdropFilter: 'blur(8px)' }} onClick={() => { setCoverModalOpen(false); setCoverPreview(null); }}>
          <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(15,32,52,0.28)', width: '100%', maxWidth: 560, border: '1px solid rgba(255,255,255,0.7)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EAF3FF', color: COLORS.primary }}><Camera size={19} /></div>
                <div><h3 style={{ fontSize: 17, fontWeight: 750, color: COLORS.textPrimary, margin: 0 }}>Photo de couverture</h3>
                <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: '4px 0 0' }}>Donnez du caractère à votre profil</p></div>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => { setCoverModalOpen(false); setCoverPreview(null); }} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', background: COLORS.inputBg, color: COLORS.textMuted, cursor: 'pointer' }}><X size={17} /></button>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ width: '100%', aspectRatio: '4/1', borderRadius: 14, overflow: 'hidden', background: coverPreview || p.coverSrc
                ? `url(${coverPreview || p.coverSrc}) center/cover no-repeat`
                : COLORS.inputBg,
                border: `1px solid ${COLORS.border}`, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(15,32,52,0.1)' }}>
                {!coverPreview && !p.coverSrc && <span style={{ fontSize: 13, color: COLORS.textMuted }}>Aucun aperçu</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button type="button" onClick={() => coverInputRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 12, padding: '10px 16px', fontSize: 13.5, fontWeight: 700, border: 'none', color: '#fff', background: COLORS.primary, cursor: 'pointer', boxShadow: '0 6px 14px rgba(10,102,194,0.2)' }}>
                  <ImagePlus size={16} /> Importer une image
                </button>
                <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleCoverFile(e.target.files)} />
              </div>
              <p style={{ fontSize: 12, color: COLORS.textMuted, textAlign: 'center', margin: '12px 0 0' }}>JPG, PNG ou GIF · 1584 × 396 px recommandé</p>
            </div>
            <div style={{ padding: '16px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${COLORS.border}`, background: '#F8FAFC' }}>
              <SecondaryButton onClick={() => { setCoverModalOpen(false); setCoverPreview(null); }}>Annuler</SecondaryButton>
              <PrimaryButton onClick={saveCover} disabled={!coverPreview || uploadingCover}>
                {uploadingCover ? 'Enregistrement...' : 'Enregistrer'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal (revoke / delete) */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction === 'delete-account' ? 'Supprimer votre compte LynoraLink' : 'Révoquer la session'}
          body={confirmAction === 'delete-account'
            ? 'Cette action supprimera définitivement votre compte et toutes les données associées. Pour confirmer, veuillez saisir votre mot de passe.'
            : 'Voulez-vous révoquer cette session ? Vous serez déconnecté(e) sur cet appareil.'}
          confirmLabel={confirmAction === 'delete-account' ? 'Confirmer la suppression' : 'Révoquer'}
          danger={confirmAction === 'delete-account'}
          onCancel={() => { setConfirmAction(null); setDeletePassword(''); setDeleteError(null); }}
          onConfirm={() => {
            if (confirmAction === 'delete-account') handleDeleteAccount();
            else if (confirmAction?.startsWith('revoke:')) removeSession(confirmAction.split(':')[1]);
          }}
        >
          {confirmAction === 'delete-account' && (
            <div style={{ marginTop: 16 }}>
              <FieldLabel>Mot de passe actuel</FieldLabel>
              <TextInput type="password" value={deletePassword} onChange={setDeletePassword} placeholder="Entrez votre mot de passe" />
              {deleteError && <p style={{ marginTop: 8, fontSize: 12, color: COLORS.danger }}>{deleteError}</p>}
              <p style={{ marginTop: 12, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
                Cette action est irréversible et supprimera toutes vos données personnelles, votre historique et votre profil.
              </p>
            </div>
          )}
        </ConfirmModal>
      )}

      {/* Toast */}
      {toast && <Toast message={toast} />}
    </div>
  );
}
