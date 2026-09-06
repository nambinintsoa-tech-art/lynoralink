"use client";

import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Home, Users, Briefcase, MessageSquare, Bell, Search, Image as ImageIcon,
  Video, FileText, ThumbsUp, MessageCircle, Share2, Send, X, ChevronDown,
  MoreHorizontal, Globe, Bookmark, PlayCircle, Zap, TrendingUp, Megaphone,
  UserPlus, Check, Pencil, Clock, ArrowLeft, BookOpen, User, Settings,
  LogOut, Bold, Italic, Heading2, Quote, List, Link2, MapPin, Mail,
  ShieldCheck, Trash2, Eye, EyeOff, CheckCircle2, Camera, Building2,
  UserX, AtSign, Paperclip, Phone as PhoneIcon, Video as VideoIcon,
  Info, CircleDot, CheckCheck, BellOff, Calendar, Users2, ExternalLink, ArrowRight,
  Smile, Crown, Lock, Plus, AlertTriangle, ImagePlus, Loader2,
  LogOut as LeaveIcon, Filter, Sparkles,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import LogoBadge from "./LogoBadge";
import EnterpriseBadge from "./EnterpriseBadge";
import PremiumBadge from "./PremiumBadge";
import { TopNav as SharedTopNav } from "./TopNav";
import ProfileLynoraLink from "./ProfileLynoraLink";
import SettingsLynora from "./SettingsLynora";
import CompanyPage, { CompanyPagesGrille as CompanyPagesGrid, PAGE_DIRECTORY, SponsorModal } from "./CompanyPage";
import { CURRENT_USER_ID } from "./companyStore";
import CreatePostModal from "./CreatePostModal";
import { fetchBackendApi } from "@/lib/backend-api";
import CompanyComposer from "./CompanyComposer";
import AIVisualEditorModal from "./AIVisualEditorModal";
import MessagingWidget from "./Message";
import { NotificationsPage as NotificationPage, DEMO_NOTIFICATIONS as NOTIFICATION_SEED } from "./Notification";
import Reseau from "./Reseau";
import AIAgentAssistant from "./AIAgentAssistant";
import PostViewerPreview from "./PostViewerPreview";
import EventViewerPreview from "./EventViewerPreview";
import ArticleViewerPreview from "./ArticleViewerPreview";
import Groupe from "./Groupe";
import PostCard from "./PostCard";
import Abonnement from "./Abonnement";
import Story from "./Story";
import Reel from "./Reel";
import { getReelsSource } from "@/lib/reels";
import { SkeletonStoryRail } from "./StorySkeleton";
import FeedLoadingShell from "./FeedLoadingShell";
import AccountSwitchTransition from "./AccountSwitchTransition";
import LogoutTransition from "./LogoutTransition";
import RelativeTime from "./RelativeTime";
import {
  FeedSkeleton,
  ComposerSkeleton,
  LeftSidebarSkeleton,
  RightSidebarSkeleton,
  NotificationsSkeleton,
  ProfileSkeleton,
  CompanySkeleton,
  SubscriptionSkeleton,
  CompanyPagesGridSkeleton,
} from "./Skeleton";

/* ------------------------------------------------------------------ */
/*  TOKENS — palette dérivée du logo LynoraLink (badge navy + L doré) */
/* ------------------------------------------------------------------ */
const C = {
  navy900: "var(--navy900)",
  navy800: "var(--navy800)", // couleur exacte du badge du logo
  navy700: "#2C6BA0",
  navy100: "#DCE7F1",
  navy50: "var(--app-bg)",
  gold400: "#F6D374", // dégradé du "L" du logo
  gold600: "#D9A536",
  ink: "var(--app-text)",
  muted: "var(--app-muted)",
  mutedLight: "var(--app-muted-light)",
  line: "var(--app-border)",
  white: "var(--app-surface)",
  danger: "#C24444",
  danger50: "#FBEDED",
};

function playPostPublishedSound() {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const audioContext = new AudioContextClass();
    const playTone = (frequency, startTime, duration) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration + 0.02);
    };

    const resume = audioContext.state === "suspended" ? audioContext.resume() : Promise.resolve();
    resume.then(() => {
      const startTime = audioContext.currentTime;
      playTone(660, startTime, 0.11);
      playTone(880, startTime + 0.09, 0.16);
      window.setTimeout(() => audioContext.close().catch(() => {}), 400);
    }).catch(() => audioContext.close().catch(() => {}));
  } catch {}
}

function playNotificationSound(kind = "notification") {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const audioContext = window.__lynoraNotificationAudioContext || new AudioContextClass();
    window.__lynoraNotificationAudioContext = audioContext;
    const notes = kind === "message" ? [520, 760] : [660, 880];
    const resume = audioContext.state === "suspended" ? audioContext.resume() : Promise.resolve();
    resume.then(() => {
      const startTime = audioContext.currentTime;
      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const noteStart = startTime + index * 0.1;
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.1, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.12);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteStart + 0.14);
      });
    }).catch(() => {});
  } catch {}
}

function unlockNotificationAudio() {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    const audioContext = window.__lynoraNotificationAudioContext || new AudioContextClass();
    window.__lynoraNotificationAudioContext = audioContext;
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  } catch {}
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;

function normalizeMembersList(members) {
  if (Array.isArray(members)) return members;
  if (typeof members === "string") {
    try {
      const parsed = JSON.parse(members);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
const APP_NAME = "LynoraLink";

/* ------------------------------------------------------------------ */
/*  DONNÉES UTILISATEUR / PRÉPARATION PRODUCTION                    */
/* ------------------------------------------------------------------ */
const CURRENT_USER = { name: "Utilisateur", title: "Membre LynoraLink", avatar: "U" };

const DEFAULT_PROFILE = {
  name: CURRENT_USER.name,
  title: CURRENT_USER.title,
  location: "",
  bio: "",
  email: "",
  phone: "",
  image: null,
  avatarUrl: null,
  coverUrl: null,
  bannerUrl: null,
};

const getUserAvatar = (user = {}) => user.avatarUrl || user.image || user.photoUrl || null;
const getInitials = (name = "") => String(name).split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "P";

const EXPERIENCE = [];
const SKILLS = [];

/* ---- RÉSEAU ---- */
const MY_CONNECTIONS = [];
const PENDING_INVITATIONS = [];

/* ---- MESSAGES ---- */
const INITIAL_CONVERSATIONS = [];

/* ---- NOTIFICATIONS ---- */
const INITIAL_NOTIFICATIONS = [];

/* ---- PAGES SUIVIES ---- */
const COMPANY_PAGES = [];

const ARTICLE_1_BODY = `Nous venons de boucler notre levée de série A. Trois ans de travail acharné, une équipe extraordinaire, et une vision qui reste intacte : rendre la logistique africaine transparente, de bout en bout.

# Ce qui a vraiment changé la donne

La première leçon, la plus dure à accepter, c'est que **le produit ne suit jamais le plan initial**. Nous avons pivoté deux fois avant de trouver le bon angle : partir des transporteurs plutôt que des expéditeurs. Ce changement de perspective a tout débloqué.

> Écouter en profondeur un petit nombre d'utilisateurs vaut mieux que sonder superficiellement des milliers de prospects.

Voici les trois principes qui ont guidé nos décisions de recrutement :
- Ralentir pour mieux choisir, même sous pression
- Privilégier la diversité des profils plutôt que les copier-collés de CV
- Impliquer l'équipe dans chaque décision d'embauche clé

Merci à tous ceux qui ont cru au projet dès le premier jour. La route continue, avec encore plus d'ambition.`;

const INITIAL_POSTS = [];

/* ------------------------------------------------------------------ */
/*  UTILITAIRES — lecture / rendu de texte enrichi (markdown léger)   */
/* ------------------------------------------------------------------ */
function readingTime(text) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function externalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try { return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).toString(); } catch { return null; }
}

function sponsoredActionLabel(ad) {
  if (ad?.objective === "conversions") return "S'inscrire";
  if (ad?.objective === "clics" && externalUrl(ad.website)) return "Visiter";
  if (ad?.whatsapp && !externalUrl(ad.website)) return "WhatsApp";
  return "Découvrir";
}

function SponsoredInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <span
      ref={containerRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      style={{ position: "relative", display: "inline-flex" }}
    >
      <button
        type="button"
        aria-label="Pourquoi vois-je cette publicité ?"
        aria-expanded={isOpen}
        onFocus={() => setIsOpen(true)}
        onBlur={(event) => {
          if (!containerRef.current?.contains(event.relatedTarget)) setIsOpen(false);
        }}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 1, border: 0, background: "transparent", color: "inherit", cursor: "pointer", borderRadius: 4 }}
      >
        <Info size={11} />
      </button>
      {isOpen && (
        <span role="status" style={{ position: "absolute", zIndex: 10, top: "calc(100% + 8px)", left: 0, width: "min(230px, calc(100vw - 32px))", padding: "10px 12px", borderRadius: 8, background: C.navy800, color: "#fff", fontSize: 12, lineHeight: 1.4, fontWeight: 500, textAlign: "left", whiteSpace: "normal", boxSizing: "border-box", boxShadow: "0 6px 18px rgba(15,51,82,0.22)" }}>
          Cette publicité est sponsorisée par LynoraLink.
        </span>
      )}
    </span>
  );
}

