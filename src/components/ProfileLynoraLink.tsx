"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNewspaper, faPhotoFilm, faWandSparkles } from '@fortawesome/free-solid-svg-icons';
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  MapPin, BadgeCheck, MessageCircle, UserPlus,
  MoreHorizontal, Users2, CheckCircle2, Circle, Camera, X, ImagePlus, User, Briefcase,
  Activity as ActivityIcon, MessageSquare, PenSquare,
  Globe2, Lock, Share2, ChevronDown,
  Bookmark, Flag, Copy, ExternalLink, Bell, BellOff,
  Check, Send, AlertTriangle, UserX, QrCode, FileText,
  Image as ImageIcon, ChevronLeft, ChevronRight as ArrowRight,
  GraduationCap, Award, Search, ThumbsUp, Sparkles,
} from 'lucide-react';
import RelativeTime from './RelativeTime';
import FeedCreatePostModal from './CreatePostModal';
import AIVisualEditorModal from './AIVisualEditorModal';
import FeedPostCard from './PostCard';
import FeedPostViewerPreview from './PostViewerPreview';
import FeedArticleViewerPreview from './ArticleViewerPreview';
import PremiumBadge from './PremiumBadge';
import EnterpriseBadge from './EnterpriseBadge';
import { ProfileSkeleton } from './Skeleton';
import { fetchBackendApi } from '@/lib/backend-api';

const FeedPostCardComponent = FeedPostCard as any;
const FeedPostViewerPreviewComponent = FeedPostViewerPreview as any;
const FeedArticleViewerPreviewComponent = FeedArticleViewerPreview as any;

type VisibilityKey = 'public' | 'connections' | 'private';

type ExperienceItem = {
  company: string;
  code: string;
  role: string;
  period: string;
  desc?: string;
};

type SkillItem = {
  name: string;
  endorsements: number;
  weight: number;
};

type StrengthItem = {
  label: string;
  done: boolean;
};

type FriendAvatar = {
  id: string | number;
  name: string;
  initials: string;
  avatarUrl?: string | null;
};

type ProfilePost = {
  id: string | number;
  time: string | Date;
  text: string;
  image?: string | null;
  likes: number;
  comments: number;
  visibility: VisibilityKey;
};

type ProfileData = {
  id?: string;
  email?: string;
  name: string;
  firstName: string;
  headline: string;
  location: string;
  company: string;
  initials: string;
  verified: boolean;
  isPremium?: boolean;
  isPlatformAdmin?: boolean;
  status: 'open' | 'mentoring' | 'unavailable';
  trustScore: number;
  connections: number;
  profileViews: number;
  endorsementRate: number;
  website: string;
  about: string;
  bio: string;
  avatarUrl?: string | null;
  experience: ExperienceItem[];
  skills: SkillItem[];
  strength: StrengthItem[];
  mutuals: { count: number; initials: string[]; friends?: FriendAvatar[] };
  activity: number[][];
};

let profile: ProfileData = {
  name: '',
  firstName: '',
  headline: '',
  location: '',
  company: '',
  initials: '',
  verified: false,
  isPremium: false,
  isPlatformAdmin: false,
  status: 'open',
  trustScore: 0,
  connections: 0,
  profileViews: 0,
  endorsementRate: 0,
  website: '',
  about: '',
  bio: '',
  experience: [],
  skills: [],
  strength: [],
  mutuals: { count: 0, initials: [] },
  activity: Array.from({ length: 14 }, () => Array.from({ length: 7 }, () => 0)),
};

const STATUS_META = {
  open: { label: 'Ouverte aux opportunités', color: '#155724', bg: '#d4edda', border: '#c3e6cb', dot: '#155724' },
  mentoring: { label: 'Disponible pour du mentorat', color: '#856404', bg: '#fff3cd', border: '#ffeeba', dot: '#856404' },
  unavailable: { label: 'Non disponible actuellement', color: '#383d41', bg: '#e2e3e5', border: '#d6d8db', dot: '#383d41' },
};

const VISIBILITY_META = {
  public: { label: 'Public', icon: Globe2 },
  connections: { label: 'Relations', icon: Users2 },
  private: { label: 'Privé', icon: Lock },
};

/* Tabs matching the reference screenshot */
const TAB_ITEMS = [
  { key: 'Publications', icon: MessageSquare },
  { key: 'À propos', icon: User },
  { key: 'Expérience', icon: Briefcase },
  { key: 'Activités', icon: ActivityIcon },
  { key: 'Amis', icon: Users2 },
  { key: 'Médias', icon: ImageIcon },
];

const INITIAL_POSTS: ProfilePost[] = [];

type FriendProfile = FriendAvatar & {
  headline: string;
  location: string;
  mutualCount: number;
  verified?: boolean;
  online?: boolean;
};

function getFriendsList(): FriendProfile[] {
  if (Array.isArray(profile.mutuals.friends) && profile.mutuals.friends.length) {
    return profile.mutuals.friends.map((f, i) => ({
      ...f,
      headline: (f as any).headline || 'Membre LynoraLink',
      location: (f as any).location || '—',
      mutualCount: (f as any).mutualCount ?? Math.max(1, Math.round(profile.mutuals.count / Math.max(1, profile.mutuals.friends.length))),
      verified: (f as any).verified ?? false,
      online: (f as any).online ?? (i % 3 === 0),
    }));
  }
  return [];
}

function getAboutContent() {
  const bio = profile.bio?.trim() || '';
  const about = profile.about?.trim() || '';
  const sections = [bio, about].filter((value, index, values) => value && values.indexOf(value) === index);
  return sections.length > 0 ? sections.join('\n\n') : 'Aucune présentation renseignée pour le moment.';
}

/* ========================================================================
   SUB-COMPONENTS
   ======================================================================== */

function Avatar({ src, initials, size = 40, borderColor = '#FFFFFF', borderWidth = 3 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden',
      background: src ? 'transparent' : '#E5E7EB',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `${borderWidth}px solid ${borderColor}`, flexShrink: 0,
      fontSize: size * 0.36, fontWeight: 600, color: '#6B7280',
    }}>
      {src ? <img src={src} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  );
}

function AvatarStack({ people = [], extraCount = 0, size = 24, max = 5, onClick, onPersonClick }: { people?: FriendAvatar[]; extraCount?: number; size?: number; max?: number; onClick?: () => void; onPersonClick?: (person: FriendAvatar) => void; }) {
  const visible = people.slice(0, max);
  const hiddenCount = Math.max(0, people.length - visible.length) + Math.max(0, extraCount);
  const [hoveredPerson, setHoveredPerson] = useState<FriendAvatar | null>(null);
  return (
    <div onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={(event) => { if (onClick && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onClick(); } }} style={{ position: 'relative', display: 'inline-flex', cursor: onClick ? 'pointer' : 'default', background: 'none', border: 'none', padding: 0, paddingTop: 4 }} aria-label="Voir les contacts">
      {visible.map((person, i) => (
        <span
          key={person.id}
          onMouseEnter={() => setHoveredPerson(person)}
          onMouseLeave={() => setHoveredPerson(null)}
          onClick={(event) => { event.stopPropagation(); onPersonClick?.(person); }}
          role={onPersonClick ? 'button' : undefined}
          tabIndex={onPersonClick ? 0 : undefined}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onPersonClick?.(person); } }}
          style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', border: '2px solid #fff', marginLeft: i > 0 ? '-8px' : 0, zIndex: visible.length - i, position: 'relative', display: 'inline-block', transition: 'transform 150ms ease', cursor: onPersonClick ? 'pointer' : 'default' }}
        >
          {person.avatarUrl
            ? <img src={person.avatarUrl} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E5E7EB', color: '#6B7280', fontSize: size * 0.36, fontWeight: 600 }}>{person.initials}</span>}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span style={{ width: size, height: size, borderRadius: '50%', background: '#E5E7EB', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.32, fontWeight: 600, color: '#374151', marginLeft: '-8px', border: '2px solid #fff', position: 'relative' }}>+{hiddenCount}</span>
      )}
      {hoveredPerson && (
        <span style={{ position: 'absolute', left: '50%', bottom: `calc(100% + 8px)`, transform: 'translateX(-50%)', zIndex: 20, whiteSpace: 'nowrap', padding: '6px 10px', borderRadius: 8, background: '#132433', color: '#fff', fontSize: 12, fontWeight: 700, boxShadow: '0 6px 16px rgba(15,51,82,0.24)', pointerEvents: 'none' }}>
          {hoveredPerson.name}
        </span>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const meta = STATUS_META[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 16, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
      {meta.label}
    </span>
  );
}

/* ========================================================================
   CARD WRAPPER — LinkedIn style
   ======================================================================== */

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#ffffff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.04)', border: '1px solid #E5E7EB', padding: 16, ...style }}>
      {children}
    </div>
  );
}

function CardTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(0,0,0,0.9)', margin: 0 }}>{title}</h3>
      {action}
    </div>
  );
}

/* ========================================================================
   IMAGE UPLOAD MODAL
   ======================================================================== */

type MediaItem = { id: string; name: string; url: string; type: 'image' | 'video'; size: number; uploadedAt: string | null; };

