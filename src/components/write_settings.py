import json, os
p = r'c:\Users\Roots\lynoralink\src\components\SettingsLynora.jsx'
content = r'''
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  User, Lock, Bell, Palette, ShieldCheck, Database, Camera, ImagePlus,
  Globe2, Users2, ChevronRight, Check, X, Moon, Sun, Monitor, Smartphone,
  Laptop, LogOut, Trash2, Eye, EyeOff, KeyRound, Mail, MapPin, Building2,
  Link2, AlertTriangle, Download, RotateCcw, BadgeCheck,
} from 'lucide-react';

export const DEFAULT_SETTINGS = {
  profile: { name: '', headline: '', location: '', company: '', website: '', about: '', initials: 'U', avatarSrc: null },
  privacy: { profileVisibility: 'public', showConnections: true, showActivity: true, availability: 'open', searchable: true },
  notifications: { email: { messages: true, connectionRequests: true, endorsements: false, newsletter: true }, push: { messages: true, connectionRequests: true, mentions: true, endorsements: false } },
  appearance: { theme: 'system', density: 'comfortable', fontScale: 'medium' },
  account: { email: '', language: 'fr', timezone: 'Africa/Nairobi', twoFactor: false },
  sessions: [],
};

const NAV_SECTIONS = [
  { key: 'profil', label: 'Profil', icon: User, desc: 'Informations publiques' },
  { key: 'confidentialite', label: 'Confidentialité', icon: Lock, desc: 'Visibilité et découvrabilité' },
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

const STATUS_OPTIONS = [
  { key: 'open', label: 'Ouverte aux opportunités', color: '#1E7A4C', bg: '#E7F4EC' },
  { key: 'mentoring', label: 'Disponible pour du mentorat', color: '#8A5A16', bg: '#FBF0DC' },
  { key: 'unavailable', label: 'Non disponible actuellement', color: '#5C6B78', bg: '#EEF1F4' },
];

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl mb-3.5 sm:mb-4" style={{ background: '#FFFFFF', border: '1px solid #E4E9EE' }}>
      {(title || subtitle) && (
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3.5 sm:pb-4 border-b" style={{ borderColor: '#E4E9EE' }}>
          {title && (
            <h3 className="text-[14.5px] sm:text-[15px] font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-[12px] sm:text-[12.5px] mt-1" style={{ color: '#5C6B78' }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="px-4 sm:px-6 py-4 sm:py-5">{children}</div>
    </div>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <div className="mb-1.5">
      <label className="text-[13px] font-medium" style={{ color: '#16232C' }}>
        {children}
      </label>
      {hint && (
        <p className="text-[11.5px] mt-0.5" style={{ color: '#5C6B78' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function TextInput({ icon: Icon, value, onChange, placeholder, type = 'text' }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 transition-colors focus-within:ring-2"
      style={{ border: '1px solid #E4E9EE', background: '#F5F7FA' }}
    >
      {Icon && <Icon size={15} style={{ color: '#5C6B78' }} className="flex-shrink-0" />}
      <input
        type={isPassword && !show ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none text-[13.5px]"
        style={{ color: '#16232C' }}
      />
      {isPassword && (
        <button type="button" onClick={() => setShow((s) => !s)} style={{ color: '#5C6B78' }} aria-label="Afficher le mot de passe">
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
      className="w-full rounded-xl px-3.5 py-3 outline-none text-[13.5px] leading-relaxed resize-none"
      style={{ border: '1px solid #E4E9EE', background: '#F5F7FA', color: '#16232C' }}
    />
  );
}

function Toggle({ checked, onChange, label, desc }) {
  return (
    <div className="flex items-center justify-between gap-3 sm:gap-4 py-3 sm:py-2.5">
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium" style={{ color: '#16232C' }}>{label}</div>
        {desc && <div className="text-[12px] mt-0.5" style={{ color: '#5C6B78' }}>{desc}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 rounded-full transition-colors"
        style={{ width: 44, height: 26, background: checked ? '#1B5386' : '#C7D0D8' }}
      >
        <span
          className="absolute top-[3px] left-[3px] h-5 w-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(21px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}

function OptionRow({ active, onClick, icon: Icon, label, desc, colorDot }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors"
      style={{
        border: active ? '1.5px solid #1B5386' : '1px solid #E4E9EE',
        background: active ? '#EEF4FA' : '#FFFFFF',
      }}
    >
      {Icon && <Icon size={16} style={{ color: active ? '#1B5386' : '#5C6B78' }} className="flex-shrink-0" />}
      {colorDot && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colorDot }} />}
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium" style={{ color: '#16232C' }}>{label}</div>
        {desc && <div className="text-[11.5px] mt-0.5" style={{ color: '#5C6B78' }}>{desc}</div>}
      </div>
      {active && <Check size={16} style={{ color: '#1B5386' }} className="flex-shrink-0" />}
    </button>
  );
}

function DangerButton({ children, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors"
      style={{ border: '1px solid #E9B4AE', color: '#B3261E', background: '#FBEAEA' }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function ConfirmModal({ title, body, confirmLabel, danger, onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(15,58,95,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: '#FFFFFF', animation: 'st-modal-in 200ms cubic-bezier(0.22,1,0.36,1)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes st-modal-in { from { opacity:0; transform:translateY(8px) scale(0.98);} to { opacity:1; transform:translateY(0) scale(1); }`}</style>
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span className="w-9 h-1 rounded-full" style={{ background: '#E4E9EE' }} />
        </div>
        <div className="px-5 sm:px-6 pt-4 sm:pt-6 pb-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
            style={{ background: danger ? '#FBEAEA' : '#EEF4FA' }}
          >
            <AlertTriangle size={18} style={{ color: danger ? '#B3261E' : '#1B5386' }} />
          </div>
          <h3 className="text-[16px] font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h3>
          <p className="text-[13px] mt-2 leading-relaxed" style={{ color: '#5C6B78' }}>{body}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-4 mt-2">
          <button
            onClick={onCancel}
            className="rounded-full px-4 py-2.5 sm:py-2 text-[13px] font-medium"
            style={{ border: '1px solid #E4E9EE', color: '#5C6B78' }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full px-4 py-2.5 sm:py-2 text-[13px] font-medium text-white"
            style={{ background: danger ? '#B3261E' : 'linear-gradient(135deg, #1B5386, #0F3A5F)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
'''
with open(p, 'w', encoding='utf-8') as f:
    f.write(content)
print('written chunk1', len(content))