function SponsoredAdCard({ ad, onNavigate, onMessage, onOpenPost, currentUserId }) {
  const track = (event) => {
    if (!ad?.campaignId) return;
    fetchBackendApi("/api/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: ad.campaignId, event }) }).catch(() => {});
  };
  useEffect(() => { track("impression"); }, [ad?.id]);
  const website = externalUrl(ad.website);
  const isStory = ad.format === "story";
  return (
    <article className={`sponsored-ad-card${isStory ? " sponsored-ad-card-story" : ""}`}>
      <div className="sponsored-ad-label"><Megaphone size={14} /> {ad.isDemo ? "Aperçu démo" : "Sponsorisé"} <span>· Publicité</span></div>
      <div className="sponsored-ad-header">
        <Avatar initials={ad.initials || "L"} size={42} imgUrl={ad.image} />
        <div style={{ minWidth: 0, flex: 1 }}><strong>{ad.author}</strong><span>Partenaire LynoraLink</span></div>
      </div>
      <div className="sponsored-ad-copy"><h3>{ad.title}</h3><p>{ad.description}</p></div>
      {ad.mediaUrl && (ad.mediaType === "video" ? <video className="sponsored-ad-media" src={ad.mediaUrl} controls playsInline /> : <img className="sponsored-ad-media" src={ad.mediaUrl} alt={ad.title} />)}
      <div className="sponsored-ad-actions">
        {onOpenPost && <button type="button" className="sponsored-ad-action sponsored-ad-action-secondary" onClick={() => onOpenPost(ad)}><ExternalLink size={14} /> Voir plus</button>}
        {website ? <a className="sponsored-ad-action sponsored-ad-action-primary" href={website} target="_blank" rel="noreferrer" onClick={() => track("click")}>{sponsoredActionLabel(ad)} <ExternalLink size={14} /></a> : <button type="button" className="sponsored-ad-action sponsored-ad-action-primary" onClick={() => { track("click"); onNavigate?.("feed"); }}>{sponsoredActionLabel(ad)} <ArrowRight size={14} /></button>}
        {onOpenPost && <button type="button" className="sponsored-ad-action sponsored-ad-action-comment" onClick={() => onOpenPost(ad)}><MessageCircle size={14} /> Commenter</button>}
        {ad.authorId && String(ad.authorId) !== String(currentUserId || "") && onMessage && <button type="button" className="sponsored-ad-action sponsored-ad-action-message" onClick={() => { track("click"); onMessage(ad); }}><MessageCircle size={14} /> Message</button>}
        {ad.whatsapp && <a className="sponsored-ad-action sponsored-ad-action-whatsapp" href={`https://wa.me/${String(ad.whatsapp).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" onClick={() => track("conversion")}><FontAwesomeIcon icon={faWhatsapp} /> WhatsApp</a>}
      </div>
    </article>
  );
}

function parseArticleBody(raw) {
  if (!raw) return [];
  const normalizedRaw = String(raw)
    .replace(/\*{3,}/g, "")
    .replace(/(^|\n)\s*\*{2}(?=\S)/g, "$1")
    .replace(/\*{2}\s*(?=\n|$)/g, "")
    .replace(/(^|\n)\s*\*(?=\S)/g, "$1")
    .replace(/\*\s*(?=\n|$)/g, "")
    .replace(/(^|\n)\s*<\/span\b[^>]*>?/gi, "$1");
  const chunks = normalizedRaw.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);
  return chunks.map((chunk) => {
    if (chunk.startsWith("# ")) return { type: "heading", text: chunk.slice(2) };
    if (chunk.startsWith("> ")) return { type: "quote", text: chunk.replace(/^>\s?/gm, "") };
    const lines = chunk.split("\n");
    if (lines.length > 0 && lines.every((l) => l.trim().startsWith("- "))) {
      return { type: "list", items: lines.map((l) => l.trim().slice(2)) };
    }
    return { type: "paragraph", text: chunk };
  });
}

function inlineFormat(str) {
  const cleanText = String(str)
    .replace(/&lt;span\b[^&]*?style\s*=\s*["']?color\s*:\s*[^"'>&\s]+["']?/gi, "")
    .replace(/<span\b[^>]*?style\s*=\s*["']?color\s*:\s*[^"'>\s]+["']?/gi, "")
    .replace(/&lt;span\b[^&]*?(?:&gt;|>)/gi, "")
    .replace(/<span\b[^>]*>/gi, "")
    .replace(/&lt;\/span\b[^&]*?(?:&gt;|>)/gi, "")
    .replace(/<\/span\b[^>]*>?/gi, "")
    .replace(/&lt;\/span&gt;|<\/span>/gi, "")
    .replace(/<span\b[^>]*$/gi, "")
    .replace(/&lt;span\b[^&]*$/gi, "");
  const nodes = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(cleanText))) {
    if (match.index > lastIndex) nodes.push(cleanText.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      const href = match[2].trim();
      const isSafeHref = /^(https?:\/\/|mailto:|\/[A-Za-z0-9])/.test(href);
      nodes.push(isSafeHref ? (
        <a key={key++} href={href} target="_blank" rel="noreferrer" style={{ color: C.navy800, fontWeight: 600, textDecoration: "underline" }}>
          {match[1]}
        </a>
      ) : match[1]);
    } else if (match[3] !== undefined) {
      nodes.push(<strong key={key++}>{match[3]}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(<em key={key++}>{match[4]}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < cleanText.length) nodes.push(cleanText.slice(lastIndex));
  return nodes;
}

function formatLines(text) {
  const lines = text.split("\n");
  return lines.map((line, i) => (
    <React.Fragment key={i}>
      {inlineFormat(line)}
      {i < lines.length - 1 && <br />}
    </React.Fragment>
  ));
}

function ArticleBlocks({ blocks }) {
  if (!blocks.length) {
    return <p style={{ color: C.mutedLight, fontStyle: "italic" }}>Votre article apparaîtra ici au fur et à mesure de la rédaction...</p>;
  }
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "heading")
          return (
            <h2 key={i} style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 22, color: C.ink, margin: "26px 0 12px" }}>
              {formatLines(b.text)}
            </h2>
          );
        if (b.type === "quote")
          return (
            <blockquote key={i} style={{ margin: "0 0 20px", padding: "2px 0 2px 16px", borderLeft: `3px solid ${C.gold600}`, color: C.muted, fontStyle: "italic", fontSize: 16 }}>
              {formatLines(b.text)}
            </blockquote>
          );
        if (b.type === "list")
          return (
            <ul key={i} style={{ margin: "0 0 20px", paddingLeft: 22, color: C.ink, fontSize: 16, lineHeight: 1.8 }}>
              {b.items.map((item, j) => (
                <li key={j}>{formatLines(item)}</li>
              ))}
            </ul>
          );
        return (
          <p key={i} style={{ margin: "0 0 20px", fontSize: 16, lineHeight: 1.85, color: C.ink }}>
            {formatLines(b.text)}
          </p>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  PETITS COMPOSANTS UTILITAIRES                                     */
/* ------------------------------------------------------------------ */
function Avatar({ initials, size = 44, ring = false, gradient = navyGrad, imgUrl = null, online = false }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          position: "relative",
        borderRadius: "50%",
        background: imgUrl ? C.navy100 : gradient,
        color: C.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.36,
        fontFamily: "'Sora', sans-serif",
        overflow: "hidden",
        border: ring ? `3px solid ${C.white}` : "none",
        boxShadow: ring ? `0 0 0 4px ${C.gold600}` : "none",
        letterSpacing: "-0.02em",
      }}
    >
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={initials}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : initials}
      </div>
      {online && <span aria-label="En ligne" style={{ position: "absolute", right: 0, bottom: 0, width: 10, height: 10, boxSizing: "border-box", borderRadius: "50%", background: "#22C55E", border: `2px solid ${C.white}`, boxShadow: "0 0 0 1px #15803D" }} />}
    </div>
  );
}


function IconBtn({ icon: Icon, onClick, active, size = 18, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10,
        border: "none", background: active ? C.navy50 : "transparent", color: active ? C.navy800 : C.muted, cursor: "pointer",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)}
      onMouseLeave={(e) => (e.currentTarget.style.background = active ? C.navy50 : "transparent")}
    >
      <Icon size={size} />
    </button>
  );
}

function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, ...style }}>
      {children}
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 42, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
        background: checked ? goldGrad : C.line, position: "relative", flexShrink: 0, transition: "background 0.2s ease",
      }}
    >
      <span
        style={{
          position: "absolute", top: 3, left: checked ? 21 : 3, width: 18, height: 18, borderRadius: "50%",
          background: C.white, boxShadow: "0 1px 3px rgba(15,51,82,0.35)", transition: "left 0.2s ease",
        }}
      />
    </button>
  );
}

// Modale de confirmation générique (déconnexion, suppression de compte...)
function ConfirmModal({ title, message, confirmLabel, danger, onCancel, onConfirm }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,51,82,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: C.white, borderRadius: 16, padding: 22, boxShadow: "0 24px 60px rgba(15,51,82,0.35)" }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>{message}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${C.line}`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
            Annuler
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: danger ? C.danger : C.navy800, color: C.white, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BARRE DE NAVIGATION SUPÉRIEURE — logo seul + menu déroulant profil */
/* ------------------------------------------------------------------ */
export function TopNav({ profile, view, onNavigate, onRequestLogout, unreadMessages = 0, unreadNotifications = 0, isAdmin = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = [
    { id: "feed", icon: Home, label: "Accueil" },
    { id: "network", icon: Users, label: "Réseau" },
    { id: "groups", icon: Users2, label: "Groupes" },
    { id: "company", icon: Building2, label: "Mon entreprise" },
    { id: "dashboard", icon: TrendingUp, label: "Dashboard" },
    { id: "messages", icon: MessageSquare, label: "Messages", badge: unreadMessages },
    { id: "notifications", icon: Bell, label: "Notifications", badge: unreadNotifications },
  ];

  return (
    <>
      <style jsx global>{`
        @media (max-width: 900px) {
          .lynora-topnav-shell {
            padding: 10px 12px !important;
          }
          .lynora-topnav-search {
            display: none !important;
          }
          .lynora-topnav-actions {
            gap: 2px !important;
          }
          .lynora-topnav-actions button {
            padding: 6px 8px !important;
          }
          .lynora-topnav-label {
            display: none !important;
          }
          .lynora-topnav-divider {
            display: none !important;
          }
          .lynora-mobile-search-btn {
            display: flex !important;
          }
        }

        @media (min-width: 901px) {
          .lynora-mobile-search-btn {
            display: none !important;
          }
        }
      `}</style>
      <div ref={topnavRef} className="lynora-topnav-shell" style={{ position: "sticky", top: 0, zIndex: 30, background: C.white, borderBottom: `1px solid ${C.line}`, boxShadow: "0 1px 0 rgba(15, 51, 82, 0.06)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", flexWrap: "wrap" }}>
          <button onClick={() => onNavigate("feed")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}>
            <LogoBadge size={38} />
          </button>

          <div className="lynora-topnav-search" style={{ flex: "1 1 280px", maxWidth: 360, minWidth: 0, display: "flex", alignItems: "center", gap: 8, background: C.navy50, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 12px" }}>
            <Search size={16} color={C.muted} />
            <input
              placeholder="Rechercher des personnes, articles..."
              style={{ background: "transparent", border: "none", outline: "none", color: C.ink, fontSize: 14, width: "100%" }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }} />

          <div className="lynora-topnav-actions" style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {navItems.map(({ id, icon: Icon, label, badge }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  title={label}
                  onClick={() => onNavigate(id)}
                  style={{
                    position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none",
                    padding: "6px 10px", borderRadius: 10, cursor: "pointer",
                    color: active ? C.navy800 : C.muted,
                    borderBottom: active ? `2px solid ${C.gold400}` : "2px solid transparent",
                  }}
                >
                  <span style={{ position: "relative" }}>
                    <Icon size={19} />
                    {badge > 0 && (
                      <span style={{ position: "absolute", top: -5, right: -8, minWidth: 15, height: 15, padding: "0 3px", borderRadius: 999, background: C.danger, color: C.white, fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                        {badge}
                      </span>
                    )}
                  </span>
                  <span className="lynora-topnav-label" style={{ fontSize: 10.5, fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", color: active ? C.navy800 : C.muted }}>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="lynora-topnav-divider" style={{ width: 1, height: 26, background: C.line, margin: "0 4px" }} />

          {/* Avatar + menu déroulant */}
          <div style={{ position: "relative", marginLeft: "auto" }}>
            <button onClick={() => setMenuOpen((o) => !o)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Avatar initials={CURRENT_USER.avatar} imgUrl={profileAvatar} size={34} ring />
              <ChevronDown size={14} color={C.muted} />
            </button>

            {menuOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 39 }} onClick={() => setMenuOpen(false)} />
                <div
                  style={{
                    position: "absolute", top: 46, right: 0, width: 240, background: C.white, borderRadius: 14,
                    boxShadow: "0 16px 40px rgba(15,51,82,0.3)", border: `1px solid ${C.line}`, zIndex: 40, overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
                    <Avatar initials={CURRENT_USER.avatar} imgUrl={profileAvatar} size={40} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{profile.name}</span>
                        {profile.isPlatformAdmin && <EnterpriseBadge size={14} label="Administrateur officiel LynoraLink" />}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.title}</div>
                    </div>
                  </div>
                  <MenuItem icon={Settings} label="Paramètres" onClick={() => { onNavigate("settings"); setMenuOpen(false); }} />
                  {!isAdmin && <MenuItem icon={Crown} label="Passer à Premium" onClick={() => { onNavigate("abonnement"); setMenuOpen(false); }} />}
                  {isAdmin && <MenuItem icon={ShieldCheck} label="Administration" badge={unreadNotifications} onClick={() => { window.location.href = "/admin"; setMenuOpen(false); }} />}
                  <div style={{ height: 1, background: C.line, margin: "4px 0" }} />
                  <MenuItem icon={LogOut} label="Déconnexion" danger onClick={() => { onRequestLogout(); setMenuOpen(false); }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", background: "transparent",
        border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: danger ? C.danger : C.ink, textAlign: "left",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? C.danger50 : C.navy50)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  SIDEBAR GAUCHE — PROFIL + RACCOURCIS + ARTICLES                    */
/* ------------------------------------------------------------------ */
function LeftSidebar({ profile, articleCount, connectionCount, draftCount = 0, onOpenComposer, onOpenCampaign, onNavigate, onNavigateShortcut, onNavigateProfile, activeView = "feed" }) {
  const [showAllShortcuts, setShowAllShortcuts] = useState(false);
  const avatarImg = profile.avatarUrl || profile.image || profile.photoUrl || null;
  const navigateToProfile = onNavigateProfile || (() => onNavigate("profile"));
  const isPageAccount = profile?.accountType === "company";

  const shortcuts = [
    { id: "my-posts", icon: FileText, label: "Mes posts" },
    { id: "groups", icon: Users, label: "Groupes" },
    { id: "saved", icon: Bookmark, label: "Enregistrements" },
    { id: "my-articles", icon: BookOpen, label: "Mes articles" },
    { id: "ai-assistant", icon: Sparkles, label: "Assistant IA" },
  ];
  const visibleShortcuts = showAllShortcuts ? shortcuts : shortcuts.slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ---- Profile Card (LinkedIn dark style) ---- */}
      <Card style={{ overflow: "hidden", border: "none" }}>
        {/* Dark gradient header with wave */}
        <div style={{
          height: 72,
          background: profile.coverUrl
            ? `linear-gradient(180deg, rgba(15, 51, 82, 0.08), rgba(15, 51, 82, 0.48)), url(${profile.coverUrl}) center/cover no-repeat`
            : navyGrad,
          position: "relative",
          overflow: "hidden",
        }}>
          <svg
            viewBox="0 0 300 40"
            preserveAspectRatio="none"
            style={{ position: "absolute", bottom: -1, left: 0, width: "100%", height: 20, opacity: 0.15 }}
          >
            <path d="M0 20 Q75 0 150 20 T300 20 V40 H0 Z" fill="#F6D374" />
          </svg>
        </div>

        {/* Centered avatar overlapping the header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 16px", marginTop: -32 }}>
          <button
            onClick={navigateToProfile}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", position: "relative", zIndex: 2 }}
          >
            <Avatar initials={CURRENT_USER.avatar} imgUrl={avatarImg} size={68} ring online={profile.showOnlineStatus !== false && !isPageAccount} />
          </button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", minWidth: 0, marginTop: 10 }}>
            <span
              onClick={navigateToProfile}
              style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, cursor: "pointer" }}
            >
              {profile.name || CURRENT_USER.name}
            </span>
            {profile.isPlatformAdmin ? <EnterpriseBadge size={12} label="Administrateur officiel LynoraLink" /> : profile.isPremium && <PremiumBadge size={12} />}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3, textAlign: "center", lineHeight: 1.4, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {profile.title || CURRENT_USER.title}
          </div>
          {profile.location && (
            <div style={{ fontSize: 11.5, color: C.mutedLight, marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
              <MapPin size={11} />
              {profile.location}
            </div>
          )}

          {/* Stats row: Abonnés / Abonnements */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 12, padding: "8px 0" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: "#0a66c2" }}>
                {connectionCount || profile.followersCount || 0}
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>Abonnés</div>
            </div>
            <div style={{ width: 1, height: 24, background: C.line }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>
                {profile.followingCount || 0}
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>Abonnements</div>
            </div>
          </div>

          {/* "Voir le profil" button */}
          <button
            onClick={navigateToProfile}
            style={{
              width: "100%",
              padding: "9px 0",
              borderRadius: 24,
              border: "1.5px solid #0a66c2",
              background: "transparent",
              color: "#0a66c2",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              marginTop: 4,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#0a66c2"; e.currentTarget.style.color = C.white; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#0a66c2"; }}
          >
            Voir le profil
          </button>
        </div>
      </Card>

      {isPageAccount && (
        <button type="button" onClick={onOpenCampaign} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "11px 14px", border: "none", borderRadius: 12, background: goldGrad, color: C.navy900, fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 5px 14px rgba(217,165,54,0.22)" }}>
          <Megaphone size={16} /> Créer une publicité
        </button>
      )}

      {/* ---- Mes raccourcis ---- */}
      <Card style={{ padding: "12px 0" }}>
        <div style={{ padding: "0 16px 10px" }}>
          <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>Mes raccourcis</span>
        </div>
        {visibleShortcuts.map(({ id, icon: Icon, label, badge }, i) => (
          <button
            key={id}
            onClick={() => (onNavigateShortcut || onNavigate)(id)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px", cursor: "pointer", fontSize: 13.5,
              color: activeView === id ? C.navy800 : C.ink, background: activeView === id ? C.navy50 : "none", border: "none",
              borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
              textAlign: "left", transition: "background 0.15s ease", fontWeight: activeView === id ? 700 : 500,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {id === "ai-assistant" ? (
              <img src="/assistant-icone.svg" alt="" width="17" height="17" style={{ flexShrink: 0, display: "block" }} />
            ) : (
              <Icon size={17} color={activeView === id ? C.navy800 : C.navy700} style={{ flexShrink: 0 }} />
            )}
            <span style={{ flex: 1 }}>{label}</span>
            {badge > 0 && (
              <span style={{
                width: 20, height: 20, borderRadius: "50%",
                background: C.line, color: C.ink,
                fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {badge}
              </span>
            )}
          </button>
        ))}
        {shortcuts.length > 3 && (
          <button
            onClick={() => setShowAllShortcuts((v) => !v)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 6,
              padding: "10px 16px", cursor: "pointer", fontSize: 12.5,
              color: C.muted, background: "none",
              borderTop: `1px solid ${C.line}`,
              border: "none", textAlign: "left",
            }}
          >
            <ChevronDown size={14} style={{ transition: "transform 0.2s ease", transform: showAllShortcuts ? "rotate(180deg)" : "none" }} />
            Voir plus
          </button>
        )}
      </Card>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  SECTION SUGGESTIONS POUR LE FEED PRINCIPAL                         */
/* ------------------------------------------------------------------ */
function SuggestionsSection({ suggestions, connectedIds, pendingRequestIds, onConnect, onCancel, onDismiss, onNavigate, onOpenProfile }) {
  const displayedSuggestions = suggestions.slice(0, 10);
  const trackRef = useRef(null);

  const scrollSuggestions = (direction) => {
    const container = trackRef.current;
    if (!container) return;
    const amount = Math.max(container.clientWidth * 0.8, 220);
    container.scrollBy({ left: direction === "next" ? amount : -amount, behavior: "smooth" });
  };

  if (displayedSuggestions.length === 0) {
    return null;
  }

  return (
    <Card style={{ padding: "18px 16px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <UserPlus size={18} color={C.gold600} />
        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>Suggestions pour vous</span>
        <span style={{ fontSize: 12, color: C.mutedLight, marginLeft: "auto" }}>{displayedSuggestions.length} nouvelle{displayedSuggestions.length > 1 ? "s" : ""}</span>
        <button type="button" onClick={() => onNavigate?.("network", { tab: "suggestions" })} style={{ border: 0, background: "none", color: "#0a66c2", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>Voir tout</button>
      </div>

      <div style={{ position: "relative" }}>
        <button type="button" aria-label="Suggestions précédentes" onClick={() => scrollSuggestions("prev")} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.08)", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)", color: "#65676b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, zIndex: 2, transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#f2f3f5"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}>
          <ArrowLeft size={16} strokeWidth={2.2} />
        </button>
        <button type="button" aria-label="Suggestions suivantes" onClick={() => scrollSuggestions("next")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.08)", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)", color: "#65676b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, zIndex: 2, transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#f2f3f5"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}>
          <ArrowRight size={16} strokeWidth={2.2} />
        </button>

        <div ref={trackRef} className="feed-suggestions-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, width: "100%", maxWidth: "100%", margin: 0, overflow: "visible", padding: "0 0 8px", scrollBehavior: "smooth", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {displayedSuggestions.map((s, index) => {
          const isCompany = s.type === "company";
          const isConnected = connectedIds.includes(s.id);
          const isPending = pendingRequestIds.includes(s.id);
          const avatarUrl = s.avatarUrl || s.image || s.logoUrl || s.photoUrl || null;
          const coverUrl = s.coverUrl || s.cover || s.bannerUrl || s.backgroundImage || null;
          const openProfile = () => !isCompany && onOpenProfile?.(s.userId ?? s.id);
          const isFirstCard = index === 0;
          const isLastCard = index === displayedSuggestions.length - 1;

          return (
            <div
              key={s.id}
              className="feed-suggestion-card"
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: isFirstCard || isLastCard ? 12 : 12,
                borderLeft: isFirstCard ? "none" : `1px solid ${C.line}`,
                borderRight: isLastCard ? "none" : `1px solid ${C.line}`,
                borderTop: `1px solid ${C.line}`,
                borderBottom: `1px solid ${C.line}`,
                background: C.white,
                overflow: "hidden",
                transition: "all 0.2s ease",
                cursor: "pointer",
                minWidth: 0,
                width: "100%",
                maxWidth: "100%",
                flex: "none",
                justifySelf: "stretch",
                boxShadow: "0 2px 8px rgba(15,51,82,0.05)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 16px rgba(15,51,82,0.12)"; e.currentTarget.style.borderColor = C.gold400; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(15,51,82,0.05)"; e.currentTarget.style.borderColor = C.line; }}
            >
              <div
                style={{
                  width: "100%",
                  height: 70,
                  background: coverUrl ? `linear-gradient(180deg, rgba(15, 51, 82, 0.12), rgba(15, 51, 82, 0.32)), url(${coverUrl}) center/cover no-repeat` : `linear-gradient(135deg, ${C.gold300 || "#F9D77B"} 0%, ${C.gold600} 100%)`,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    bottom: -16,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 2,
                  }}
                >
                  {!isCompany && (
                    <button type="button" aria-label={`Voir le profil de ${s.name}`} onClick={openProfile} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
                      <Avatar
                        initials={s.initials || (s.name || "?").slice(0, 2).toUpperCase()}
                        size={46}
                        imgUrl={avatarUrl}
                      />
                    </button>
                  )}
                  {isCompany && (
                    <Avatar
                      initials={s.initials || (s.name || "?").slice(0, 2).toUpperCase()}
                      size={46}
                      imgUrl={avatarUrl}
                    />
                  )}
                </div>
              </div>

              <div style={{ padding: "22px 8px 8px", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                {!isCompany ? (
                  <button type="button" onClick={openProfile} style={{ border: "none", background: "transparent", color: C.ink, fontSize: 13.5, fontWeight: 800, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", padding: 0, width: "100%" }}>
                    {s.name}
                  </button>
                ) : (
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name}
                  </div>
                )}
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.title || (isCompany ? "Entreprise" : "Professionnel")}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, padding: "0 8px 8px", flexDirection: "column" }}>
                <button
                  onClick={() => isPending ? onCancel(s.id) : onConnect(s.id)}
                  disabled={isConnected}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "none",
                    background: isConnected ? C.navy50 : isPending ? C.white : C.gold600,
                    color: isConnected ? C.muted : isPending ? C.danger : C.white,
                    cursor: isConnected ? "default" : "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { if (!isConnected && !isPending) { e.currentTarget.style.background = C.gold500; } }}
                  onMouseLeave={(e) => { if (!isConnected && !isPending) { e.currentTarget.style.background = C.gold600; } }}
                >
                  {isConnected ? (
                    <><Check size={10} /> {isCompany ? "Suivi" : "Connecté"}</>
                  ) : isPending ? (
                    <><X size={10} /> Annuler</>
                  ) : (
                    <>{isCompany ? "Suivre" : "Se connecter"}</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDismiss?.(s.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: "5px 8px",
                    borderRadius: 8,
                    border: `1px solid ${C.line}`,
                    background: "transparent",
                    color: C.muted,
                    cursor: "pointer",
                  }}
                >
                  <X size={10} /> Supprimer
                </button>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </Card>
  );
}

function GroupSuggestionsRail({ groups, currentUserId, onJoinGroup, onNavigate, compactGrid = false, onDismiss, dismissedIds = [] }) {
  const displayedGroups = groups
    .filter((group) => !normalizeMembersList(group?.members).some((member) => String(member?.id) === String(currentUserId)))
    .filter((group) => !dismissedIds.includes(group.id))
    .slice(0, 6);

  const openGroup = (groupId) => {
    if (!groupId) return;
    onNavigate?.("groups", { groupId });
  };

  const trackRef = useRef(null);

  const scrollGroups = (direction) => {
    const container = trackRef.current;
    if (!container) return;
    const amount = Math.max(container.clientWidth * 0.8, 220);
    container.scrollBy({ left: direction === "next" ? amount : -amount, behavior: "smooth" });
  };

  if (displayedGroups.length === 0) return null;

  const isGridLayout = compactGrid;

  return (
    <Card style={{ padding: "18px 16px", overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Users2 size={18} color={C.gold600} />
        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>Groupes recommandés</span>
        <button type="button" onClick={() => onNavigate?.("groups")} style={{ marginLeft: "auto", border: 0, background: "none", color: "#0a66c2", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Voir tout</button>
      </div>

      <button type="button" aria-label="Groupes précédents" onClick={() => scrollGroups("prev")} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.08)", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)", color: "#65676b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, zIndex: 2 }}>
        <ArrowLeft size={16} strokeWidth={2.2} />
      </button>
      <button type="button" aria-label="Groupes suivants" onClick={() => scrollGroups("next")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.08)", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)", color: "#65676b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, zIndex: 2 }}>
        <ArrowRight size={16} strokeWidth={2.2} />
      </button>

      <div
        ref={trackRef}
        className="feed-suggestions-rail"
        style={
          isGridLayout
            ? { display: "flex", gap: 12, overflowX: "auto", overflowY: "hidden", padding: "0 20px 8px", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }
            : { display: "flex", gap: 12, flexWrap: "nowrap", overflowX: "auto", overflowY: "hidden", padding: "0 20px 8px", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }
        }
      >
        {displayedGroups.map((group) => (
          <div key={group.id} style={{ display: "flex", flexDirection: "column", borderRadius: 12, border: `1px solid ${C.line}`, background: C.white, overflow: "hidden", width: 180, maxWidth: 180, minWidth: 180, boxShadow: "0 2px 8px rgba(15,51,82,0.05)", height: 220, flex: "0 0 180px" }}>
            <button type="button" aria-label={`Voir le groupe ${group.name}`} onClick={() => openGroup(group.id)} style={{ width: "100%", height: 70, border: "none", background: group.coverUrl ? `linear-gradient(180deg, rgba(15,51,82,0.12), rgba(15,51,82,0.32)), url(${group.coverUrl}) center/cover no-repeat` : group.coverGradient || navyGrad, padding: 0, cursor: "pointer" }} />
            <div style={{ padding: "22px 8px 8px", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <button type="button" onClick={() => openGroup(group.id)} style={{ display: "block", width: "100%", padding: 0, border: 0, background: "none", color: C.ink, fontSize: 13.5, fontWeight: 800, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer" }}>{group.name}</button>
              <div style={{ fontSize: 10.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{group.memberCount ?? normalizeMembersList(group?.members).length} membre{(group.memberCount ?? normalizeMembersList(group?.members).length) > 1 ? "s" : ""}</div>
            </div>
            <div style={{ padding: "0 8px 8px", width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
              <button type="button" onClick={() => onJoinGroup?.(group)} style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 8px", borderRadius: 8, border: `1px solid ${C.gold600}`, background: "linear-gradient(135deg, #F6D374, #D9A536)", color: C.navy900, fontSize: 11, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 6px rgba(217,165,54,0.24)" }}>
                <UserPlus size={11} /> Rejoindre
              </button>
              <button type="button" onClick={() => onDismiss?.(group.id)} style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "5px 8px", borderRadius: 8, border: `1px solid ${C.line}`, background: "transparent", color: C.muted, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                <X size={10} /> Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MobileFeedShortcuts({ activeView, onNavigate }) {
  const shortcuts = [
    { id: "my-posts", icon: FileText, label: "Mes posts" },
    { id: "my-articles", icon: BookOpen, label: "Articles" },
    { id: "saved", icon: Bookmark, label: "Enregistrés" },
    { id: "groups", icon: Users2, label: "Groupes" },
  ];

  return (
    <nav className="lynora-mobile-shortcuts" aria-label="Raccourcis du feed">
      {shortcuts.map(({ id, icon: Icon, label }) => (
        <button key={id} type="button" className={activeView === id ? "is-active" : ""} onClick={() => onNavigate(id)}>
          <Icon size={17} strokeWidth={2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function PageSuggestionsGrid({ pages, followedPageIds, onFollowPage, onNavigate, onDismiss, dismissedIds = [] }) {
  const displayedPages = pages.filter((page) => !dismissedIds.includes(page.id)).slice(0, 10);
  const trackRef = useRef(null);

  const openPage = (pageId) => {
    if (!pageId) return;
    onNavigate?.("company", { pageId });
  };

  const scrollPages = (direction) => {
    const container = trackRef.current;
    if (!container) return;
    const amount = Math.max(container.clientWidth * 0.8, 220);
    container.scrollBy({ left: direction === "next" ? amount : -amount, behavior: "smooth" });
  };

  if (displayedPages.length === 0) return null;

  return (
    <Card style={{ padding: "18px 16px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Building2 size={18} color={C.gold600} />
        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>Pages suggérées</span>
        <span style={{ fontSize: 12, color: C.mutedLight, marginLeft: "auto" }}>{displayedPages.length}</span>
        <button type="button" onClick={() => onNavigate?.("company-grid", { tab: "discover" })} style={{ border: 0, background: "none", color: "#0a66c2", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>Voir tout</button>
      </div>

      <div style={{ position: "relative" }}>
        <button type="button" aria-label="Pages précédentes" onClick={() => scrollPages("prev")} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.08)", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)", color: "#65676b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, zIndex: 2, transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#f2f3f5"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}>
          <ArrowLeft size={16} strokeWidth={2.2} />
        </button>
        <button type="button" aria-label="Pages suivantes" onClick={() => scrollPages("next")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.08)", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)", color: "#65676b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, zIndex: 2, transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#f2f3f5"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}>
          <ArrowRight size={16} strokeWidth={2.2} />
        </button>

        <div ref={trackRef} className="feed-page-suggestions-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 180px))", justifyContent: "space-between", gap: 10, width: "100%", maxWidth: "100%", margin: 0, overflow: "visible", padding: "0 0 8px", scrollBehavior: "smooth", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {displayedPages.map((page) => {
          const isOwnPage = page.isOwn;
          const isFollowed = !isOwnPage && followedPageIds.includes(page.id);
          const avatarUrl = page.avatarUrl || page.logoUrl || page.image || page.photoUrl || null;
          const coverUrl = page.coverUrl || page.cover || page.bannerUrl || page.backgroundImage || null;

          return (
            <div 
              key={page.id} 
              className="feed-page-suggestion-card" 
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 12,
                border: `1px solid ${C.line}`,
                background: C.white,
                overflow: "hidden",
                transition: "all 0.2s ease",
                minWidth: 0,
                width: 180,
                maxWidth: 180,
                flex: "none",
                justifySelf: "stretch",
                boxShadow: "0 2px 8px rgba(15,51,82,0.05)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(15,51,82,0.12)"; e.currentTarget.style.borderColor = C.gold400; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = C.line; }}
            >
              <button type="button" aria-label={`Voir la page ${page.name}`} onClick={() => openPage(page.id)} style={{ width: "100%", height: 70, border: "none", background: coverUrl ? `linear-gradient(180deg, rgba(15, 51, 82, 0.12), rgba(15, 51, 82, 0.32)), url(${coverUrl}) center/cover no-repeat` : `linear-gradient(135deg, ${C.navy700} 0%, ${C.navy900} 100%)`, padding: 0, cursor: "pointer", position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    bottom: -16,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 2,
                  }}
                >
                  <Avatar 
                    initials={page.initials || (page.name || "P").slice(0, 2).toUpperCase()} 
                    size={46} 
                    imgUrl={avatarUrl}
                  />
                </div>
              </button>

              <div style={{ padding: "22px 8px 8px", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <button type="button" onClick={() => openPage(page.id)} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", width: "100%", fontSize: 13.5, fontWeight: 800, color: C.ink, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {page.name}
                </button>
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {page.title}
                </div>
              </div>

              <div style={{ padding: "0 8px 8px", width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  onClick={() => isOwnPage ? undefined : onFollowPage?.(page.id)}
                  disabled={isOwnPage || isFollowed}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: isOwnPage || isFollowed ? `1.5px solid ${C.line}` : "none",
                    background: isOwnPage ? C.navy50 : isFollowed ? C.navy50 : C.gold600,
                    color: isOwnPage ? C.muted : isFollowed ? C.muted : C.white,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: isOwnPage || isFollowed ? "default" : "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { if (!isOwnPage && !isFollowed) { e.currentTarget.style.background = C.gold500; } }}
                  onMouseLeave={(e) => { if (!isOwnPage && !isFollowed) { e.currentTarget.style.background = C.gold600; } }}
                >
                  {isOwnPage ? "Voir" : isFollowed ? <><Check size={10} /> Suivi</> : <>Suivre</>}
                </button>
                <button
                  type="button"
                  onClick={() => onDismiss?.(page.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    padding: "5px 8px",
                    borderRadius: 8,
                    border: `1px solid ${C.line}`,
                    background: "transparent",
                    color: C.muted,
                    fontSize: 9.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <X size={10} /> Supprimer
                </button>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  PUB SIDEBAR — composants performants et modernes                   */
/* ------------------------------------------------------------------ */

/* Seuil de repli du texte de pub sidebar ( caracteres ). */
const SIDEBAR_AD_TEXT_LIMIT = 130;

/**
 * Texte de publicite sidebar avec repli "Voir plus / Voir moins".
 * Memoise : ne re-render que si la description change.
 * Hover du bouton gere par CSS (.sidebar-ad-toggle) -> pas de manip DOM.
 */
const SidebarAdText = React.memo(function SidebarAdText({ description, isLong, preview }) {
  const [expanded, setExpanded] = useState(false);
  const handleToggle = useCallback(() => setExpanded((v) => !v), []);
  if (!description) return null;
  const ellipsis = "\u2026";
  const displayed = isLong && !expanded ? `${preview}${ellipsis}` : description;
  return (
    <div className="sidebar-ad-text" style={{ padding: "0 14px 8px", color: C.ink, fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {displayed}
      {isLong && (
        <button
          type="button"
          onClick={handleToggle}
          className="sidebar-ad-toggle"
          aria-expanded={expanded}
          style={{
            display: expanded ? "block" : "inline",
            marginTop: expanded ? 4 : 0,
            marginLeft: expanded ? 0 : 5,
            background: "none", border: "none", padding: 0, cursor: "pointer",
            color: C.navy800, fontWeight: 700, fontSize: 13, textDecoration: "none",
          }}
        >
          {expanded ? "Voir moins" : "Voir plus"}
        </button>
      )}
    </div>
  );
});

/**
 * Image de publicite pleine largeur avec lazy-loading, decode async,
 * placeholder navy et fallback onError. Memoisee.
 */
const SidebarAdMedia = React.memo(function SidebarAdMedia({ mediaUrl, initials, onClick }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const showImage = mediaUrl && !errored;
  const handleClick = useCallback(() => onClick?.(), [onClick]);
  return (
    <div
      className="sidebar-ad-media"
      style={{
        position: "relative", width: "100%", aspectRatio: "1.91 / 1",
        background: navyGrad, cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
      }}
      onClick={handleClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      {/* Placeholder navy visible jusqu'au chargement */}
      {!loaded && !errored && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", fontWeight: 800, fontSize: 28, fontFamily: "'Sora', sans-serif" }}>
          <Loader2 size={22} className="sidebar-ad-spin" />
        </div>
      )}
      {showImage ? (
        <img
          src={mediaUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", opacity: loaded ? 1 : 0,
            transition: "opacity 320ms cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 800, fontSize: 30, fontFamily: "'Sora', sans-serif" }}>
          {initials || "L"}
        </div>
      )}
    </div>
  );
});

/**
 * Carte de publicite sidebar - structure Facebook, couleurs navy/dore.
 * Memoisee : ne re-render que si l'ad ou les callbacks changent.
 * Tous les calculs (domain, whatsapp, preview) sont memoises.
 */
const SidebarAdCard = React.memo(function SidebarAdCard({ ad, index, onAdClick, onAdNavigate, onAdWhatsapp, onMessage, currentUserId }) {
  const adWebsite = useMemo(() => externalUrl(ad.website), [ad.website]);
  const adWhatsappUrl = useMemo(
    () => (ad.whatsapp ? `https://wa.me/${String(ad.whatsapp).replace(/\D/g, "")}` : null),
    [ad.whatsapp]
  );
  const adDomain = useMemo(() => {
    if (!adWebsite) return "lynoralink.com";
    try { return new URL(adWebsite).hostname.replace(/^www\./, ""); } catch { return "lynoralink.com"; }
  }, [adWebsite]);

  const adDescription = ad.description || "";
  const adDescriptionIsLong = adDescription.length > SIDEBAR_AD_TEXT_LIMIT;
  const adDescriptionPreview = useMemo(
    () => (adDescriptionIsLong ? adDescription.slice(0, SIDEBAR_AD_TEXT_LIMIT - 3).replace(/\s+\S*$/, "").trimEnd() : adDescription),
    [adDescription, adDescriptionIsLong]
  );
  const adCtaLabel = ad.isDemo ? "Aperçu démo" : "Découvrir";

  const handleCardClick = useCallback(() => onAdClick(ad, "click"), [ad, onAdClick]);
  const handleMediaClick = useCallback(() => { onAdClick(ad, "click"); onAdNavigate?.(); }, [ad, onAdClick, onAdNavigate]);
  const handleCtaClick = useCallback((event) => { event.stopPropagation(); onAdClick(ad, "click"); }, [ad, onAdClick]);
  const handleCtaNavigate = useCallback((event) => { event.stopPropagation(); onAdClick(ad, "click"); onAdNavigate?.(); }, [ad, onAdClick, onAdNavigate]);
  const handleWhatsappClick = useCallback((event) => { event.stopPropagation(); onAdClick(ad, "conversion"); }, [ad, onAdClick]);
  const handleMessageClick = useCallback((event) => { event.stopPropagation(); onAdClick(ad, "click"); onMessage?.(ad); }, [ad, onAdClick, onMessage]);

  const ctaStyle = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
    padding: "6px 12px", borderRadius: 7, border: `1px solid ${C.gold600}`,
    fontSize: 12.5, lineHeight: 1, fontWeight: 700, whiteSpace: "nowrap",
    color: C.navy800, background: C.gold400,
    boxShadow: "0 1px 2px rgba(15,51,82,0.10)",
    transition: "background 180ms cubic-bezier(0.4,0,0.2,1), color 180ms cubic-bezier(0.4,0,0.2,1), transform 120ms cubic-bezier(0.4,0,0.2,1)",
    textDecoration: adWebsite ? "none" : undefined, cursor: "pointer",
  };

  return (
    <article
      className="sidebar-sponsored-item sidebar-ad-card"
      style={{ display: "flex", flexDirection: "column", borderTop: index === 0 ? "none" : `1px solid ${C.line}` }}
    >
      <div className="sidebar-ad-header" style={{ display: "flex", alignItems: "center", padding: "11px 14px 8px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.gold600, fontSize: 11.5, fontWeight: 700 }}>
          <span>Sponsorisé</span>
          <SponsoredInfo />
        </div>
      </div>

      {/* Texte principal au-dessus de l'image ( Voir plus / Voir moins ) */}
      <SidebarAdText description={adDescription} isLong={adDescriptionIsLong} preview={adDescriptionPreview} />

      {/* Image pleine largeur - lazy, async, placeholder, fallback */}
      <SidebarAdMedia mediaUrl={ad.mediaUrl} initials={ad.initials} onClick={handleMediaClick} />

      {/* Ligne headline + domaine + CTA facon Facebook */}
      <div className="sidebar-ad-linkrow" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", background: C.navy50, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, transition: "background 180ms cubic-bezier(0.4,0,0.2,1)" }}>
        {adWebsite ? (
          <a href={adWebsite} target="_blank" rel="noreferrer" onClick={handleCtaClick} style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 2, color: "inherit", textDecoration: "none" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ad.title || "Publicité"}</span>
            <span style={{ fontSize: 11.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: "underline" }}>{adDomain}</span>
          </a>
        ) : (
          <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ad.title || "Publicité"}</span>
            <span style={{ fontSize: 11.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{adDomain}</span>
          </div>
        )}
        {adWebsite ? (
          <a className="sidebar-sponsored-cta" href={adWebsite} target="_blank" rel="noreferrer" onClick={handleCtaClick} style={ctaStyle}>
            {adCtaLabel} <ExternalLink size={12} style={{ flexShrink: 0 }} />
          </a>
        ) : (
          <button className="sidebar-sponsored-cta" type="button" onClick={handleCtaNavigate} style={ctaStyle}>
            {adCtaLabel} <ArrowRight size={12} style={{ flexShrink: 0 }} />
          </button>
        )}
      </div>

      {/* Action secondaire discrete ( WhatsApp ) */}
      {(adWhatsappUrl || (onMessage && ad.authorId && String(ad.authorId) !== String(currentUserId || ""))) && (
        <div className="sidebar-sponsored-secondary" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px 10px" }}>
          {onMessage && ad.authorId && String(ad.authorId) !== String(currentUserId || "") && <button type="button" aria-label="Envoyer un message" title="Envoyer un message" onClick={handleMessageClick} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 7, border: `1px solid ${C.line}`, background: C.white, color: C.navy800, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <MessageCircle size={14} /> Message
          </button>}
          {adWhatsappUrl && <a href={adWhatsappUrl} target="_blank" rel="noreferrer" aria-label="Contacter sur WhatsApp" title="Contacter sur WhatsApp" onClick={handleWhatsappClick} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 7, border: `1px solid ${C.line}`, background: C.white, color: "#159447", fontSize: 12, fontWeight: 700, textDecoration: "none", cursor: "pointer", transition: "opacity 160ms ease" }}>
            <FontAwesomeIcon icon={faWhatsapp} /> WhatsApp
          </a>}
        </div>
      )}
    </article>
  );
});

/*  SIDEBAR DROITE — SUGGESTIONS + ACTUALITÉS + GROUPES RECOMMANDÉS    */
/* ------------------------------------------------------------------ */
function RightSidebar({ ads, groups, currentUserId, onSelectTrend, suggestions, pageSuggestions = [], connectedIds, followedPageIds = [], pendingRequestIds, onConnect, onCancel, onFollowPage, onJoinGroup, onNavigate, onOpenProfile, onMessage, accountMode = "personal", birthdays = [] }) {
  const isPageMode = accountMode === "company";
  const [joiningGroupId, setJoiningGroupId] = useState(null);
  const openSuggestions = () => onNavigate?.(isPageMode ? "company-grid" : "network", { tab: "suggestions" });
  const displayedAds = ads.slice(0, 3);
  const birthdayPeople = useMemo(() => {
    if (!Array.isArray(birthdays)) return [];

    const parseDate = (value) => {
      if (!value) return null;
      const date = new Date(`${value}T12:00:00`);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const today = new Date();

    return birthdays
      .map((person) => {
        const birthDate = parseDate(person?.birthDate || person?.dateOfBirth);
        if (!birthDate) return null;
        const isToday = birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate();
        if (!isToday) return null;
        return {
          id: person?.id || person?.userId,
          name: person?.name || person?.fullName || "Une personne",
          image: person?.image || person?.avatarUrl || person?.photoUrl || null,
          initials: person?.initials || (person?.name || person?.fullName || "?").slice(0, 2).toUpperCase(),
          nextBirthday: birthDate,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.nextBirthday - b.nextBirthday);
  }, [birthdays]);

  const birthdaySummary = birthdayPeople.length > 0 ? (() => {
    const firstPerson = birthdayPeople[0];
    const extraCount = Math.max(0, birthdayPeople.length - 1);
    if (!firstPerson) return null;
    if (extraCount === 0) {
      return `C'est l'anniversaire de ${firstPerson.name}`;
    }
    return `C'est l'anniversaire de ${firstPerson.name} et ${extraCount} autre${extraCount > 1 ? 's' : ''} personne${extraCount > 1 ? 's' : ''}`;
  })() : null;
  const [adRotation, setAdRotation] = useState(0);
  const sidebarAds = displayedAds.length > 0
    ? [displayedAds[adRotation % displayedAds.length]]
    : [];
  const trackAd = (ad, event) => {
    if (!ad?.campaignId) return;
    fetchBackendApi("/api/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: ad.campaignId, event }) }).catch(() => {});
  };
  useEffect(() => {
    sidebarAds.forEach((ad) => trackAd(ad, "impression"));
  }, [sidebarAds.map((ad) => ad.id).join(",")]);
  useEffect(() => {
    setAdRotation(0);
  }, [displayedAds.map((ad) => ad.id).join(",")]);
  useEffect(() => {
    if (displayedAds.length <= 1) return undefined;
    const rotationTimer = window.setInterval(() => {
      setAdRotation((current) => (current + 1) % displayedAds.length);
    }, 30000);
    return () => window.clearInterval(rotationTimer);
  }, [displayedAds.length, displayedAds.map((ad) => ad.id).join(",")]);
  const suggestedGroups = groups
    .filter((group) => !normalizeMembersList(group?.members).some((member) => String(member?.id) === String(currentUserId)))
    .slice(0, 3);
  const displaySuggestions = suggestions
    .filter((suggestion) => !isPageMode || suggestion.type === "company")
    .slice(0, 4);
  const displayPageSuggestions = pageSuggestions.slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ---- 1. Suggestions pour vous (TOP) ---- */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        <Card style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>{isPageMode ? "Pages à suivre" : "Suggestions pour vous"}</span>
            <button onClick={openSuggestions} style={{ background: "none", border: "none", color: "#0a66c2", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>
              Voir tout
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {displaySuggestions.length === 0 ? (
              <div style={{ fontSize: 12, color: C.mutedLight, lineHeight: 1.5 }}>
                {isPageMode ? "Aucune page à suivre pour le moment." : "Aucune suggestion pour le moment."}
              </div>
            ) : displaySuggestions.map((s) => {
              const isCompany = s.type === "company";
              const isConnected = connectedIds.includes(s.id);
              const isPending = pendingRequestIds.includes(s.id);
              const avatarUrl = s.avatarUrl || s.image || s.logoUrl || s.photoUrl || null;
              const openProfile = () => !isCompany && onOpenProfile?.(s.userId ?? s.id);

              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "4px 0",
                  }}
                >
                  {!isCompany ? (
                    <button type="button" aria-label={`Voir le profil de ${s.name}`} onClick={openProfile} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
                      <Avatar initials={s.initials || (s.name || "?").slice(0, 2).toUpperCase()} size={38} imgUrl={avatarUrl} />
                    </button>
                  ) : (
                    <Avatar initials={s.initials || (s.name || "?").slice(0, 2).toUpperCase()} size={38} imgUrl={avatarUrl} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {!isCompany ? (
                      <button type="button" onClick={openProfile} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", width: "100%", textAlign: "left", fontSize: 12.5, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.name}
                      </button>
                    ) : (
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.name}
                      </div>
                    )}
                    <div style={{ fontSize: 10.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.title || (isCompany ? "Entreprise" : "Professionnel")}
                    </div>
                  </div>
                  <button
                    onClick={() => isPending ? onCancel(s.id) : onConnect(s.id)}
                    disabled={isConnected}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 84,
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(15,51,82,0.12)",
                      background: isConnected ? C.navy50 : isPending ? C.white : C.gold600,
                      color: isConnected ? C.muted : isPending ? C.danger : C.white,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: isConnected ? "default" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {isConnected ? (isPageMode ? "Suivi" : "Connecté") : isPending ? "Annuler" : (isPageMode ? "Suivre" : "Se connecter")}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {!isPageMode && birthdaySummary && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
          <Card style={{ padding: 0, overflow: "hidden", background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,247,227,0.95) 100%)", border: "1px solid rgba(217, 165, 54, 0.28)", boxShadow: "0 12px 32px rgba(217,165,54,0.12)" }}>
            <div style={{ padding: "16px 16px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 12, background: "linear-gradient(135deg, #F9D98A 0%, #E2A937 100%)", color: "#3F2D06", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px rgba(217,165,54,0.25)" }}>
                    <Gift size={15} />
                  </div>
                  <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 15, color: C.ink }}>Anniversaire</span>
                </div>
                <button onClick={() => onNavigate?.("network", { tab: "anniversaires" })} style={{ background: "none", border: "none", color: "#0a66c2", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                  Voir tout
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 999, background: "rgba(217, 165, 54, 0.14)", color: C.gold600, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  <Sparkles size={11} /> Aujourd'hui
                </span>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{birthdayPeople.length} personne{birthdayPeople.length > 1 ? "s" : ""}</span>
              </div>

              <div style={{ fontSize: 14, lineHeight: 1.55, color: C.ink, fontWeight: 700, marginBottom: 12 }}>{birthdaySummary}</div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {birthdayPeople.slice(0, 3).map((person) => (
                  <div key={person.id} title={person.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 6px", borderRadius: 999, background: "rgba(255,255,255,0.66)", border: "1px solid rgba(26,37,58,0.06)", boxShadow: "0 4px 10px rgba(15,51,82,0.04)" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(255,255,255,0.9)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                      <Avatar initials={person.initials} size={26} imgUrl={person.image} radius="50%" />
                    </div>
                    <span style={{ fontSize: 11.5, color: C.ink, fontWeight: 700, maxWidth: 90, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{person.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {!isPageMode && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
          <Card style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>Pages à suivre</span>
              <button onClick={() => onNavigate?.("company-grid", { tab: "discover" })} style={{ background: "none", border: "none", color: "#0a66c2", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                Voir tout
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {displayPageSuggestions.length === 0 ? (
                <div style={{ fontSize: 12, color: C.mutedLight, lineHeight: 1.5 }}>Aucune page à suivre pour le moment.</div>
              ) : displayPageSuggestions.map((page) => {
                const isOwnPage = page.isOwn;
                const isFollowed = !isOwnPage && followedPageIds.includes(page.id);
                return (
                  <div key={page.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar initials={page.initials || page.name.slice(0, 2).toUpperCase()} size={40} imgUrl={page.image} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{page.name}</div>
                      <div style={{ fontSize: 11.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{page.title}</div>
                    </div>
                    <button
                      onClick={() => isOwnPage ? onNavigate?.("company") : onFollowPage?.(page.id)}
                      disabled={isFollowed}
                      style={{
                        display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
                        padding: "6px 14px", borderRadius: 20,
                        border: `1.5px solid ${isFollowed ? C.line : "#0a66c2"}`,
                        background: isFollowed ? C.navy50 : "transparent",
                        color: isFollowed ? C.muted : "#0a66c2",
                        cursor: isFollowed ? "default" : "pointer", flexShrink: 0,
                      }}
                    >
                      {isOwnPage ? "Voir" : isFollowed ? <><Check size={13} /> Suivi</> : "+ Suivre"}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ---- 2. Publicités sponsorisées (MIDDLE) ---- */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 10px" }}>
          <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>Publicités sponsorisées</span>
          <button onClick={() => onNavigate && onNavigate("feed")} style={{ background: "none", border: "none", color: C.navy800, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            Voir tout
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {sidebarAds.length === 0 ? (
            <div style={{ padding: "8px 14px 14px", color: C.mutedLight, fontSize: 12, lineHeight: 1.45 }}>Aucune publicité disponible pour le moment.</div>
          ) : (
            sidebarAds.map((ad, adIndex) => (
              <SidebarAdCard
                key={ad.id}
                ad={ad}
                index={adIndex}
                onAdClick={trackAd}
                onAdNavigate={() => onNavigate?.("feed")}
                onAdWhatsapp={trackAd}
                onMessage={onMessage}
                currentUserId={currentUserId}
              />
            ))
          )}
        </div>
        <div style={{ marginTop: 0, padding: "9px 14px", fontSize: 11, color: C.mutedLight, display: "flex", alignItems: "center", gap: 4, borderTop: `1px solid ${C.line}` }}>
          <Info size={11} />
          Contenu mis en avant par LynoraLink
        </div>
      </Card>

      {/* ---- 3. Les groupes recommandés (BOTTOM) ---- */}
      <Card style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>Les groupes recommandés</span>
          <button onClick={() => onNavigate && onNavigate("groups")} style={{ background: "none", border: "none", color: "#0a66c2", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            Voir tout
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {suggestedGroups.length === 0 ? (
            <div style={{ fontSize: 12, color: C.mutedLight, lineHeight: 1.5 }}>
              Aucun groupe à découvrir pour le moment.
            </div>
          ) : suggestedGroups.map((grp) => (
            <div key={grp.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                aria-label={`Ouvrir le groupe ${grp.name}`}
                onClick={() => onNavigate?.("groups", { groupId: grp.id })}
                style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  border: 0, padding: 0,
                  background: grp.coverGradient || navyGrad,
                  backgroundImage: grp.coverUrl ? `linear-gradient(180deg, rgba(14,31,23,.08), rgba(14,31,23,.38)), url(${grp.coverUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.white, fontWeight: 700, fontSize: 11,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {!grp.coverUrl && (grp.emoji || grp.name.slice(0, 2).toUpperCase())}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <button type="button" onClick={() => onNavigate?.("groups", { groupId: grp.id })} style={{ display: "block", width: "100%", padding: 0, border: 0, background: "none", color: C.ink, fontSize: 13, fontWeight: 600, textAlign: "left", cursor: "pointer" }}>{grp.name}</button>
                <div style={{ fontSize: 11.5, color: C.muted }}>{grp.memberCount ?? grp.members.length} membre{(grp.memberCount ?? grp.members.length) > 1 ? "s" : ""}</div>
              </div>
              <button
                type="button"
                style={{
                  display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
                  padding: "6px 14px", borderRadius: 20,
                  border: "1.5px solid #0a66c2",
                  background: "transparent", color: "#0a66c2",
                  cursor: joiningGroupId === grp.id ? "wait" : "pointer", flexShrink: 0, transition: "all 0.15s ease",
                }}
                disabled={joiningGroupId === grp.id}
                onClick={async () => {
                  if (joiningGroupId === grp.id) return;
                  setJoiningGroupId(grp.id);
                  try {
                    await onJoinGroup?.(grp);
                  } finally {
                    setJoiningGroupId(null);
                  }
                }}
                onMouseEnter={(e) => { if (joiningGroupId !== grp.id) { e.currentTarget.style.background = "#0a66c2"; e.currentTarget.style.color = C.white; } }}
                onMouseLeave={(e) => { if (joiningGroupId !== grp.id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#0a66c2"; } }}
              >
                {joiningGroupId === grp.id ? "En cours..." : "Rejoindre"}
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DÉCLENCHEUR DE COMPOSITION (au-dessus du fil)                     */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  BARRE D'OUTILS DE SAISIE POUR L'ÉDITEUR D'ARTICLE                 */
/* ------------------------------------------------------------------ */
function ToolbarBtn({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", color: C.ink, cursor: "pointer" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon size={16} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  VUE COMPLÈTE D'UNE PUBLICATION (fil principal & groupes)          */
/* ------------------------------------------------------------------ */
function PostViewer({ post, onClose, onToggleLike, onToggleBookmark, onAddComment, onShare, backLabel = "Retour au fil", contextLabel }) {
  const [commentDraft, setCommentDraft] = useState("");

  const submitComment = () => {
    if (!commentDraft.trim()) return;
    onAddComment(post.id, commentDraft.trim());
    setCommentDraft("");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: C.navy50, zIndex: 100, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, background: C.white, borderBottom: `1px solid ${C.line}`, zIndex: 5 }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, padding: "14px 20px" }}>
          <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, background: C.navy50, border: "none", borderRadius: 10, padding: "7px 12px", cursor: "pointer", color: C.navy800, fontWeight: 600, fontSize: 12.5 }}>
            <ArrowLeft size={15} /> {backLabel}
          </button>
          <div style={{ flex: 1 }} />
          <LogoBadge size={28} />
        </div>
      </div>

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px 80px" }}>
        <Card style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "18px 18px 10px" }}>
            <Avatar initials={post.initials} size={46} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{post.author}</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 1 }}>{post.title}</div>
              <div style={{ fontSize: 11.5, color: C.mutedLight, marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                <RelativeTime date={post.time} /> · <Globe size={10} />
                {contextLabel && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: C.line }}>·</span> dans <span style={{ color: C.navy800, fontWeight: 600 }}>{contextLabel}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {post.text && <div style={{ padding: "0 18px 16px", fontSize: 15.5, color: C.ink, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{post.text}</div>}

          {post.media && (
            <div style={{ margin: "0 0 4px" }}>
              {post.media.url ? (
                post.media.type === "video" ? (
                  <video src={post.media.url} controls style={{ width: "100%", maxHeight: 460, display: "block", background: "#000" }} />
                ) : (
                  <img src={post.media.url} alt="Media de la publication" style={{ width: "100%", maxHeight: 460, objectFit: "cover", display: "block" }} />
                )
              ) : (
                <div style={{ height: 260, background: navyGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "rgba(255,255,255,0.9)" }}>
                  {post.media.type === "video" ? <PlayCircle size={44} color={C.gold400} /> : <ImageIcon size={40} color={C.gold400} />}
                  <span style={{ fontSize: 12.5, fontWeight: 600, padding: "0 24px", textAlign: "center" }}>{post.media.label}</span>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", fontSize: 12, color: C.muted }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {post.likes > 0 && (
                <>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: C.white, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/emoji_picker/j'aime.png" alt="J'aime" style={{ width: 14, height: 14, objectFit: "contain", borderRadius: 4 }} />
                  </span>
                  {post.likes}
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {post.comments.length > 0 && <span>{post.comments.length} commentaires</span>}
              {post.shares > 0 && <span>{post.shares} partages</span>}
            </div>
          </div>

          <div style={{ height: 1, background: C.line, margin: "0 18px" }} />

          <div style={{ display: "flex", padding: "4px 10px" }}>
            <ActionBtn icon={ThumbsUp} label="J'aime" active={post.liked} activeColor={C.gold600} onClick={() => onToggleLike(post.id)} />
            <ActionBtn icon={MessageCircle} label="Commenter" onClick={() => {}} />
            <ActionBtn icon={Share2} label="Partager" onClick={() => onShare(post.id)} />
            <ActionBtn icon={Bookmark} label="Enregistrer" active={post.bookmarked} activeColor={C.navy800} onClick={() => onToggleBookmark(post.id)} />
          </div>
        </Card>

        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, margin: "22px 0 14px" }}>
          {post.comments.length} commentaire{post.comments.length > 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
          {post.comments.length === 0 && (
            <div style={{ fontSize: 12.5, color: C.mutedLight }}>Soyez le premier ou la première à commenter cette publication.</div>
          )}
          {post.comments.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 9 }}>
              <Avatar initials={c.initials} size={32} />
              <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 14, padding: "8px 13px", flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{c.author}</div>
                <div style={{ fontSize: 13, color: C.ink, marginTop: 1 }}>{c.text}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
          <Avatar initials={CURRENT_USER.avatar} size={32} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", background: C.white, border: `1px solid ${C.line}`, borderRadius: 999, padding: "3px 4px 3px 14px" }}>
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder="Ajouter un commentaire..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13 }}
            />
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <button onClick={() => setShowEmoji((value) => !value)} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.muted }}>
                <Smile size={13} />
              </button>
              {showEmoji && (
                <div style={{ position: "absolute", bottom: 38, right: 0, zIndex: 20 }}>
                  <Emojipicker
                    emojis={["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥", "👏", "💡"]}
                    onSelect={(emoji) => {
                      setCommentDraft((current) => `${current}${emoji}`);
                      setShowEmoji(false);
                    }}
                    size={30}
                  />
                </div>
              )}
            </div>
            <button onClick={submitComment} disabled={!commentDraft.trim()} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: commentDraft.trim() ? C.navy800 : C.line, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: commentDraft.trim() ? "pointer" : "default" }}>
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Internal `PostCard` replaced by external `PostCard.jsx` component. */

function ActionBtn({ icon: Icon, label, onClick, active, activeColor = C.navy800 }) {
  return (
    <button
      onClick={onClick}
      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 0", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: active ? activeColor : C.muted, transition: "background 0.15s ease, color 0.15s ease" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon size={16} fill={active ? activeColor : "none"} />
      {label}
    </button>
  );
}

// Profile page removed — replaced by `ProfileLynoraLink` component.

function ProfileActivityItem({ item, onOpenArticle, onOpenPost }) {
  const isArticle = item?.isArticle;
  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ width: 26, height: 26, borderRadius: 999, background: C.navy50, display: "flex", alignItems: "center", justifyContent: "center", color: C.navy800 }}>
          {isArticle ? <BookOpen size={13} /> : <FileText size={13} />}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{isArticle ? "Article" : "Publication"}</span>
        <span style={{ fontSize: 11.5, color: C.mutedLight }}>{item.time}</span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{isArticle ? item.headline : item.text?.slice(0, 120)}</div>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{isArticle ? item.excerpt : item.text}</div>
      <button onClick={() => (isArticle ? onOpenArticle(item) : onOpenPost(item))} style={{ marginTop: 8, background: "none", border: "none", padding: 0, color: C.navy800, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
        Voir la publication
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 11px", fontSize: 13.5, color: C.ink, outline: "none" }} />
    </label>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 12, background: C.navy50, border: `1px solid ${C.line}` }}>
      <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>{value}</div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function StatBlock({ value, label }) {
  return (
    <div>
      <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 17, color: C.ink }}>{value}</div>
      <div style={{ fontSize: 11.5, color: C.muted }}>{label}</div>
    </div>
  );
}

// Settings page removed — replaced by `SettingsLynora` component.

function SectionTitle({ icon: Icon, label, danger }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Icon size={16} color={danger ? C.danger : C.navy800} />
      <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: danger ? C.danger : C.ink }}>{label}</span>
    </div>
  );
}

function SettingRow({ title, desc, checked, onChange, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: last ? "none" : `1px solid ${C.line}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{title}</div>
        <div style={{ fontSize: 11.5, color: C.mutedLight, marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE RÉSEAU                                                        */
/* ------------------------------------------------------------------ */
function NetworkPage() {
  return null;
}

/* ------------------------------------------------------------------ */
/*  PAGE MESSAGES                                                      */
/* ------------------------------------------------------------------ */
function MessagesPage({ conversations, activeId, onSelect, onChange, onSend, onOpenProfile, onOpenChatSettings, onNewConversation, onClose, loading, mobile, directConversation = false }) {
  const [localConversations, setLocalConversations] = useState(conversations);

  useEffect(() => {
    setLocalConversations(conversations);
  }, [conversations]);

  const handleChange = (next) => {
    setLocalConversations(next);
    onChange?.(next);
  };

  return (
    <div style={{ height: "100%", background: C.white, borderRadius: mobile ? 0 : 24, overflow: "hidden", border: mobile ? "none" : `1px solid ${C.line}`, boxShadow: mobile ? "none" : "0 24px 80px rgba(15,51,82,0.14)" }}>
      <MessagingWidget
        conversations={localConversations}
        activeId={activeId}
        onChange={handleChange}
        onOpenChat={(id) => onSelect?.(id)}
        onNewConversation={onNewConversation}
        onOpenProfile={onOpenProfile}
        onOpenChatSettings={onOpenChatSettings}
        onSend={(conversationId, text, attachments, replyTo) => onSend?.(conversationId, text, attachments, replyTo)}
        autoOpen={true}
        directConversation={directConversation}
        showFab={false}
        onClose={onClose}
        nonBlocking={true}
        loading={loading}
        mobile={mobile}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Icon size={15} color={C.mutedLight} />
      <span style={{ fontSize: 12.5, color: C.muted, minWidth: 130 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.ink, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "50px 20px", color: C.mutedLight }}>
      <Icon size={30} />
      <span style={{ fontSize: 13 }}>{text}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE ÉLÉMENTS ENREGISTRÉS                                          */
/* ------------------------------------------------------------------ */
function MyPostsPage({ posts, currentUserId, companyPageId, isCompanyAccount = false, currentUser, onBack, onToggleLike, onSelectReaction, onToggleBookmark, onAddComment, onShare, onOpenArticle, onOpenPost }) {
  const mine = isCompanyAccount
    ? posts.filter((post) => String(post.companyPageId) === String(companyPageId))
    : posts.filter((post) => post.authorId === currentUserId || (!post.authorId && post.author === currentUser.name));

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 20px 60px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 24, color: C.ink, display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={20} color={C.gold600} /> Mes posts
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{mine.length} publication{mine.length > 1 ? "s" : ""} publiée{mine.length > 1 ? "s" : ""}.</div>
      </div>
      {mine.length === 0 ? (
        <EmptyState icon={FileText} text="Vous n'avez encore publié aucun post." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mine.map((post) => (
            <PostCard key={post.id} post={post} currentUser={currentUser} onToggleLike={onToggleLike} onSelectReaction={onSelectReaction} onToggleBookmark={onToggleBookmark} onAddComment={onAddComment} onShare={onShare} onOpenArticle={onOpenArticle} onOpenPost={onOpenPost} />
          ))}
        </div>
      )}
    </div>
  );
}

function MyArticlesPage({ posts, currentUserId, companyPageId, isCompanyAccount = false, currentUser, onToggleLike, onSelectReaction, onToggleBookmark, onAddComment, onShare, onOpenArticle, onOpenPost }) {
  const articles = posts.filter((post) => post.isArticle && (isCompanyAccount
    ? String(post.companyPageId) === String(companyPageId)
    : post.authorId === currentUserId || (!post.authorId && post.author === currentUser.name)));

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 20px 60px", display: "flex", flexDirection: "column", gap: 16 }} className="lynora-my-articles-content">
      <div style={{ padding: "20px", background: navyGrad, borderRadius: 16, color: C.white }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <BookOpen size={21} color={C.gold400} />
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 23, fontWeight: 800, margin: 0 }}>Mes articles</h1>
        </div>
        <div style={{ marginTop: 6, color: "rgba(255,255,255,.76)", fontSize: 13 }}>{articles.length} article{articles.length > 1 ? "s" : ""} publié{articles.length > 1 ? "s" : ""}.</div>
      </div>
      {articles.length === 0 ? (
        <EmptyState icon={BookOpen} text="Vous n'avez encore publié aucun article." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {articles.map((article) => (
            <PostCard key={article.id} post={article} currentUser={currentUser} onToggleLike={onToggleLike} onSelectReaction={onSelectReaction} onToggleBookmark={onToggleBookmark} onAddComment={onAddComment} onShare={onShare} onOpenArticle={onOpenArticle} onOpenPost={onOpenPost} />
          ))}
        </div>
      )}
    </div>
  );
}

function SavedSidebar({ activeFilter, onFilterChange, counts }) {
  const items = [
    { id: "all", label: "Toutes les publications", icon: Bookmark, count: counts.all },
    { id: "articles", label: "Articles", icon: BookOpen, count: counts.articles },
    { id: "media", label: "Photos et vidéos", icon: ImageIcon, count: counts.media },
  ];

  return (
    <aside className="lynora-saved-sidebar" style={{ position: "sticky", top: 116, background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(15,51,82,0.05)" }}>
      <div style={{ padding: "18px 16px 14px", background: navyGrad }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, color: C.white }}>
          <Bookmark size={18} color={C.gold400} />
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 800 }}>Enregistrements</span>
        </div>
        <div style={{ marginTop: 6, color: "rgba(255,255,255,.72)", fontSize: 11.5 }}>Retrouvez vos publications utiles.</div>
      </div>
      <nav className="lynora-saved-filters" aria-label="Filtres des enregistrements" style={{ padding: "8px 0" }}>
        {items.map(({ id, label, icon: Icon, count }) => (
          <button
            type="button"
            key={id}
            onClick={() => onFilterChange(id)}
            aria-current={activeFilter === id ? "page" : undefined}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", border: "none", borderLeft: `3px solid ${activeFilter === id ? C.gold600 : "transparent"}`, background: activeFilter === id ? C.navy50 : "transparent", color: activeFilter === id ? C.navy800 : C.ink, cursor: "pointer", textAlign: "left", fontSize: 12.5, fontWeight: activeFilter === id ? 700 : 500 }}
          >
            <Icon size={16} />
            <span style={{ flex: 1 }}>{label}</span>
            <span style={{ minWidth: 22, padding: "3px 5px", borderRadius: 999, background: activeFilter === id ? C.white : C.navy50, color: C.muted, textAlign: "center", fontSize: 10.5, fontWeight: 700 }}>{count}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function SavedPage({ posts, onBack, onToggleLike, onSelectReaction, onToggleBookmark, onAddComment, onShare, onOpenArticle, onOpenPost, onOpenReels, currentUser }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [savedReels, setSavedReels] = useState([]);
  const [savedReelsLoading, setSavedReelsLoading] = useState(true);
  const [savedReelsHasMore, setSavedReelsHasMore] = useState(false);
  const [savedReelsNextCursor, setSavedReelsNextCursor] = useState(null);

  const loadSavedReels = useCallback(async (cursor = null) => {
    setSavedReelsLoading(true);
    try {
      const query = new URLSearchParams({ savedOnly: "true", limit: "20" });
      if (cursor) query.set("cursor", cursor);
      const response = await fetchBackendApi(`/api/reels?${query.toString()}`);
      const data = response.ok ? await response.json() : { reels: [] };
      const nextReels = Array.isArray(data.reels) ? data.reels : [];
      setSavedReels((current) => cursor ? [...current, ...nextReels] : nextReels);
      setSavedReelsHasMore(Boolean(data.hasMore));
      setSavedReelsNextCursor(data.nextCursor || null);
    } catch {
      if (!cursor) setSavedReels([]);
    } finally {
      setSavedReelsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSavedReels();
  }, [loadSavedReels]);

  const saved = posts.filter((p) => p.bookmarked);
  const counts = {
    all: saved.length + savedReels.length,
    articles: saved.filter((post) => post.isArticle).length,
    media: saved.filter((post) => !post.isArticle && (post.media?.length || post.media?.url)).length + savedReels.length,
  };
  const visiblePosts = saved.filter((post) => activeFilter === "all" || (activeFilter === "articles" ? post.isArticle : !post.isArticle && (post.media?.length || post.media?.url)));
  const visibleReels = activeFilter === "articles" ? [] : savedReels;
  const hasSavedContent = visiblePosts.length > 0 || visibleReels.length > 0;
  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "20px 20px 60px", display: "grid", gridTemplateColumns: "250px minmax(0, 680px)", gap: 24, alignItems: "start" }} className="lynora-saved-content">
      <SavedSidebar activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={counts} />
      <main style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <div style={{ padding: "18px 20px", background: C.white, border: `1px solid ${C.line}`, borderRadius: 16 }}>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 23, color: C.ink }}>{activeFilter === "all" ? "Toutes les publications" : activeFilter === "articles" ? "Articles enregistrés" : "Photos et vidéos"}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 5 }}>{visiblePosts.length + visibleReels.length} publication{visiblePosts.length + visibleReels.length > 1 ? "s" : ""} dans cette sélection.</div>
        </div>
        {!hasSavedContent && !savedReelsLoading ? (
          <EmptyState icon={activeFilter === "articles" ? BookOpen : activeFilter === "media" ? ImageIcon : Bookmark} text={saved.length === 0 && savedReels.length === 0 ? "Vous n'avez encore rien enregistré. Cliquez sur « Enregistrer » sous une publication pour la retrouver ici." : "Aucune publication ne correspond à ce filtre."} />
      ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {visiblePosts.map((post) => (
              <PostCard key={post.id} post={post} group={post.group || null} currentUser={currentUser} onToggleLike={onToggleLike} onSelectReaction={onSelectReaction} onToggleBookmark={onToggleBookmark} onAddComment={onAddComment} onShare={onShare} onOpenArticle={onOpenArticle} onOpenPost={onOpenPost} />
            ))}
            {visibleReels.length > 0 && (
              <section style={{ padding: 18, background: C.white, border: `1px solid ${C.line}`, borderRadius: 16 }}>
                <h2 style={{ margin: "0 0 14px", fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 800, color: C.ink }}>Reels enregistrés</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                  {visibleReels.map((reel) => (
                    <button key={reel.id} type="button" onClick={() => onOpenReels?.(visibleReels)} style={{ position: "relative", height: 230, border: "none", borderRadius: 12, overflow: "hidden", padding: 0, cursor: "pointer", background: reel.poster ? `url(${reel.poster}) center/cover` : "linear-gradient(150deg, #1D2F5C, #0A1530)" }}>
                      {reel.videoUrl && !reel.poster && <video src={reel.videoUrl} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      <span style={{ position: "absolute", inset: "auto 0 0", padding: "28px 10px 10px", color: "#fff", textAlign: "left", fontSize: 12, fontWeight: 700, background: "linear-gradient(transparent, rgba(0,0,0,.78))" }}>{reel.caption || "Reel"}</span>
                    </button>
                  ))}
                </div>
                {savedReelsHasMore && (
                  <button type="button" onClick={() => loadSavedReels(savedReelsNextCursor)} disabled={savedReelsLoading} style={{ display: "block", width: "100%", marginTop: 14, padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 10, background: C.navy50, color: C.navy800, fontSize: 12.5, fontWeight: 700, cursor: savedReelsLoading ? "default" : "pointer", opacity: savedReelsLoading ? 0.6 : 1 }}>
                    {savedReelsLoading ? "Chargement..." : "Charger plus de Reels"}
                  </button>
                )}
              </section>
            )}
          </div>
      )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE PAGES SUIVIES                                                 */
/* ------------------------------------------------------------------ */
function FollowedPagesPage({ onBack }) {
  const [following, setFollowing] = useState(["pg1", "pg3"]);
  const toggleFollow = (id) => setFollowing((fs) => (fs.includes(id) ? fs.filter((f) => f !== id) : [...fs, id]));

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 20px 60px", display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.navy800, fontWeight: 600, fontSize: 13, padding: 0, alignSelf: "flex-start" }}>
        <ArrowLeft size={15} /> Retour au fil
      </button>
      <div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 24, color: C.ink }}>Pages suivies</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Suivez des entreprises pour ne rien manquer de leur actualité.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {COMPANY_PAGES.map((p) => (
          <Card key={p.id} style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: C.navy50, color: C.navy800, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, fontFamily: "'Sora', sans-serif", flexShrink: 0 }}>
              {p.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: C.mutedLight, marginTop: 1 }}>{p.category} · {p.followers.toLocaleString("fr-FR")} abonnés</div>
            </div>
            <button
              onClick={() => toggleFollow(p.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0,
                border: following.includes(p.id) ? `1.5px solid ${C.line}` : "none", background: following.includes(p.id) ? "transparent" : goldGrad,
                color: following.includes(p.id) ? C.muted : C.navy900,
              }}
            >
              {following.includes(p.id) ? <><Check size={13} /> Abonné</> : <><UserPlus size={13} /> Suivre</>}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE DÉDIÉE — ASSISTANT IA                                         */
/* ------------------------------------------------------------------ */
function AIAssistantPage({ onBack, actions, context, userName }) {
  const pageDescription = "Votre assistant pour comprendre et utiliser LynoraLink : posez vos questions, consultez votre activité et avancez étape par étape.";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 20px 60px", display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`@media (max-width: 640px) { .lm-ai-page-intro { display: none !important; } }`}</style>
      <button className="lm-ai-page-intro" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.navy800, fontWeight: 600, fontSize: 13, padding: 0, alignSelf: "flex-start" }}>
        <ArrowLeft size={15} /> Retour au fil
      </button>
      <div className="lm-ai-page-intro">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/assistant-icone.svg" alt="" width="24" height="24" style={{ display: "block" }} />
          <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 24, color: C.ink }}>Assistant IA LynoraLink</span>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          {pageDescription}
        </div>
      </div>
      <AIAgentAssistant variant="page" actions={actions} context={context} userName={userName} onBack={onBack} pageDescription={pageDescription} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE TENDANCE (résultats liés à un hashtag)                        */
/* ------------------------------------------------------------------ */
function TrendPage({ tag, posts, onBack, onToggleLike, onToggleBookmark, onAddComment, onShare, onOpenArticle, onOpenPost, currentUser }) {
  const keyword = tag.replace("#", "").toLowerCase();
  const matches = posts.filter((p) => {
    const haystack = `${p.text || ""} ${p.headline || ""} ${p.excerpt || ""} ${p.body || ""}`.toLowerCase();
    return haystack.includes(keyword) || keyword.split(/(?=[A-Z])/).some((w) => haystack.includes(w.toLowerCase()));
  });

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 20px 60px", display: "flex", flexDirection: "column", gap: 16 }} className="lynora-my-posts-content">
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.navy800, fontWeight: 600, fontSize: 13, padding: 0, alignSelf: "flex-start" }}>
        <ArrowLeft size={15} /> Retour au fil
      </button>
      <div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 22, color: C.navy800 }}>{tag}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{matches.length} publication{matches.length > 1 ? "s" : ""} de votre réseau sur cette tendance.</div>
      </div>
      {matches.length === 0 ? (
        <EmptyState icon={TrendingUp} text="Aucune publication de votre réseau ne mentionne cette tendance pour l'instant." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {matches.map((post) => (
            <PostCard key={post.id} post={post} currentUser={currentUser} onToggleLike={onToggleLike} onSelectReaction={selectReaction} onToggleBookmark={onToggleBookmark} onAddComment={onAddComment} onShare={onShare} onOpenArticle={onOpenArticle} onOpenPost={onOpenPost} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MODALE — CHANGEMENT DE MOT DE PASSE                                */
/* ------------------------------------------------------------------ */
function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const strength = next.length === 0 ? 0 : next.length < 6 ? 1 : next.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Faible", "Moyen", "Fort"][strength];
  const strengthColor = ["", C.danger, C.gold600, "#2E9E5B"][strength];

  const submit = () => {
    setError("");
    if (!current.trim()) return setError("Saisissez votre mot de passe actuel.");
    if (next.length < 6) return setError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
    if (next !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
    setDone(true);
    setTimeout(onClose, 1400);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,51,82,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: C.white, borderRadius: 16, padding: 22, boxShadow: "0 24px 60px rgba(15,51,82,0.35)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink }}>Changer le mot de passe</div>
          <button onClick={onClose} style={{ background: C.navy50, border: "none", borderRadius: 999, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.muted }}>
            <X size={13} />
          </button>
        </div>

        {done ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "18px 0 6px", color: "#2E9E5B", fontSize: 13, fontWeight: 600 }}>
            <CheckCircle2 size={16} /> Mot de passe mis à jour avec succès.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: C.muted, margin: "6px 0 16px", lineHeight: 1.5 }}>
              Choisissez un mot de passe d'au moins 6 caractères, différent de vos précédents mots de passe.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted }}>Mot de passe actuel</span>
                <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 11px" }}>
                  <input type={show ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} style={{ border: "none", outline: "none", fontSize: 13.5, color: C.ink, flex: 1 }} />
                </div>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted }}>Nouveau mot de passe</span>
                <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 11px" }}>
                  <input type={show ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} style={{ border: "none", outline: "none", fontSize: 13.5, color: C.ink, flex: 1 }} />
                  <button onClick={() => setShow((s) => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: C.mutedLight, display: "flex" }} type="button">
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {next.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i < strength ? strengthColor : C.line }} />
                    ))}
                    <span style={{ fontSize: 10.5, color: strengthColor, marginLeft: 4, fontWeight: 600 }}>{strengthLabel}</span>
                  </div>
                )}
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted }}>Confirmer le nouveau mot de passe</span>
                <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 11px" }}>
                  <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ border: "none", outline: "none", fontSize: 13.5, color: C.ink, flex: 1 }} />
                </div>
              </label>
            </div>

            {error && <div style={{ fontSize: 12, color: C.danger, marginTop: 10 }}>{error}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${C.line}`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
                Annuler
              </button>
              <button onClick={submit} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: goldGrad, color: C.navy900, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
                Mettre à jour
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  COMPOSANT RACINE — FEED LynoraLink                                */
/* ------------------------------------------------------------------ */
export default function LynoraFeed({ session, initialPosts, initialSearch = "" } = {}) {
  const isAdmin = Boolean(session?.user?.email && session.user.email.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase());

  // Synchronise l'utilisateur connecté avec l'interface réelle.
  useEffect(() => {
    const u = session?.user;
    if (!u) return;
    CURRENT_USER.name = u.name || CURRENT_USER.name;
    CURRENT_USER.title = u.title || CURRENT_USER.title;
    CURRENT_USER.avatar = (u.name || CURRENT_USER.name)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");
  }, [session]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedView = searchParams?.get("view") || "feed";

  const enablePushNotifications = async () => {
    if (!session?.user?.id || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    try {
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== "granted") return;
      const keyResponse = await fetchBackendApi("/api/push/vapid-public-key", { cache: "no-store" });
      if (!keyResponse.ok) return;
      const { publicKey } = await keyResponse.json();
      if (!publicKey) return;
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetchBackendApi("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subscription }),
      });
    } catch {
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      enablePushNotifications();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return undefined;
    const heartbeat = () => {
      fetchBackendApi("/api/presence", { method: "POST" }).catch(() => {});
    };
    heartbeat();
    const intervalId = window.setInterval(heartbeat, 30000);
    return () => window.clearInterval(intervalId);
  }, [session?.user?.id]);

  useEffect(() => {
    const unlock = () => unlockNotificationAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const rotateSuggestions = () => setSuggestionRotation((current) => (current + 1) % 3);
    rotateSuggestions();
    const rotationTimer = window.setInterval(rotateSuggestions, 10 * 60 * 1000);
    return () => window.clearInterval(rotationTimer);
  }, []);

  useEffect(() => {
    if (!session?.user?.id || typeof document === "undefined") return undefined;
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const cachedAppearance = (() => {
      try { return JSON.parse(localStorage.getItem("lynoralink:appearance") || "null"); } catch { return null; }
    })();
    let activeAppearance = cachedAppearance || {};
    const applyAppearance = (appearance = {}) => {
      activeAppearance = appearance;
      const theme = appearance.theme || "system";
      root.dataset.theme = theme === "system" ? (mediaQuery.matches ? "dark" : "light") : theme;
      root.dataset.density = appearance.density || "comfortable";
      root.dataset.fontScale = appearance.fontScale || "medium";
    };
    const handleAppearanceChange = (event) => {
      try { localStorage.setItem("lynoralink:appearance", JSON.stringify(event.detail)); } catch {}
      applyAppearance(event.detail);
    };
    const loadAppearance = async () => {
      if (cachedAppearance?.theme) return;
      try {
        const response = await fetchBackendApi("/api/settings", { cache: "no-store" });
        if (response.ok) {
          const appearance = (await response.json()).appearance;
          try { localStorage.setItem("lynoralink:appearance", JSON.stringify(appearance)); } catch {}
          applyAppearance(appearance);
        }
      } catch {
        applyAppearance();
      }
    };
    loadAppearance();
    window.addEventListener("lynora:appearance-updated", handleAppearanceChange);
    const handleSystemThemeChange = () => applyAppearance(activeAppearance);
    applyAppearance(cachedAppearance || {});
    mediaQuery.addEventListener?.("change", handleSystemThemeChange);
    return () => {
      window.removeEventListener("lynora:appearance-updated", handleAppearanceChange);
      mediaQuery.removeEventListener?.("change", handleSystemThemeChange);
    };
  }, [session?.user?.id]);

  const mergeOptimisticPosts = (currentPosts = [], serverPosts = []) => {
    if (!Array.isArray(serverPosts)) return currentPosts;

    const mergeReactionCounts = (currentReactions = {}, serverReactions = {}) => {
      const merged = { ...(serverReactions || {}) };
      Object.entries(currentReactions || {}).forEach(([key, value]) => {
        const serverValue = Number(merged[key] || 0);
        const currentValue = Array.isArray(value) ? value.length : Number(value || 0);
        merged[key] = Math.max(serverValue, currentValue);
      });
      return merged;
    };

    const byId = new Map((currentPosts || []).map((post) => [String(post.id), post]));
    const merged = serverPosts.map((serverPost) => {
      const key = String(serverPost?.id);
      const currentPost = byId.get(key);
      if (!currentPost) return serverPost;

      const currentComments = Array.isArray(currentPost.comments) ? currentPost.comments : [];
      const hasPendingComment = currentComments.some((comment) => {
        const id = String(comment?.id || "");
        return id.startsWith("c") || id.startsWith("r");
      });

      const mergedReactions = mergeReactionCounts(currentPost.reactions, serverPost.reactions);
      const pageId = serverPost.companyPageId ?? currentPost.companyPageId ?? null;

      return {
        ...serverPost,
        ...currentPost,
        companyPageId: pageId,
        authorType: pageId ? "page" : (serverPost.authorType ?? currentPost.authorType),
        ...(pageId ? {
          author: serverPost.author ?? currentPost.author,
          avatarUrl: serverPost.avatarUrl ?? currentPost.avatarUrl,
          initials: serverPost.initials ?? currentPost.initials,
          title: serverPost.title ?? currentPost.title,
          coverUrl: serverPost.coverUrl ?? currentPost.coverUrl,
        } : {}),
        comments: hasPendingComment ? currentComments : (Array.isArray(serverPost.comments) ? serverPost.comments : currentComments),
        likes: Math.max(Number(currentPost.likes ?? serverPost.likes ?? 0), Number(serverPost.likes ?? currentPost.likes ?? 0)),
        liked: currentPost.liked ?? serverPost.liked ?? false,
        reaction: currentPost.reaction ?? serverPost.reaction ?? null,
        bookmarked: currentPost.bookmarked ?? serverPost.bookmarked ?? false,
        shares: currentPost.shares ?? serverPost.shares ?? 0,
        reactions: Object.keys(mergedReactions).length ? mergedReactions : (serverPost.reactions || currentPost.reactions || {}),
        group: currentPost.group ?? serverPost.group,
      };
    });

    const remaining = (currentPosts || []).filter((post) => !serverPosts.some((serverPost) => String(serverPost.id) === String(post.id)));
    return [...merged, ...remaining];
  };

  const [posts, setPosts] = useState(
    initialPosts && initialPosts.length ? initialPosts : INITIAL_POSTS
  );
  const [profile, setProfile] = useState({
    ...DEFAULT_PROFILE,
    id: session?.user?.id || DEFAULT_PROFILE.id,
    name: session?.user?.name || DEFAULT_PROFILE.name,
    title: session?.user?.title || DEFAULT_PROFILE.title,
    email: session?.user?.email || DEFAULT_PROFILE.email,
    image: session?.user?.image || DEFAULT_PROFILE.image,
    avatarUrl: session?.user?.image || DEFAULT_PROFILE.avatarUrl,
    coverUrl: session?.user?.cover || DEFAULT_PROFILE.coverUrl,
    showOnlineStatus: true,
    isPlatformAdmin: isAdmin,
  });

  const profileAvatar = getUserAvatar(profile);

  useEffect(() => {
    let mounted = true;

    const syncProfile = async () => {
      try {
        const res = await fetchBackendApi('/api/profile');
        if (!res.ok) return;
        const json = await res.json();
        const user = json?.user;
        if (!user || !mounted) return;

        setProfile((current) => ({
          id: user.id || current.id,
          name: user.name || session?.user?.name || current.name,
          title: user.title || session?.user?.title || current.title,
          email: user.email || current.email,
          image: user.image || current.image || user.avatarUrl || current.avatarUrl,
          avatarUrl: user.avatarUrl || user.image || user.photoUrl || current.avatarUrl,
          photoUrl: user.photoUrl || user.image || current.photoUrl,
          cover: user.cover || current.cover,
          coverUrl: user.cover || user.coverUrl || current.coverUrl,
          bio: user.bio || current.bio,
          location: user.location || current.location,
          company: user.company || current.company,
          sector: user.sector || current.sector,
          isPlatformAdmin: Boolean(user.isPlatformAdmin) || current.isPlatformAdmin,
        }));
      } catch (e) {
        // ignore - fallback to session values
      }
    };

    if (session?.user) {
      syncProfile();
    }

    return () => {
      mounted = false;
    };
  }, [session?.user?.id, session?.user?.email]);

  useEffect(() => {
    if (!session?.user?.id) return undefined;
    let active = true;
    fetchBackendApi("/api/settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && data?.notifications?.showOnlineStatus !== undefined) {
          setProfile((current) => ({ ...current, showOnlineStatus: Boolean(data.notifications.showOnlineStatus) }));
        }
      })
      .catch(() => {});
    const handleSettingsUpdate = (event) => {
      if (typeof event.detail?.showOnlineStatus === "boolean") {
        setProfile((current) => ({ ...current, showOnlineStatus: event.detail.showOnlineStatus }));
        return;
      }
      fetchBackendApi("/api/settings", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => {
          if (active && data?.notifications?.showOnlineStatus !== undefined) {
            setProfile((current) => ({ ...current, showOnlineStatus: Boolean(data.notifications.showOnlineStatus) }));
          }
        })
        .catch(() => {});
    };
    window.addEventListener("lynora:settings-updated", handleSettingsUpdate);
    return () => { active = false; window.removeEventListener("lynora:settings-updated", handleSettingsUpdate); };
  }, [session?.user?.id]);

  const [modalMode, setModalMode] = useState(null);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [composerCompanyId, setComposerCompanyId] = useState(null);
  const [openArticleId, setOpenArticleId] = useState(null);
  const [openPostId, setOpenPostId] = useState(null);
  const [openPostOverride, setOpenPostOverride] = useState(null);
  const [reelsOpen, setReelsOpen] = useState(false);
  const [reelModalItems, setReelModalItems] = useState(null);
  const [reelPreview, setReelPreview] = useState([]);
  const [reelPreviewLoading, setReelPreviewLoading] = useState(false);
  const [reelPreviewHasMore, setReelPreviewHasMore] = useState(false);
  const [reelPreviewNextCursor, setReelPreviewNextCursor] = useState(null);
  const [reelPreviewIndex, setReelPreviewIndex] = useState(0);
  const [isMobileReelPreview, setIsMobileReelPreview] = useState(false);
  const reelPreviewSwipeRef = useRef(null);
  const reelPreviewSuppressClickRef = useRef(false);
  const [reelViewportWidth, setReelViewportWidth] = useState(390);
  const mobileReelCardWidth = isMobileReelPreview ? Math.min(Math.max(reelViewportWidth - 48, 260), 340) : 220;
  const [jobEngagementVersion, setJobEngagementVersion] = useState(0);
  const [openEventId, setOpenEventId] = useState(null);
  const [view, setView] = useState(requestedView); // feed | profile | settings | network | messages | notifications | company | saved | groups | pages | trend
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [showLogoutTransition, setShowLogoutTransition] = useState(false);
  const [feedContentReady, setFeedContentReady] = useState(Array.isArray(initialPosts));
  const [unreadPublications, setUnreadPublications] = useState(0);
  const feedSeenAtRef = useRef(0);
  const [profileLoading, setProfileLoading] = useState(false);
  const [networkInitialTab, setNetworkInitialTab] = useState("connections");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyData, setCompanyData] = useState(null);
  const [publicCompanyPages, setPublicCompanyPages] = useState([]);
  const [companyPagesLoading, setCompanyPagesLoading] = useState(false);
  const [sponsoredAds, setSponsoredAds] = useState([]);
  const [followedPageIds, setFollowedPageIds] = useState([]);
  const [connectedSuggestionIds, setConnectedSuggestionIds] = useState([]);
  useEffect(() => {
    window.dispatchEvent(new Event("lynora:navigation-complete"));
  }, [view]);
  useEffect(() => {
    const updateReelPreviewLayout = () => {
      const width = typeof window !== "undefined" ? window.innerWidth : 390;
      setIsMobileReelPreview(width <= 767);
      setReelViewportWidth(Math.max(300, width));
    };
    updateReelPreviewLayout();
    window.addEventListener("resize", updateReelPreviewLayout);
    return () => window.removeEventListener("resize", updateReelPreviewLayout);
  }, []);

  // Charger les reels depuis l'API
  const loadReels = useCallback(async ({ append = false, cursor = null } = {}) => {
    setReelPreviewLoading(true);
    try {
      const query = new URLSearchParams({ limit: "10" });
      if (cursor) query.set("cursor", cursor);
      const response = await fetchBackendApi(`/api/reels?${query.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const nextReels = Array.isArray(data.reels) ? data.reels.filter((reel) => reel && (reel.videoUrl || reel.poster)) : [];
        setReelPreview((current) => append ? [...current, ...nextReels] : nextReels);
        setReelPreviewHasMore(Boolean(data.hasMore));
        setReelPreviewNextCursor(data.nextCursor || null);
        if (!append) setReelPreviewIndex(0);
        if (append && nextReels.length) setReelPreviewIndex((current) => current + 1);
      } else {
        if (!append) setReelPreview([]);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des reels:", error);
      if (!append) setReelPreview([]);
    } finally {
      setReelPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReels();
  }, [loadReels]);

  // Recharger les reels quand on crée un événement "reels-updated"
  useEffect(() => {
    const handleReelsUpdated = () => {
      loadReels();
    };
    window.addEventListener("lynoralink:reels-updated", handleReelsUpdated);
    return () => window.removeEventListener("lynoralink:reels-updated", handleReelsUpdated);
  }, [loadReels]);

  const moveReelPreview = (direction) => {
    if (direction > 0 && reelPreviewIndex === reelPreview.length - 1 && reelPreviewHasMore && reelPreviewNextCursor && !reelPreviewLoading) {
      loadReels({ append: true, cursor: reelPreviewNextCursor });
      return;
    }
    setReelPreviewIndex((current) => Math.min(Math.max(current + direction, 0), reelPreview.length - 1));
  };

  const handleReelPreviewPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    reelPreviewSuppressClickRef.current = false;
    reelPreviewSwipeRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleReelPreviewPointerUp = (event) => {
    const swipe = reelPreviewSwipeRef.current;
    reelPreviewSwipeRef.current = null;
    if (!swipe) return;
    const deltaX = event.clientX - swipe.x;
    const deltaY = event.clientY - swipe.y;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return;
    reelPreviewSuppressClickRef.current = true;
    moveReelPreview(deltaX < 0 ? 1 : -1);
  };

  const handleReelPreviewPointerCancel = () => {
    reelPreviewSwipeRef.current = null;
  };

  const consumeReelPreviewClick = () => {
    if (reelPreviewSuppressClickRef.current) {
      reelPreviewSuppressClickRef.current = false;
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!session?.user?.id) {
      setCompanyLoading(false);
      return undefined;
    }
    let mounted = true;
    setCompanyLoading(true);
    try {
      const cachedCompany = JSON.parse(localStorage.getItem("companyData") || "null");
      if (cachedCompany && typeof cachedCompany === "object") setCompanyData(cachedCompany);
    } catch {}
    fetchBackendApi("/api/company", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((company) => {
        if (!mounted) return;
        if (company && typeof company === "object" && company.id) {
          setCompanyData(company);
          return;
        }
        if (!company && !localStorage.getItem("companyData")) {
          try { localStorage.removeItem("companyData"); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setCompanyLoading(false);
      });
    return () => { mounted = false; };
  }, [session?.user?.id]);
  const [activeAccount, setActiveAccount] = useState("personal");
  const [accountReady, setAccountReady] = useState(false);
  useEffect(() => {
    if (!session?.user?.id) {
      setAccountReady(true);
      return;
    }
    if (companyLoading) return;
    let mounted = true;
    const applyAccount = (serverAccount) => {
      if (!mounted) return;
      try {
        const saved = localStorage.getItem("lynoralink:activeAccount");
        const legacy = localStorage.getItem("activeAccount");
        const legacyAccount = legacy ? JSON.parse(legacy) : null;
        const localAccount = saved || (legacyAccount?.type === "company" ? "company" : "personal");
        const requestedAccount = localAccount === "company" && companyData ? "company" : (serverAccount || localAccount);
        setActiveAccount(requestedAccount === "company" && companyData ? "company" : "personal");
      } catch {
        setActiveAccount("personal");
      } finally {
        setAccountReady(true);
      }
    };

    fetchBackendApi("/api/account/switch", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => applyAccount(data?.account))
      .catch(() => applyAccount(null));

    return () => { mounted = false; };
  }, [session?.user?.id, companyLoading, companyData]);
  const [companyTab, setCompanyTab] = useState(() => searchParams?.get("companyTab") === "mine" ? "mine" : "discover");
  const [selectedCompanyPage, setSelectedCompanyPage] = useState(null);
  const [accountSwitch, setAccountSwitch] = useState(null);

  const activeProfile = activeAccount === "company"
    ? {
        ...profile,
        ...(companyData || {}),
        name: companyData?.displayName || companyData?.name || "Page entreprise",
        title: "Page entreprise",
        accountType: "company",
        isPremium: Boolean(companyData?.isPremium || companyData?.creatorSubscribed || subscriptionData?.plan === "premium"),
        initials: (companyData?.displayName || companyData?.name || "Page entreprise")
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((word) => word[0]?.toUpperCase())
          .join(""),
        image: companyData?.avatarUrl || companyData?.logoUrl || companyData?.image || companyData?.photoUrl || companyData?.avatar || null,
        avatarUrl: companyData?.avatarUrl || companyData?.logoUrl || companyData?.image || companyData?.photoUrl || companyData?.avatar || null,
        coverUrl: companyData?.coverUrl || companyData?.bannerUrl || companyData?.cover || null,
      }
    : profile;
  const activeProfileAvatar = getUserAvatar(activeProfile);
  const storyProfileAvatar = activeProfileAvatar || getUserAvatar(session?.user || {}) || null;
  const publicCompanyJobPosts = publicCompanyPages
    .flatMap((page) => (Array.isArray(page.jobs) ? page.jobs : []).map((job) => ({
      ...job,
      id: `company-job-${page.id}-${job.id}`,
      authorId: page.id,
      companyPageId: page.id,
      author: page.name || page.displayName || "Page entreprise",
      isPremium: Boolean(page.isPremium),
      title: job.title,
      initials: getInitials(page.name || page.displayName || "Page entreprise"),
      avatarUrl: page.logoUrl || page.avatarUrl || null,
      time: job.createdAt || page.updatedAt || page.createdAt,
      variant: "job",
      jobType: job.type,
      jobTitle: job.title,
      text: job.description,
      description: job.description,
      jobCtaLabel: job.type === "Appel d'offres" ? "Répondre à l'appel" : "Contacter l'entreprise",
      liked: false,
      bookmarked: false,
      likes: 0,
      comments: [],
      shares: 0,
      reactions: {},
    })));
  const ownCompanyJobPosts = (activeAccount === "company" ? (Array.isArray(companyData?.jobs) ? companyData.jobs : []) : [])
    .map((job) => ({
      ...job,
      id: `company-job-${companyData.id}-${job.id}`,
      authorId: companyData.id,
      companyPageId: companyData.id,
      author: companyData.name || companyData.displayName || "Page entreprise",
      isPremium: Boolean(companyData.isPremium),
      title: job.title,
      initials: getInitials(companyData.name || companyData.displayName || "Page entreprise"),
      avatarUrl: companyData.logoUrl || companyData.avatarUrl || null,
      time: job.createdAt || companyData.updatedAt || companyData.createdAt,
      variant: "job",
      jobType: job.type,
      jobTitle: job.title,
      text: job.description,
      description: job.description,
      jobCtaLabel: job.type === "Appel d'offres" ? "Répondre à l'appel" : "Gérer l'annonce",
      liked: false,
      bookmarked: false,
      likes: 0,
      comments: [],
      shares: 0,
      reactions: {},
    }));
  const sponsoredFeedPosts = sponsoredAds.map((ad) => ({
    ...ad,
    id: ad.id,
    sourceAdId: ad.id,
    companyPageId: ad.pageId || null,
    authorType: ad.pageId ? "page" : "person",
    title: ad.author || "Partenaire LynoraLink",
    headline: ad.title || "Publicité sponsorisée",
    campaignTitle: ad.title || "Publicité sponsorisée",
    avatarUrl: ad.image || ad.avatarUrl || null,
    initials: ad.initials || "L",
    text: ad.description || "",
    excerpt: ad.description || "",
    media: ad.mediaUrl ? { url: ad.mediaUrl, type: ad.mediaType === "video" ? "video" : "image" } : null,
    time: ad.createdAt || ad.time || null,
    isSponsored: true,
  }));
  const visibleFeedPosts = [...(activeAccount === "company"
    ? posts.filter((post) => Boolean(post.companyPageId || post.group))
    : posts), ...(activeAccount === "company" ? [...publicCompanyJobPosts, ...ownCompanyJobPosts] : publicCompanyJobPosts), ...sponsoredFeedPosts].sort((firstPost, secondPost) => {
      return new Date(secondPost.time || secondPost.createdAt || 0).getTime()
        - new Date(firstPost.time || firstPost.createdAt || 0).getTime();
    });
  const pageCatalog = useMemo(() => [...PAGE_DIRECTORY, ...publicCompanyPages].filter((page, index, pages) => (
    pages.findIndex((candidate) => String(candidate.id) === String(page.id)) === index
  )), [publicCompanyPages]);
  const followedPageIdSet = new Set(followedPageIds.map((id) => String(id)));
  const pageSuggestions = pageCatalog
    .filter((page) => (
      (!companyData || String(page.id) !== String(companyData.id)) &&
      !followedPageIdSet.has(String(page.id))
    ))
    .map((page) => ({
      ...page,
      type: "company",
      title: page.tag || "Page entreprise",
      initials: (page.name || page.displayName || "Page entreprise").split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join(""),
      image: page.logoUrl || page.avatarUrl || page.image || null,
    }));

  const saveCompanyData = (c) => {
    setCompanyData(c);
    try { if (typeof window !== 'undefined') localStorage.setItem('companyData', JSON.stringify(c)); } catch (e) {}
  };
  const navigateFeedRoute = (route, replace = false) => {
    window.history[replace ? "replaceState" : "pushState"]({}, "", route);
  };
  const openCompanyComposer = (mode, pageId = companyData?.id) => {
    setComposerCompanyId(pageId || null);
    setModalMode(mode);
  };
  const returnToCompanyGrid = () => {
    setSelectedCompanyPage(null);
    setCompanyTab("discover");
    setView("company");
    ignoreRouteSyncRef.current = true;
    navigateFeedRoute("/feed?view=company&companyTab=discover", true);
  };
  const handleCompanyDeleted = () => {
    setCompanyData(null);
    setSelectedCompanyPage(null);
    setPublicCompanyPages((pages) => pages.filter((page) => String(page.id) !== String(companyData?.id)));
    setActiveAccount("personal");
    try {
      localStorage.removeItem("companyData");
      localStorage.removeItem("activeAccount");
      localStorage.setItem("lynoralink:activeAccount", "personal");
    } catch {}
    setCompanyTab("discover");
    setView("company");
    ignoreRouteSyncRef.current = true;
    navigateFeedRoute("/feed?view=company&companyTab=discover", true);
  };
  const updateSelectedCompanyPage = (patch) => {
    setSelectedCompanyPage((current) => {
      if (!current) return current;
      return { ...current, ...patch };
    });

    if (selectedCompanyPage) {
      const updated = { ...selectedCompanyPage, ...patch };
      if (selectedCompanyPage.ownerId === CURRENT_USER_ID) {
        saveCompanyData(updated);
      }
    }
  };
  const [messagesModalOpen, setMessagesModalOpen] = useState(false);
  const [directChatOpen, setDirectChatOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const messagesPanelRef = useRef(null);
  const notificationsPanelRef = useRef(null);
  const [overlayOriginView, setOverlayOriginView] = useState("feed");
  const ignoreRouteSyncRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [targetProfileId, setTargetProfileId] = useState(null);
  const [suggestionRotation, setSuggestionRotation] = useState(0);
  const [targetGroupId, setTargetGroupId] = useState(null);
  const searchRequestRef = useRef(0);
  const triggerRealtimeSync = useCallback((type = "all") => {
    if (typeof window === "undefined") return;
    const allowedTypes = ["all", "posts", "reactions", "suggestions", "notifications", "messages"];
    const safeType = allowedTypes.includes(type) ? type : "all";
    const detail = { type: safeType };

    window.dispatchEvent(new CustomEvent("lynoralink:sync", { detail }));
    if (safeType === "all" || safeType === "posts" || safeType === "reactions") {
      window.dispatchEvent(new CustomEvent("lynoralink:posts-updated"));
    }
    if (safeType === "all" || safeType === "messages") {
      window.dispatchEvent(new CustomEvent("lynoralink:messages-updated"));
    }
    if (safeType === "all" || safeType === "notifications") {
      window.dispatchEvent(new CustomEvent("lynoralink:notifications-updated"));
    }
    if (safeType === "all" || safeType === "suggestions") {
      window.dispatchEvent(new CustomEvent("lynoralink:suggestions-updated"));
    }
  }, []);
  const profileTargetId = targetProfileId || searchParams?.get("userId") || null;

  // Mesure la hauteur réelle du topnav pour que les modals collent parfaitement en dessous
  const [topnavHeight, setTopnavHeight] = useState(96);
  const topnavRef = useRef(null);

  // Détection mobile pour les modals messages/notifications plein écran
  const [isMobile, setIsMobile] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const height = topnavRef.current?.getBoundingClientRect().height || 96;
      setTopnavHeight(height);
      document.documentElement.style.setProperty("--lynora-header-offset", `${height}px`);
    };

    measure();

    const ro = new ResizeObserver(measure);
    if (topnavRef.current) ro.observe(topnavRef.current);

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Trigger search from URL parameter
  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
      handleSearch(initialSearch);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ignoreRouteSyncRef.current) {
      ignoreRouteSyncRef.current = false;
      return;
    }

    const nextView = searchParams?.get("view") || "feed";

    if (nextView === "messages") {
      setView("feed");
      setMessagesModalOpen(true);
      setNotificationsModalOpen(false);
      setOverlayOriginView((current) => (current === "messages" || current === "notifications" ? "feed" : current));
      return undefined;
    }

    if (nextView === "notifications") {
      setNotificationsModalOpen(true);
      setMessagesModalOpen(false);
      setOverlayOriginView((current) => (current === "messages" || current === "notifications" ? "feed" : current));
      return undefined;
    }

    if (nextView === "abonnement") {
      setMessagesModalOpen(false);
      setNotificationsModalOpen(false);
      setView("abonnement");
      return;
    }

    setMessagesModalOpen(false);
    setNotificationsModalOpen(false);

    if (nextView === "company") {
      const requestedPageId = searchParams?.get("pageId");
      if (requestedPageId) {
        const requestedPage = pageCatalog.find((page) => String(page.id) === String(requestedPageId))
          || (companyData && String(companyData.id) === String(requestedPageId) ? companyData : null);
        if (requestedPage) {
          setSelectedCompanyPage((current) => (
            current && String(current.id) === String(requestedPage.id)
              ? { ...current, ...Object.fromEntries(Object.entries(requestedPage).filter(([, value]) => value !== undefined && value !== null)) }
              : requestedPage
          ));
          setCompanyTab("mine");
        }
      } else {
        if (view !== "company") {
          const requestedCompanyTab = searchParams?.get("companyTab");
          setCompanyTab(["mine", "followed", "discover"].includes(requestedCompanyTab) ? requestedCompanyTab : "discover");
        }
        setSelectedCompanyPage(null);
      }
    }

    if (["feed", "profile", "settings", "network", "company", "saved", "my-posts", "my-articles", "groups", "pages", "trend", "abonnement"].includes(nextView)) {
      setView(nextView);
    }
  }, [searchParams, pageCatalog, companyData, view]);

  useEffect(() => {
    const postId = searchParams?.get("post");
    if (!postId) return;
    const targetPost = posts.find((post) => String(post.id) === String(postId));
    if (targetPost) {
      setView("feed");
      const requestedArticle = searchParams?.get("article") === "1";
      if (requestedArticle || targetPost.isArticle || targetPost.headline) {
        setOpenPostId(null);
        setOpenArticleId(targetPost.id);
      } else {
        setOpenArticleId(null);
        setOpenPostId(targetPost.id);
      }
    }
  }, [searchParams, posts]);

  useEffect(() => {
    if (view !== "abonnement") return undefined;
    let active = true;
    setSubscriptionLoading(true);
    fetchBackendApi("/api/subscription", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Impossible de charger l'abonnement.");
        return response.json();
      })
      .then((data) => {
        if (active) setSubscriptionData(data);
      })
      .catch(() => {
        if (active) setSubscriptionData({ plan: "free", status: "UNKNOWN", canManage: false });
      })
      .finally(() => {
        if (active) setSubscriptionLoading(false);
      });
    return () => { active = false; };
  }, [view]);

  useEffect(() => {
    setFeedContentReady(Array.isArray(initialPosts));
  }, [initialPosts]);

  useEffect(() => {
    if (!session?.user?.id) {
      setUnreadPublications(0);
      return undefined;
    }

    if (view === "ai-assistant") return undefined;

    const storageKey = `lynoralink:feed-last-seen:${session.user.id}`;
    if (view === "feed") {
      feedSeenAtRef.current = Date.now();
      localStorage.setItem(storageKey, String(feedSeenAtRef.current));
      setUnreadPublications(0);
    } else if (!feedSeenAtRef.current) {
      feedSeenAtRef.current = Number(localStorage.getItem(storageKey) || 0);
    }

    const countUnread = (items) => {
      const lastSeen = feedSeenAtRef.current;
      const ownId = String(session.user.id);
      const unread = items.filter((post) => (
        new Date(post.time || post.createdAt || 0).getTime() > lastSeen &&
        String(post.authorId || "") !== ownId
      )).length;
      setUnreadPublications(unread);
    };

    countUnread(posts);
    const refreshUnread = async () => {
      if (document.hidden) return; // Skip polling when tab is inactive
      try {
        const response = await fetchBackendApi("/api/posts?feedOnly=true&limit=50", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data.posts)) countUnread(data.posts);
      } catch {
        // Keep the current badge when the refresh is unavailable.
      }
    };
    const interval = setInterval(refreshUnread, 30000); // Increased from 15s to 30s
    return () => clearInterval(interval);
  }, [session?.user?.id, view, posts]);

  useEffect(() => {
    if (view !== "feed" && view !== "company") return;
    let active = true;
    if (view === "company") setCompanyPagesLoading(true);
    fetchBackendApi("/api/company/pages", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && Array.isArray(data?.pages)) setPublicCompanyPages(data.pages);
      })
      .catch(() => {})
      .finally(() => { if (active && view === "company") setCompanyPagesLoading(false); });
    const refreshFeedOnEntry = async () => {
      try {
        const response = await fetchBackendApi("/api/posts?feedOnly=true&limit=50", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active && Array.isArray(data.posts)) {
          setPosts((current) => mergeOptimisticPosts(current, data.posts));
        }
      } catch {
        // Le chargement initial conserve les données déjà visibles en cas d'erreur réseau.
      }
    };
    refreshFeedOnEntry();
    return () => { active = false; };
  }, [view]);

  useEffect(() => {
    const controller = new AbortController();

    const loadPosts = async () => {
      if (!Array.isArray(initialPosts) || initialPosts.length === 0) {
        setFeedContentReady(false);
      }

      try {
        const response = await fetchBackendApi("/api/posts?feedOnly=true", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Impossible de charger les publications");

        const data = await response.json();
        if (!controller.signal.aborted && Array.isArray(data.posts)) {
          setPosts((current) => mergeOptimisticPosts(current, data.posts));
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Erreur de chargement du feed:", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setFeedContentReady(true);
        }
      }
    };

    const handlePostsUpdated = () => loadPosts();
    const handleRealtimeSync = (event) => {
      const type = event?.detail?.type;
      if (type === "all" || type === "posts" || type === "reactions") {
        loadPosts();
      }
    };
    window.addEventListener("lynoralink:posts-updated", handlePostsUpdated);
    window.addEventListener("lynoralink:sync", handleRealtimeSync);
    loadPosts();
    return () => {
      window.removeEventListener("lynoralink:posts-updated", handlePostsUpdated);
      window.removeEventListener("lynoralink:sync", handleRealtimeSync);
      controller.abort();
    };
  }, [initialPosts]);

  // Réseau
  const [connections, setConnections] = useState(MY_CONNECTIONS);
  const [invitations, setInvitations] = useState(PENDING_INVITATIONS);
  const [networkBadgeDismissed, setNetworkBadgeDismissed] = useState(false);
  const [groupBadgeDismissed, setGroupBadgeDismissed] = useState(false);
  const [companyBadgeDismissed, setCompanyBadgeDismissed] = useState(false);
  const [networkSuggestions, setNetworkSuggestions] = useState([]);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState([]);
  const [sidebarGroups, setSidebarGroups] = useState([]);
  const [pendingSuggestionIds, setPendingSuggestionIds] = useState([]);
  const pendingSuggestionIdsRef = useRef([]);
  const optimisticPendingSuggestionIdsRef = useRef(new Map());
  const [sidebarToast, setSidebarToast] = useState(null);
  const subscriptionExpiryNotified = useRef(false);
  const syncedCheckoutSessionRef = useRef(null);
  const openCampaign = () => {
    if (subscriptionData?.isPremium || subscriptionData?.plan === "premium") {
      setCampaignModalOpen(true);
      return;
    }
    setSidebarToast({ message: "La création de publicités sponsorisées est réservée aux Pages Entreprise Premium.", icon: AlertTriangle });
  };

  useEffect(() => {
    if (!session?.user?.id || view !== "feed") return undefined;
    let active = true;
    const loadSponsoredAds = async () => {
      try {
        const response = await fetchBackendApi("/api/ads", { credentials: "include", cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active) setSponsoredAds(Array.isArray(data.ads) ? data.ads : []);
      } catch {
        if (active) setSponsoredAds([]);
      }
    };
    loadSponsoredAds();
    return () => { active = false; };
  }, [session?.user?.id, view]);

  useEffect(() => {
    if (!sidebarToast) return undefined;
    const timeoutId = setTimeout(() => setSidebarToast(null), 3200);
    return () => clearTimeout(timeoutId);
  }, [sidebarToast]);

  useEffect(() => {
    if (!session?.user?.id || typeof window === "undefined") return undefined;
    const stream = new EventSource("/api/realtime", { withCredentials: true });
    const handleRealtime = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (!payload || !payload.type) return;
        if (["posts", "reactions", "suggestions", "notifications", "messages"].includes(payload.type)) {
          window.dispatchEvent(new CustomEvent("lynoralink:sync", { detail: { type: payload.type } }));
        }
      } catch {
        // ignore malformed SSE payloads
      }
    };
    stream.addEventListener("realtime", handleRealtime);
    stream.addEventListener("message", handleRealtime);
    stream.onerror = () => {
      stream.close();
    };
    return () => {
      stream.close();
    };
  }, [session?.user?.id, view]);

  useEffect(() => {
    if (!session?.user?.id) return undefined;
    if (view === "ai-assistant") return undefined;
    let active = true;

    const refreshSubscription = () => fetchBackendApi("/api/subscription", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!active || !data) return;
        setSubscriptionData(data);
        if (data.expired && !subscriptionExpiryNotified.current) {
          subscriptionExpiryNotified.current = true;
          setSidebarToast({ message: "Votre période Premium est terminée. Les fonctionnalités Premium sont désactivées.", icon: AlertTriangle });
        }
      })
      .catch(() => {});
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshSubscription();
    };
    const refreshTimer = window.setInterval(refreshSubscription, 60_000);
    document.addEventListener("visibilitychange", handleVisibility);
    refreshSubscription();

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [session?.user?.id, view]);

  useEffect(() => {
    const sessionId = searchParams?.get("session_id");
    if (!session?.user?.id || searchParams?.get("upgrade") !== "success" || !sessionId) return undefined;
    if (syncedCheckoutSessionRef.current === sessionId) return undefined;
    let active = true;

    fetchBackendApi("/api/stripe/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "Synchronisation Stripe impossible");
        syncedCheckoutSessionRef.current = sessionId;
        return Promise.all([
          fetchBackendApi("/api/subscription", { cache: "no-store" }).then((result) => result.ok ? result.json() : null),
          fetchBackendApi("/api/profile", { cache: "no-store" }).then((result) => result.ok ? result.json() : null),
          fetchBackendApi("/api/company", { cache: "no-store" }).then((result) => result.ok ? result.json() : null),
        ]);
      })
      .then(([subscription, profileResponse, company]) => {
        if (!active) return;
        if (subscription) setSubscriptionData(subscription);
        if (profileResponse?.user) setProfile((current) => ({ ...current, ...profileResponse.user }));
        if (company) setCompanyData(company);
      })
      .catch((error) => console.error("Synchronisation de l'abonnement impossible:", error.message));

    return () => { active = false; };
  }, [searchParams, session?.user?.id]);

  // Messages
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState(INITIAL_CONVERSATIONS[0]?.id ?? null);

  useEffect(() => {
    if (!session?.user?.id || conversations.length === 0) return undefined;
    let active = true;

    const checkIncomingCalls = async () => {
      if (document.hidden) return; // Skip polling when tab is inactive
      const results = await Promise.all(conversations.map(async (conversation) => {
        try {
          const response = await fetchBackendApi(`/api/calls?conversationId=${encodeURIComponent(conversation.id)}`, {
            credentials: "include",
            cache: "no-store",
          });
          if (!response.ok) return null;
          const data = await response.json();
          return data.call && !data.call.isCaller ? { conversation, call: data.call } : null;
        } catch {
          return null;
        }
      }));

      if (!active) return;
      const incoming = results.find(Boolean);
      if (!incoming) return;
      if (activeConversationId !== incoming.conversation.id || !messagesModalOpen) {
        setActiveConversationId(incoming.conversation.id);
        setMessagesModalOpen(true);
      }
    };

    checkIncomingCalls();
    const interval = setInterval(checkIncomingCalls, 5000); // Increased from 1.5s to 5s
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [session?.user?.id, conversations, activeConversationId, messagesModalOpen]);

  // Notifications
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [adminEventCount, setAdminEventCount] = useState(0);
  const notificationsRef = useRef(INITIAL_NOTIFICATIONS);
  const knownNotificationIdsRef = useRef(null);
  const knownMessageIdsRef = useRef(null);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const count = notifications.filter((notification) => notification.type !== "message" && !notification.read).length;
    document.title = count > 0 ? `LynoraLink (${count})` : "LynoraLink";

    const favicon = document.querySelector('link[rel~="icon"]');
    if (!favicon) return undefined;
    if (!favicon.dataset.originalHref) favicon.dataset.originalHref = favicon.href;

    if (count === 0) {
      favicon.href = favicon.dataset.originalHref;
      return undefined;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) return undefined;

    const drawBadge = (image) => {
      context.clearRect(0, 0, 64, 64);
      if (image) context.drawImage(image, 0, 0, 64, 64);
      context.fillStyle = "#C24444";
      context.beginPath();
      context.arc(49, 15, 15, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#FFFFFF";
      context.font = "bold 16px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(count > 99 ? "99+" : String(count), 49, 15);
      favicon.href = canvas.toDataURL("image/png");
    };

    const image = new Image();
    image.onload = () => drawBadge(image);
    image.onerror = () => drawBadge(null);
    image.src = favicon.dataset.originalHref;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [notifications]);

  const fetchRelations = useCallback(async () => {
    if (!session?.user?.id) return;

    const res = await fetchBackendApi(`/api/connections?userId=${encodeURIComponent(session.user.id)}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Impossible de charger le réseau");

    const data = await res.json();
    const nextConnections = Array.isArray(data.connections) ? data.connections : [];
    const nextPending = Array.isArray(data.pendingRequests) ? data.pendingRequests : [];
    if (!(optimisticPendingSuggestionIdsRef.current instanceof Map)) {
      optimisticPendingSuggestionIdsRef.current = new Map(
        optimisticPendingSuggestionIdsRef.current instanceof Set
          ? [...optimisticPendingSuggestionIdsRef.current].map((id) => [id, Date.now()])
          : []
      );
    }
    const pendingSuggestionCutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, createdAt] of optimisticPendingSuggestionIdsRef.current) {
      if (createdAt < pendingSuggestionCutoff) optimisticPendingSuggestionIdsRef.current.delete(id);
    }
    const nextPendingIds = [...new Set([
      ...nextPending.map((request) => request.userId),
      ...optimisticPendingSuggestionIdsRef.current.keys(),
    ])];
    const nextInvitations = Array.isArray(data.invitations) ? data.invitations : [];
    const nextConnectedSuggestionIds = nextConnections.map((connection) => connection.id);
    setConnections((current) => JSON.stringify(current) === JSON.stringify(nextConnections) ? current : nextConnections);
    setInvitations((current) => JSON.stringify(current) === JSON.stringify(nextInvitations) ? current : nextInvitations);
    setConnectedSuggestionIds((current) => JSON.stringify(current) === JSON.stringify(nextConnectedSuggestionIds) ? current : nextConnectedSuggestionIds);
    pendingSuggestionIdsRef.current = nextPendingIds;
    setPendingSuggestionIds((current) => JSON.stringify(current) === JSON.stringify(nextPendingIds) ? current : nextPendingIds);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      setConnections(MY_CONNECTIONS);
      setInvitations(PENDING_INVITATIONS);
      setNetworkSuggestions([]);
      setPublicCompanyPages([]);
      setSidebarGroups([]);
      setSponsoredAds([]);
      setConnectedSuggestionIds([]);
      pendingSuggestionIdsRef.current = [];
      optimisticPendingSuggestionIdsRef.current.clear();
      setPendingSuggestionIds([]);
      setFollowedPageIds([]);
      setConversations(INITIAL_CONVERSATIONS);
      setActiveConversationId(INITIAL_CONVERSATIONS[0]?.id ?? null);
      setNotifications(INITIAL_NOTIFICATIONS);
      knownNotificationIdsRef.current = null;
      knownMessageIdsRef.current = null;
      return;
    }

    if (view === "ai-assistant") return undefined;

    let active = true;

    const loadRelations = async () => {
      try {
        await fetchRelations();
        if (!active) return;
      } catch (error) {
        // fallback to empty lists if the API is unavailable
      }
    };

    const fetchMessages = async () => {
      if (document.hidden || messagesModalOpen) return; // Keep the open chat stable while it manages its own interactions.
      try {
        const res = await fetchBackendApi(`/api/messages?userId=${encodeURIComponent(session.user.id)}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        const nextConversations = Array.isArray(data.conversations) ? data.conversations : [];
        const incomingMessages = nextConversations.flatMap((conversation) => (
          (conversation.messages || []).filter((message) => message.from === "them" && !message.read)
        ));
        const previousMessageIds = knownMessageIdsRef.current;
        const newIncomingMessages = previousMessageIds
          ? incomingMessages.filter((message) => !previousMessageIds.has(String(message.id)))
          : [];
        knownMessageIdsRef.current = new Set(nextConversations.flatMap((conversation) => (
          (conversation.messages || []).map((message) => String(message.id))
        )));
        if (newIncomingMessages.length > 0 && !document.hidden) playNotificationSound("message");
        if (nextConversations.length === 0) {
          setConversations((currentConversations) => currentConversations);
          return;
        }
        setConversations((currentConversations) => {
          const mergedConversations = nextConversations.map((serverConversation) => {
            const localConversation = currentConversations.find((conversation) => conversation.id === serverConversation.id);
            const serverMessageIds = new Set((serverConversation.messages || []).map((message) => String(message.id)));
            const pendingMessages = (localConversation?.messages || []).filter(
              (message) => !serverMessageIds.has(String(message.id))
            );

            return {
              ...serverConversation,
              pinned: localConversation?.pinned ?? serverConversation.pinned,
              muted: localConversation?.muted ?? serverConversation.muted,
              archived: localConversation?.archived ?? serverConversation.archived,
              ...(pendingMessages.length > 0 ? { messages: [...serverConversation.messages, ...pendingMessages] } : {}),
            };
          });
          return JSON.stringify(currentConversations) === JSON.stringify(mergedConversations) ? currentConversations : mergedConversations;
        });
      } catch (error) {
        // fallback to empty list if the API is unavailable
      }
    };

    const handleMessagesUpdated = () => {
      if (active) fetchMessages();
    };
    const handleRealtimeSync = (event) => {
      const type = event?.detail?.type;
      if (!active) return;
      if (type === "all" || type === "messages") {
        fetchMessages();
      }
      if (type === "all" || type === "suggestions") {
        fetchSuggestions();
      }
    };
    window.addEventListener("lynoralink:messages-updated", handleMessagesUpdated);
    window.addEventListener("lynoralink:sync", handleRealtimeSync);

    const fetchSuggestions = async () => {
      try {
        const res = await fetchBackendApi(`/api/users`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!active || !data) return;
        const suggestions = Array.isArray(data.suggestions) ? data.suggestions : (Array.isArray(data.users) ? data.users : []);
        setNetworkSuggestions(suggestions);
      } catch (error) {
        // Preserve the last valid list during a transient network failure.
      }
    };

    const fetchGroups = async () => {
      try {
        const res = await fetchBackendApi("/api/groups", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setSidebarGroups(Array.isArray(data.groups) ? data.groups : []);
      } catch (error) {
        if (active) setSidebarGroups([]);
      }
    };

    const fetchCompanyPages = async () => {
      try {
        const res = await fetchBackendApi("/api/company/pages", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setPublicCompanyPages(Array.isArray(data.pages) ? data.pages : []);
      } catch (error) {
        if (active) setPublicCompanyPages([]);
      }
    };

    const fetchFollowedPages = async () => {
      try {
        const res = await fetchBackendApi("/api/company/follow", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setFollowedPageIds(Array.isArray(data.followedPages) ? data.followedPages : []);
      } catch (error) {
        if (active) setFollowedPageIds([]);
      }
    };

    const fetchSponsoredAds = async () => {
      try {
        const res = await fetchBackendApi("/api/ads", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setSponsoredAds(Array.isArray(data.ads) ? data.ads : []);
      } catch (error) {
        if (active) setSponsoredAds([]);
      }
    };
    const handleAdsUpdated = () => {
      if (active) fetchSponsoredAds();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden && active) fetchSponsoredAds();
    };
    window.addEventListener("lynoralink:ads-updated", handleAdsUpdated);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    loadRelations();
    setMessagesLoading(true);
    fetchMessages().finally(() => setMessagesLoading(false));
    const messagesInterval = setInterval(fetchMessages, 30000);
    fetchSuggestions();
    fetchCompanyPages();
    fetchFollowedPages();
    fetchGroups();
    fetchSponsoredAds();
    const adsInterval = setInterval(() => {
      if (!document.hidden) fetchSponsoredAds();
    }, 30000);
    const relationsInterval = setInterval(() => {
      if (document.hidden) return; // Skip polling when tab is inactive
      loadRelations();
      fetchSuggestions();
    }, 20000); // Increased from 10s to 20s

    return () => {
      active = false;
      clearInterval(messagesInterval);
      clearInterval(adsInterval);
      clearInterval(relationsInterval);
      window.removeEventListener("lynoralink:messages-updated", handleMessagesUpdated);
      window.removeEventListener("lynoralink:sync", handleRealtimeSync);
      window.removeEventListener("lynoralink:ads-updated", handleAdsUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session?.user?.id, fetchRelations, view, messagesModalOpen]);

  useEffect(() => {
    if (!openPostOverride?.isSponsored) return;
    const sourceId = openPostOverride.sourceAdId || openPostOverride.id;
    const latest = sponsoredAds.find((ad) => String(ad.id) === String(sourceId));
    if (!latest) return;
    setOpenPostOverride((current) => current ? {
      ...current,
      sourceAdId: latest.id,
      author: latest.author || current.author,
      authorId: latest.authorId || current.authorId,
      pageId: latest.pageId || current.pageId || null,
      companyPageId: latest.pageId || current.companyPageId || null,
      authorType: latest.pageId ? "page" : current.authorType,
      avatarUrl: latest.image || current.avatarUrl,
      initials: latest.initials || current.initials,
      title: latest.title || current.title,
      time: latest.createdAt || latest.time || current.time,
      text: latest.description || current.text,
      excerpt: latest.description || current.excerpt,
      media: latest.mediaUrl ? { url: latest.mediaUrl, type: latest.mediaType === "video" ? "video" : "image" } : current.media,
    } : current);
  }, [openPostOverride?.isSponsored, openPostOverride?.sourceAdId, openPostOverride?.id, sponsoredAds]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (!session?.user?.id) {
      setNotifications([]);
      return;
    }
    if (view === "ai-assistant") return undefined;

    let active = true;
    const buildBirthdayNotifications = (connectedPeople = []) => {
      if (!Array.isArray(connectedPeople) || connectedPeople.length === 0) return [];

      const today = new Date();
      const birthdayItems = connectedPeople
        .map((person) => {
          const value = person?.birthDate || person?.dateOfBirth;
          if (!value) return null;
          const birthDate = new Date(`${value}T12:00:00`);
          if (Number.isNaN(birthDate.getTime())) return null;
          const isBirthdayToday = birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate();
          if (!isBirthdayToday) return null;

          const personId = String(person?.userId || person?.id || "");
          return {
            id: `birthday-${personId}-${today.toISOString().slice(0, 10)}`,
            type: "birthday",
            actor: person?.name || person?.fullName || "Une personne",
            initials: person?.initials || (person?.name || person?.fullName || "?").slice(0, 2).toUpperCase(),
            avatarUrl: person?.image || person?.avatarUrl || person?.photoUrl || null,
            text: "fête son anniversaire aujourd'hui.",
            time: new Date().toISOString(),
            read: false,
            meta: { kind: "birthday", personId },
          };
        })
        .filter(Boolean);

      return birthdayItems;
    };

    const fetchNotifications = async () => {
      try {
        const res = await fetchBackendApi(`/api/notifications?userId=${encodeURIComponent(session.user.id)}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (!active) return;
        const normalized = Array.isArray(data.notifications) ? data.notifications.map((n) => ({
          id: n.id,
          type: n.type || "info",
          actor: n.actor || n.meta?.actor || "LynoraLink",
          initials: n.initials || "L",
          avatarUrl: n.avatarUrl || n.imageUrl || n.meta?.avatarUrl || n.meta?.actorAvatar || null,
          coverUrl: n.coverUrl || n.meta?.coverUrl || n.meta?.groupCover || n.meta?.groupImage || null,
          text: n.text || n.message || "Nouvelle notification",
          time: n.createdAt || n.time || new Date().toISOString(),
          read: Boolean(n.read),
          meta: n.meta || {},
        })) : [];
        const birthdayNotifications = buildBirthdayNotifications(connections);
        const merged = [...normalized.filter((notification) => notification.type !== "birthday"), ...birthdayNotifications];
        const previousIds = knownNotificationIdsRef.current;
        const newUnread = previousIds
          ? merged.filter((notification) => !notification.read && !previousIds.has(String(notification.id)))
          : [];
        knownNotificationIdsRef.current = new Set(merged.map((notification) => String(notification.id)));
        if (newUnread.length > 0 && document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
          newUnread.forEach((notification) => {
            try {
              new Notification(`LynoraLink - ${notification.actor}`, {
                body: notification.text,
                icon: "/logo_lynora.svg",
                badge: "/notification-badge.svg",
                tag: `lynoralink-${notification.id}`,
              });
            } catch {
            }
          });
        }
        if (newUnread.length > 0 && !document.hidden) playNotificationSound("notification");
        setNotifications((current) => JSON.stringify(current) === JSON.stringify(merged) ? current : merged);
      } catch (error) {
      }
    };

    const handleRealtimeSync = (event) => {
      const type = event?.detail?.type;
      if (!active) return;
      if (type === "all" || type === "notifications" || type === "messages") {
        fetchNotifications();
      }
    };

    setNotificationsLoading(true);
    fetchNotifications().finally(() => setNotificationsLoading(false));
    const interval = setInterval(fetchNotifications, 8000); // Increased from 3s to 8s
    window.addEventListener("focus", fetchNotifications);
    window.addEventListener("lynoralink:sync", handleRealtimeSync);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", fetchNotifications);
      window.removeEventListener("lynoralink:sync", handleRealtimeSync);
    };
  }, [session?.user?.id, view, connections]);

  useEffect(() => {
    if (!session?.user?.id) return undefined;

    let cancelled = false;
    const unreadAdminNotifications = notifications.filter((notification) => notification.type === "admin_ai_tasks" && !notification.read).length;
    if (!cancelled) setAdminEventCount(unreadAdminNotifications);

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, notifications]);

  const unreadMessages = conversations.reduce((sum, conversation) => sum + Math.max(0, Number(conversation.unread) || 0), 0);
  const unreadNotifications = notifications.filter((n) => n.type !== "message" && !n.read).length;
  const unreadAcceptedConnections = notifications.filter((notification) => (
    notification.type === "connection" && notification.meta?.kind === "accepted" && !notification.read
  )).length;
  const networkBadge = invitations.length + unreadAcceptedConnections;
  const newGroupCount = sidebarGroups.filter((group) => (
    !normalizeMembersList(group?.members).some((member) => String(member?.id) === String(session?.user?.id))
  )).length;
  const groupBadge = groupBadgeDismissed ? 0 : newGroupCount;
  const companyBadge = companyBadgeDismissed ? 0 : pageSuggestions.length;

  const markNetworkNotificationsRead = async () => {
    const acceptedNotifications = notifications.filter((notification) => (
      notification.type === "connection" && notification.meta?.kind === "accepted" && !notification.read
    ));
    if (!acceptedNotifications.length) return;
    setNotifications((current) => current.map((notification) => (
      acceptedNotifications.some((item) => item.id === notification.id)
        ? { ...notification, read: true }
        : notification
    )));
    await Promise.all(acceptedNotifications.map((notification) => fetchBackendApi("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notification.id, read: true }),
    }).catch(() => {})));
  };

  const closeOverlay = (type) => {
    const targetView = overlayOriginView || "feed";
    setMessagesLoading(false);
    setMessagesModalOpen(false);
    setDirectChatOpen(false);
    setNotificationsModalOpen(false);
    setView(targetView);
    ignoreRouteSyncRef.current = true;
    const nextRoute = targetView === "feed" ? "/feed" : `/feed?view=${encodeURIComponent(targetView)}`;
    window.dispatchEvent(new Event("lynora:navigation-start"));
    window.history.replaceState({}, "", nextRoute);

    if (type === "messages") {
      setMessagesModalOpen(false);
    } else if (type === "notifications") {
      setNotificationsModalOpen(false);
    }
  };

  useEffect(() => {
    if (!messagesModalOpen && !notificationsModalOpen) return undefined;
    const handleOutsidePointerDown = (event) => {
      const insideMessages = messagesPanelRef.current?.contains(event.target);
      const insideNotifications = notificationsPanelRef.current?.contains(event.target);
      if (!insideMessages && !insideNotifications) closeOverlay(messagesModalOpen ? "messages" : "notifications");
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [messagesModalOpen, notificationsModalOpen, overlayOriginView]);

  useEffect(() => {
    const handleCallEnded = () => closeOverlay("messages");
    window.addEventListener("lynoralink:call-ended", handleCallEnded);
    return () => window.removeEventListener("lynoralink:call-ended", handleCallEnded);
  }, [overlayOriginView]);

  const switchAccount = (targetPage) => {
    const targetIsCompany = Boolean(targetPage);
    const targetCompany = targetPage || companyData;
    if (targetIsCompany && !targetCompany) return;
    const previousAccount = activeAccount;

    const personalIdentity = {
      name: profile.name,
      title: profile.title,
      image: profileAvatar,
    };
    const companyIdentity = targetCompany ? {
      name: targetCompany.displayName || targetCompany.name || "Page entreprise",
      title: "Page entreprise",
      image: targetCompany.avatarUrl || targetCompany.image || targetCompany.photoUrl || targetCompany.avatar || null,
    } : null;

    setAccountSwitch({
      from: activeAccount === "company" ? companyIdentity : personalIdentity,
      to: targetIsCompany ? companyIdentity : personalIdentity,
      account: targetIsCompany ? "company" : "personal",
      navigateTo: "feed",
    });
    const nextAccount = targetIsCompany ? "company" : "personal";
    setActiveAccount(nextAccount);
    try { localStorage.setItem("lynoralink:activeAccount", nextAccount); } catch {}
    if (targetIsCompany && targetPage) setCompanyData(targetPage);

    fetchBackendApi("/api/account/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account: nextAccount }),
    })
      .then(async (response) => {
        if (response.ok) return;
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Impossible de changer de compte.");
      })
      .catch(() => {
        setActiveAccount(previousAccount);
        try { localStorage.setItem("lynoralink:activeAccount", previousAccount); } catch {}
        setAccountSwitch(null);
      });
  };

  const refreshFeedContent = useCallback(async () => {
    try {
      const response = await fetchBackendApi("/api/posts?feedOnly=true&limit=50", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data.posts)) {
        setPosts((current) => mergeOptimisticPosts(current, data.posts));
      }
    } catch {
      // Conserver le feed actuel si la synchronisation réseau échoue.
    }
  }, []);

  const openUserProfile = useCallback((userId) => {
    if (!userId) return;
    setTargetProfileId(userId);
    setView("profile");
    ignoreRouteSyncRef.current = true;
    window.history.pushState({}, "", `/feed?view=profile&userId=${encodeURIComponent(userId)}`);
  }, []);

  const openCompanyPageDetail = useCallback((pageId) => {
    if (!pageId) return;
    const page = pageCatalog.find((candidate) => String(candidate.id) === String(pageId)) || companyData || publicCompanyPages.find((candidate) => String(candidate.id) === String(pageId));
    if (page) setSelectedCompanyPage(page);
    setCompanyTab("mine");
    setView("company");
    ignoreRouteSyncRef.current = true;
    window.history.pushState({}, "", `/feed?view=company&pageId=${encodeURIComponent(pageId)}`);
  }, [companyData, pageCatalog, publicCompanyPages]);

  useEffect(() => {
    if (view !== "network") return;
    const nextTab = searchParams?.get("tab");
    const allowedTabs = ["accueil", "invitations", "suggestions", "connections", "anniversaires", "listes"];
    if (nextTab && allowedTabs.includes(nextTab) && nextTab !== networkInitialTab) {
      setNetworkInitialTab(nextTab);
    }
  }, [view, searchParams, networkInitialTab]);

  const navigate = (id, options = {}) => {
    window.dispatchEvent(new Event("lynora:navigation-start"));
    setModalMode(null);
    setComposerCompanyId(null);
    if (id === "profile" || id === "feed") setTargetProfileId(null);
    if (id === "feed") setUnreadPublications(0);
    if (id === "network") {
      setNetworkBadgeDismissed(true);
      markNetworkNotificationsRead();
    }
    if (id === "groups") setGroupBadgeDismissed(true);
    if (id === "company") setCompanyBadgeDismissed(true);

    if (id === "company-grid") {
      setMessagesModalOpen(false);
      setNotificationsModalOpen(false);
      setCompanyTab("discover");
      setSelectedCompanyPage(null);
      setView("company");
      ignoreRouteSyncRef.current = true;
      navigateFeedRoute("/feed?view=company&companyTab=discover");
      return;
    }

    if (id === "groups" && options.groupId) {
      setTargetGroupId(options.groupId);
      const groupsRoute = `/feed?${new URLSearchParams({ view: "groups", groupId: String(options.groupId) }).toString()}`;
      router.push(groupsRoute);
      return;
    }

    if (id === "company") {
      const nextCompanyTab = companyData ? "mine" : "discover";
      setMessagesModalOpen(false);
      setNotificationsModalOpen(false);
      setCompanyTab(nextCompanyTab);
      setSelectedCompanyPage(null);
      setView("company");
      ignoreRouteSyncRef.current = true;
      navigateFeedRoute(`/feed?view=company&companyTab=${nextCompanyTab}`);
      return;
    }

    if (id === "messages") {
      if (messagesModalOpen) {
        closeOverlay("messages");
        return;
      }

      setOverlayOriginView(view);
      setMessagesModalOpen(true);
      setNotificationsModalOpen(false);
      setConversations((cs) => cs.map((c) => (c.id === activeConversationId ? { ...c, unread: 0 } : c)));
      if (activeConversationId && session?.user?.id) {
        fetchBackendApi('/api/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: activeConversationId }),
        }).catch(() => {});
      }
      ignoreRouteSyncRef.current = true;
      window.history.pushState({}, "", "/feed?view=messages");
      return;
    }

    if (id === "notifications") {
      enablePushNotifications();
      if (notificationsModalOpen) {
        closeOverlay("notifications");
        return;
      }

      setOverlayOriginView(view);
      setNotificationsModalOpen(true);
      setMessagesModalOpen(false);
      markAllNotificationsRead();
      window.history.pushState({}, "", "/feed?view=notifications");
      return;
    }

    if (id === "abonnement") {
      setMessagesModalOpen(false);
      setNotificationsModalOpen(false);
      setView("abonnement");
      window.history.pushState({}, "", "/feed?view=abonnement");
      return;
    }

    if (id === "feed") {
      setMessagesModalOpen(false);
      setNotificationsModalOpen(false);
      setView("feed");

      if (view === "feed") {
        setFeedContentReady(false);
        refreshFeedContent().finally(() => setFeedContentReady(true));
        window.history.replaceState({}, "", "/feed");
        return;
      }

      window.history.pushState({}, "", "/feed");
      return;
    }

    if (id === "settings") {
      const section = options.section || "profil";
      setMessagesModalOpen(false);
      setNotificationsModalOpen(false);
      setView("settings");
      window.history.pushState({}, "", `/feed?view=settings&section=${encodeURIComponent(section)}`);
      return;
    }

    if (id === "dashboard") {
      setMessagesModalOpen(false);
      setNotificationsModalOpen(false);
      router.push("/dashboard");
      return;
    }

    if (id === "legal-support") {
      setMessagesModalOpen(false);
      setNotificationsModalOpen(false);
      router.push("/legal-support");
      return;
    }

    if (id === "legal") {
      setMessagesModalOpen(false);
      setNotificationsModalOpen(false);
      router.push("/legal");
      return;
    }

    setMessagesModalOpen(false);
    setNotificationsModalOpen(false);
    if (id === "network") {
      const nextTab = options.tab || networkInitialTab || "connections";
      setNetworkInitialTab(nextTab);
      window.history.replaceState({}, "", `/feed?view=network&tab=${encodeURIComponent(nextTab)}`);
      markNetworkNotificationsRead();
    }

    if (id === "company") {
      setView("company");
      window.history.pushState({}, "", "/feed?view=company");
    } else {
      setView(id);
      window.history.pushState({}, "", `/feed?view=${id}`);
    }
  };

  const selectConversation = async (id) => {
    setActiveConversationId(id);
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));

    if (!id || !session?.user?.id) return;
    try {
      await fetchBackendApi('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: id }),
      });
    } catch (e) {
      // ignore network errors, local state already updated optimistically
    }

    // Refresh conversations from server to keep unread counts in sync
    try {
      const res = await fetchBackendApi(`/api/messages?userId=${encodeURIComponent(session.user.id)}`);
      if (res && res.ok) {
        const data = await res.json();
        const nextConversations = Array.isArray(data.conversations) ? data.conversations : [];
        setConversations(nextConversations);
      }
    } catch (e) {
      // ignore refresh errors
    }
  };

  const selectTrend = (tag) => {
    setSelectedTrend(tag);
    setView("trend");
  };

  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);

    const term = query.trim().toLowerCase();
    if (!term) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const requestId = ++searchRequestRef.current;
    setSearchLoading(true);
    const includesTerm = (value) => String(value || "").toLowerCase().includes(term);

    try {
      const [usersResponse, groupsResponse] = await Promise.all([
        fetchBackendApi("/api/users", { cache: "no-store" }),
        fetchBackendApi("/api/groups", { cache: "no-store" }),
      ]);
      const usersData = usersResponse.ok ? await usersResponse.json() : {};
      const groupsData = groupsResponse.ok ? await groupsResponse.json() : {};
      if (requestId !== searchRequestRef.current) return;

      const results = [];
      const users = Array.isArray(usersData.users) ? usersData.users : [];
      const groups = Array.isArray(groupsData.groups) ? groupsData.groups : [];

      users.filter((user) => includesTerm(user.name) || includesTerm(user.title) || includesTerm(user.company)).forEach((user) => {
        results.push({
          id: `user-${user.id}`,
          targetId: user.id,
          targetType: "user",
          type: "Personne",
          title: user.name || "Utilisateur",
          subtitle: user.title || user.company || "Membre LynoraLink",
          view: "network",
          icon: Users,
          iconBg: C.navy50,
          iconColor: C.navy700,
        });
      });

      PAGE_DIRECTORY.filter((page) => includesTerm(page.name) || includesTerm(page.tag) || includesTerm(page.desc)).forEach((page) => {
        results.push({
          id: `page-${page.id}`,
          targetId: page.id,
          targetType: "page",
          type: "Page",
          title: page.name,
          subtitle: `${page.tag || "Page entreprise"} · ${page.followers || 0} abonnés`,
          view: "company-grid",
          icon: Building2,
          iconBg: "rgba(246, 211, 116, 0.2)",
          iconColor: C.gold600,
        });
      });

      groups.filter((group) => includesTerm(group.name) || includesTerm(group.description) || includesTerm(group.category)).forEach((group) => {
        results.push({
          id: `group-${group.id}`,
          targetId: group.id,
          targetType: "group",
          type: "Groupe",
          title: group.name,
          subtitle: group.description || group.category || "Communauté LynoraLink",
          view: "groups",
          icon: Users2,
          iconBg: "rgba(27, 83, 134, 0.1)",
          iconColor: C.navy700,
        });
      });

      posts.forEach((post) => {
        const author = typeof post.author === "string" ? post.author : post.author?.name;
        if (includesTerm(post.title || post.headline) || includesTerm(post.text || post.content || post.body) || includesTerm(author)) {
          results.push({
            id: `post-${post.id}`,
            type: "Publication",
            title: post.title || post.headline || "Publication",
            subtitle: `Par ${author || "Utilisateur"}`,
            view: "feed",
            icon: FileText,
            iconBg: C.navy50,
            iconColor: C.navy700,
          });
        }
      });

      setSearchResults(results.slice(0, 20));
    } catch {
      if (requestId === searchRequestRef.current) setSearchResults([]);
    } finally {
      if (requestId === searchRequestRef.current) setSearchLoading(false);
    }
  }, [posts, connections, networkSuggestions]);

  const handleSearchResult = useCallback((result) => {
    if (result?.targetType === "user" && result.targetId) {
      setTargetProfileId(result.targetId);
      navigateFeedRoute(`/feed?view=profile&userId=${encodeURIComponent(result.targetId)}`);
      return;
    }
    if (result?.targetType === "page" && result.targetId) {
      const page = PAGE_DIRECTORY.find((item) => String(item.id) === String(result.targetId));
      if (page) {
        setSelectedCompanyPage(page);
        setCompanyTab("mine");
        navigateFeedRoute(`/feed?view=company&pageId=${encodeURIComponent(result.targetId)}`);
      }
      return;
    }
    if (result?.targetType === "group" && result.targetId) {
      setTargetGroupId(result.targetId);
      navigateFeedRoute(`/feed?view=groups&groupId=${encodeURIComponent(result.targetId)}`);
      return;
    }
    navigate(result?.view || "feed");
  }, [router]);

  const sendMessage = async (id, text, attachments = [], replyTo = null) => {
    const trimmed = (text || "").trim();
    if (!trimmed && attachments.length === 0) return;

    const conversation = conversations.find((c) => c.id === id);
    const payload = conversation?.otherUserId
      ? { conversationId: id, pageId: conversation.pageId || null, text: trimmed }
      : { otherUserId: id, text: trimmed };
    const temporaryId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage = {
      id: temporaryId,
      from: "me",
      text: trimmed || (attachments.length > 1 ? "Fichiers envoyés" : "Fichier envoyé"),
      time: "À l'instant",
      attachments,
      replyTo: replyTo ? { ...replyTo, from: replyTo.from || "them" } : null,
      pending: true,
    };
    setConversations((cs) => cs.map((c) => (
      c.id === id || c.otherUserId === id
        ? { ...c, messages: [...c.messages, optimisticMessage] }
        : c
    )));

    try {
      const res = await fetchBackendApi("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, attachments, replyTo: replyTo ? { id: replyTo.id } : null }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.message) {
          setConversations((cs) =>
            cs.map((c) =>
              c.id === id || c.otherUserId === id
                ? { ...c, messages: c.messages.map((message) => message.id === temporaryId ? { id: data.message.id, from: "me", text: data.message.text, time: data.message.time, attachments: data.message.attachments || attachments, replyTo: data.message.replyTo || null } : message) }
                : c
            )
          );
          triggerRealtimeSync("messages");
          return;
        }
      }
    } catch (error) {
      console.error("Erreur d'envoi du message:", error);
    }
    setConversations((cs) => cs.map((c) => (
      c.id === id || c.otherUserId === id
        ? { ...c, messages: c.messages.filter((message) => message.id !== temporaryId) }
        : c
    )));
  };

  const openConversationWithUser = async (user) => {
    const targetUserId = user?.ownerId ?? user?.userId ?? user?.id;
    if (!targetUserId || String(targetUserId) === String(session?.user?.id || "")) return;

    const requestedPageId = user?.pageId || null;
    const existing = conversations.find((c) => c.otherUserId === targetUserId && String(c.pageId || "") === String(requestedPageId || ""));
    if (existing) {
      if (requestedPageId && (existing.messages || []).length === 0) {
        const greetingResponse = await fetchBackendApi("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ otherUserId: targetUserId, pageId: requestedPageId, createOnly: true }),
        });
        const greetingData = await greetingResponse.json().catch(() => ({}));
        if (greetingData.greeting) {
          setConversations((cs) => cs.map((c) => c.id === existing.id ? {
            ...c,
            messages: [{ id: greetingData.greeting.id, from: "them", text: greetingData.greeting.text, time: "À l'instant", read: false, attachments: [], reactions: [] }],
          } : c));
        }
      }
      setActiveConversationId(existing.id);
      setMessagesModalOpen(true);
      setConversations((cs) => cs.map((c) => (c.id === existing.id ? {
        ...c,
        name: requestedPageId ? (user.name || c.name) : c.name,
        title: requestedPageId ? "Page entreprise" : c.title,
        image: requestedPageId ? (user.image || user.avatarUrl || c.image || null) : c.image,
        unread: 0,
      } : c)));
      return;
    }

    try {
      const res = await fetchBackendApi("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: targetUserId, pageId: user?.pageId, createOnly: true }),
      });

      if (!res.ok) return;
      const data = await res.json();
      if (!data?.conversationId) return;

      const nextConversation = {
        id: data.conversationId,
        otherUserId: targetUserId,
        pageId: requestedPageId,
        name: user.name,
        title: user.title,
        image: user.image || user.avatarUrl || null,
        initials: user.initials,
        online: false,
        unread: 0,
        pinned: false,
        muted: false,
        archived: false,
        messages: [],
      };
      if (data.greeting) {
        nextConversation.messages = [{ id: data.greeting.id, from: "them", text: data.greeting.text, time: "À l'instant", read: false, attachments: [], reactions: [] }];
      }

      setConversations((cs) => [nextConversation, ...cs]);
      setActiveConversationId(data.conversationId);
      setMessagesModalOpen(true);
    } catch (error) {
      // ignore
    }
  };

  const acceptInvitation = async (id) => {
    const inv = invitations.find((i) => i.id === id);
    if (!inv) return;

    try {
      await fetchBackendApi("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: inv.userId, action: "accept" }),
      });
    } catch (error) {
      // ignore API failure
    }

    setConnections((cs) => [{ id: inv.userId, name: inv.name, title: inv.title, initials: inv.initials, mutual: inv.mutual }, ...cs]);
    setInvitations((is) => is.filter((i) => i.id !== id));
  };

  const declineInvitation = async (id) => {
    const inv = invitations.find((i) => i.id === id);
    if (!inv) return;

    try {
      await fetchBackendApi("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: inv.userId, action: "decline" }),
      });
    } catch (error) {
      // ignore API failure
    }

    setInvitations((is) => is.filter((i) => i.id !== id));
  };
  const dismissSuggestion = (id) => {
    setDismissedSuggestionIds((current) => (current.includes(id) ? current : [...current, id]));
    setSidebarToast({ message: "Suggestion masquée", icon: Check });
  };

  const connectSuggestion = async (id) => {
    const suggestion = (activeAccount === "company" ? pageSuggestions : networkSuggestions).find((item) => item.id === id);
    if (!suggestion || pendingSuggestionIds.includes(id)) return;

    if (activeAccount === "company") {
      try {
        const response = await fetchBackendApi("/api/company/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: id }),
        });
        if (!response.ok) throw new Error("Impossible de suivre la page");
        const data = await response.json();
        setFollowedPageIds((current) => data.followed
          ? [...new Set([...current, id])]
          : current.filter((pageId) => pageId !== id));
        setSidebarToast({ message: data.followed ? "Page suivie" : "Page retirée", icon: Check });
      } catch (error) {
        setSidebarToast({ message: "Action impossible", icon: X });
      }
      return;
    }

    setPendingSuggestionIds((prev) => [...prev, id]);
    if (!(optimisticPendingSuggestionIdsRef.current instanceof Map)) {
      optimisticPendingSuggestionIdsRef.current = new Map();
    }
    optimisticPendingSuggestionIdsRef.current.set(id, Date.now());
    pendingSuggestionIdsRef.current = [...pendingSuggestionIdsRef.current, id];
    setSidebarToast({ message: "Demande envoyé", icon: Clock });

    try {
      const response = await fetchBackendApi("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: id }),
      });

      if (!response.ok) {
        optimisticPendingSuggestionIdsRef.current.delete(id);
        setPendingSuggestionIds((prev) => prev.filter((pid) => pid !== id));
        pendingSuggestionIdsRef.current = pendingSuggestionIdsRef.current.filter((pid) => pid !== id);
        return;
      }
      triggerRealtimeSync("suggestions");
      await fetchRelations();
    } catch (error) {
      optimisticPendingSuggestionIdsRef.current.delete(id);
      setPendingSuggestionIds((prev) => prev.filter((pid) => pid !== id));
      pendingSuggestionIdsRef.current = pendingSuggestionIdsRef.current.filter((pid) => pid !== id);
    }
  };

  const connectUser = async (id) => {
    if (!id || id === session?.user?.id) return;
    const response = await fetchBackendApi("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: id }),
    });
    if (response.ok) {
      setSidebarToast({ message: "Demande de connexion envoyée", icon: Check });
      await fetchRelations();
    } else setSidebarToast({ message: "Action impossible", icon: X });
  };

  const removeConnection = async (id) => {
    if (!id) return;
    const response = await fetchBackendApi("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: id, action: "remove" }),
    });
    if (response.ok) {
      setSidebarToast({ message: "Connexion retirée", icon: Check });
      await fetchRelations();
    } else setSidebarToast({ message: "Action impossible", icon: X });
  };

  const leaveGroupFromFeed = async (id) => {
    if (!id) return;
    const response = await fetchBackendApi(`/api/groups/${encodeURIComponent(id)}/leave`, { method: "POST" });
    if (response.ok) {
      setSidebarToast({ message: "Vous avez quitté le groupe", icon: Check });
      setPosts((currentPosts) => currentPosts.map((post) => post.group?.id === id ? { ...post, group: { ...post.group, memberIds: (post.group.memberIds || []).filter((memberId) => String(memberId) !== String(session?.user?.id)) } } : post));
    } else setSidebarToast({ message: "Action impossible", icon: X });
  };

  const cancelConnectionRequest = async (id) => {
    if (!pendingSuggestionIdsRef.current.includes(id)) return;

    const previousPendingIds = pendingSuggestionIdsRef.current;
    pendingSuggestionIdsRef.current = previousPendingIds.filter((pendingId) => pendingId !== id);
    optimisticPendingSuggestionIdsRef.current.delete(id);
    setPendingSuggestionIds(pendingSuggestionIdsRef.current);

    try {
      const response = await fetchBackendApi("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: id, action: "decline" }),
      });
      if (!response.ok) throw new Error("Impossible d'annuler la demande");
      setSidebarToast({ message: "Demande annulée", icon: Check });
      triggerRealtimeSync("suggestions");
      await fetchRelations();
    } catch (error) {
      pendingSuggestionIdsRef.current = previousPendingIds;
      setPendingSuggestionIds(previousPendingIds);
      setSidebarToast({ message: "Action impossible", icon: X });
    }
  };

  const followPage = async (id) => {
    if (!id) return;

    try {
      const response = await fetchBackendApi("/api/company/follow", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: id }),
      });
      if (!response.ok) throw new Error("Impossible de suivre la page");
      const data = await response.json();
      setFollowedPageIds((current) => data.followed
        ? [...new Set([...current, id])]
        : current.filter((pageId) => String(pageId) !== String(id)));
      setSidebarToast({ message: data.followed ? "Page suivie" : "Désabonnement effectué", icon: Check });
    } catch (error) {
      setSidebarToast({ message: "Action impossible", icon: X });
    }
  };

  const persistNotificationChange = async (next) => {
    if (!session?.user?.id || !Array.isArray(next)) return;
    const previous = notificationsRef.current || [];
    const changed = next.filter((n) => {
      const prev = previous.find((p) => p.id === n.id);
      return !prev || prev.read !== n.read;
    });

    for (const n of changed) {
      try {
        await fetchBackendApi("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: n.id, read: Boolean(n.read), userId: session.user.id }),
        });
      } catch (error) {
        // ignore and keep local optimistic state
      }
    }

    const removed = previous.filter((p) => !next.some((n) => n.id === p.id));
    for (const n of removed) {
      try {
        await fetchBackendApi(`/api/notifications?id=${encodeURIComponent(n.id)}`, { method: "DELETE" });
      } catch (error) {
        // ignore
      }
    }
  };

  const handleNotificationChange = useCallback((next) => {
    const normalized = Array.isArray(next) ? next : [];
    setNotifications(normalized);
    persistNotificationChange(normalized).catch(() => {});
  }, [session?.user?.id]);

  const markNotificationRead = async (notification) => {
    const id = typeof notification === "object" ? notification.id : notification;
    const next = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    handleNotificationChange(next);

    const meta = typeof notification === "object" ? notification.meta || {} : {};
    triggerRealtimeSync("notifications");
    setNotificationsModalOpen(false);
    if (meta.href) {
      window.location.assign(meta.href);
      return;
    }
    if (meta.groupId) {
      setTargetGroupId(meta.groupId);
      setView("groups");
      navigateFeedRoute(`/feed?view=groups&groupId=${encodeURIComponent(meta.groupId)}`);
      return;
    }
    if (meta.postId) {
      const targetPost = posts.find((post) => String(post.id) === String(meta.postId));
      if (targetPost) {
        const isArticle = targetPost.isArticle || targetPost.headline;
        setOpenPostId(null);
        setOpenArticleId(isArticle ? targetPost.id : null);
        if (!isArticle) setOpenPostId(targetPost.id);
        setView("feed");
        navigateFeedRoute("/feed");
      } else {
        setView("feed");
        const articleParam = notification?.type === "article" || meta.isArticle ? "&article=1" : "";
        navigateFeedRoute(`/feed?post=${encodeURIComponent(meta.postId)}${articleParam}`);
      }
      return;
    }
    if (meta.pageId) {
      const targetPage = pageCatalog.find((page) => String(page.id) === String(meta.pageId));
      setCompanyTab("mine");
      setSelectedCompanyPage(targetPage || null);
      setView("company");
      navigateFeedRoute(`/feed?view=company&pageId=${encodeURIComponent(meta.pageId)}`);
      return;
    }
    if (meta.storyId) {
      setView("feed");
      navigateFeedRoute("/feed");
      return;
    }
    if (meta.view) {
      navigate(meta.view, meta.tab ? { tab: meta.tab } : {});
      return;
    }
    if (typeof notification === "object" && notification.type === "connection") {
      navigate("network", { tab: meta.kind === "accepted" ? "connections" : "invitations" });
      return;
    }
    if (typeof notification === "object" && notification.type === "suggestion") {
      navigate("network", { tab: "suggestions" });
    }
  };

  const handleSecurityAlertResponse = async (notification, response) => {
    try {
      const result = await fetch("/api/security/alert-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notification.id, response }),
      });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) {
        setSidebarToast({ message: data.error || "Impossible de traiter cette alerte.", icon: X });
        return;
      }

      handleNotificationChange(notifications.map((item) => (
        item.id === notification.id ? { ...item, read: true } : item
      )));
      if (response === "yes") {
        setSidebarToast({ message: "Connexion confirmée.", icon: Check });
        return;
      }

      window.localStorage.removeItem("lynoralink:login-device-id");
      window.localStorage.removeItem("lynoralink:connectedAccounts");
      await signOut({ callbackUrl: `/reset-password?email=${encodeURIComponent(session?.user?.email || "")}` });
    } catch {
      setSidebarToast({ message: "Impossible de traiter cette alerte.", icon: X });
    }
  };

  const markAllNotificationsRead = async () => {
    if (!session?.user?.id) {
      setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
      return;
    }

    try {
      await fetchBackendApi("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id, markAllRead: true, read: true }),
      });
    } catch (error) {
      // ignore
    }

    triggerRealtimeSync("notifications");
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
  };

  const updateLegacyGroupPost = async (post, updater) => {
    const groupId = post?.group?.id;
    const postId = String(post?.id || "");
    if (!groupId || (!postId.startsWith("new_") && !postId.startsWith("shared_"))) return null;
    const groupResponse = await fetchBackendApi(`/api/groups/${encodeURIComponent(groupId)}`, { cache: "no-store" });
    if (!groupResponse.ok) throw new Error("Impossible de charger le groupe");
    const groupData = await groupResponse.json();
    const groupPosts = Array.isArray(groupData?.group?.posts) ? groupData.group.posts : [];
    const currentGroupPost = groupPosts.find((item) => String(item.id) === String(post.id));
    if (!currentGroupPost) throw new Error("Publication de groupe introuvable");
    const nextGroupPost = updater(currentGroupPost);
    const updateResponse = await fetchBackendApi(`/api/groups/${encodeURIComponent(groupId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posts: groupPosts.map((item) => String(item.id) === String(post.id) ? nextGroupPost : item) }),
    });
    if (!updateResponse.ok) throw new Error("Impossible d'enregistrer l'engagement");
    return nextGroupPost;
  };

  const toggleLike = async (id) => {
    const currentPost = posts.find((post) => post.id === id);
    if (!currentPost) return;
    const nextLiked = !currentPost.liked;
    setPosts((ps) => ps.map((p) => {
      if (p.id !== id) return p;
      const reactionKey = p.reaction || "ok";
      const reactions = { ...(p.reactions || {}) };
      reactions[reactionKey] = Math.max(0, Number(reactions[reactionKey] || 0) + (nextLiked ? 1 : -1));
      return { ...p, liked: nextLiked, reaction: nextLiked ? reactionKey : null, likes: Math.max(0, p.likes + (nextLiked ? 1 : -1)), reactions };
    }));
    try {
      if (String(id).startsWith("new_") && currentPost.group?.id) {
        const nextPost = await updateLegacyGroupPost(currentPost, (post) => {
          const reactionKey = post.reaction || "ok";
          const reactions = { ...(post.reactions || {}) };
          reactions[reactionKey] = Math.max(0, Number(reactions[reactionKey] || 0) + (nextLiked ? 1 : -1));
          return { ...post, liked: nextLiked, reaction: nextLiked ? reactionKey : null, likes: Math.max(0, Number(post.likes || 0) + (nextLiked ? 1 : -1)), reactions };
        });
        if (nextPost) setPosts((ps) => ps.map((p) => p.id === id ? { ...p, ...nextPost } : p));
        return;
      }
      const response = await fetchBackendApi(`/api/posts/${id}/like`, { method: "POST" });
      if (!response.ok) return;
      const result = await response.json();
      setPosts((ps) => ps.map((p) => (p.id === id ? {
        ...p,
        liked: result.liked,
        likes: result.likes,
        reaction: result.reaction ?? null,
        reactions: result.reactions ?? p.reactions,
      } : p)));
      triggerRealtimeSync("reactions");
    } catch {
      // Les publications de démonstration restent optimistes si elles n'existent pas côté serveur.
    }
  };
  const selectReaction = async (id, reaction) => {
    const currentPost = posts.find((post) => post.id === id);
    if (!currentPost) return;
    setPosts((ps) => ps.map((p) => {
      if (p.id !== id) return p;
      const reactions = { ...(p.reactions || {}) };
      if (p.reaction && p.reaction !== reaction) reactions[p.reaction] = Math.max(0, Number(reactions[p.reaction] || 0) - 1);
      reactions[reaction] = Number(reactions[reaction] || 0) + (p.reaction === reaction ? 0 : 1);
      return { ...p, liked: true, reaction, likes: p.liked ? p.likes : p.likes + 1, reactions };
    }));
    try {
      if (String(id).startsWith("new_") && currentPost.group?.id) {
        const nextPost = await updateLegacyGroupPost(currentPost, (post) => {
          const reactions = { ...(post.reactions || {}) };
          if (post.reaction && post.reaction !== reaction) reactions[post.reaction] = Math.max(0, Number(reactions[post.reaction] || 0) - 1);
          reactions[reaction] = Number(reactions[reaction] || 0) + (post.reaction === reaction ? 0 : 1);
          return { ...post, liked: true, reaction, likes: post.reaction ? Number(post.likes || 0) : Number(post.likes || 0) + 1, reactions };
        });
        if (nextPost) setPosts((ps) => ps.map((p) => p.id === id ? { ...p, ...nextPost } : p));
        return;
      }
      const response = await fetchBackendApi(`/api/posts/${id}/like`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reaction }) });
      if (!response.ok) return;
      const result = await response.json();
      setPosts((ps) => ps.map((p) => (p.id === id ? {
        ...p,
        liked: result.liked,
        likes: result.likes,
        reaction: result.reaction ?? null,
        reactions: result.reactions ?? p.reactions,
      } : p)));
      triggerRealtimeSync("reactions");
    } catch {
      // Les publications de démonstration restent optimistes si elles n'existent pas côté serveur.
    }
  };
  const toggleBookmark = async (id) => {
    const previous = posts.find((post) => post.id === id)?.bookmarked;
    const currentPost = posts.find((post) => post.id === id);
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, bookmarked: !p.bookmarked } : p)));
    try {
      if (currentPost?.group?.id && (String(id).startsWith("new_") || String(id).startsWith("shared_"))) {
        const nextPost = await updateLegacyGroupPost(currentPost, (post) => ({ ...post, bookmarked: !post.bookmarked }));
        if (nextPost) setPosts((ps) => ps.map((p) => p.id === id ? { ...p, ...nextPost } : p));
        return;
      }
      const response = await fetchBackendApi(`/api/posts/${id}/save`, { method: "POST" });
      if (!response.ok) throw new Error("Impossible d'enregistrer la publication");
      const result = await response.json();
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, bookmarked: result.bookmarked, bookmarks: result.bookmarks ?? p.bookmarks } : p)));
      triggerRealtimeSync("posts");
    } catch {
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, bookmarked: previous } : p)));
    }
  };
  const joinEventFromFeed = async (post, event, currentlyAttending) => {
    const groupId = post.group?.id;
    if (!groupId || !event?.id) return;
    const attending = Boolean(currentlyAttending);
    const nextEvent = {
      ...event,
      attendees: Math.max(0, Number(event.attendees || 0) + (attending ? -1 : 1)),
      attendeeIds: attending
        ? (event.attendeeIds || []).filter((id) => id !== session?.user?.id)
        : [...new Set([...(event.attendeeIds || []), session?.user?.id].filter(Boolean))],
      attending: !attending,
    };
    setPosts((currentPosts) => currentPosts.map((item) => item.id === post.id ? { ...item, event: nextEvent } : item));
    try {
      const response = await fetchBackendApi(`/api/groups/${groupId}/events`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, attending: !attending }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Impossible de mettre à jour la participation");
      setPosts((currentPosts) => currentPosts.map((item) => item.id === post.id ? { ...item, event: { ...data.event, attending: !attending } } : item));
    } catch (error) {
      setPosts((currentPosts) => currentPosts.map((item) => item.id === post.id ? { ...item, event } : item));
      console.error("Erreur de participation à l'événement:", error);
    }
  };
  const addComment = async (id, text, media) => {
    // Optimistic update
    const tempId = `c${Date.now()}`;
    const targetPost = visibleFeedPosts.find((post) => post.id === id);
    if (targetPost?.variant === "job" && typeof window !== "undefined") {
      try {
        const response = await fetchBackendApi("/api/company/jobs/engagement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: targetPost.companyPageId, jobId: targetPost.jobId || id, action: "comment", text }) });
        if (!response.ok) throw new Error("Impossible d'enregistrer le commentaire");
        setJobEngagementVersion((version) => version + 1);
        return await response.json();
      } catch {}
      return;
    }
    if (targetPost?.group?.id && (String(id).startsWith("new_") || String(id).startsWith("shared_"))) {
      try {
        const nextPost = await updateLegacyGroupPost(targetPost, (post) => ({
          ...post,
          comments: [...(Array.isArray(post.comments) ? post.comments : []), {
            id: `c${Date.now()}`,
            authorId: session?.user?.id || activeProfile.id || null,
            author: activeProfile.name || CURRENT_USER.name,
            initials: activeProfile.initials || CURRENT_USER.avatar,
            avatarUrl: activeProfileAvatar || null,
            text,
            time: new Date().toISOString(),
            replies: [],
            reactions: {},
          }],
        }));
        if (nextPost) setPosts((ps) => ps.map((p) => p.id === id ? { ...p, ...nextPost } : p));
      } catch (error) {
        console.error("Erreur d'engagement du groupe:", error);
      }
      return;
    }
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, comments: [...p.comments, { id: tempId, authorId: activeProfile.id || session?.user?.id, authorType: p.authorType === "page" ? "page" : "person", companyPageId: p.authorType === "page" ? p.companyPageId : null, author: activeProfile.name || CURRENT_USER.name, initials: activeProfile.initials || CURRENT_USER.avatar, avatarUrl: activeProfileAvatar || null, text, media: media || [] }] } : p)));

    try {
      const res = await fetchBackendApi(`/api/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, media: media || [] }),
      });

      if (!res.ok) throw new Error("Erreur lors de la création du commentaire");

      const savedComment = await res.json();
      // Replace temp comment with saved one
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, comments: p.comments.map((c) => (c.id === tempId ? savedComment : c)) } : p)));
    } catch (error) {
      console.error("Erreur:", error);
      // Remove temp comment on error
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, comments: p.comments.filter((c) => c.id !== tempId) } : p)));
    }
  };
  const updateCommentTree = (comments, commentId, update) => comments.map((comment) => {
    if (comment.id === commentId) return update(comment);
    return { ...comment, replies: updateCommentTree(comment.replies || [], commentId, update) };
  });

  const replyComment = async (postId, commentId, text, media) => {
    const tempId = `r${Date.now()}`;
    const reply = {
      id: tempId,
      authorId: activeProfile.id || session?.user?.id,
      authorType: posts.find((post) => post.id === postId)?.authorType === "page" ? "page" : "person",
      companyPageId: posts.find((post) => post.id === postId)?.authorType === "page" ? posts.find((post) => post.id === postId)?.companyPageId : null,
      author: activeProfile.name || CURRENT_USER.name,
      initials: activeProfile.initials || CURRENT_USER.avatar,
      avatarUrl: activeProfileAvatar || null,
      text,
      media: media || [],
      time: new Date().toISOString(),
      likes: 0,
      liked: false,
    };

    setPosts((ps) => ps.map((p) => (p.id === postId
      ? { ...p, comments: updateCommentTree(p.comments || [], commentId, (comment) => ({ ...comment, replies: [...(comment.replies || []), reply] })) }
      : p)));

    try {
      const targetPost = posts.find((post) => post.id === postId);
      if (targetPost?.group?.id && (String(postId).startsWith("new_") || String(postId).startsWith("shared_"))) {
        const nextPost = await updateLegacyGroupPost(targetPost, (post) => ({
          ...post,
          comments: updateCommentTree(post.comments || [], commentId, (comment) => ({ ...comment, replies: [...(comment.replies || []), reply] })),
        }));
        if (nextPost) setPosts((ps) => ps.map((p) => p.id === postId ? { ...p, ...nextPost } : p));
        return;
      }
      const res = await fetchBackendApi(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, parentId: commentId, media: media || [] }),
      });
      if (!res.ok) throw new Error("Erreur lors de la création de la réponse");
      const savedReply = await res.json();
      setPosts((ps) => ps.map((p) => (p.id === postId
        ? { ...p, comments: updateCommentTree(p.comments || [], commentId, (comment) => ({ ...comment, replies: (comment.replies || []).map((item) => item.id === tempId ? savedReply : item) })) }
        : p)));
    } catch (error) {
      console.error("Erreur:", error);
      setPosts((ps) => ps.map((p) => (p.id === postId
        ? { ...p, comments: updateCommentTree(p.comments || [], commentId, (comment) => ({ ...comment, replies: (comment.replies || []).filter((item) => item.id !== tempId) })) }
        : p)));
    }
  };
  const toggleCommentLike = (postId, commentId) => {
    setPosts((ps) => ps.map((p) => (p.id === postId
      ? {
          ...p,
          comments: p.comments.map((comment) => {
            if (comment.id === commentId) {
              return { ...comment, liked: !comment.liked, likes: (comment.likes || 0) + (comment.liked ? -1 : 1) };
            }
            return { ...comment, replies: (comment.replies || []).map((reply) => reply.id === commentId
              ? { ...reply, liked: !reply.liked, likes: (reply.likes || 0) + (reply.liked ? -1 : 1) }
              : reply) };
          }),
        }
      : p)));
  };
  const toggleCommentReaction = async (postId, commentId, reaction) => {
    const targetPost = posts.find((post) => post.id === postId);
    if (targetPost?.group?.id && (String(postId).startsWith("new_") || String(postId).startsWith("shared_"))) {
      const nextPost = await updateLegacyGroupPost(targetPost, (post) => ({
        ...post,
        comments: updateCommentTree(post.comments || [], commentId, (comment) => ({
          ...comment,
          reactions: { ...(comment.reactions || {}), [reaction]: Number(comment.reactions?.[reaction] || 0) + 1 },
          reaction,
          liked: true,
          totalReactions: Number(comment.totalReactions || 0) + 1,
        })),
      }));
      if (nextPost) setPosts((currentPosts) => currentPosts.map((post) => post.id === postId ? { ...post, ...nextPost } : post));
      return nextPost;
    }
    const response = await fetchBackendApi(`/api/posts/${postId}/comments/${commentId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction }),
    });
    if (!response.ok) throw new Error("Impossible de réagir au commentaire");
    const result = await response.json();
    const updateComments = (comments) => comments.map((comment) => comment.id === commentId
      ? { ...comment, reaction: result.reaction, liked: Boolean(result.reaction), totalReactions: result.totalReactions }
      : { ...comment, replies: updateComments(comment.replies || []) });
    setPosts((currentPosts) => currentPosts.map((post) => post.id === postId
      ? { ...post, comments: updateComments(post.comments || []) }
      : post));
    return result;
  };
  const share = async (id) => {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, shares: (p.shares || 0) + 1 } : p)));
    try {
      const currentPost = posts.find((post) => post.id === id);
      if (currentPost?.group?.id && (String(id).startsWith("new_") || String(id).startsWith("shared_"))) {
        const nextPost = await updateLegacyGroupPost(currentPost, (post) => ({ ...post, shares: Number(post.shares || 0) + 1 }));
        if (nextPost) setPosts((ps) => ps.map((p) => p.id === id ? { ...p, ...nextPost } : p));
        return;
      }
      const response = await fetchBackendApi(`/api/posts/${id}/share`, { method: "POST" });
      if (!response.ok) throw new Error("Impossible d'enregistrer le partage");
      const result = await response.json();
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, shares: result.shares ?? p.shares } : p)));
    } catch {
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, shares: Math.max(0, (p.shares || 1) - 1) } : p)));
    }
  };

  const editPost = async (id, text, visibility) => {
    const response = await fetchBackendApi(`/api/posts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, visibility }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Impossible de modifier la publication");
    setPosts((currentPosts) => currentPosts.map((post) => post.id === id ? { ...post, text: data.post.text, visibility: data.post.visibility } : post));
    setSidebarToast({ message: "Publication modifiée", icon: Check });
  };

  const publish = ({ mode, text, articleTitle, articleExcerpt, media, presentation, mood, identifiedUsers, visibility, reelSound }) => {
    const isArticle = mode === "article";
    const isReel = mode === "reel";
    const postMedia = Array.isArray(media) ? media : [];
    const reelVideo = postMedia.find((item) => item?.type === "video" && typeof item?.url === "string" && item.url.trim()) || postMedia.find((item) => typeof item?.url === "string" && item.url.trim()) || null;
    const resolvedVideoUrl = reelVideo?.url || null;

    // ✅ NE PAS créer de post local pour les reels
    if (isReel) {
      setModalMode(null);
      setSidebarToast({ message: "Reel publié", icon: Check });
      playPostPublishedSound();

      // Envoyer directement à l'API reels (sans passer par setPosts)
      const currentAuthorId = session?.user?.id || activeProfile?.id || null;
      const isPageAuthor = activeAccount === "company" && (companyData?.id || activeProfile?.id);
      const currentPageId = isPageAuthor ? (companyData?.id || activeProfile?.id) : null;

      fetchBackendApi("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `reel-${Date.now()}`,
          videoUrl: resolvedVideoUrl,
          caption: text,
          sound: reelSound || "Son original",
          likes: 0,
          comments: 0,
          shares: 0,
          following: false,
          author: {
            id: currentAuthorId,
            userId: currentAuthorId,
            pageId: currentPageId,
            companyPageId: currentPageId,
            type: isPageAuthor ? "page" : "user",
            accountType: isPageAuthor ? "page" : "user",
            name: activeProfile.name || CURRENT_USER.name,
            handle: activeProfile.username || "@lynoralink",
            avatar: activeProfileAvatar || null,
            verified: Boolean(activeProfile.isPremium || activeProfile.isPlatformAdmin),
          },
          tone: ["#1D2F5C", "#0A1530"],
          media: postMedia.length ? postMedia : [],
        }),
      })
        .then(() => {
          // Recharger les reels après création
          window.dispatchEvent(new CustomEvent("lynoralink:reels-updated"));
        })
        .catch(() => {});
      return;
    }

    // Pour les articles et posts normaux
    const newPost = {
      id: `p${Date.now()}`,
      authorId: session?.user?.id || activeProfile.id || null,
      companyPageId: activeAccount === "company" ? companyData?.id || null : null,
      isArticle,
      isReel: false,
      author: activeProfile.name || CURRENT_USER.name,
      title: activeProfile.title || CURRENT_USER.title,
      initials: activeProfile.initials || CURRENT_USER.avatar,
      avatarUrl: activeProfileAvatar || null,
      time: new Date().toISOString(),
      likes: 0,
      comments: [],
      shares: 0,
      liked: false,
      bookmarked: false,
      mood,
      identifiedUsers,
      visibility,
      reelSound: null,
      videoUrl: null,
      isSponsored: mode === "ad",
      ...(isArticle
        ? {
            headline: articleTitle,
            excerpt: articleExcerpt?.trim() || text.replace(/[#>*_\-\[\]()]/g, "").trim().slice(0, 140) + "…",
            body: text,
            coverUrl: postMedia.find((item) => item?.type === "image" && item?.url)?.url || null,
            presentation: { ...(presentation || { theme: "navy-gold", font: "editorial", density: "airy" }), coverUrl: postMedia.find((item) => item?.type === "image" && item?.url)?.url || null },
            media: postMedia.map(({ id, ...item }) => item),
          }
        : { text, media: postMedia.map(({ id, ...item }) => ({ ...item, label: item.name })) }),
    };
    
    setPosts((ps) => [newPost, ...ps]);
    setModalMode(null);
    setSidebarToast({ message: isArticle ? "Article publié" : "Publication publiée", icon: Check });
    playPostPublishedSound();
    if (isArticle) setOpenArticleId(newPost.id);

    // Persistance en base — remplace l'id local par le vrai id serveur une fois créé.
    fetchBackendApi("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: isArticle ? null : text,
        isArticle,
        headline: isArticle ? articleTitle : undefined,
        excerpt: isArticle ? newPost.excerpt : undefined,
        articleBody: isArticle ? text : undefined,
        presentation: isArticle ? newPost.presentation : undefined,
        media: newPost.media,
        mood,
        identifiedUsers,
        visibility,
        companyPageId: composerCompanyId || (activeAccount === "company" ? companyData?.id : undefined),
        isSponsored: mode === "ad",
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.post) return;
        setPosts((ps) => ps.map((p) => (p.id === newPost.id ? { ...p, id: data.post.id, time: data.post.createdAt } : p)));
        if (isArticle) setOpenArticleId((cur) => (cur === newPost.id ? data.post.id : cur));
        window.dispatchEvent(new CustomEvent("lynoralink:posts-updated"));
        if (composerCompanyId || activeAccount === "company") window.dispatchEvent(new CustomEvent("lynoralink:company-posts-updated"));
        setComposerCompanyId(null);
      })
      .catch(() => {});
  };

  const joinGroupFromFeed = useCallback(async (group) => {
    const userId = session?.user?.id;
    if (!userId || !group?.id) return;
    if (group.privacy === "private") {
      setSidebarToast({ message: "Ouvrez Groupes pour envoyer votre demande d'adhésion", icon: Info });
      navigate("groups");
      return;
    }
    try {
      const groupResponse = await fetchBackendApi(`/api/groups/${group.id}`, { cache: "no-store" });
      const groupData = await groupResponse.json();
      if (!groupResponse.ok) throw new Error(groupData?.error || "Impossible de charger le groupe");
      const currentGroup = groupData.group;
      const currentMembers = normalizeMembersList(currentGroup?.members);
      if (currentMembers.some((member) => String(member?.id) === String(userId))) return;
      const userName = session.user.name || activeProfile.name || "Utilisateur";
      const userInitials = userName.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "U";
      const member = { id: userId, name: userName, initials: userInitials, image: session.user.image || activeProfileAvatar || null, avatarUrl: session.user.image || activeProfileAvatar || null, online: true, role: "member", title: session.user.title || activeProfile.title || "Membre", joinedAt: new Date().toISOString(), postsCount: 0 };
      const updateResponse = await fetchBackendApi(`/api/groups/${group.id}/join`, { method: "POST" });
      const updateData = await updateResponse.json();
      if (!updateResponse.ok) throw new Error(updateData?.error || "Impossible de rejoindre le groupe");
      setPosts((currentPosts) => currentPosts.map((post) => post.group?.id === group.id ? { ...post, group: { ...post.group, memberIds: [...(post.group.memberIds || []), userId] } } : post));
      setSidebarGroups((currentGroups) => currentGroups.map((item) => item.id === group.id
        ? { ...item, members: [...normalizeMembersList(item?.members), updateData.member || member] }
        : item));
      setSidebarToast({ message: `Vous avez rejoint ${group.name}`, icon: Check });
    } catch (error) {
      console.error("joinGroupFromFeed", error);
      setSidebarToast({ message: error.message || "Impossible de rejoindre le groupe", icon: X });
    }
  }, [activeProfile.name, activeProfile.title, activeProfileAvatar, session?.user]);

  const articleCount = posts.filter((p) => p.isArticle && p.author === CURRENT_USER.name).length;
  const openArticle = posts.find((p) => p.id === openArticleId);
  const openSponsoredAdPreview = (ad) => {
    const media = ad.mediaUrl ? [{ url: ad.mediaUrl, type: ad.mediaType === "video" ? "video" : "image", label: ad.title }] : [];
    setOpenArticleId(null);
    setOpenPostId(null);
    setOpenPostOverride({
      id: ad.sourceAdId || ad.id,
      sourceAdId: ad.sourceAdId || ad.id,
      companyPageId: ad.pageId || null,
      pageId: ad.pageId || null,
      authorType: ad.pageId ? "page" : "person",
      author: ad.author || "Annonceur",
      authorId: ad.authorId || null,
      initials: ad.initials || "L",
      avatarUrl: ad.image || null,
      title: ad.title || "Annonce sponsorisée",
      campaignTitle: ad.title || "Annonce sponsorisée",
      time: ad.createdAt || ad.time || null,
      text: ad.description || "",
      excerpt: ad.description || "",
      media,
      comments: Array.isArray(ad.comments) ? ad.comments : [],
      likes: Number(ad.likes || 0),
      shares: Number(ad.shares || 0),
      isSponsored: true,
      objective: ad.objective || null,
      cta: ad.cta || "En savoir plus",
      website: ad.website,
      whatsapp: ad.whatsapp,
      campaignId: ad.campaignId,
    });
  };
  const openPostPreview = (post) => {
    setOpenPostOverride(null);
    if (post?.isArticle || post?.headline) {
      setOpenPostId(null);
      setOpenArticleId(post.id);
      return;
    }
    setOpenArticleId(null);
    setOpenPostId(post.id);
  };
  const openPost = (() => {
    if (openPostOverride) return openPostOverride;
    void jobEngagementVersion;
    const post = visibleFeedPosts.find((item) => String(item.id) === String(openPostId));
    if (!post || post.variant !== "job" || typeof window === "undefined") return post;
    try {
      const key = `lynoralink:job-engagement:${session?.user?.id || "guest"}:${post.id}`;
      const saved = JSON.parse(window.localStorage.getItem(key) || "null");
      return saved && typeof saved === "object" ? { ...post, ...saved } : post;
    } catch {
      return post;
    }
  })();
  const openEvent = posts.find((p) => p.id === openEventId);

  const requestLogout = () => {
    setShowLogoutTransition(true);
  };
  const confirmLogout = async () => {
    await signOut({ redirect: false });
    window.location.replace("/");
  };
  const deleteAccount = () => {
    fetchBackendApi("/api/account", { method: "DELETE" })
      .catch(() => {})
      .finally(async () => {
        await signOut({ redirect: false });
        window.location.replace("/");
      });
  };
  if (!accountReady && view === "feed") {
    return <FeedLoadingShell profileView={view === "profile"} />;
  }

  const accountLockState = session?.user?.status && session.user.status !== "active"
    ? {
        type: session.user.status === "banned" ? "banned" : session.user.status === "deleted" ? "deleted" : "suspended",
        title: session.user.status === "banned" ? "Compte bloqué" : session.user.status === "deleted" ? "Compte supprimé" : "Compte suspendu",
        message: session.user.status === "banned"
          ? "Votre accès à LynoraLink a été bloqué par l’équipe de modération. Tous vos contenus et fonctionnalités sont actuellement verrouillés."
          : session.user.status === "deleted"
            ? "Votre compte LynoraLink a été supprimé. L’accès à la plateforme est définitivement fermé et toutes les données associées sont verrouillées."
            : "Votre accès à LynoraLink est temporairement suspendu. Tous vos contenus et fonctionnalités sont actuellement verrouillés pendant la vérification administrative.",
        badge: session.user.status === "banned" ? "Accès interdit" : session.user.status === "deleted" ? "Compte supprimé" : "Vérification en cours",
      }
    : null;

  const lockOverlay = accountLockState ? (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, pointerEvents: "auto", background: "rgba(8, 15, 22, 0.3)", backdropFilter: "blur(9px)", WebkitBackdropFilter: "blur(9px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 620, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(21,53,84,0.08)", borderRadius: 28, boxShadow: "0 24px 70px rgba(12,33,51,0.12)", overflow: "hidden" }}>
        <div style={{ padding: "22px 24px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: accountLockState.type === "banned" ? "#FDECEC" : "#FFF5E8", color: accountLockState.type === "banned" ? "#B93F3F" : "#A76612", borderRadius: 999, padding: "8px 12px", fontWeight: 700, fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            <Lock size={14} /> {accountLockState.badge}
          </div>
          <LogoBadge size={34} />
        </div>

        <div style={{ padding: "8px 28px 28px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <div style={{ width: 92, height: 92, borderRadius: 24, background: accountLockState.type === "banned" ? "linear-gradient(135deg, #F9D8D8 0%, #F4B1B1 100%)" : "linear-gradient(135deg, #FDE4B7 0%, #F3BE62 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.55)" }}>
              <ShieldCheck size={40} color={accountLockState.type === "banned" ? "#A72E2E" : "#8B5600"} />
            </div>
          </div>

          <div style={{ textAlign: "center", fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 26, color: "#17345C", marginBottom: 12 }}>
            {accountLockState.title}
          </div>

          <div style={{ textAlign: "center", color: "#53657A", fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: "0 auto 24px" }}>
            {accountLockState.message}
          </div>

          <div style={{ background: "#F5F8FB", border: "1px solid #E4EBF4", borderRadius: 18, padding: "16px 18px", color: "#355070", fontSize: 14, lineHeight: 1.6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontWeight: 700 }}>
              <Info size={16} color="#2F659C" /> Informations importantes
            </div>
            <div>
              Tous les contenus de votre interface sont temporairement verrouillés. Si vous pensez qu’il s’agit d’une erreur, veuillez contacter l’équipe de support ou l’administrateur de la plateforme.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            <button
              onClick={() => router.push(`/legal-support?tab=support&reason=${accountLockState.type}`)}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid rgba(23,52,92,0.15)", borderRadius: 12, background: "#FFFFFF", color: "#17345C", fontWeight: 700, fontSize: 13.5, padding: "12px 18px", cursor: "pointer", boxShadow: "0 12px 24px rgba(17, 34, 48, 0.08)" }}
            >
              <Mail size={15} /> Contacter le support
            </button>
            <button
              onClick={async () => {
                await signOut({ redirect: false });
                window.location.replace("/");
              }}
              style={{ border: "none", borderRadius: 12, background: "linear-gradient(135deg, #17345C 0%, #2B5F8B 100%)", color: "#FFFFFF", fontWeight: 700, fontSize: 13.5, padding: "12px 22px", cursor: "pointer", boxShadow: "0 12px 28px rgba(23,52,92,0.2)" }}
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {showLogoutTransition && (
        <LogoutTransition
          userName={activeProfile.name}
          onComplete={confirmLogout}
        />
      )}
      {lockOverlay}
      <div className={`lynora-feed-page${view === "company" ? " lynora-company-view" : ""}`} style={{ fontFamily: "'Inter', sans-serif", background: C.navy50, minHeight: "100dvh", paddingTop: "var(--lynora-header-offset)", filter: accountLockState ? "blur(8px) saturate(0.7)" : "none", pointerEvents: accountLockState ? "none" : "auto", userSelect: accountLockState ? "none" : "auto" }}>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input, textarea, button { font-family: inherit; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${C.navy100}; border-radius: 8px; }

        :root {
          --lynora-header-offset: 96px;
        }
        @media (max-width: 900px) {
          :root {
            --lynora-header-offset: 0px;
          }
        }
        .lynora-feed-container {
          padding: 0 20px 60px;
        }
        .lynora-reel-rail {
          margin: 8px 0 16px;
          padding: 16px;
          overflow: hidden;
          border: 1px solid ${C.line};
          border-radius: 16px;
          background: ${C.white};
          box-shadow: 0 8px 24px rgba(15, 51, 82, 0.06);
        }
        .lynora-reel-rail .lynora-reel-preview-viewport {
          border-radius: 12px;
        }
        .lynora-profile-page {
          height: calc(100dvh - var(--lynora-header-offset, 0px));
          min-height: 0;
          padding-bottom: 0;
          overflow: hidden;
          background: #f3f2ef;
        }
        .lynora-profile-page .lynora-profile-root {
          height: 100%;
          min-height: 0 !important;
        }
        @media (max-width: 900px) {
          .lynora-feed-container {
            padding: 0 16px 24px;
          }
          .lynora-reel-rail {
            padding: 12px;
          }
          .lynora-profile-page {
            padding-bottom: 0;
          }
        }
        @media (max-width: 560px) {
          .lynora-feed-page { width: 100%; max-width: none; min-width: 0; min-height: 100dvh; overflow-x: hidden; }
          .lynora-feed-container { width: 100%; max-width: none; min-width: 0; padding: 0 12px 12px; }
          .lynora-company-detail-container { width: 100vw; margin-left: 50%; transform: translateX(-50%); padding: 0 0 12px; }
          .lynora-company-detail-container { margin-left: 0 !important; margin-right: 0 !important; transform: none !important; }
          .lynora-company-detail-container .company-page { width: 100%; min-width: 0; }
          .lynora-company-detail-container .company-detail-shell { width: 100%; max-width: none; padding-inline: 12px; }
          .lynora-company-detail-container .company-page-hero { margin-inline: -12px; border-radius: 0; height: 170px; }
          .lynora-company-detail-container .company-page-identity,
          .lynora-company-detail-container .company-page-metadata,
          .lynora-company-detail-container .company-page-stats,
          .lynora-company-detail-container .company-page-tabs,
          .lynora-company-detail-container .company-page-content { padding-inline: 0; }
          .lynora-company-detail-container .company-page-identity { margin-top: -44px; }
          .lynora-company-detail-container .company-page-actions { width: 100%; margin-top: 4px; }
          .lynora-company-detail-container .company-page-actions > button { min-width: 0; }
          .lynora-company-detail-container .company-page-stats { gap: 8px; }
          .lynora-company-detail-container .company-page-tabs { position: sticky; top: 0; z-index: 8; background: ${C.navy50}; }
          .lynora-company-detail-container .company-page-content { margin-top: 12px; }
          .lynora-company-detail-container .company-page-content { width: 100%; }
          .lynora-company-detail-container .company-page-content > div:first-child { width: 100%; max-width: none; }
          .lynora-company-directory-container { margin-top: 0; }
          .lynora-company-view .lynora-view-back-button { display: none; }
          .lynora-company-directory-container .company-pages-directory { margin-top: calc(-1 * var(--lynora-header-offset, 0px)); }
          .lynora-feed-container > .lynora-grid { padding-top: 8px !important; }
          .lynora-grid { display: block !important; width: 100%; max-width: none; min-width: 0; }
          .lynora-grid > div { width: 100%; min-width: 0; }
          .lynora-grid > div:not(.lynora-fixed-sidebar) { max-width: 680px; margin-inline: auto; }
          .lynora-feed-main { width: 100% !important; max-width: none !important; margin: 0 !important; }
          .lynora-settings-view { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .lynora-abonnement-view { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .lynora-mobile-shortcuts {
            display: flex;
            width: 100%;
            gap: 6px;
            padding: 8px 0;
            overflow-x: auto;
            scrollbar-width: none;
          }
          .lynora-mobile-shortcuts::-webkit-scrollbar { display: none; }
          .lynora-mobile-shortcuts button {
            flex: 1 0 0;
            min-width: 82px;
            min-height: 48px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 6px 8px;
            border: 1px solid ${C.line};
            border-radius: 10px;
            background: ${C.white};
            color: ${C.muted};
            font-size: 10.5px;
            font-weight: 700;
            white-space: nowrap;
          }
          .lynora-mobile-shortcuts button.is-active {
            border-color: ${C.gold600};
            background: ${C.gold100};
            color: ${C.navy800};
          }
          .feed-suggestions-rail,
          .feed-suggestions-grid,
          .feed-page-suggestions-grid {
            width: 100vw !important;
            max-width: none !important;
            margin-left: calc(50% - 50vw) !important;
            border-radius: 0 !important;
          }
          .feed-suggestions-rail { gap: 10px !important; padding: 0 0 8px !important; }
          .feed-suggestions-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
            padding: 0 0 8px !important;
            overflow: visible !important;
          }
          .feed-suggestions-grid > * {
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            flex: none !important;
            border-radius: 0 !important;
          }
          .feed-suggestion-card {
            width: 100% !important;
            max-width: none !important;
            flex-basis: auto !important;
            border-radius: 0 !important;
          }
          .feed-suggestion-card > div:first-child {
            height: 56px !important;
          }
          .feed-suggestion-card > div:first-child > div {
            bottom: -14px !important;
          }
          .feed-suggestion-card > div:nth-child(2) {
            padding-top: 18px !important;
          }
          .feed-suggestion-card button {
            font-size: 9.5px !important;
            padding: 6px 6px !important;
          }
          .feed-page-suggestions-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
            overflow: visible !important;
            padding: 0 0 8px;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }
          .feed-page-suggestions-grid::-webkit-scrollbar { display: none; }
          .feed-page-suggestions-grid > * {
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            flex: none !important;
            border-radius: 0 !important;
          }
          .feed-page-suggestion-card {
            padding: 10px !important;
            border-radius: 0 !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center;
            gap: 8px !important;
          }
          .feed-page-suggestion-card > div { width: 100%; }
          .feed-page-suggestion-card > div > div:first-child,
          .feed-page-suggestion-card > div > div:nth-child(2) {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .feed-page-suggestion-card button { width: 100%; justify-content: center; }
          .lynora-reel-rail {
            margin-inline: -12px;
            padding: 12px 0 0;
            border-right: 0;
            border-left: 0;
            border-radius: 0;
            box-shadow: none;
          }
          .lynora-reel-rail > div:first-child {
            padding-inline: 12px !important;
          }
          .lynora-reel-rail .lynora-reel-preview-viewport {
            border-radius: 0;
          }
          .lynora-feed-page input, .lynora-feed-page textarea { font-size: 16px; }
        }
        .lynora-sticky-sidebar {
          position: fixed !important;
          top: var(--lynora-header-offset);
          isolation: isolate;
          overscroll-behavior: contain;
        }
        .lynora-fixed-sidebar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .lynora-fixed-sidebar::-webkit-scrollbar {
          display: none;
        }
        .sponsored-ad-card {
          overflow: hidden;
          border: 1px solid #D9A536;
          border-radius: 16px;
          background: linear-gradient(145deg, #FFFDF5 0%, #FFFFFF 46%, #F4F8FC 100%);
          box-shadow: 0 8px 24px rgba(15, 51, 82, 0.10);
        }
        .sponsored-ad-label {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 16px 4px;
          color: #8A5A00;
          background: transparent !important;
          background-image: none !important;
          border-bottom: 0;
          font-size: 12px;
          font-weight: 800;
        }
        .sponsored-ad-label span { color: #997C3E; font-weight: 600; }
        .sponsored-ad-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px 8px; }
        .sponsored-ad-header strong, .sponsored-ad-header span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sponsored-ad-header strong { color: #17345C; font-size: 14px; }
        .sponsored-ad-header span { margin-top: 2px; color: #718096; font-size: 11px; }
        .sponsored-ad-copy { padding: 4px 16px 14px; }
        .sponsored-ad-copy h3 { margin: 0 0 5px; color: #17345C; font-size: 18px; line-height: 1.3; }
        .sponsored-ad-copy p { margin: 0; color: #53657A; font-size: 13px; line-height: 1.5; }
        .sponsored-ad-media { display: block; width: 100%; max-height: 390px; object-fit: cover; background: #17345C; }
        .sponsored-ad-actions { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px 16px 14px; background: rgba(244, 248, 252, 0.72); }
        .sponsored-ad-action { display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex: 0 0 auto; min-width: 86px; min-height: 36px; padding: 7px 12px; border: 0; border-radius: 6px; background: transparent; color: #315B7D; font-size: 11.5px; line-height: 1; font-weight: 800; text-decoration: none; cursor: pointer; white-space: nowrap; }
        .sponsored-ad-action:hover { opacity: 0.72; }
        .sponsored-ad-action-primary { color: #17345C; }
        .sponsored-ad-action-secondary { color: #315B7D; border: 1px solid var(--app-border); }
        .sponsored-ad-action-comment { color: #0A66C2; border: 1px solid #B9D9F5; }
        .sponsored-ad-action-message { color: #0A66C2; }
        .sponsored-ad-action-whatsapp { color: #159447; }
        .sidebar-sponsored-item { display: flex; flex-direction: column; }
        .sidebar-sponsored-item + .sidebar-sponsored-item { border-top: 1px solid var(--app-border); }
        .sidebar-ad-card { transition: background 200ms cubic-bezier(0.4,0,0.2,1); animation: sidebar-ad-enter 280ms ease-out both; }
        .sidebar-ad-card:hover { background: rgba(15,51,82,0.015); }
        .sidebar-ad-linkrow { transition: background 180ms cubic-bezier(0.4,0,0.2,1); }
        .sidebar-ad-linkrow:hover { background: rgba(15,51,82,0.05) !important; }
        .sidebar-ad-toggle:hover { text-decoration: underline; }
        .sidebar-ad-spin { animation: sidebar-ad-spin 0.8s linear infinite; }
        @keyframes sidebar-ad-spin { to { transform: rotate(360deg); } }
        @keyframes sidebar-ad-enter { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .sidebar-sponsored-cta {
          transition: background 180ms cubic-bezier(0.4,0,0.2,1), color 180ms cubic-bezier(0.4,0,0.2,1), transform 120ms cubic-bezier(0.4,0,0.2,1);
          will-change: transform;
        }
        .sidebar-sponsored-cta:hover {
          background: var(--navy800) !important;
          color: var(--app-surface) !important;
          border-color: var(--navy800) !important;
        }
        .sidebar-sponsored-cta:active { transform: scale(0.97); }
        .sidebar-sponsored-cta:focus-visible { outline: 3px solid rgba(15, 51, 82, 0.22); outline-offset: 2px; }
        .sidebar-sponsored-secondary a { transition: opacity 160ms ease; }
        .sidebar-sponsored-secondary a:hover { opacity: 0.82; }
        @media (max-width: 480px) {
          .sidebar-sponsored-cta { padding: 5px 9px !important; font-size: 11.5px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sidebar-ad-card, .sidebar-ad-linkrow, .sidebar-sponsored-cta, .sidebar-ad-spin { transition: none !important; animation: none !important; }
        }
        @media (max-width: 480px) {
          .sponsored-ad-actions { gap: 4px; padding-inline: 10px; }
          .sponsored-ad-action { min-width: 0; padding-inline: 6px; font-size: 10.5px; }
        }
        .sponsored-ad-card-story { max-width: 390px; margin-inline: auto; }
        .sponsored-ad-card-story .sponsored-ad-media { aspect-ratio: 9 / 14; max-height: 560px; }
        @media (max-width: 640px) {
          .sponsored-ad-copy h3 { font-size: 16px; }
          .sponsored-ad-media { max-height: 320px; }
          .sponsored-ad-card-story .sponsored-ad-media { max-height: 520px; }
        }
        .lynora-sidebar-placeholder {
          min-height: 1px;
        }
        .lynora-mobile-shortcuts { display: none; }
      `}</style>


      <SharedTopNav
        ref={topnavRef}
        profile={activeProfile}
        accountMode={activeAccount}
        personalAccount={{ ...profile, accountType: "personal", displayName: profile.name || "Compte classique" }}
        onSwitchAccount={switchAccount}
        view={view}
        onNavigate={navigate}
        onRequestLogout={requestLogout}
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
        adminBadge={adminEventCount}
        networkBadge={networkBadge}
        feedBadge={unreadPublications}
        groupBadge={groupBadge}
        companyBadge={companyBadge}
        isAdmin={isAdmin}
        onOpenCampaign={openCampaign}
        isPremium={subscriptionData?.plan === "premium"}
        onSearch={handleSearch}
        onSelectSearchResult={handleSearchResult}
        searchResults={searchResults}
        searchLoading={searchLoading}
        profileLoading={profileLoading}
        companyPages={companyData ? [companyData] : []}
      />

      {accountSwitch && (
        <AccountSwitchTransition
          from={accountSwitch.from}
          to={accountSwitch.to}
          onDone={() => {
            const nextView = accountSwitch.navigateTo;
            const nextAccount = accountSwitch.account;
            setAccountSwitch(null);
            if (nextAccount) setActiveAccount(nextAccount);
            if (nextView) navigate(nextView);
          }}
        />
      )}

      {view === "feed" ? (
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "300px minmax(0,1fr) 320px", gap: 32, alignItems: "start", paddingTop: 28 }} className="lynora-grid lynora-feed-container">
          {!feedContentReady ? (
            <>
              <aside aria-label="Chargement de la navigation latérale">
                <LeftSidebarSkeleton />
              </aside>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
                <ComposerSkeleton />
                <SkeletonStoryRail />
                <FeedSkeleton count={5} />
              </div>

              <aside aria-label="Chargement des informations latérales">
                <RightSidebarSkeleton />
              </aside>
            </>
          ) : (
            <>
              <div className="lynora-sidebar-placeholder" />

              <div style={{ position: "fixed", top: "calc(var(--lynora-header-offset) + 28px)", left: "calc((100vw - min(1400px, 100vw)) / 2)", width: 300, zIndex: 10, maxHeight: "calc(100vh - var(--lynora-header-offset) - 28px - 60px)", overflowY: "auto", paddingRight: 8 }} className="lynora-sticky-sidebar lynora-fixed-sidebar">
                <LeftSidebar
                  profile={activeProfile}
                  articleCount={articleCount}
                  connectionCount={connections.length}
                  activeView={view}
                  onOpenComposer={setModalMode}
                  onOpenCampaign={openCampaign}
                  onNavigate={navigate}
                  onNavigateShortcut={async (shortcut) => {
                    if (activeAccount === "company" && (shortcut === "my-posts" || shortcut === "my-articles") && companyData?.id) {
                      try {
                        const response = await fetchBackendApi(`/api/posts?companyPageId=${encodeURIComponent(companyData.id)}&limit=50`, { cache: "no-store" });
                        if (response.ok) {
                          const data = await response.json();
                          if (Array.isArray(data.posts)) setPosts((current) => mergeOptimisticPosts(current, data.posts));
                        }
                      } catch {
                        // Keep the currently loaded posts if the dedicated request fails.
                      }
                    }
                    navigate(shortcut);
                  }}
                  onNavigateProfile={() => {
                    if (activeAccount === "company") {
                      setCompanyTab("mine");
                      setSelectedCompanyPage(null);
                      navigate("company");
                    } else {
                      navigate("profile");
                    }
                  }}
                />
              </div>

              <div className="lynora-feed-main" style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                <MobileFeedShortcuts activeView={view} onNavigate={navigate} />
                  <CompanyComposer onOpen={(mode) => openCompanyComposer(mode, null)} avatarUrl={activeProfileAvatar} initials={activeProfile.initials || CURRENT_USER.avatar} />
                
                <Story
                  accountMode={activeAccount}
                  currentUser={{
                    name: activeProfile.name || CURRENT_USER.name,
                    initials: activeProfile.initials || CURRENT_USER.avatar,
                    id: activeProfile.id || "current-user",
                    image: storyProfileAvatar || activeProfile.image || null,
                  }}
                  onReply={async (groupId, storyId, message, context = {}) => {
                    const storyAuthorId = context.author?.id;
                    if (!storyAuthorId || storyAuthorId === activeProfile.id) return;
                    const story = context.story || {};
                    const storyUrl = story.mediaUrl || story.image || null;
                    const attachments = storyUrl ? [{
                      url: storyUrl,
                      type: story.type === "video" ? "video" : "image",
                      name: `Story de ${context.author?.name || "cet utilisateur"}`,
                      label: story.text || "Story",
                    }] : [];
                    const storyReference = story.type === "text"
                      ? `Story de ${context.author?.name || "cet utilisateur"} : « ${story.text || "Story texte"} »`
                      : `Réponse à la story de ${context.author?.name || "cet utilisateur"}`;
                    const text = `${storyReference}\n\n${message}`;
                    try {
                      const response = await fetchBackendApi("/api/messages", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ otherUserId: storyAuthorId, text, attachments }),
                      });
                      if (!response.ok) throw new Error("Impossible d'envoyer la réponse à la story");
                      window.dispatchEvent(new CustomEvent("lynoralink:messages-updated"));
                    } catch (error) {
                      console.error("Failed to send story reply:", error);
                    }
                  }}
                  onReact={async (groupId, storyId, reaction) => {
                    try {
                      const response = await fetchBackendApi(`/api/stories/${storyId}/reactions`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ reaction }),
                      });
                      if (!response.ok) throw new Error("Impossible d'enregistrer la reaction");
                      return response.json();
                    } catch (err) {
                      console.error("Failed to react to story:", err);
                      return null;
                    }
                  }}
                  onAction={async (action, groupId, storyId, author) => {
                    const storyLink = `${window.location.origin}/?story=${encodeURIComponent(storyId)}`;
                    if (action === "copy") {
                      await navigator.clipboard?.writeText(storyLink);
                      return "Lien copié";
                    }
                    if (action === "share") {
                      const response = await fetchBackendApi(`/api/stories/${storyId}/actions`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "share" }),
                      });
                      if (!response.ok) throw new Error("Partage impossible");
                      if (navigator.share) {
                        await navigator.share({ title: `Story de ${author?.name || "cet utilisateur"}`, url: storyLink });
                      } else {
                        await navigator.clipboard?.writeText(storyLink);
                      }
                      return navigator.share ? "Story partagée" : "Lien copié";
                    }
                    if (action === "report") {
                      const response = await fetchBackendApi("/api/admin/reports", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: "story", targetId: storyId, targetLabel: `Story de ${author?.name || "cet utilisateur"}`, reason: "Contenu de story signalé" }),
                      });
                      if (!response.ok) throw new Error("Signalement impossible");
                      return "Story signalée";
                    }
                    const response = await fetchBackendApi(`/api/stories/${storyId}/actions`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action }),
                    });
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) throw new Error(data.error || "Action impossible");
                    if (action === "save") return data.saved ? "Story enregistrée" : "Story retirée des enregistrements";
                    if (action === "unfollow") return "Vous ne verrez plus les stories de cet utilisateur";
                    return "Action enregistrée";
                  }}
                  style={{ width: "100%" }}
                />
                
                {visibleFeedPosts.length === 0 ? (
                  <>
                    <div style={{ padding: "32px 20px", textAlign: "center", background: "#F7FAFC", border: `1px solid ${C.line}`, borderRadius: 18 }}>
                      <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 20, color: C.ink, marginBottom: 8 }}>
                        Aucune publication pour le moment
                      </div>
                      <div style={{ color: C.muted, fontSize: 14 }}>
                        Publiez le premier message pour lancer le fil d’actualité.
                      </div>
                    </div>
                    <div className="lynora-feed-inline-suggestions" style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
                      <SuggestionsSection
                        suggestions={(activeAccount === "company" ? pageSuggestions : networkSuggestions).filter((suggestion) => !dismissedSuggestionIds.includes(suggestion.id))}
                        connectedIds={activeAccount === "company" ? followedPageIds : connectedSuggestionIds}
                        pendingRequestIds={pendingSuggestionIds}
                        onConnect={connectSuggestion}
                        onCancel={cancelConnectionRequest}
                        onDismiss={dismissSuggestion}
                        onNavigate={navigate}
                        onOpenProfile={openUserProfile}
                      />
                      <GroupSuggestionsRail groups={sidebarGroups} currentUserId={session?.user?.id} onJoinGroup={joinGroupFromFeed} onNavigate={navigate} />
                    </div>
                  </>
                ) : (
                  <>
                    {(() => {
                      const personSuggestions = activeAccount === "company" ? pageSuggestions : networkSuggestions;
                      const suggestionTypes = ["page", "group"];
                      const rotatedSuggestionTypes = [
                        suggestionTypes[(0 + suggestionRotation) % suggestionTypes.length],
                        suggestionTypes[(1 + suggestionRotation) % suggestionTypes.length],
                      ];
                      const mountedSuggestionTypes = new Set();

                      const showPageSuggestions = visibleFeedPosts.length > 0 && pageSuggestions.length > 0;
                      const showGroupSuggestions = visibleFeedPosts.length > 0 && sidebarGroups.length > 0;

                      return (
                        <>
                          {visibleFeedPosts.map((post, index) => (
                            <React.Fragment key={post.id}>
                              <PostCard
                                post={post}
                                group={post.group || null}
                                isOwn={Boolean(session?.user?.id && post.authorId === session.user.id)}
                                currentUser={{
                                  id: session?.user?.id || activeProfile.id,
                                  name: activeProfile.name || CURRENT_USER.name,
                                  initials: activeProfile.initials || CURRENT_USER.avatar,
                                  avatarUrl: activeProfileAvatar || null,
                                }}
                                onJoinGroup={joinGroupFromFeed}
                                onConnect={connectUser}
                                onRemove={removeConnection}
                                onLeaveGroup={leaveGroupFromFeed}
                                onToggleLike={toggleLike}
                                onSelectReaction={selectReaction}
                                onToggleBookmark={toggleBookmark}
                                onAddComment={addComment}
                                onReplyComment={replyComment}
                                onToggleCommentLike={(commentId) => toggleCommentLike(post.id, commentId)}
                                onShare={share}
                                onMessage={(post) => {
                                  const targetId = typeof post === "string" ? post : (post?.authorId || post?.id);
                                  if (!targetId) return;
                                  setDirectChatOpen(true);
                                  openConversationWithUser({ id: targetId, pageId: typeof post === "object" ? (post.companyPageId || post.pageId || null) : null, name: typeof post === "object" ? (post.author || post.name) : undefined, image: typeof post === "object" ? (post.avatarUrl || post.image || null) : null, avatarUrl: typeof post === "object" ? (post.avatarUrl || post.image || null) : null });
                                }}
                                onJoinEvent={joinEventFromFeed}
                                onOpenEvent={(post) => setOpenEventId(post.id)}
                                onOpenArticle={(p) => setOpenArticleId(p.id)}
                                onOpenPost={post.isSponsored ? openSponsoredAdPreview : openPostPreview}
                                onJobAction={(job) => {
                                  if (String(job.companyPageId) === String(session?.user?.id)) {
                                    setView("company");
                                    setCompanyTab("mine");
                                    return;
                                  }
                                  setDirectChatOpen(true);
                                  openConversationWithUser({ id: job.authorId, pageId: job.companyPageId, name: job.author, image: job.avatarUrl || null, avatarUrl: job.avatarUrl || null, initials: job.initials });
                                }}
                                onEditPost={editPost}
                                onFollowPage={followPage}
                                followedPageIds={followedPageIds}
                                isCompanyAccount={activeAccount === "company"}
                              />
                              {index === 0 && reelPreview.length > 0 && (
                                <section className="lynora-reel-rail" aria-labelledby="lynora-reel-rail-title">
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
                                    <h2 id="lynora-reel-rail-title" style={{ fontSize: 15, fontWeight: 800, color: C.ink, margin: 0 }}>Reels</h2>
                                    <button
                                      type="button"
                                      onClick={() => setReelsOpen(true)}
                                      style={{ border: "none", background: "transparent", color: C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}
                                    >
                                      Voir tout
                                    </button>
                                  </div>
                                  <div className="lynora-reel-preview-viewport" onPointerDown={handleReelPreviewPointerDown} onPointerUp={handleReelPreviewPointerUp} onPointerCancel={handleReelPreviewPointerCancel} style={{ position: "relative", overflow: "hidden", display: "flex", justifyContent: "flex-start", width: "100%", height: isMobileReelPreview ? 430 : 360, maxWidth: "100%", padding: isMobileReelPreview ? 8 : 0, boxSizing: "border-box", border: "1px solid rgba(15,51,82,0.12)", borderRadius: isMobileReelPreview ? 16 : 24, background: "#F7FAFD", touchAction: "pan-x", cursor: "grab" }}>
                                    {reelPreview.length > 1 && !reelPreviewLoading && (
                                      <>
                                        <button
                                          type="button"
                                          aria-label="Reel précédent"
                                          onClick={() => moveReelPreview(-1)}
                                          disabled={reelPreviewIndex === 0}
                                          style={{ position: "absolute", zIndex: 2, left: 12, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, border: "1px solid rgba(255,255,255,.35)", borderRadius: "50%", background: "rgba(10,21,48,.72)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: reelPreviewIndex === 0 ? "default" : "pointer", opacity: reelPreviewIndex === 0 ? 0.4 : 1 }}
                                        >
                                          <ArrowLeft size={18} />
                                        </button>
                                        <button
                                          type="button"
                                          aria-label="Reel suivant"
                                          onClick={() => moveReelPreview(1)}
                                          disabled={reelPreviewIndex === reelPreview.length - 1 && !reelPreviewHasMore}
                                          style={{ position: "absolute", zIndex: 2, right: 12, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, border: "1px solid rgba(255,255,255,.35)", borderRadius: "50%", background: "rgba(10,21,48,.72)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: reelPreviewIndex === reelPreview.length - 1 && !reelPreviewHasMore ? "default" : "pointer", opacity: reelPreviewIndex === reelPreview.length - 1 && !reelPreviewHasMore ? 0.4 : 1 }}
                                        >
                                          <ArrowRight size={18} />
                                        </button>
                                      </>
                                    )}
                                    {reelPreviewLoading ? (
                                      <div style={{ display: "flex", gap: isMobileReelPreview ? 8 : 16 }}>
                                        {[1, 2, 3, 4].map((item) => (
                                          <div key={item} style={{ width: isMobileReelPreview ? mobileReelCardWidth : 220, height: isMobileReelPreview ? 412 : 360, borderRadius: isMobileReelPreview ? 12 : 24, background: "linear-gradient(135deg, rgba(19,35,70,0.22), rgba(246,211,116,0.16))", flexShrink: 0 }} />
                                        ))}
                                      </div>
                                    ) : (
                                      <div
                                        className="lynora-reel-preview-track"
                                        style={{
                                          display: "flex",
                                          gap: isMobileReelPreview ? 8 : 16,
                                          transform: isMobileReelPreview ? `translateX(-${reelPreviewIndex * (mobileReelCardWidth + 8)}px)` : `translateX(-${reelPreviewIndex * 236}px)`,
                                          transition: "transform 380ms ease",
                                          width: isMobileReelPreview ? `${Math.max(reelPreview.length * (mobileReelCardWidth + 8), 0)}px` : `${Math.max(reelPreview.length * 236, 0)}px`,
                                          paddingBottom: 4,
                                          justifyContent: "flex-start",
                                        }}
                                      >
                                        {reelPreview.map((reel, reelIndex) => {
                                          const gradient = Array.isArray(reel.tone) && reel.tone.length >= 2 ? `linear-gradient(160deg, ${reel.tone[0]}, ${reel.tone[1]})` : "linear-gradient(135deg, #162d57, #0b1836)";
                                          const posterUrl = typeof reel.poster === "string" && reel.poster.trim() ? reel.poster : null;
                                          const videoUrl = typeof reel.videoUrl === "string" && reel.videoUrl.trim() ? reel.videoUrl : null;
                                          const isVideoPreview = Boolean(videoUrl && /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(videoUrl));

                                          return (
                                            <button
                                              key={reel.id || reelIndex}
                                              type="button"
                                              onClick={() => { if (!consumeReelPreviewClick()) setReelsOpen(true); }}
                                              onMouseEnter={(event) => {
                                                const video = event.currentTarget.querySelector("video");
                                                if (video) {
                                                  video.currentTime = 0;
                                                  video.play().catch(() => {});
                                                }
                                              }}
                                              onMouseLeave={(event) => {
                                                const video = event.currentTarget.querySelector("video");
                                                if (video) {
                                                  video.pause();
                                                  video.currentTime = 0;
                                                }
                                              }}
                                              style={{
                                                width: isMobileReelPreview ? mobileReelCardWidth : 220,
                                                border: "none",
                                                background: "transparent",
                                                padding: 0,
                                                textAlign: "left",
                                                cursor: "pointer",
                                                borderRadius: isMobileReelPreview ? 12 : 24,
                                                overflow: "hidden",
                                                boxShadow: "none",
                                                flexShrink: 0,
                                              }}
                                            >
                                              <div
                                                style={{
                                                  position: "relative",
                                                  height: isMobileReelPreview ? 412 : 360,
                                                  borderRadius: isMobileReelPreview ? 12 : 24,
                                                  background: posterUrl || videoUrl ? "transparent" : gradient,
                                                  overflow: "hidden",
                                                }}
                                              >
                                                {isVideoPreview ? (
                                                  <video
                                                    src={videoUrl}
                                                    poster={posterUrl || undefined}
                                                    muted
                                                    loop
                                                    playsInline
                                                    preload="metadata"
                                                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                                  />
                                                ) : posterUrl ? (
                                                  <img
                                                    src={posterUrl}
                                                    alt={reel.caption || "Reel"}
                                                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                                  />
                                                ) : null}
                                                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,12,24,0.08) 0%, rgba(6,12,24,0.82) 100%)" }} />
                                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: 14 }}>
                                                  <div style={{ width: "100%" }}>
                                                    <div style={{ color: "rgba(255,255,255,0.92)", fontSize: 12.5, lineHeight: 1.4, minHeight: 36, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                                      {reel.caption || "Nouvelle publication"}
                                                    </div>
                                                  </div>
                                                </div>
                                                <div style={{ position: "absolute", left: 12, top: 12, display: "flex", alignItems: "center", gap: 8, borderRadius: 999, background: "rgba(9,17,30,0.52)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "7px 11px", fontSize: 11, fontWeight: 700 }}>
                                                  <Video size={14} />
                                                  Reels
                                                </div>
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </section>
                              )}
                              {index === 3 && showPageSuggestions && (
                                <div className="lynora-feed-inline-suggestions">
                                  <PageSuggestionsGrid
                                    key={`content-suggestion-page-${suggestionRotation}`}
                                    pages={pageSuggestions}
                                    followedPageIds={followedPageIds}
                                    onFollowPage={followPage}
                                    onNavigate={navigate}
                                    onDismiss={dismissSuggestion}
                                    dismissedIds={dismissedSuggestionIds}
                                  />
                                </div>
                              )}
                              {index === 5 && showGroupSuggestions && (
                                <div className="lynora-feed-inline-suggestions">
                                  <GroupSuggestionsRail
                                    key={`content-suggestion-group-${suggestionRotation}`}
                                    groups={sidebarGroups}
                                    currentUserId={session?.user?.id}
                                    onJoinGroup={joinGroupFromFeed}
                                    onNavigate={navigate}
                                    compactGrid
                                    onDismiss={dismissSuggestion}
                                    dismissedIds={dismissedSuggestionIds}
                                  />
                                </div>
                              )}
                              {((index === 2) || (visibleFeedPosts.length < 3 && index === visibleFeedPosts.length - 1)) && personSuggestions.length > 0 && (
                                <div className="lynora-feed-inline-suggestions">
                                  <SuggestionsSection
                                    suggestions={personSuggestions.filter((suggestion) => !dismissedSuggestionIds.includes(suggestion.id))}
                                    connectedIds={activeAccount === "company" ? followedPageIds : connectedSuggestionIds}
                                    pendingRequestIds={pendingSuggestionIds}
                                    onConnect={connectSuggestion}
                                    onCancel={cancelConnectionRequest}
                                    onDismiss={dismissSuggestion}
                                    onNavigate={navigate}
                                    onOpenProfile={openUserProfile}
                                  />
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>

              <div className="lynora-sidebar-placeholder" />

              <div style={{ position: "fixed", top: "calc(var(--lynora-header-offset) + 28px)", right: "calc((100vw - min(1400px, 100vw)) / 2)", width: 320, zIndex: 10, maxHeight: "calc(100vh - var(--lynora-header-offset) - 28px - 60px)", overflowY: "auto", paddingRight: 8 }} className="lynora-sticky-sidebar lynora-fixed-sidebar">
                <RightSidebar
                  ads={sponsoredAds}
                  groups={sidebarGroups}
                  currentUserId={session?.user?.id}
                  onOpenArticle={(p) => setOpenArticleId(p.id)}
                  onSelectTrend={selectTrend}
                  suggestions={activeAccount === "company" ? pageSuggestions : networkSuggestions}
                  pageSuggestions={pageSuggestions}
                  accountMode={activeAccount}
                  connectedIds={activeAccount === "company" ? followedPageIds : connectedSuggestionIds}
                  followedPageIds={followedPageIds}
                  onOpenProfile={openUserProfile}
                  pendingRequestIds={pendingSuggestionIds}
                  onConnect={connectSuggestion}
                  onCancel={cancelConnectionRequest}
                  onFollowPage={followPage}
                  onJoinGroup={joinGroupFromFeed}
                  onNavigate={navigate}
                  onMessage={(messageAd) => {
                    setDirectChatOpen(true);
                    openConversationWithUser({ id: messageAd.ownerId || messageAd.authorId, pageId: messageAd.pageId || null, name: messageAd.author, image: messageAd.image || null });
                  }}
                  birthdays={connections}
                />
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {view === "groups" && (
            <Groupe
              initialGroupId={targetGroupId}
              onBack={() => navigate("feed")}
              onPostCreated={(post) => setPosts((currentPosts) => [post, ...currentPosts.filter((item) => item.id !== post.id)])}
            />
          )}
          {view === "profile" && (
            <div style={{ maxWidth: 1400, margin: "0 auto", paddingTop: 0 }} className="lynora-feed-container lynora-profile-page">
              <ProfileLynoraLink targetUserId={profileTargetId} headerOffset={topnavHeight} />
            </div>
          )}

          {view === "settings" && (
            <div style={{ maxWidth: 1400, margin: "0 auto", paddingTop: 28 }} className="lynora-feed-container lynora-settings-view">
              {profileLoading ? <ProfileSkeleton /> : <SettingsLynora showTopNav={false} initialSection={searchParams?.get("section") || "profil"} />}
            </div>
          )}

          {view === "network" && (
            <div style={{ width: "100%", maxWidth: "none", margin: 0, paddingTop: 0, height: "calc(100dvh - var(--lynora-header-offset, 0px))", minHeight: "calc(100dvh - var(--lynora-header-offset, 0px))", overflow: "hidden" }} className="lynora-feed-container lynora-network-page">
              <Reseau
                  connections={connections}
                  invitations={invitations}
                  suggestions={activeAccount === "company" ? pageSuggestions : networkSuggestions}
                  accountMode={activeAccount}
                  pageProfile={activeAccount === "company" ? activeProfile : null}
                  initialTab={networkInitialTab}
                  pendingRequestIds={pendingSuggestionIds}
                  onConnectionsChange={setConnections}
                  onInvitationsChange={setInvitations}
                  onConnectSuggestion={activeAccount === "personal" ? connectSuggestion : undefined}
                  onCancelConnectionRequest={activeAccount === "personal" ? cancelConnectionRequest : undefined}
                  onTabChange={(nextTab) => {
                    setNetworkInitialTab(nextTab);
                  }}
                  onMessageUser={(user) => {
                    openConversationWithUser(user);
                    if (!messagesModalOpen) {
                      navigate("messages");
                    }
                  }}
              />
            </div>
          )}
        </>
      )}


      {messagesModalOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: isMobile ? 1200 : 20, pointerEvents: "none", background: "transparent", display: "flex", justifyContent: "flex-end", alignItems: "flex-start", paddingTop: isMobile ? 0 : "calc(var(--lynora-header-offset) + 10px)" }}
        >
          <div
            ref={messagesPanelRef}
            className="lynora-mobile-notifications"
            style={{
              position: "relative",
              ...(isMobile
                ? {
                    width: "100%",
                    height: "100svh",
                    maxHeight: "100svh",
                    margin: "0 auto",
                  }
                : {
                    width: "min(500px, calc(100vw - 40px))",
                    maxWidth: "100%",
                    height: "calc(100vh - var(--lynora-header-offset) - 28px)",
                    maxHeight: "calc(100vh - var(--lynora-header-offset) - 28px)",
                    margin: "0 20px 0 auto",
                  }),
              pointerEvents: "auto",
              overflow: "hidden",
            }}
          >
            <MessagesPage
              conversations={conversations}
              activeId={activeConversationId}
              onChange={setConversations}
              onSelect={selectConversation}
              onNewConversation={() => setActiveConversationId(null)}
              onSend={sendMessage}
              onOpenProfile={(userId) => {
                if (!userId) return;
                setTargetProfileId(userId);
                setMessagesModalOpen(false);
                setNotificationsModalOpen(false);
                setView("profile");
                ignoreRouteSyncRef.current = true;
                navigateFeedRoute(`/feed?view=profile&userId=${encodeURIComponent(userId)}`);
              }}
              onOpenChatSettings={(target) => {
                const sectionByTarget = {
                  privacy: "confidentialite",
                  requests: "notifications",
                  receiving: "messagerie",
                  restricted: "confidentialite",
                  blocked: "confidentialite",
                };
                const section = sectionByTarget[target] || "messagerie";
                setMessagesModalOpen(false);
                setDirectChatOpen(false);
                setView("settings");
                ignoreRouteSyncRef.current = true;
                navigateFeedRoute(`/feed?view=settings&section=${section}`);
              }}
              onClose={() => closeOverlay("messages")}
              loading={messagesLoading}
              mobile={isMobile}
              directConversation={directChatOpen}
            />
          </div>
        </div>
      )}

      {notificationsModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: isMobile ? 1200 : 220, pointerEvents: "none", background: "transparent" }}>
          <div
            ref={notificationsPanelRef}
            style={{
              position: "absolute",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              top: isMobile ? 0 : "calc(var(--lynora-header-offset) + 10px)",
              ...(isMobile
                ? {
                    left: 0,
                    right: 0,
                    width: "100%",
                    height: "100svh",
                    maxHeight: "100svh",
                  }
                : {
                    right: 20,
                    width: "min(440px, calc(100vw - 40px))",
                    maxWidth: "100%",
                    height: "calc(100vh - var(--lynora-header-offset) - 28px)",
                    maxHeight: "calc(100vh - var(--lynora-header-offset) - 28px)",
                  }),
              pointerEvents: "auto",
            }}
          >
            {notificationsLoading ? <NotificationsSkeleton /> : (
              <NotificationPage
                notifications={notifications}
                onChange={handleNotificationChange}
                onOpenNotification={markNotificationRead}
                onSecurityResponse={handleSecurityAlertResponse}
                modal
                onClose={() => {
                  closeOverlay("notifications");
                }}
              />
            )}
          </div>
        </div>
      )}

      {view === "abonnement" && (
        <div style={{ maxWidth: 1400, margin: "0 auto",  }} className="lynora-feed-container lynora-abonnement-view">
          {subscriptionLoading ? <SubscriptionSkeleton /> : (
            <Abonnement
              currentPlan={subscriptionData?.plan || "free"}
              subscriptionExpired={Boolean(subscriptionData?.expired)}
              showTopNav={false}
              onBack={() => navigate("feed")}
              onSubscribe={async (planId, billingCycle) => {
                const response = await fetchBackendApi("/api/stripe/checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ planId, billingCycle }),
                });
                if (!response.ok) {
                  const data = await response.json().catch(() => ({}));
                  throw new Error(data?.error || "Impossible de lancer le checkout Premium.");
                }
                const data = await response.json();
                if (!data?.url) {
                  throw new Error("Aucune URL de paiement reçue.");
                }
                window.location.assign(data.url);
              }}
              onManage={async () => {
                const response = await fetchBackendApi("/api/stripe/portal", { method: "POST" });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data?.url) {
                  throw new Error(data?.error || "Impossible d'ouvrir la gestion de l'abonnement.");
                }
                window.location.assign(data.url);
              }}
              onCancel={() => navigate("feed")}
              userName={activeProfile?.name || CURRENT_USER.name}
            />
          )}
        </div>
      )}

      {view === "company" && (
        <div style={{ maxWidth: 1400, margin: "0 auto",  }} className={`lynora-feed-container${selectedCompanyPage || companyTab === "mine" ? " lynora-company-detail-container" : " lynora-company-directory-container"}`}>
          {selectedCompanyPage ? (
            <CompanyPage
              company={selectedCompanyPage}
              headerOffset={topnavHeight}
              isOwner={selectedCompanyPage.ownerId === CURRENT_USER_ID || selectedCompanyPage.managed === true}
              canCreatePost={activeAccount === "company" && String(selectedCompanyPage.id) === String(companyData?.id)}
              onSwitchAccount={switchAccount}
              onBack={returnToCompanyGrid}
              onDeleted={handleCompanyDeleted}
              following={false}
              onToggleFollow={() => {}}
              onMessage={(user) => {
                setDirectChatOpen(true);
                openConversationWithUser(user);
              }}
              onOpenProfile={(userId) => {
                if (!userId) return;
                setTargetProfileId(userId);
                setView("profile");
                ignoreRouteSyncRef.current = true;
                navigateFeedRoute(`/feed?view=profile&userId=${encodeURIComponent(userId)}`);
              }}
              onCreateCampaign={() => {}}
              onWithdraw={() => {}}
              onDownloadInvoice={() => {}}
              onUpdateCompany={updateSelectedCompanyPage}
              onOpenComposer={(mode) => openCompanyComposer(mode, selectedCompanyPage?.id)}
              onOpenSponsor={openCampaign}
              onToggleLike={toggleLike}
              onSelectReaction={selectReaction}
              onToggleBookmark={toggleBookmark}
              onAddComment={addComment}
              onReplyComment={replyComment}
              onToggleCommentLike={(commentId) => toggleCommentLike(selectedCompanyPage.id, commentId)}
              onShare={share}
              onFollowPage={followPage}
              followedPageIds={followedPageIds}
              isCompanyAccount={activeAccount === "company"}
            />
          ) : (
            <>
              {companyTab !== "mine" || !companyLoading ? (
                <div style={{ padding: 0 }}>
                  {companyPagesLoading ? <CompanyPagesGridSkeleton count={6} /> : (
                  <CompanyPagesGrid
                    companyTab={companyTab}
                    onNavigate={navigate}
                    onMessage={(page) => {
                      setDirectChatOpen(true);
                      openConversationWithUser({
                        id: page.ownerId || page.id,
                        pageId: page.id,
                        name: page.name || page.displayName || "Page entreprise",
                        title: page.tag || page.industry || "Page entreprise",
                        image: page.avatarUrl || page.logoUrl || page.image || null,
                        avatarUrl: page.avatarUrl || page.logoUrl || page.image || null,
                      });
                    }}
                    onCompanyTabChange={(nextTab) => {
                      setSelectedCompanyPage(null);
                      setCompanyTab(nextTab);
                      ignoreRouteSyncRef.current = true;
                      navigateFeedRoute(`/feed?view=company&companyTab=${nextTab}`);
                    }}
                    onOpenCompany={setSelectedCompanyPage}
                    currentCompanyId={companyData?.id}
                    currentUserId={CURRENT_USER_ID}
                    onOpenMyPage={() => {
                      setSelectedCompanyPage(null);
                      setCompanyTab("mine");
                      navigateFeedRoute("/feed?view=company&companyTab=mine");
                    }}
                    followedPageIds={followedPageIds}
                    onFollowPage={followPage}
                    initialPages={[
                      ...(companyTab === "mine" && companyData ? [{ ...companyData, ownerId: CURRENT_USER_ID, managed: true, isOwn: true }] : []),
                      ...publicCompanyPages.filter((page) => {
                        const isMyPage = String(page.id) === String(companyData?.id)
                          || String(page.ownerId || "") === String(CURRENT_USER_ID);
                        if (companyTab === "mine") return false;
                        if (companyTab === "followed") return followedPageIds.some((pageId) => String(pageId) === String(page.id));
                        return !isMyPage && !followedPageIds.some((pageId) => String(pageId) === String(page.id));
                      }),
                    ]}
                    onPageCreated={(page) => {
                      saveCompanyData({ ...page, ownerId: CURRENT_USER_ID, isPremium: true, creatorSubscribed: true });
                      setActiveAccount("company");
                      try { localStorage.setItem("lynoralink:activeAccount", "company"); } catch {}
                      fetchBackendApi("/api/account/switch", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ account: "company" }),
                      }).catch(() => {});
                      setSelectedCompanyPage(null);
                      setCompanyTab("mine");
                      setView("company");
                      ignoreRouteSyncRef.current = true;
                      navigateFeedRoute("/feed?view=company&companyTab=mine", true);
                    }}
                    canCreatePage={true}
                    onUpgrade={() => {}}
                  />
                  )}
                </div>
              ) : companyLoading ? (
                <div aria-busy="true" style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 20px 60px" }}>
                  <CompanySkeleton />
                </div>
              ) : companyData ? (
                <CompanyPage
                  company={companyData}
                  headerOffset={topnavHeight}
                  isOwner
                  canCreatePost={activeAccount === "company"}
                  onSwitchAccount={switchAccount}
                  following={false}
                  onToggleFollow={() => {}}
                  onCreateCampaign={() => {}}
                  onWithdraw={() => {}}
                  onDownloadInvoice={() => {}}
                  onUpdateCompany={(patch) => {
                    const nextCompany = { ...companyData, ...patch };
                    saveCompanyData(nextCompany);
                    setSelectedCompanyPage((current) =>
                      current && current.id === nextCompany.id ? nextCompany : current
                    );
                  }}
                  onOpenComposer={(mode) => openCompanyComposer(mode, companyData?.id)}
                  onOpenSponsor={openCampaign}
                  onMessage={(user) => {
                    setDirectChatOpen(true);
                    openConversationWithUser(user);
                  }}
                  onOpenProfile={(userId) => {
                    if (!userId) return;
                    setTargetProfileId(userId);
                    setView("profile");
                    ignoreRouteSyncRef.current = true;
                    navigateFeedRoute(`/feed?view=profile&userId=${encodeURIComponent(userId)}`);
                  }}
                  onToggleLike={toggleLike}
                  onSelectReaction={selectReaction}
                  onToggleBookmark={toggleBookmark}
                  onAddComment={addComment}
                  onReplyComment={replyComment}
                  onToggleCommentLike={(commentId) => toggleCommentLike(companyData.id, commentId)}
                  onShare={share}
                  onFollowPage={followPage}
                  followedPageIds={followedPageIds}
                  isCompanyAccount={activeAccount === "company"}
                  onBack={returnToCompanyGrid}
                  onDeleted={handleCompanyDeleted}
                />
              ) : (
                <div>
                  <div className="flex items-center gap-1 border-b" style={{ borderColor: C.line }}>
                    {[
                      { id: "mine", label: "Ma page" },
                      { id: "followed", label: "Pages suivies" },
                      { id: "discover", label: "Découvrir" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setCompanyTab(tab.id);
                          ignoreRouteSyncRef.current = true;
                          navigateFeedRoute(`/feed?view=company&companyTab=${tab.id}`);
                        }}
                        className="relative px-3 py-3 text-sm font-semibold"
                        style={{ color: companyTab === tab.id ? C.navy700 : C.muted }}
                      >
                        {tab.label}
                        {companyTab === tab.id && <span className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: C.navy700 }} />}
                      </button>
                    ))}
                  </div>
                  <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 px-6 text-center" style={{ color: C.inkSoft }}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: C.navy50, color: C.navy700 }}>
                      <Building2 size={25} />
                    </div>
                    <h2 className="text-base font-bold" style={{ color: C.ink }}>Vous n’avez pas encore de page</h2>
                    <p className="max-w-sm text-sm" style={{ color: C.muted }}>Créez votre page entreprise pour profiter de votre espace professionnel.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setCompanyTab("discover");
                        ignoreRouteSyncRef.current = true;
                        navigateFeedRoute("/feed?view=company&companyTab=discover");
                      }}
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                      style={{ background: C.navy700 }}
                    >
                      Créer une page
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {view === "saved" && (
        <SavedPage
          posts={posts}
          onBack={() => navigate("feed")}
          currentUser={{
            id: session?.user?.id || activeProfile.id,
            name: activeProfile.name || CURRENT_USER.name,
            initials: activeProfile.initials || CURRENT_USER.avatar,
            avatarUrl: activeProfileAvatar || null,
          }}
          onToggleLike={toggleLike}
          onSelectReaction={selectReaction}
          onToggleBookmark={toggleBookmark}
          onAddComment={addComment}
          onShare={share}
          onOpenArticle={(p) => setOpenArticleId(p.id)}
          onOpenPost={openPostPreview}
          onOpenReels={(items) => { setReelModalItems(items); setReelsOpen(true); }}
        />
      )}

      {view === "my-posts" && (
        <MyPostsPage
          posts={posts}
          currentUserId={session?.user?.id || activeProfile.id}
          companyPageId={companyData?.id}
          isCompanyAccount={activeAccount === "company"}
          currentUser={{
            name: activeProfile.name || CURRENT_USER.name,
            initials: activeProfile.initials || CURRENT_USER.avatar,
            avatarUrl: activeProfileAvatar || null,
          }}
          onBack={() => navigate("feed")}
          onToggleLike={toggleLike}
          onSelectReaction={selectReaction}
          onToggleBookmark={toggleBookmark}
          onAddComment={addComment}
          onShare={share}
          onOpenArticle={(p) => setOpenArticleId(p.id)}
          onOpenPost={openPostPreview}
        />
      )}

      {view === "my-articles" && (
        <MyArticlesPage
          posts={posts}
          currentUserId={session?.user?.id || activeProfile.id}
          companyPageId={companyData?.id}
          isCompanyAccount={activeAccount === "company"}
          currentUser={{
            name: activeProfile.name || CURRENT_USER.name,
            initials: activeProfile.initials || CURRENT_USER.avatar,
            avatarUrl: activeProfileAvatar || null,
          }}
          onToggleLike={toggleLike}
          onSelectReaction={selectReaction}
          onToggleBookmark={toggleBookmark}
          onAddComment={addComment}
          onShare={share}
          onOpenArticle={(p) => setOpenArticleId(p.id)}
          onOpenPost={openPostPreview}
        />
      )}

      {view === "pages" && <FollowedPagesPage onBack={() => navigate("feed")} />}

      {view === "ai-assistant" && (
        <AIAssistantPage
          onBack={() => navigate("feed")}
          actions={{
            onNavigate: navigate,
            onCreatePost: (text) => {
              publish({ mode: "post", text });
            },
            onConnect: (id) => connectSuggestion(id),
            onSearchResults: () => {},
            onMarkAllNotificationsRead: markAllNotificationsRead,
          }}
          context={{
            view,
            connections,
            suggestions: networkSuggestions,
            notifications,
            profile: activeProfile,
            accountMode: activeAccount,
          }}
          userName={activeProfile?.name || CURRENT_USER.name}
        />
      )}

      {view === "trend" && selectedTrend && (
        <TrendPage
          tag={selectedTrend}
          posts={posts}
          onBack={() => navigate("feed")}
          currentUser={{
            name: activeProfile.name || CURRENT_USER.name,
            initials: activeProfile.initials || CURRENT_USER.avatar,
            avatarUrl: activeProfileAvatar || null,
          }}
          onToggleLike={toggleLike}
          onToggleBookmark={toggleBookmark}
          onAddComment={addComment}
          onShare={share}
          onOpenArticle={(p) => setOpenArticleId(p.id)}
          onOpenPost={openPostPreview}
        />
      )}

      {campaignModalOpen && activeAccount === "company" && companyData && (
        <SponsorModal company={companyData} onClose={() => setCampaignModalOpen(false)} />
      )}

      {reelsOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(3, 7, 18, 0.86)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Reel
            reels={reelModalItems || undefined}
            onClose={() => { setReelsOpen(false); setReelModalItems(null); }}
            onOpenProfile={openUserProfile}
            onOpenCompanyPage={openCompanyPageDetail}
          />
        </div>
      )}

      {modalMode && modalMode !== "visuelfocus" && (
        <CreatePostModal
          initialMode={modalMode}
          onClose={() => { setModalMode(null); setComposerCompanyId(null); }}
          onOpenVisualFocus={() => { setModalMode("visuelfocus"); setComposerCompanyId(null); }}
          onPublish={publish}
          currentUser={{
            name: activeProfile.name || CURRENT_USER.name,
            title: activeProfile.title || CURRENT_USER.title,
            avatar: activeProfile.initials || CURRENT_USER.avatar,
            avatarUrl: activeProfileAvatar || null,
            isPlatformAdmin: Boolean(activeProfile.isPlatformAdmin),
            isPremium: Boolean(activeProfile.isPremium),
          }}
        />
      )}

      {modalMode === "visuelfocus" && (
        <AIVisualEditorModal
          onClose={() => { setModalMode(null); setComposerCompanyId(null); }}
          onPublish={publish}
          currentUser={{
            name: activeProfile.name || CURRENT_USER.name,
            title: activeProfile.title || CURRENT_USER.title,
            avatar: activeProfile.initials || CURRENT_USER.avatar,
            avatarUrl: activeProfileAvatar || null,
            isPlatformAdmin: Boolean(activeProfile.isPlatformAdmin),
            isPremium: Boolean(activeProfile.isPremium),
          }}
        />
      )}

      {openArticle && (
        <ArticleViewerPreview
          article={{
            ...openArticle,
            author: openArticle.author,
            title: openArticle.title,
            time: openArticle.time,
            readingTime: openArticle.readingTime ?? readingTime(openArticle.body || openArticle.text || ""),
          }}
          currentUser={{
            name: activeProfile.name || CURRENT_USER.name,
            initials: activeProfile.initials || CURRENT_USER.avatar,
            avatarUrl: activeProfileAvatar || null,
          }}
          onClose={() => setOpenArticleId(null)}
          onToggleLike={(id) => toggleLike(id)}
          onSelectReaction={(id, reaction) => selectReaction(id, reaction)}
          onToggleBookmark={(id) => toggleBookmark(id)}
          onAddComment={addComment}
          onReplyComment={replyComment}
          onToggleCommentReaction={toggleCommentReaction}
          onShare={(id) => share(id)}
        />
      )}

      {openPost && (
        <PostViewerPreview
          post={openPost}
          currentUser={{
            id: session?.user?.id || activeProfile.id,
            name: activeProfile.name || CURRENT_USER.name,
            initials: activeProfile.initials || CURRENT_USER.avatar,
            avatarUrl: activeProfileAvatar || null,
          }}
          onClose={() => { setOpenPostId(null); setOpenPostOverride(null); }}
          onToggleLike={toggleLike}
          onReact={selectReaction}
          onToggleBookmark={toggleBookmark}
          onAddComment={addComment}
          onReplyComment={(postId, commentId, text) => replyComment(postId, commentId, text)}
          onToggleCommentLike={(commentId) => toggleCommentLike(openPost.id, commentId)}
          onToggleCommentReaction={toggleCommentReaction}
          onShare={share}
          onFollowPage={followPage}
          followedPageIds={followedPageIds}
          isCompanyAccount={activeAccount === "company"}
        />
      )}

      {openEvent && (
        <EventViewerPreview
          post={{ ...openEvent, currentUserId: session?.user?.id }}
          onClose={() => setOpenEventId(null)}
        />
      )}

      {sidebarToast && (
        <div
          className="lynora-feed-toast"
          style={{
            position: "fixed",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            borderRadius: 9999,
            padding: "0.75rem 1.25rem",
            background: "#16232C",
            color: "#FFFFFF",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
            animation: "lynora-sidebar-toast-in 300ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {sidebarToast.icon && <sidebarToast.icon size={16} style={{ color: "#F6D374", flexShrink: 0 }} />}
          <span style={{ fontSize: 13.5, fontWeight: 500, overflowWrap: "anywhere" }}>{sidebarToast.message}</span>
          <button
            onClick={() => setSidebarToast(null)}
            style={{ marginLeft: "0.375rem", borderRadius: 9999, padding: "0.125rem", border: "none", background: "none", cursor: "pointer", color: "#5C6B78" }}
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      )}


      <style>{`
        @media (max-width: 1024px) {
          .lynora-grid { grid-template-columns: minmax(0,1fr) !important; }
          .lynora-grid > aside { display: none !important; }
          .lynora-grid > div:first-child, .lynora-grid > div:last-child { display: none; }
          .lynora-saved-content { grid-template-columns: minmax(0, 680px) !important; }
          .lynora-saved-content > .lynora-saved-sidebar { position: static !important; }
          .lynora-saved-filters { display: flex; overflow-x: auto; padding: 4px !important; scrollbar-width: none; }
          .lynora-saved-filters::-webkit-scrollbar { display: none; }
          .lynora-saved-filters button { width: auto !important; min-width: max-content; border-left: none !important; border-bottom: 3px solid transparent !important; padding: 10px 12px !important; }
          .lynora-saved-filters button[aria-current="page"] { border-bottom-color: ${C.gold600} !important; }
          .lynora-fixed-sidebar { display: none !important; }
        }

        @media (max-width: 560px) {
          .lynora-saved-content { padding: 12px 12px 40px !important; gap: 14px !important; }
          .lynora-my-posts-content { padding: 14px 12px 40px !important; }
          .lynora-saved-content main > div { border-radius: 12px !important; padding: 15px 16px !important; }
        }

        @keyframes lynora-sidebar-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      </div>
    </>
  );
}