function ImageUploadModal({ type, initialPreview, onClose, onSave }: { type: string; initialPreview: string | null; onClose: () => void; onSave: (url: string) => Promise<void> }) {
  const [preview, setPreview] = useState(initialPreview || null);
  const [dragActive, setDragActive] = useState(false);
  const [fileObj, setFileObj] = useState(null as File | null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAvatar = type === 'avatar';
  const handleFiles = (files: FileList | null) => { const file = files?.[0]; if (file?.type.startsWith('image/')) { setFileObj(file); setPreview(URL.createObjectURL(file)); } };
  const handleSave = async () => {
    setUploading(true);
    try {
      let url = preview;
      if (fileObj) {
        const preset = process.env.NEXT_PUBLIC_CLOUDINARY_AVATAR_PRESET;
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const fd = new FormData(); fd.append('file', fileObj);
        if (preset) fd.append('upload_preset', preset);
        fd.append('resource_type', 'image'); fd.append('folder', 'lynoralink');
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
        const json = await res.json(); if (res.ok && json?.secure_url) url = json.secure_url;
      }
      await onSave(url || '');
    } catch (err) { console.error('Upload failed', err); await onSave(preview || ''); } finally { setUploading(false); }
  };
  return (
    <div className="profile-upload-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.5)' }}>
      <div className="profile-upload-panel" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '100%', maxWidth: 448 }}>
        <div className="profile-upload-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <div><h3 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(0,0,0,0.9)', margin: 0 }}>{isAvatar ? 'Changer la photo de profil' : 'Changer la photo de couverture'}</h3>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>{isAvatar ? 'Format carré recommandé' : 'Format large recommandé'}</p></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: '50%', color: '#6B7280' }}><X size={18} /></button>
        </div>
        <div className="profile-upload-body" style={{ padding: 20 }}>
          <div style={{ width: '100%', aspectRatio: isAvatar ? '1/1' : '16/9', borderRadius: isAvatar ? '50%' : 12, border: `2px dashed ${dragActive ? '#0a66c2' : '#E5E7EB'}`, background: preview ? 'transparent' : '#F9FAFB', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }} onClick={() => inputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}>
            {preview ? <img src={preview} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}><ImagePlus size={26} color="#6B7280" /><p style={{ fontSize: 13, color: '#374151', margin: 0 }}>Glissez une image ici</p></div>}
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Annuler</button>
            <button onClick={handleSave} disabled={!preview || uploading} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: '#0a66c2', color: '#fff', fontSize: 14, fontWeight: 600, cursor: preview && !uploading ? 'pointer' : 'default', opacity: (!preview || uploading) ? 0.4 : 1 }}>{uploading ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================
   MORE DROPDOWN
   ======================================================================== */

function MoreDropdown({ items }: { items: any[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (!open) return; const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ border: '1px solid #9CA3AF', borderRadius: 24, padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#374151', background: open ? '#F3F4F6' : '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><MoreHorizontal size={16} /> Plus</button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 220, background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '1px solid #E5E7EB', overflow: 'hidden', zIndex: 30 }}>
          {items.map((item, i) => { const Icon = item.icon; return (
            <React.Fragment key={i}>
              {item.divider && <div style={{ borderTop: '1px solid #E5E7EB' }} />}
              <button onClick={() => { item.onClick?.(); setOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', fontSize: 14, fontWeight: 500, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: item.danger ? '#DC2626' : 'rgba(0,0,0,0.9)', transition: 'background 100ms' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
                <Icon size={15} style={{ color: item.danger ? '#DC2626' : '#6B7280', flexShrink: 0 }} />{item.label}
              </button>
            </React.Fragment>); })}
        </div>
      )}
    </div>
  );
}

/* ========================================================================
   TOAST
   ======================================================================== */

function Toast({ message, icon: Icon, onClose }: { message: string; icon: any; onClose: () => void }) {
  React.useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 10, borderRadius: 24, padding: '12px 20px', background: '#0a66c2', color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
      {Icon && <Icon size={16} style={{ color: '#fff', flexShrink: 0 }} />}
      <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>{message}</span>
      <button onClick={onClose} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: 2, borderRadius: '50%' }}><X size={14} /></button>
    </div>
  );
}

/* ========================================================================
   SHARE MODAL
   ======================================================================== */

function ShareProfileModal({ profileName, onClose, onCopyLink, onToast }: { profileName: string; onClose: () => void; onCopyLink: () => void; onToast: (msg: string, icon: any) => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { onCopyLink(); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.5)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '100%', maxWidth: 448 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <div><h3 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(0,0,0,0.9)', margin: 0 }}>Partager le profil</h3><p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Partager le profil de {profileName}</p></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: '50%', color: '#6B7280' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <button onClick={handleCopy} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, border: '1px solid #E5E7EB', background: copied ? '#D1FAE5' : 'transparent', cursor: 'pointer', marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: copied ? '#057642' : '#0a66c2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{copied ? <Check size={18} /> : <Copy size={18} />}</div>
            <div style={{ textAlign: 'left' }}><div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.9)' }}>{copied ? 'Lien copié !' : 'Copier le lien'}</div><div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Copier le lien du profil</div></div>
          </button>
          <button onClick={() => onToast('QR Code généré', QrCode)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'transparent', cursor: 'pointer', marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#0a66c2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><QrCode size={18} /></div>
            <div style={{ textAlign: 'left' }}><div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.9)' }}>Code QR</div><div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Afficher un QR code</div></div>
          </button>
          <div style={{ background: '#F3F4F6', borderRadius: 8, padding: 12, marginTop: 12, border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 8px' }}>Lien direct du profil</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <code style={{ flex: 1, padding: '8px 12px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 13, color: '#0a66c2', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>https://lynoralink.com/p/{profileName.toLowerCase().replace(/\s+/g, '-')}</code>
              <button onClick={handleCopy} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#0a66c2', color: '#fff', cursor: 'pointer' }}>{copied ? <Check size={14} /> : <Copy size={14} />}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================
   REPORT MODAL
   ======================================================================== */

const REPORT_REASONS = [
  { id: 'fake', label: 'Profil fictif', icon: UserX },
  { id: 'spam', label: 'Spam', icon: AlertTriangle },
  { id: 'impersonation', label: "Usurpation d'identité", icon: Flag },
  { id: 'harassment', label: 'Harcèlement', icon: Flag },
  { id: 'scam', label: 'Escroquerie', icon: AlertTriangle },
];

function ReportModal({ profileName, onClose, onToast }: { profileName: string; onClose: () => void; onToast: (msg: string, icon: any) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = () => { if (!selected) return; setSubmitted(true); setTimeout(() => { onToast('Signalement envoyé', Flag); onClose(); }, 1800); };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.5)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '100%', maxWidth: 448 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <div><h3 style={{ fontSize: 16, fontWeight: 700, color: '#DC2626', margin: 0 }}>Signaler ce profil</h3><p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>Aidez-nous à comprendre le problème</p></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: '50%', color: '#6B7280' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {submitted ? (<div style={{ textAlign: 'center', padding: '24px 0' }}><div style={{ width: 56, height: 56, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><CheckCircle2 size={28} color="#057642" /></div><h4 style={{ margin: '0 0 4px', color: 'rgba(0,0,0,0.9)' }}>Signalement envoyé</h4><p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Notre équipe examinera le profil.</p></div>) : (<>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 12px' }}>Sélectionnez la raison :</p>
            {REPORT_REASONS.map((r) => { const Icon = r.icon; const isSel = selected === r.id; return (
              <button key={r.id} onClick={() => setSelected(r.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: isSel ? '2px solid #DC2626' : '1px solid #E5E7EB', background: isSel ? '#FEF2F2' : 'transparent', cursor: 'pointer', marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: isSel ? '#DC2626' : '#F3F4F6', color: isSel ? '#fff' : '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={17} /></div>
                <span style={{ fontSize: 14, fontWeight: 500, color: isSel ? '#DC2626' : 'rgba(0,0,0,0.9)', flex: 1, textAlign: 'left' }}>{r.label}</span>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: isSel ? '2px solid #DC2626' : '2px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{isSel && <Check size={11} color="#fff" />}</div>
              </button>); })}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Annuler</button>
              <button onClick={handleSubmit} disabled={!selected} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: '#DC2626', color: '#fff', fontSize: 14, fontWeight: 600, cursor: selected ? 'pointer' : 'default', opacity: selected ? 1 : 0.4 }}>Signaler</button>
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================
   CONTACTS MODAL (matching reference screenshot)
   ======================================================================== */

function ContactsModal({ isOpen, onClose, contacts }: { isOpen: boolean; onClose: () => void; contacts: FriendProfile[] }) {
  const [search, setSearch] = useState('');
  if (!isOpen) return null;
  const filtered = search.trim()
    ? contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.headline.toLowerCase().includes(search.toLowerCase()))
    : contacts;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '100%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'rgba(0,0,0,0.9)', margin: 0 }}>Contacts ({contacts.length})</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: '50%', color: '#6B7280' }}><X size={20} /></button>
        </div>
        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input type="text" placeholder="Rechercher un contact..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', paddingLeft: 38, paddingRight: 14, padding: '10px 14px 10px 38', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none', color: 'rgba(0,0,0,0.9)', background: '#fff' }} />
          </div>
        </div>
        {/* List */}
        <div style={{ overflowY: 'auto', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, flex: 1 }}>
          {filtered.map(contact => (
            <div key={contact.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 8, border: '1px solid transparent', cursor: 'pointer', transition: 'all 150ms' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.borderColor = '#E5E7EB'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar src={contact.avatarUrl || null} initials={contact.initials} size={56} borderWidth={0} />
                {contact.online && <span style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: '50%', background: '#057642', border: '2px solid #fff' }} />}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.9)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {contact.name}
                  {contact.verified && <BadgeCheck size={14} color="#0a66c2" />}
                </h4>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.headline}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', background: '#F9FAFB' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 20, border: 'none', background: '#0a66c2', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================
   SIDEBAR CARDS (matching reference screenshot)
   ======================================================================== */

function SidebarAboutCard() {
  const about = getAboutContent();
  return (
    <Card>
      <CardTitle title="À propos" />
      <p style={{ margin: 0, color: '#4B5563', fontSize: 13.5, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {about.split('\n\n').map((section, index) => <React.Fragment key={index}>{index > 0 && <br />}<span>{section}</span></React.Fragment>)}
      </p>
    </Card>
  );
}

/* Skills pill tags — LinkedIn style */
function SidebarSkillTagsCard() {
  const skills = profile.skills
    .filter((skill) => skill?.name?.trim())
    .slice()
    .sort((first, second) => (Number(second.endorsements) || 0) - (Number(first.endorsements) || 0))
    .slice(0, 8);
  return (
    <Card>
      <CardTitle title="Compétences" action={skills.length > 0 ? <span style={{ fontSize: 12, color: '#6B7280' }}>{profile.skills.length} au total</span> : undefined} />
      {skills.length > 0 ? <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {skills.map((skill, index) => {
          const endorsements = Math.max(0, Number(skill.endorsements) || 0);
          const weight = Math.min(100, Math.max(0, Number(skill.weight) || Math.min(95, 35 + endorsements * 3)));
          const level = weight >= 80 ? 'Avancé' : weight >= 55 ? 'Intermédiaire' : 'En développement';
          return <div key={`${skill.name}-${index}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: index === 0 ? '#E8F2FF' : '#F3F6F8', color: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{index + 1}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(0,0,0,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{skill.name}</span>
                  <span style={{ fontSize: 11, color: '#6B7280', flexShrink: 0 }}>{level}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 11, color: '#6B7280' }}>
                  <span>{endorsements} endorsement{endorsements !== 1 ? 's' : ''}</span>
                  <span>{weight}%</span>
                </div>
              </div>
            </div>
            <div style={{ height: 7, marginLeft: 40, borderRadius: 4, background: '#E5E7EB', overflow: 'hidden' }}>
              <div style={{ width: `${weight}%`, height: '100%', borderRadius: 4, background: index === 0 ? 'linear-gradient(90deg, #0a66c2, #4f9be8)' : '#6FA8DC', transition: 'width 500ms ease' }} />
            </div>
          </div>;
        })}
      </div> : <div style={{ padding: '8px 0', color: '#6B7280', fontSize: 13 }}>Aucune compétence renseignée pour le moment.</div>}
    </Card>
  );
}

/* Contacts sidebar card with 3-col avatar grid + modal */
function SidebarContactsCard({ friends, total, showActions, showRemove, pendingIds, removingIds, onMessage, onConnect, onRemove, onShowAll }: { friends: FriendProfile[]; total: number; showActions: boolean; showRemove: boolean; pendingIds: Array<string | number>; removingIds: Array<string | number>; onMessage: (friend: FriendProfile) => void; onConnect: (friend: FriendProfile) => void; onRemove: (friend: FriendProfile) => void; onShowAll: () => void }) {
  const previewFriends = friends.slice(0, 3);
  return (
    <Card>
      <CardTitle title="Contacts" action={<span style={{ fontSize: 14, color: '#6B7280' }}>({total})</span>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {previewFriends.map((f) => (
          <div key={f.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 0 }}>
            <div style={{ position: 'relative' }}>
              <img src={f.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=E5E7EB&color=6B7280&size=80`} alt={f.name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.9)', textAlign: 'center', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
            <span style={{ fontSize: 11, color: '#6B7280', textAlign: 'center', lineHeight: 1.3, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.headline}</span>
            {showActions && <div style={{ display: 'flex', gap: 4, width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => onMessage(f)} aria-label={`Écrire à ${f.name}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '5px 7px', borderRadius: 14, border: '1px solid #0a66c2', background: '#fff', color: '#0a66c2', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}><MessageCircle size={12} /> Message</button>
              {showRemove ? <button type="button" onClick={() => onRemove(f)} disabled={removingIds.includes(f.id)} aria-label={`Retirer ${f.name}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '5px 7px', borderRadius: 14, border: '1px solid #DC2626', background: '#fff', color: '#DC2626', fontSize: 11, fontWeight: 600, cursor: removingIds.includes(f.id) ? 'default' : 'pointer', opacity: removingIds.includes(f.id) ? 0.6 : 1 }}>{removingIds.includes(f.id) ? '...' : <UserX size={12} />} {removingIds.includes(f.id) ? 'Retrait...' : 'Retirer'}</button> : <button type="button" onClick={() => onConnect(f)} disabled={pendingIds.includes(f.id)} aria-label={`Se connecter avec ${f.name}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '5px 7px', borderRadius: 14, border: 'none', background: pendingIds.includes(f.id) ? '#E5E7EB' : '#0a66c2', color: pendingIds.includes(f.id) ? '#6B7280' : '#fff', fontSize: 11, fontWeight: 600, cursor: pendingIds.includes(f.id) ? 'default' : 'pointer' }}>{pendingIds.includes(f.id) ? <Check size={12} /> : <UserPlus size={12} />} {pendingIds.includes(f.id) ? 'Demandé' : 'Se connecter'}</button>}
            </div>}
          </div>
        ))}
      </div>
      <button onClick={onShowAll} style={{ width: '100%', padding: '10px 20px', borderRadius: 24, background: '#4a5568', hover: { background: '#2d3748' }, color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.15)', transition: 'background 150ms' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#2d3748')} onMouseLeave={(e) => (e.currentTarget.style.background = '#4a5568')}>
        <Users2 size={16} />
        Voir tous
      </button>
    </Card>
  );
}

/* Gallery sidebar card — 3-col grid */
function SidebarGalleryCard({ posts, onShowAll, onViewMedia }: { posts: any[]; onShowAll: () => void; onViewMedia: (media: any) => void }) {
  const preview = posts.flatMap((post) => {
    const media = Array.isArray(post.media) ? post.media : post.media ? [post.media] : [];
    return media.filter((item: any) => item?.url).map((item: any, index: number) => ({
      id: `${post.id}-${index}`,
      url: item.url,
      alt: item.label || post.headline || 'Publication',
      type: item.type === 'video' ? 'video' : 'image',
    }));
  }).slice(0, 3);
  const allMediaCount = posts.reduce((count, post) => count + (Array.isArray(post.media) ? post.media : post.media ? [post.media] : []).filter((item: any) => item?.url).length, 0);
  const remainingCount = Math.max(0, allMediaCount - preview.length);
  return (
    <Card>
      <CardTitle title="Médias" />
      {preview.length > 0 ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginTop: 4 }}>
        {preview.map((item: any, index: number) => (
          <div key={item.id} role="button" tabIndex={0} style={{ position: 'relative', aspectRatio: '1', borderRadius: 4, overflow: 'hidden', cursor: 'pointer' }} onClick={() => remainingCount > 0 && index === preview.length - 1 ? onShowAll() : onViewMedia(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); remainingCount > 0 && index === preview.length - 1 ? onShowAll() : onViewMedia(item); } }}>
            {item.type === 'video' ? <video src={item.url} aria-label={item.alt} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 150ms' }} /> : <img src={item.url} alt={item.alt || item.name || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 150ms' }} onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')} />}
            {remainingCount > 0 && index === preview.length - 1 && <span aria-label={`${remainingCount} médias supplémentaires`} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(19,28,51,0.62)', color: '#fff', fontSize: 18, fontWeight: 800 }}>+{remainingCount}</span>}
          </div>
        ))}
      </div> : <div style={{ fontSize: 13, color: '#6B7280' }}>Aucun média</div>}
      <button type="button" onClick={onShowAll} style={{ width: '100%', marginTop: 12, padding: '9px 16px', borderRadius: 8, border: '1px solid #0a66c2', background: '#fff', color: '#0a66c2', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Voir tous</button>
    </Card>
  );
}

function getProfileMedia(posts: any[]) {
  return posts.flatMap((post) => {
    const rawMedia = Array.isArray(post.media) ? post.media : post.media ? [post.media] : [];
    return rawMedia.filter((media: any) => media?.url).map((media: any, index: number) => ({
      id: `${post.id}-${index}`,
      name: media.label || post.headline || 'Publication',
      url: media.url,
      type: media.type === 'video' ? 'video' : 'image',
      postId: post.id,
    }));
  });
}

function ProfileMediaViewer({ media, selectedIndex = 0, onClose, onSelect, onOpenPost }: { media: any[]; selectedIndex?: number; onClose: () => void; onSelect: (index: number) => void; onOpenPost: (postId: string | number) => void }) {
  const currentIndex = Math.min(Math.max(selectedIndex, 0), Math.max(media.length - 1, 0));
  const currentMedia = media[currentIndex];
  return (
    <div role="dialog" aria-modal="true" aria-label="Aperçu du média" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(19,28,51,0.8)' }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: 'min(900px, 100%)', maxHeight: '90dvh', overflow: 'auto', borderRadius: 12, padding: 16, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <strong style={{ color: 'rgba(0,0,0,0.9)', fontSize: 16 }}>Aperçu du média</strong>
          <button type="button" onClick={onClose} aria-label="Fermer l’aperçu" style={{ border: 'none', background: 'transparent', color: '#6B7280', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
        </div>
        {currentMedia && <>
          <div style={{ position: 'relative', aspectRatio: '16 / 10', overflow: 'hidden', borderRadius: 8, background: '#111' }}>
            {currentMedia.type === 'video' ? <video src={currentMedia.url} controls autoPlay playsInline onClick={() => onOpenPost(currentMedia.postId)} style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }} /> : <img src={currentMedia.url} alt={currentMedia.name} onClick={() => onOpenPost(currentMedia.postId)} style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }} />}
            {media.length > 1 && <>
              <button type="button" onClick={() => onSelect((currentIndex - 1 + media.length) % media.length)} aria-label="Média précédent" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', borderRadius: '50%', padding: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
              <button type="button" onClick={() => onSelect((currentIndex + 1) % media.length)} aria-label="Média suivant" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', borderRadius: '50%', padding: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer' }}><ArrowRight size={18} /></button>
            </>}
          </div>
          <div style={{ marginTop: 10, textAlign: 'center', color: '#6B7280', fontSize: 12 }}>{currentIndex + 1} / {media.length} · Cliquez sur le média pour ouvrir la publication</div>
        </>}
      </div>
    </div>
  );
}

/* Latest publications sidebar card */
function SidebarPublicationsCard({ posts }: { posts: any[] }) {
  const latestPost = posts[0];
  return (
    <Card>
      <CardTitle title="Dernières publications" />
      {latestPost ? <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EFF6FF', color: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={18} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.9)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{latestPost.headline || latestPost.text || 'Publication'}</p>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{latestPost.isArticle ? 'Article' : 'Publication'}</p>
        </div>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#0a66c2' }}><ArrowRight size={16} /></button>
      </div> : <div style={{ fontSize: 13, color: '#6B7280' }}>Aucune publication</div>}
    </Card>
  );
}

/* ========================================================================
   MAIN CONTENT CARDS
   ======================================================================== */

/* About card — Publications tab default */
function AboutCard() {
  return (
    <Card>
      <CardTitle title="À propos de moi" />
      <p style={{ fontSize: 15, color: 'rgba(0,0,0,0.7)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>{getAboutContent()}</p>
    </Card>
  );
}

function ExperienceCard() {
  return (
    <Card style={{ minHeight: 220 }}>
      <CardTitle title="Expérience" />
      {profile.experience.length > 0 ? profile.experience.map((exp) => (
        <div key={exp.company} style={{ display: 'flex', gap: 12, padding: '12px 0' }}>
          <div style={{ width: 48, height: 48, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#6B7280', flexShrink: 0, border: '1px solid #E5E7EB' }}>{exp.code}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.9)', margin: 0 }}>{exp.role}</h4>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '2px 0' }}>{exp.company}</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{exp.period}</p>
            {exp.desc && <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', margin: '4px 0 0', lineHeight: 1.5 }}>{exp.desc}</p>}
          </div>
        </div>
      )) : <div style={{ padding: '12px 0', fontSize: 13, color: '#6B7280' }}>Aucune expérience renseignée.</div>}
    </Card>
  );
}

/* Competences detail card — blue circle icons */
function CompetencesDetailCard() {
  const competencesItems = profile.skills.length > 0
    ? profile.skills.slice(0, 4).map(s => ({ title: s.name, sub: `${s.endorsements}+ endorsements`, desc: `Compétence validée par ${s.endorsements}+ personnes`, icon: '✓' }))
    : [];
  return (
    <Card style={{ minHeight: 220 }}>
      <CardTitle title="Mes Compétences" />
      <div>
        {competencesItems.length > 0 ? competencesItems.map((comp, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 12, padding: '12px 0' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#D0E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#0a66c2', fontSize: 14, fontWeight: 700 }}>
              {comp.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.9)', margin: 0 }}>{comp.title}</h4>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0' }}>{comp.sub}</p>
              <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', margin: '4px 0 0', lineHeight: 1.4 }}>{comp.desc}</p>
            </div>
          </div>
        )) : <div style={{ padding: '12px 0', fontSize: 13, color: '#6B7280' }}>Aucune compétence renseignée.</div>}
      </div>
    </Card>
  );
}

/* Post composer */
function PostComposerCard({ avatarSrc, onOpenCreate }: { avatarSrc: string | null; onOpenCreate: (mode?: string) => void }) {
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar src={avatarSrc} initials={profile.initials} size={42} />
        <button onClick={() => onOpenCreate('post')} style={{ flex: 1, textAlign: 'left', padding: '11px 16px', borderRadius: 22, border: '1.5px solid var(--app-border)', background: 'var(--app-input)', color: 'var(--app-muted)', fontSize: 14, cursor: 'pointer' }}>Exprimez vos idées, partagez vos projets ou vos inspirations...</button>
      </div>
      <div style={{ display: 'flex', marginTop: 12, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
        {[
          { icon: faPhotoFilm, label: 'Médias', mode: 'image', color: '#2E9E5B' },
          { icon: faNewspaper, label: 'Article', mode: 'article', color: '#1B5386' },
          { icon: faWandSparkles, label: 'VisuelFocus', mode: 'visuelfocus', color: '#D9A536' },
        ].map(({ icon, label, mode, color }, index) => <React.Fragment key={mode}>
          {index > 0 && <div style={{ width: 1, background: 'var(--app-border)', margin: '6px 0', alignSelf: 'stretch' }} />}
          <button type="button" onClick={() => onOpenCreate(mode)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 6px', border: 'none', background: 'transparent', color, fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 6 }}><FontAwesomeIcon icon={icon} style={{ fontSize: 19 }} />{label}</button>
        </React.Fragment>)}
      </div>
    </Card>
  );
}

/* Skills detail with progress bars */
function SkillsDetailCard() {
  return (
    <Card>
      <CardTitle title="Mes Compétences" />
      <div>
        {profile.skills.map((s) => (
          <div key={s.name} style={{ padding: '12px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.9)' }}>{s.name}</span>
              <span style={{ fontSize: 13, color: '#6B7280' }}>{s.endorsements}+</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.weight}%`, background: '#0a66c2', borderRadius: 3, transition: 'width 700ms ease' }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* Activity heatmap */
function ActivityHeatmapCard({ activityData, loading }: { activityData: Record<string, number> | null; loading: boolean }) {
  const today = new Date();
  const counts = activityData || {};
  const activity = Array.from({ length: 52 }, (_, weekIndex) => Array.from({ length: 7 }, (_, dayIndex) => {
    const date = new Date(today);
    date.setDate(today.getDate() - ((51 - weekIndex) * 7 + (6 - dayIndex)));
    return counts[date.toISOString().slice(0, 10)] || 0;
  }));
  const maxActivity = Math.max(1, ...activity.flat());
  const totalActivity = Object.values(counts).reduce((total, value) => total + value, 0);
  const activeDays = Object.values(counts).filter((value) => value > 0).length;
  const peakActivity = Math.max(0, ...Object.values(counts));
  return (
    <Card>
      <CardTitle title="Activité" action={!loading && activityData ? <span style={{ fontSize: 12, color: '#6B7280' }}>12 derniers mois</span> : undefined} />
      <p style={{ margin: '-4px 0 16px', color: '#6B7280', fontSize: 13, lineHeight: 1.5 }}>Votre rythme de publication au fil des jours.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
        {[['Publications', totalActivity], ['Jours actifs', activeDays], ['Pic quotidien', peakActivity]].map(([label, value]) => (
          <div key={label} style={{ padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, background: '#FAFBFC' }}>
            <div style={{ color: '#6B7280', fontSize: 11, marginBottom: 4 }}>{label}</div>
            <strong style={{ color: '#132433', fontSize: 18, lineHeight: 1 }}>{loading ? '...' : value}</strong>
          </div>
        ))}
      </div>
      <div style={{ overflowX: 'auto', padding: '4px 2px 8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(52, 10px)', gap: 3, minWidth: 673 }}>
          {activity.map((week, weekIndex) => (
            <div key={weekIndex} style={{ display: 'grid', gridTemplateRows: 'repeat(7, 10px)', gap: 3 }}>
              {week.map((value, dayIndex) => {
                const intensity = value / maxActivity;
                const color = value === 0 ? '#EEF1F4' : intensity <= 0.25 ? '#CFE3F8' : intensity <= 0.5 ? '#91BFE8' : intensity <= 0.75 ? '#4E95D2' : '#0A66C2';
                return <div key={`${weekIndex}-${dayIndex}`} title={`${value} publication${value > 1 ? 's' : ''}`} aria-label={`${value} publication${value > 1 ? 's' : ''}`} style={{ width: 10, height: 10, borderRadius: 3, background: color, boxShadow: value > 0 ? 'inset 0 0 0 1px rgba(10,102,194,0.08)' : 'none' }} />;
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 4, color: '#6B7280', fontSize: 11 }}>
        <span>Moins</span>
        {[0, 0.2, 0.45, 0.7, 1].map((level, index) => <span key={index} style={{ width: 10, height: 10, borderRadius: 3, background: level === 0 ? '#EEF1F4' : level <= 0.25 ? '#CFE3F8' : level <= 0.5 ? '#91BFE8' : level <= 0.75 ? '#4E95D2' : '#0A66C2' }} />)}
        <span>Plus</span>
      </div>
      {!loading && activityData && Object.values(activityData).every((value) => value === 0) && <div style={{ marginTop: 12, fontSize: 13, color: '#6B7280' }}>Aucune activité enregistrée.</div>}
      {loading && <div style={{ marginTop: 12, fontSize: 13, color: '#6B7280' }}>Chargement de l’activité...</div>}
    </Card>
  );
}

/* Friends list */
function FriendsListCard({ friends, total, loading, hasMore, showActions, showRemove, pendingIds, removingIds, onMessage, onConnect, onRemove, onLoadMore }: { friends: FriendProfile[]; total: number; loading: boolean; hasMore: boolean; showActions: boolean; showRemove: boolean; pendingIds: Array<string | number>; removingIds: Array<string | number>; onMessage: (friend: FriendProfile) => void; onConnect: (friend: FriendProfile) => void; onRemove: (friend: FriendProfile) => void; onLoadMore: () => void }) {
  return (
    <Card>
      <CardTitle title={`Amis (${total})`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {friends.map((f) => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: '1px solid #E5E7EB', cursor: 'pointer', transition: 'background 150ms' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            <div style={{ position: 'relative' }}>
              <Avatar src={f.avatarUrl || null} initials={f.initials} size={40} borderWidth={0} />
              {f.online && <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#057642', border: '2px solid #fff' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.9)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
              <p style={{ fontSize: 12, color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.headline}</p>
              {showActions && <div style={{ display: 'flex', gap: 4, marginTop: 7, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => onMessage(f)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 7px', borderRadius: 14, border: '1px solid #0a66c2', background: '#fff', color: '#0a66c2', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}><MessageCircle size={12} /> Message</button>
                {showRemove ? <button type="button" onClick={() => onRemove(f)} disabled={removingIds.includes(f.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 7px', borderRadius: 14, border: '1px solid #DC2626', background: '#fff', color: '#DC2626', fontSize: 11, fontWeight: 600, cursor: removingIds.includes(f.id) ? 'default' : 'pointer', opacity: removingIds.includes(f.id) ? 0.6 : 1 }}>{removingIds.includes(f.id) ? 'Retrait...' : <UserX size={12} />} {removingIds.includes(f.id) ? '' : 'Retirer'}</button> : <button type="button" onClick={() => onConnect(f)} disabled={pendingIds.includes(f.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 7px', borderRadius: 14, border: 'none', background: pendingIds.includes(f.id) ? '#E5E7EB' : '#0a66c2', color: pendingIds.includes(f.id) ? '#6B7280' : '#fff', fontSize: 11, fontWeight: 600, cursor: pendingIds.includes(f.id) ? 'default' : 'pointer' }}>{pendingIds.includes(f.id) ? <Check size={12} /> : <UserPlus size={12} />} {pendingIds.includes(f.id) ? 'Demandé' : 'Se connecter'}</button>}
              </div>}
            </div>
          </div>
        ))}
      </div>
      {loading && <div style={{ padding: '16px 0', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>Chargement...</div>}
      {!loading && hasMore && <button type="button" onClick={onLoadMore} style={{ width: '100%', marginTop: 16, padding: '10px 16px', borderRadius: 20, border: '1px solid #0a66c2', background: '#fff', color: '#0a66c2', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Charger plus</button>}
    </Card>
  );
}

/* Media gallery */
function MediaGalleryCard({ posts, loading, hasMore, onLoadMore, onViewMedia }: { posts: any[]; loading: boolean; hasMore: boolean; onLoadMore: () => void; onViewMedia: (media: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const medias = getProfileMedia(posts);
  const visibleMedias = expanded ? medias : medias.slice(0, 6);
  const remainingCount = Math.max(0, medias.length - 6);
  const revealMore = () => {
    setExpanded(true);
    if (hasMore && !loading) onLoadMore();
  };
  return (
    <Card>
      <CardTitle title="Médias" />
      {medias.length === 0 && !loading ? <div style={{ textAlign: 'center', padding: 20, color: '#6B7280', fontSize: 14 }}>Aucun média publié</div> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>{visibleMedias.map((media, index) => (<div key={media.id} role="button" tabIndex={0} onClick={() => !expanded && remainingCount > 0 && index === visibleMedias.length - 1 ? revealMore() : onViewMedia(media)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!expanded && remainingCount > 0 && index === visibleMedias.length - 1) revealMore(); else onViewMedia(media); } }} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: '#E5E7EB', cursor: 'pointer' }}>{media.type === 'video' ? <video src={media.url} aria-label={media.name} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} /> : <img src={media.url} alt={media.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}{!expanded && remainingCount > 0 && index === visibleMedias.length - 1 && <span aria-label={`${remainingCount} médias supplémentaires`} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(19,28,51,0.62)', color: '#fff', fontSize: 20, fontWeight: 800 }}>+{remainingCount}</span>}</div>))}</div>}
      {expanded && medias.length > 6 && <button type="button" onClick={() => setExpanded(false)} style={{ width: '100%', marginTop: 12, padding: '9px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Réduire</button>}
      {loading && <div style={{ padding: '16px 0', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>Chargement...</div>}
      {!loading && hasMore && <button type="button" onClick={onLoadMore} style={{ width: '100%', marginTop: 16, padding: '10px 16px', borderRadius: 20, border: '1px solid #0a66c2', background: '#fff', color: '#0a66c2', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Charger plus</button>}
    </Card>
  );
}

/* Education detail */
function EducationDetailCard() {
  return (
    <Card>
      <CardTitle title="Éducation" />
      <div style={{ padding: '12px 0', fontSize: 13, color: '#6B7280' }}>Aucune formation renseignée.</div>
    </Card>
  );
}

/* ========================================================================
   MAIN EXPORT COMPONENT — LinkedIn-style profile matching reference screenshot
   ======================================================================== */

export default function ProfileLynoraLink({ targetUserId, headerOffset = 0 }: { targetUserId?: string | null; headerOffset?: number }) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Publications');
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [coverSrc, setCoverSrc] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'avatar' | 'cover' | null>(null);
  const [profileWidth, setProfileWidth] = useState(1200);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [visualFocusOpen, setVisualFocusOpen] = useState(false);
  const [postModalMode, setPostModalMode] = useState('post');
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendsTotal, setFriendsTotal] = useState(0);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [pendingContactIds, setPendingContactIds] = useState<Array<string | number>>([]);
  const [removingContactIds, setRemovingContactIds] = useState<Array<string | number>>([]);
  const [mediaPosts, setMediaPosts] = useState<any[]>([]);
  const [mediaReels, setMediaReels] = useState<any[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [activityData, setActivityData] = useState<Record<string, number> | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Record<string | number, boolean>>({});
  const [openPostId, setOpenPostId] = useState<string | number | null>(null);
  const [mediaViewerIndex, setMediaViewerIndex] = useState<number | null>(null);
  const [openArticleId, setOpenArticleId] = useState<string | number | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [contactsModalOpen, setContactsModalOpen] = useState(false);
  const [notifMuted, setNotifMuted] = useState(false);
  const [isProfileScrolled, setIsProfileScrolled] = useState(false);
  const [toast, setToast] = useState<{ message: string; icon: any } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionUser = session?.user as { id?: string; email?: string | null } | undefined;
  const isProfileScopeForeign = Boolean(targetUserId && targetUserId !== sessionUser?.id);
  const isOwner = React.useMemo(() => {
    if (targetUserId) return false;
    return Boolean(sessionUser);
  }, [sessionUser, targetUserId]);
  const [, setTick] = useState(0);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!isOwner) return undefined;
    const loadOnlineSetting = () => {
      fetchBackendApi('/api/settings', { cache: 'no-store' })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => {
          if (data?.notifications?.showOnlineStatus !== undefined) setShowOnlineStatus(Boolean(data.notifications.showOnlineStatus));
        })
        .catch(() => {});
    };
    loadOnlineSetting();
    window.addEventListener('lynora:settings-updated', loadOnlineSetting);
    return () => window.removeEventListener('lynora:settings-updated', loadOnlineSetting);
  }, [isOwner]);

  const loadFriendsPage = async (offset = 0) => {
    setFriendsLoading(true);
    try {
      const userQuery = targetUserId ? `&userId=${encodeURIComponent(targetUserId)}` : '';
      const response = await fetchBackendApi(`/api/connections?limit=24&offset=${offset}${userQuery}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const page = (Array.isArray(data.connections) ? data.connections : []).map((friend: any) => ({
        id: friend.id, name: friend.name, initials: friend.initials, headline: friend.title || 'Membre LynoraLink',
        location: friend.location || '—', mutualCount: friend.mutual || 0, avatarUrl: friend.image || friend.avatarUrl || null,
        verified: false, online: false,
      }));
      const returnedTotal = Number(data.totalConnections);
      const total = Number.isFinite(returnedTotal) && (returnedTotal > 0 || page.length === 0) ? returnedTotal : offset + page.length;
      setFriends((current) => offset === 0 ? page : [...current, ...page]);
      setFriendsTotal(total);
      profile = { ...profile, connections: total, mutuals: { count: total, initials: page.map((friend) => friend.initials), friends: offset === 0 ? page : [...getFriendsList(), ...page] } };
      setTick((value) => value + 1);
    } finally {
      setFriendsLoading(false);
    }
  };

  const loadMediaPage = async (offset = 0) => {
    setMediaLoading(true);
    try {
      const userQuery = targetUserId ? `&userId=${encodeURIComponent(targetUserId)}` : '';
      const response = await fetchBackendApi(`/api/posts?mediaOnly=true&limit=24&offset=${offset}${userQuery}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const page = Array.isArray(data.posts) ? data.posts : [];
      setMediaPosts((current) => offset === 0 ? page : [...current, ...page]);
    } finally {
      setMediaLoading(false);
    }
  };

  const loadMediaReels = async () => {
    try {
      const authorId = targetUserId || session?.user?.id;
      if (!authorId) return;
      const response = await fetchBackendApi(`/api/reels?authorId=${encodeURIComponent(authorId)}&limit=20`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setMediaReels(Array.isArray(data.reels) ? data.reels : []);
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'Médias') loadMediaReels();
  }, [activeTab, targetUserId, session?.user?.id]);

  const openAllProfileMedia = async () => {
    setActiveTab('Médias');
    if (mediaPosts.length === 0 && !mediaLoading) await loadMediaPage(0);
    setMediaViewerIndex(0);
  };

  useEffect(() => {
    if (!session?.user || targetUserId) return;
    try {
      const name = session.user.name || profile.name; const firstName = name.split(' ')[0] || profile.firstName;
      const initials = name.trim().split(/\s+/).filter(Boolean).map(p => p[0]?.toUpperCase()).slice(0, 2).join('');
      profile = { ...profile, name, firstName, initials: initials || profile.initials, avatarUrl: session.user.image || profile.avatarUrl };
      if (session.user.image) setAvatarSrc(session.user.image);
    } catch {}
  }, [session, sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    setProfileLoading(true);
    let mounted = true;
    (async () => {
      try {
        const endpoint = targetUserId ? `/api/profile?userId=${encodeURIComponent(targetUserId)}` : '/api/profile';
        const res = await fetch(endpoint); if (!res.ok) return; const json = await res.json(); const user = json.user; if (!user || !mounted) return;
        const userName = user.name || profile.name;
        const userSkills = Array.isArray(user.skills) ? user.skills.map((skill: any) => typeof skill === 'string' ? ({ name: skill, endorsements: 0, weight: 0 }) : skill) : profile.skills;
        profile = { ...profile, name: userName, firstName: userName.split(' ')[0] || profile.firstName, headline: user.title || profile.headline, bio: user.bio || profile.bio, about: user.about || user.bio || profile.about, location: user.location || profile.location, website: user.website || profile.website, company: user.company || profile.company, experience: Array.isArray(user.experience) ? user.experience : profile.experience, status: user.status || profile.status, avatarUrl: user.image || profile.avatarUrl, skills: userSkills, initials: userName.trim().split(/\s+/).filter(Boolean).map((part: string) => part[0]?.toUpperCase()).slice(0, 2).join('') || profile.initials, id: user.id, email: user.email, isPremium: Boolean(user.isPremium), isPlatformAdmin: Boolean(user.isPlatformAdmin) };
        setProfileUserId(user.id);
        if (user.image) setAvatarSrc(user.image); if (user.cover) setCoverSrc(user.cover); setTick(t => t + 1);
      } catch {}
      finally { if (mounted) setProfileLoading(false); }
    })();
    return () => { mounted = false; };
  }, [targetUserId, sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    let mounted = true;
    setFriends([]);
    setFriendsTotal(0);
    loadFriendsPage(0).catch(() => {});
    return () => { mounted = false; };
  }, [targetUserId, sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    if (activeTab === 'Médias' && mediaPosts.length === 0 && !mediaLoading) loadMediaPage(0).catch(() => {});
  }, [activeTab, targetUserId, sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    if (activityData !== null || activityLoading) return;
    setActivityLoading(true);
    const userQuery = targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : '';
    fetchBackendApi(`/api/profile/activity${userQuery}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : { activity: [] })
      .then((data) => {
        const nextActivity = (Array.isArray(data.activity) ? data.activity : []).reduce((result: Record<string, number>, item: { day: string; count: number }) => {
          result[item.day] = item.count;
          return result;
        }, {});
        setActivityData(nextActivity);
      })
      .catch(() => setActivityData({}))
      .finally(() => setActivityLoading(false));
  }, [activeTab, targetUserId, sessionStatus, activityData, activityLoading]);

  useEffect(() => {
    setProfileUserId(null);
    setActivityData(null);
    setActivityLoading(false);
  }, [targetUserId]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    const userId = profileUserId || targetUserId || sessionUser?.id || profile.id;
    if (!userId) return;
    let mounted = true;
    fetchBackendApi(`/api/posts?limit=20&userId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : { posts: [] })
      .then((data) => {
        if (!mounted) return;
        setPosts(Array.isArray(data.posts) ? data.posts : []);
      })
      .catch(() => { if (mounted) setPosts([]); });
    return () => { mounted = false; };
  }, [profileUserId, targetUserId, sessionUser?.id, sessionStatus]);

  const isMobile = profileWidth <= 767;

  useEffect(() => {
    const profileElement = scrollRef.current;
    if (!profileElement) return undefined;

    const updateProfileWidth = () => setProfileWidth(profileElement.getBoundingClientRect().width);
    updateProfileWidth();
    const observer = new ResizeObserver(updateProfileWidth);
    observer.observe(profileElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      setIsProfileScrolled(scrollElement.scrollTop > (isMobile ? 100 : 150));
    };
    handleScroll();
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  const showToast = (message: string, icon: any) => setToast({ message, icon });
  const closeModal = () => setModalType(null);
  const saveModal = async (preview: string) => {
    try { const payload: { image?: string; cover?: string } = {}; if (modalType === 'avatar') payload.image = preview; if (modalType === 'cover') payload.cover = preview; await fetchBackendApi('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (e) { console.error('Failed', e); }
    if (modalType === 'avatar') setAvatarSrc(preview); if (modalType === 'cover') setCoverSrc(preview); closeModal();
  };
  const copyProfileLink = () => { const link = `https://lynoralink.com/p/${profile.name.toLowerCase().replace(/\s+/g, '-')}`; navigator.clipboard?.writeText(link).catch(() => {}); showToast('Lien copié', Copy); };
  const toggleNotif = () => { setNotifMuted(v => !v); showToast(notifMuted ? 'Notifications réactivées' : 'Notifications désactivées', notifMuted ? Bell : BellOff); };
  const toggleLike = (id: string | number) => setLikedPosts(prev => ({ ...prev, [id]: !prev[id] }));
  const messageContact = (friend: FriendProfile) => window.history.pushState({}, '', `/feed?view=messages&userId=${encodeURIComponent(String(friend.id))}`);
  const connectContact = async (friend: FriendProfile) => {
    if (pendingContactIds.includes(friend.id)) return;
    setPendingContactIds((current) => [...current, friend.id]);
    try {
      const response = await fetchBackendApi('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: friend.id }),
      });
      if (!response.ok) setPendingContactIds((current) => current.filter((id) => id !== friend.id));
    } catch {
      setPendingContactIds((current) => current.filter((id) => id !== friend.id));
    }
  };
  const removeContact = async (friend: FriendProfile) => {
    if (removingContactIds.includes(friend.id)) return;
    setRemovingContactIds((current) => [...current, friend.id]);
    try {
      const response = await fetchBackendApi('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: friend.id, action: 'remove' }),
      });
      if (response.ok) {
        setFriends((current) => current.filter((item) => item.id !== friend.id));
        setFriendsTotal((current) => Math.max(0, current - 1));
      }
    } finally {
      setRemovingContactIds((current) => current.filter((id) => id !== friend.id));
    }
  };

  const reloadPosts = async () => {
    const userId = profileUserId || targetUserId || sessionUser?.id;
    if (!userId) return;
    const response = await fetchBackendApi(`/api/posts?limit=20&userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    setPosts(Array.isArray(data.posts) ? data.posts : []);
  };

  const publishPost = async (payload: any = {}) => {
    if (!isOwner) return;
    const response = await fetchBackendApi('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: payload.text || '',
        isArticle: (payload.mode || postModalMode) === 'article',
        headline: payload.headline || payload.articleTitle,
        excerpt: payload.excerpt || payload.articleExcerpt,
        articleBody: payload.body || payload.articleBody,
        media: payload.media || (payload.image ? [{ type: 'image', url: payload.image }] : []),
        mood: payload.mood,
        identifiedUsers: payload.identifiedUsers,
        visibility: payload.visibility,
      }),
    });
    if (response.ok) {
      await reloadPosts();
      setActivityData(null);
      sessionStorage.setItem('lynoralink:posts-updated-at', String(Date.now()));
      window.dispatchEvent(new CustomEvent('lynoralink:posts-updated'));
    }
    setPostModalOpen(false);
    setVisualFocusOpen(false);
  };

  const addComment = async (postId: string | number, text: string, media?: any[]) => {
    if (!text.trim()) return;
    const response = await fetchBackendApi(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), media: media || [] }),
    });
    if (response.ok) await reloadPosts();
  };
  const addReply = async (postId: string | number, parentId: string | number, text: string, media?: any[]) => {
    if (!text.trim() || !parentId) return;
    const response = await fetchBackendApi(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), parentId, media: media || [] }),
    });
    if (response.ok) await reloadPosts();
  };
  const toggleCommentLike = async (postId: string | number, commentId: string | number) => {
    const response = await fetchBackendApi(`/api/posts/${postId}/comments/${commentId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction: 'ok' }),
    });
    if (response.ok) await reloadPosts();
  };

  const togglePostLike = async (postId: string | number) => {
    const response = await fetchBackendApi(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction: 'ok' }),
    });
    if (response.ok) await reloadPosts();
  };
  const selectPostReaction = async (postId: string | number, reaction: string) => {
    const response = await fetchBackendApi(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction }),
    });
    if (response.ok) await reloadPosts();
  };

  const currentProfileUser = { id: profile.id, name: profile.name || 'Utilisateur', initials: profile.initials || 'U', avatarUrl: profile.avatarUrl || avatarSrc || null, title: profile.headline || 'Membre LynoraLink' };
  const feedPosts = posts.map(post => ({ ...post, author: post.author || profile.name || 'Utilisateur', initials: post.initials || profile.initials || 'U', avatarUrl: post.avatarUrl || profile.avatarUrl || avatarSrc || null, title: post.title || profile.headline || 'Membre LynoraLink', liked: post.liked ?? !!likedPosts[post.id], bookmarked: false, comments: Array.isArray(post.comments) ? post.comments : [], shares: 0, visibility: post.visibility || 'public' as VisibilityKey, media: post.image ? [{ type: 'image', url: post.image, label: 'Image' }] : post.media || [], text: post.text || '' }));
  const reelMediaPosts = mediaReels.map((reel) => ({
    id: `reel-${reel.id}`,
    text: reel.caption || '',
    author: reel.author?.name || profile.name || 'Utilisateur',
    media: [{ id: `reel-media-${reel.id}`, url: reel.videoUrl || reel.poster, type: 'video', label: 'Reel' }],
  }));
  const profileMediaPosts = [...mediaPosts, ...reelMediaPosts];
  const profileMedia = getProfileMedia(profileMediaPosts.length > 0 ? profileMediaPosts : feedPosts);
  const selectedOpenPost = feedPosts.find(p => p.id === openPostId) || null;
  const selectedOpenArticle = feedPosts.find(p => p.id === openArticleId) || null;

  const visibleSidebarMedia = isProfileScopeForeign ? [] : feedPosts;

  if (profileLoading) {
    return (
      <div className="lynora-profile-root" style={{ width: '100%', minHeight: '100dvh', background: '#f3f2ef', fontFamily: "-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", color: 'rgba(0,0,0,0.9)' }}>
        <div className="lynora-profile-scroll lynora-profile-loading-scroll" style={{ height: 'calc(100dvh - var(--lynora-header-offset, 0px))', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ width: '100%', maxWidth: 'none', margin: '0 auto', padding: isMobile ? '0 8px 32px' : '0 16px 40px' }}>
            <ProfileSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lynora-profile-root" style={{ width: '100%', minHeight: '100dvh', background: '#f3f2ef', fontFamily: "-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", color: 'rgba(0,0,0,0.9)' }}>
      <div ref={scrollRef} onScroll={(event) => setIsProfileScrolled(event.currentTarget.scrollTop > (isMobile ? 100 : 150))} className="lynora-profile-scroll" style={{ height: 'calc(100dvh - var(--lynora-header-offset, 0px))', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 55, height: isProfileScrolled ? 62 : 0, pointerEvents: isProfileScrolled ? 'auto' : 'none' }}>
          <div
            style={{
              position: 'relative', display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: isMobile ? '9px 12px' : '10px 24px',
              background: 'rgba(255,255,255,0.96)', borderBottom: '1px solid #E5E7EB',
              boxShadow: '0 5px 18px rgba(15,51,82,0.12)', backdropFilter: 'blur(12px)',
              opacity: isProfileScrolled ? 1 : 0,
              transform: isProfileScrolled ? 'translateY(0)' : 'translateY(-100%)',
              transition: 'opacity 180ms ease, transform 220ms ease',
            }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', display: 'grid', placeItems: 'center', flexShrink: 0, background: '#1B5386', color: '#fff', fontSize: 13, fontWeight: 800 }}>
              {avatarSrc ? <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (profile.initials || 'U')}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'rgba(0,0,0,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.name || 'Utilisateur'}</span>
                {profile.isPlatformAdmin ? <EnterpriseBadge size={14} label="Administrateur officiel LynoraLink" /> : profile.isPremium && <PremiumBadge size={14} />}
              </div>
              <div style={{ fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.headline || 'Membre LynoraLink'}</div>
            </div>
          </div>
        </div>
        <div className="lynora-profile-content" style={{ width: '100%', maxWidth: 'none', margin: '0 auto', padding: isMobile ? '0 8px 32px' : '0 16px 40px' }}>

          {/* ================================================================
              PROFILE HEADER — LinkedIn style with banner + overlapping avatar
             ================================================================ */}
          <div className="lynora-profile-header" style={{ background: '#fff', borderRadius: 0, position: 'relative', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', border: 'none', borderBottom: '1px solid #E5E7EB', overflow: 'visible', marginBottom: 0 }}>

            {/* Banner */}
            <div style={{ position: 'relative', height: isMobile ? 120 : 180, background: coverSrc
              ? `url(${coverSrc}) center/cover no-repeat`
              : 'linear-gradient(135deg, #B0C4DE 0%, #DCE7F1 40%, #C8D8E8 100%)',
              borderBottom: '1px solid #E5E7EB', overflow: 'hidden', borderRadius: 0
            }}>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setModalType('cover')}
                  aria-label="Changer la photo de couverture"
                  title="Changer la photo de couverture"
                  style={{ position: 'absolute', right: 14, bottom: 14, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.7)', color: '#0a66c2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, boxShadow: '0 3px 10px rgba(0,0,0,0.2)', backdropFilter: 'blur(6px)', transition: 'transform 150ms ease, background 150ms ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(255,255,255,0.92)'; }}
                >
                  <Camera size={18} strokeWidth={2.2} />
                </button>
              )}
            </div>

            {/* Content below banner */}
            <div style={{ maxWidth: 1128, margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px', position: 'relative' }}>
              {/* Avatar — overlapping banner */}
              <div style={{ position: 'absolute', top: isMobile ? -40 : -68, left: isMobile ? 16 : 32 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: isMobile ? 100 : 152, height: isMobile ? 100 : 152, borderRadius: '50%', overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarSrc ? 'transparent' : '#E5E7EB', fontSize: isMobile ? 28 : 42, fontWeight: 600, color: '#6B7280' }}>
                    {avatarSrc
                      ? <img src={avatarSrc} alt="Photo de profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : profile.initials}
                  </div>
                  {isOwner && showOnlineStatus && <span aria-label="En ligne" style={{ position: 'absolute', right: isMobile ? 2 : 4, bottom: isMobile ? 2 : 4, width: isMobile ? 18 : 24, height: isMobile ? 18 : 24, borderRadius: '50%', background: '#22C55E', border: '3px solid #fff', boxShadow: '0 0 0 1px #15803D' }} />}
                  {/* Camera button for owner */}
                  {isOwner && (
                    <button onClick={() => setModalType('avatar')} style={{ position: 'absolute', bottom: isMobile ? 0 : 4, left: isMobile ? 0 : 4, width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: '50%', background: '#0a66c2', border: '3px solid #fff', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }} aria-label="Changer la photo">
                      <Camera size={isMobile ? 12 : 14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Info + Actions row */}
              <div className="lynora-profile-info-row" style={{ paddingTop: isMobile ? 64 : 80, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-end', gap: 16, paddingBottom: 0 }}>
                <div className="lynora-profile-info" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, flexWrap: 'wrap', minWidth: 0 }}>
                    <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: 'rgba(0,0,0,0.9)', margin: 0, lineHeight: 1.2 }}>{profile.name || 'Utilisateur'}</h1>
                    {profile.isPlatformAdmin && <EnterpriseBadge size={isMobile ? 19 : 22} />}
                    {!profile.isPlatformAdmin && profile.isPremium && <PremiumBadge size={isMobile ? 19 : 22} />}
                  </div>
                  <p style={{ fontSize: isMobile ? 15 : 18, color: 'rgba(0,0,0,0.6)', margin: '4px 0 0', lineHeight: 1.4 }}>{profile.headline || 'Membre LynoraLink'}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: isMobile ? 13 : 14, color: 'rgba(0,0,0,0.6)', marginTop: 4 }}>
                    <MapPin size={16} color="#6B7280" />
                    <span>{profile.location || 'Localisation non renseignée'}</span>
                  </div>
                  {(profile.company || profile.website) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: isMobile ? 13 : 14, color: 'rgba(0,0,0,0.6)', marginTop: 4 }}>
                      {profile.company && <span>{profile.company}</span>}
                      {profile.website && <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer" style={{ color: '#0a66c2', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Globe2 size={14} /> Site web</a>}
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <StatusPill status={profile.status} />
                  </div>

                  {/* Connection count */}
                  <button type="button" onClick={() => setActiveTab('Amis')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
                    <AvatarStack people={friends} extraCount={Math.max(0, friendsTotal - friends.length)} size={34} max={4} onClick={() => setActiveTab('Amis')} onPersonClick={(person) => window.history.pushState({}, '', `/feed?view=profile&userId=${encodeURIComponent(String(person.id))}`)} />
                    <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.6)' }}><strong style={{ color: 'rgba(0,0,0,0.9)' }}>{profile.connections.toLocaleString('fr-FR')}</strong> relations</span>
                    <ChevronDown size={14} style={{ transform: 'rotate(-90deg)', color: '#0a66c2' }} />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="lynora-profile-actions" style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-end', width: isMobile ? '100%' : 'auto' }}>
                  {isOwner ? (
                    <>
                      <button className="lynora-profile-action" onClick={() => router.push('/dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 24, border: 'none', background: '#0a66c2', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 3px rgba(10,102,194,0.3)' }}>Tableau de bord</button>
                      <button className="lynora-profile-action" onClick={() => window.history.pushState({}, '', '/feed?view=settings')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 24, border: '1px solid #9CA3AF', background: '#fff', color: 'rgba(0,0,0,0.7)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Modifier</button>
                    </>
                  ) : (
                    <>
                      <button className="lynora-profile-action" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 24, border: 'none', background: '#0a66c2', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 3px rgba(10,102,194,0.3)' }}><UserPlus size={17} /> Ajouter</button>
                      <button className="lynora-profile-action" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 24, border: '1px solid #9CA3AF', background: '#fff', color: 'rgba(0,0,0,0.7)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}><MessageCircle size={17} /> Messages</button>
                    </>
                  )}
                  <MoreDropdown items={[
                    { icon: Share2, label: 'Partager le profil', onClick: () => setShareModalOpen(true) },
                    { icon: Copy, label: 'Copier le lien', onClick: copyProfileLink },
                    ...(isOwner ? [{ icon: Camera, label: 'Changer la couverture', onClick: () => setModalType('cover') }] : []),
                    { icon: notifMuted ? Bell : BellOff, label: notifMuted ? 'Réactiver les notifications' : 'Désactiver les notifications', onClick: toggleNotif },
                    { divider: true, icon: Flag, label: 'Signaler ce profil', danger: true, onClick: () => setReportModalOpen(true) },
                  ]} />
                </div>
              </div>

              {/* Tabs — LinkedIn style with gold underline for active */}
              <div className="lynora-profile-tabs" style={{ display: 'flex', gap: 0, marginTop: 0, borderBottom: '1px solid var(--app-border)', marginLeft: isMobile ? 0 : -32, marginRight: isMobile ? 0 : -32, padding: isMobile ? '0 8px' : '0 32px', overflowX: 'auto', whiteSpace: 'nowrap', msOverflowStyle: 'none', scrollbarWidth: 'none', background: 'var(--app-surface)' }}>
                <style>{`.tab-scroll::-webkit-scrollbar{display:none}`}</style>
                {TAB_ITEMS.map(({ key, icon: TabIcon }) => {
                  const active = activeTab === key;
                  return (
                    <button key={key} onClick={() => setActiveTab(key)} className="tab-scroll" style={{ position: 'relative', padding: '14px 12px', margin: '0 12px 0 0', fontSize: 14, fontWeight: active ? 600 : 400, color: active ? 'var(--app-text)' : 'var(--app-muted)', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 150ms', display: 'inline-flex', alignItems: 'center', gap: 6 }} onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--app-text)'; }} onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--app-muted)'; }}>
                      {TabIcon && <TabIcon size={16} />}
                      {key}
                      {key === 'Activités' && <ChevronDown size={12} />}
                      {active && <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#b48c53', borderRadius: '2px 2px 0 0' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ================================================================
              MAIN CONTENT AREA — 2/3 + 1/3 grid
             ================================================================ */}
          <div className="lynora-profile-main-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? 16 : 24, marginTop: 24, alignItems: 'start' }}>

            {/* LEFT COLUMN — Main content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: isMobile ? 'none' : 716, minWidth: 0 }}>
              {activeTab === 'Publications' && (
                <>
                  {isOwner && (
                    <PostComposerCard avatarSrc={avatarSrc} onOpenCreate={(mode = 'post') => {
                      if (mode === 'visuelfocus') {
                        setVisualFocusOpen(true);
                        return;
                      }
                      setPostModalMode(mode);
                      setPostModalOpen(true);
                    }} />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {feedPosts.map(post => (
                      <FeedPostCardComponent key={post.id} post={post} currentUser={currentProfileUser}
                        onToggleLike={() => togglePostLike(post.id)} onSelectReaction={selectPostReaction} onToggleBookmark={() => {}}
                        onAddComment={addComment}
                        onReplyComment={addReply} onToggleCommentLike={(commentId) => toggleCommentLike(post.id, commentId)} onShare={() => {}} isOwn={isOwner}
                        onOpenArticle={(p) => setOpenArticleId(p.id)} onOpenPost={(p) => setOpenPostId(p.id)} />
                    ))}
                  </div>
                </>
              )}
              {activeTab === 'À propos' && (
                <Card>
                  <CardTitle title="À propos de moi" />
                  <p style={{ fontSize: 15, color: 'rgba(0,0,0,0.7)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>{getAboutContent()}</p>
                </Card>
              )}
              {activeTab === 'Expérience' && <ExperienceCard />}
              {activeTab === 'Activités' && <ActivityHeatmapCard activityData={activityData} loading={activityLoading} />}
              {activeTab === 'Amis' && <FriendsListCard friends={friends} total={friendsTotal} loading={friendsLoading} hasMore={friends.length < friendsTotal} showActions={true} showRemove={isOwner} pendingIds={pendingContactIds} removingIds={removingContactIds} onMessage={messageContact} onConnect={connectContact} onRemove={removeContact} onLoadMore={() => loadFriendsPage(friends.length)} />}
              {activeTab === 'Médias' && <MediaGalleryCard posts={profileMediaPosts} loading={mediaLoading} hasMore={mediaPosts.length === 24} onLoadMore={() => loadMediaPage(mediaPosts.length)} onViewMedia={(media) => setMediaViewerIndex(profileMedia.findIndex((item) => item.id === media.id))} />}
            </div>

            {/* RIGHT COLUMN — Sidebar */}
            <aside className="lynora-profile-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 16, position: isMobile ? 'static' : 'sticky', top: 16 }}>
              <SidebarAboutCard />
              <SidebarSkillTagsCard />
              <SidebarContactsCard friends={friends} total={friendsTotal} showActions={true} showRemove={isOwner} pendingIds={pendingContactIds} removingIds={removingContactIds} onMessage={messageContact} onConnect={connectContact} onRemove={removeContact} onShowAll={() => setActiveTab('Amis')} />
              <SidebarGalleryCard posts={visibleSidebarMedia} onShowAll={openAllProfileMedia} onViewMedia={(media) => setMediaViewerIndex(profileMedia.findIndex((item) => item.id === media.id))} />
              <SidebarPublicationsCard posts={visibleSidebarMedia} />
            </aside>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modalType && <ImageUploadModal type={modalType} initialPreview={modalType === 'avatar' ? avatarSrc : coverSrc} onClose={closeModal} onSave={saveModal} />}
      {contactsModalOpen && <ContactsModal isOpen={contactsModalOpen} onClose={() => setContactsModalOpen(false)} contacts={friends} />}
      {postModalOpen && <FeedCreatePostModal initialMode={postModalMode} onClose={() => setPostModalOpen(false)} onPublish={publishPost} currentUser={{ name: profile.name || 'Utilisateur', title: profile.headline || 'Membre LynoraLink', avatar: profile.initials || 'U', avatarUrl: profile.avatarUrl || avatarSrc || null, isPlatformAdmin: Boolean(profile.isPlatformAdmin), isPremium: Boolean(profile.isPremium) }} modalStyle={undefined} />}
      {visualFocusOpen && <AIVisualEditorModal onClose={() => setVisualFocusOpen(false)} onPublish={publishPost} currentUser={{ name: profile.name || 'Utilisateur', title: profile.headline || 'Membre LynoraLink', avatar: profile.initials || 'U', avatarUrl: profile.avatarUrl || avatarSrc || null }} />}
      {mediaViewerIndex !== null && profileMedia[mediaViewerIndex] && <ProfileMediaViewer media={profileMedia} selectedIndex={mediaViewerIndex} onClose={() => setMediaViewerIndex(null)} onSelect={setMediaViewerIndex} onOpenPost={(postId) => { setMediaViewerIndex(null); setOpenPostId(postId); }} />}
      {selectedOpenPost && <FeedPostViewerPreviewComponent post={selectedOpenPost} currentUser={currentProfileUser} onClose={() => setOpenPostId(null)} onToggleLike={(id) => togglePostLike(id)} onReact={selectPostReaction} onToggleBookmark={() => {}} onAddComment={addComment} onReplyComment={addReply} onToggleCommentLike={(commentId) => toggleCommentLike(selectedOpenPost.id, commentId)} onShare={() => {}} />}
      {selectedOpenArticle && <FeedArticleViewerPreviewComponent article={{ ...selectedOpenArticle, author: selectedOpenArticle.author || profile.name, title: selectedOpenArticle.headline || selectedOpenArticle.text?.slice(0, 60) || 'Article', time: selectedOpenArticle.time, readingTime: 3, body: selectedOpenArticle.body || selectedOpenArticle.text || '', coverUrl: selectedOpenArticle.coverUrl || selectedOpenArticle.media?.[0]?.url || null }} currentUser={currentProfileUser} onClose={() => setOpenArticleId(null)} onToggleLike={(id) => togglePostLike(id)} onToggleBookmark={() => {}} onAddComment={addComment} onShare={() => {}} onFollowAuthor={() => {}} />}
      {shareModalOpen && <ShareProfileModal profileName={profile.name} onClose={() => setShareModalOpen(false)} onCopyLink={copyProfileLink} onToast={showToast} />}
      {reportModalOpen && <ReportModal profileName={profile.name} onClose={() => setReportModalOpen(false)} onToast={showToast} />}
      {toast && <Toast message={toast.message} icon={toast.icon} onClose={() => setToast(null)} />}
    </div>
  );
}