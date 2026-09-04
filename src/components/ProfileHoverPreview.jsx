"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MapPin, Users, MessageCircle, UserPlus, Check } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  APERÇU DE PROFIL AU SURVOL                                         */
/*  Rendu, design et logique identiques à Facebook                     */
/*  ( carte flottante, positionnement intelligent, actions ),          */
/*  couleurs LynoraLink navy / doré conservées.                        */
/* ------------------------------------------------------------------ */

const SHOW_DELAY = 420;       /* délai avant ouverture au survol (ms)     */
const HIDE_GRACE = 200;       /* délai de grâce à la sortie (ms)          */
const CARD_WIDTH = 320;       /* largeur de la carte d'aperçu (px)        */
const CARD_MARGIN = 10;       /* espace déclencheur <-> carte (px)        */
const VIEWPORT_GAP = 8;       /* marge de sécurité avec le viewport (px)  */
const ESTIMATED_HEIGHT = 330; /* hauteur estimée avant la mesure réelle   */
const CACHE_TTL = 60000;      /* durée du cache de profil chargé (ms)     */

/* Palette LynoraLink ( navy / doré ) */
const C = {
  navy900: "#0F3352", navy800: "#1B5386", navy700: "#2C6BA0",
  gold400: "#F6D374", gold600: "#D9A536",
  ink: "var(--app-text, #17324d)",
  muted: "var(--app-muted, #667788)",
  line: "var(--app-border, #dbe4ee)",
  white: "var(--app-surface, #ffffff)",
};
const navyGrad = `linear-gradient(135deg, ${C.navy800} 0%, ${C.navy900} 100%)`;

/* Cache mémoire des profils chargés ( évite les refetch au survol ) */
const PROFILE_CACHE = new Map();

/* useLayoutEffect isomorphe : évite l'avertissement SSR de Next.js */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* Styles de la carte : apparition façon Facebook + hovers boutons */
const CARD_STYLE_CSS = `
  @keyframes phpPop { from { opacity: 0; transform: translateY(4px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .php-card { animation: phpPop 140ms cubic-bezier(.2,.7,.3,1) both; }
  .php-btn { transition: filter 160ms ease, background 160ms ease, border-color 160ms ease, transform 120ms ease; }
  .php-btn:hover { filter: brightness(.96); }
  .php-btn-primary:hover { filter: brightness(1.02) saturate(1.05); }
  .php-btn:active { transform: translateY(1px); }
  .php-btn:disabled { cursor: default; }
  @media (prefers-reduced-motion: reduce) {
    .php-card { animation: none; }
    .php-btn { transition: none; }
    .php-btn:active { transform: none; }
  }
`;

function getInitials(name = "?") {
  return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n < 1000) return String(n);
  if (n < 1000000) {
    const v = n / 1000;
    return `${(v >= 10 ? Math.round(v) : v.toFixed(1)).toString().replace(".", ",")} k`;
  }
  const m = n / 1000000;
  return `${(m >= 10 ? Math.round(m) : m.toFixed(1)).toString().replace(".", ",")} M`;
}

function normalizeProfile({ type, entity, fallback }) {
  const source = entity || {};
  const fb = fallback || {};
  return {
    id: source.id ?? fb.id ?? null,
    name: source.name || fb.name || "Utilisateur",
    type,
    image: source.image || source.avatarUrl || source.logoUrl || fb.image || fb.avatarUrl || null,
    cover: source.cover || source.coverUrl || source.bannerUrl || source.backgroundImage || fb.cover || fb.coverUrl || null,
    title: source.title || source.headline || fb.title || (type === "group" ? "Communauté LynoraLink" : type === "page" ? "Page entreprise" : "Membre LynoraLink"),
    bio: source.bio || source.description || fb.bio || null,
    location: source.location || fb.location || null,
    memberCount: source.memberCount ?? source.membersCount ?? fb.memberCount ?? null,
    followersCount: source.followersCount ?? source.followers ?? fb.followersCount ?? null,
    website: source.website || fb.website || null,
  };
}

function hasProfileCover(profile) {
  return Boolean(profile?.cover || profile?.coverUrl || profile?.bannerUrl);
}

export default function ProfileHoverPreview({
  type = "person",
  entity = null,
  fallback = {},
  children,
  href,
  disabled = false,
  onConnect,
  onRemove,
  onMessage,
  onFollow,
  onJoin,
  onLeave,
  isFriend = false,
  isFollowing = false,
  isMember = false,
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(() => normalizeProfile({ type, entity, fallback }));
  const [placement, setPlacement] = useState(null);
  const [hoverCapable, setHoverCapable] = useState(true);

  const timerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);
  const fetchTokenRef = useRef(0);
  const abortRef = useRef(null);

  /* ---- Facebook n'affiche pas d'aperçu au doigt : écrans tactiles ---- */
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setHoverCapable(media.matches);
    update();
    if (media.addEventListener) media.addEventListener("change", update);
    else if (media.addListener) media.addListener(update);
    return () => {
      if (media.removeEventListener) media.removeEventListener("change", update);
      else if (media.removeListener) media.removeListener(update);
    };
  }, []);

  /* ---- Synchronisation des données entity / fallback ---- */
  useEffect(() => {
    setProfile(normalizeProfile({ type, entity, fallback }));
  }, [type, entity?.id, entity?.name, entity?.image, entity?.avatarUrl, entity?.logoUrl, entity?.cover, entity?.coverUrl, entity?.bannerUrl, entity?.description, entity?.bio, entity?.headline, entity?.title, entity?.location, entity?.website, entity?.memberCount, entity?.membersCount, entity?.followersCount, fallback?.id, fallback?.name, fallback?.image, fallback?.avatarUrl, fallback?.cover, fallback?.coverUrl, fallback?.title, fallback?.bio, fallback?.location, fallback?.memberCount, fallback?.website, fallback?.followersCount]);

  /* ---- Nettoyage des minuteurs + requêtes au démontage ---- */
  useEffect(() => () => {
    clearTimeout(timerRef.current);
    clearTimeout(closeTimerRef.current);
    abortRef.current?.abort();
  }, []);

  /* ---- Pré-chargement du profil complet ( cache + anti-course ) ---- */
  const fetchProfile = useCallback(async () => {
    const id = profile?.id;
    if (!id || (type !== "person" && type !== "page")) return;
    const cacheKey = `${type}:${id}`;
    const cached = PROFILE_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      setProfile((current) => normalizeProfile({ type, entity: cached.entity, fallback: current }));
      return;
    }
    const token = ++fetchTokenRef.current;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    try {
      let enriched = null;
      if (type === "person") {
        const response = await fetch(`/api/profile?userId=${encodeURIComponent(id)}`, { signal: controller.signal });
        if (response.ok) {
          const payload = await response.json();
          if (payload.user) enriched = payload.user;
        }
      } else {
        const [pagesResponse, ownPageResponse] = await Promise.all([
          fetch("/api/company/pages", { cache: "no-store", signal: controller.signal }),
          fetch("/api/company", { cache: "no-store", signal: controller.signal }),
        ]);
        const pagesPayload = pagesResponse.ok ? await pagesResponse.json() : {};
        const ownPage = ownPageResponse.ok ? await ownPageResponse.json() : null;
        enriched = (Array.isArray(pagesPayload.pages) ? pagesPayload.pages : []).find((item) => String(item.id) === String(id))
          || (ownPage && String(ownPage.id) === String(id) ? ownPage : null);
      }
      if (enriched && token === fetchTokenRef.current) {
        PROFILE_CACHE.set(cacheKey, { at: Date.now(), entity: enriched });
        setProfile((current) => {
          const next = normalizeProfile({ type, entity: enriched, fallback: current });
          return hasProfileCover(next) || !hasProfileCover(current)
            ? next
            : normalizeProfile({ type, entity: current, fallback: next });
        });
      }
    } catch {
      /* L'aperçu reste utilisable avec les données du post. */
    }
  }, [type, profile?.id]);

  /* ---- Positionnement intelligent façon Facebook ---- */
  /* En dessous par défaut, bascule au-dessus si manque de place,
     se cale aux bords du viewport, se mesure après montage.       */
  const computePlacement = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect || typeof window === "undefined") return null;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const height = popupRef.current?.offsetHeight || ESTIMATED_HEIGHT;
    const spaceBelow = vh - rect.bottom - CARD_MARGIN;
    const spaceAbove = rect.top - CARD_MARGIN;
    let top = null;
    let bottom = null;
    if (spaceBelow >= height || spaceBelow >= spaceAbove) {
      top = rect.bottom + CARD_MARGIN;
      if (top + height > vh - VIEWPORT_GAP) top = Math.max(VIEWPORT_GAP, vh - height - VIEWPORT_GAP);
    } else {
      bottom = vh - rect.top + CARD_MARGIN;
      if (vh - bottom < VIEWPORT_GAP) bottom = Math.max(VIEWPORT_GAP, vh - height - VIEWPORT_GAP);
    }
    let left = rect.left;
    const maxLeft = vw - CARD_WIDTH - VIEWPORT_GAP;
    if (left > maxLeft) left = Math.max(VIEWPORT_GAP, maxLeft);
    if (left < VIEWPORT_GAP) left = VIEWPORT_GAP;
    return { top, bottom, left };
  }, []);

  const hideNow = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(closeTimerRef.current);
    setOpen(false);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), HIDE_GRACE);
  }, []);

  const applyPlacement = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect || typeof window === "undefined") return;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    /* Le déclencheur a disparu de l'écran ( scroll ) : fermeture. */
    if (rect.bottom < 0 || rect.top > vh) { hideNow(); return; }
    const next = computePlacement();
    if (next) setPlacement(next);
  }, [computePlacement, hideNow]);

  const show = useCallback(() => {
    if (disabled) return;
    clearTimeout(closeTimerRef.current);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const next = computePlacement();
      if (!next) return;
      setPlacement(next);
      setOpen(true);
      fetchProfile();
    }, SHOW_DELAY);
  }, [disabled, computePlacement, fetchProfile]);

  /* ---- Affinage de la position après montage ( hauteur réelle ) ---- */
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    applyPlacement();
  }, [open, applyPlacement]);

  /* ---- Repositionnement au scroll / resize pendant l'ouverture ---- */
  useEffect(() => {
    if (!open) return;
    const handleReposition = () => applyPlacement();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, { capture: true });
    };
  }, [open, applyPlacement]);

  /* ---- Fermeture avec la touche Échap ---- */
  useEffect(() => {
    if (!open) return;
    const handleKey = (event) => { if (event.key === "Escape") hideNow(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, hideNow]);

  /* ---- Accessibilité clavier : le focus peut entrer dans la carte ---- */
  const handleTriggerBlur = useCallback((event) => {
    const next = event.relatedTarget;
    if (next && triggerRef.current?.contains(next)) return;
    if (next && popupRef.current?.contains(next)) { clearTimeout(closeTimerRef.current); return; }
    hide();
  }, [hide]);

  const handlePopupBlur = useCallback((event) => {
    const next = event.relatedTarget;
    if (next && popupRef.current?.contains(next)) return;
    if (next && triggerRef.current?.contains(next)) { clearTimeout(closeTimerRef.current); return; }
    hide();
  }, [hide]);

  const targetHref = href || (type === "group"
    ? `/feed?view=groups&groupId=${encodeURIComponent(profile.id || "")}`
    : type === "page"
      ? `/feed?view=company&pageId=${encodeURIComponent(profile.id || "")}`
      : `/feed?view=profile&userId=${encodeURIComponent(profile.id || "")}`);

  const membersLabel = type === "group" && profile.memberCount != null
    ? `${formatCount(profile.memberCount) ?? profile.memberCount} membre${Number(profile.memberCount) > 1 ? "s" : ""}`
    : null;
  const followersLabel = type === "page" && profile.followersCount != null
    ? `${formatCount(profile.followersCount) ?? profile.followersCount} abonné${Number(profile.followersCount) > 1 ? "s" : ""}`
    : null;

  /* ---- Boutons d'action façon Facebook ( primaire + secondaire ) ---- */
  const actions = useMemo(() => {
    const list = [];
    if (type === "person") {
      if (isFriend) list.push({ key: "remove", kind: "secondary", icon: <UserPlus size={14} />, label: "Retirer", onClick: () => onRemove?.(profile.id) });
      else list.push({ key: "connect", kind: "primary", icon: <UserPlus size={14} />, label: "Connecter", onClick: () => onConnect?.(profile.id) });
      list.push({ key: "message", kind: "secondary", icon: <MessageCircle size={14} />, label: "Message", onClick: () => onMessage?.({ id: profile.id, authorId: profile.id, name: profile.name, image: profile.image, avatarUrl: profile.image }) });
      list.push({ key: "view", kind: "secondary", icon: null, label: "Voir profil", href: targetHref });
    } else if (type === "page") {
      list.push({ key: "message", kind: "secondary", icon: <MessageCircle size={14} />, label: "Message", onClick: () => onMessage?.({ id: profile.id, authorId: profile.id, pageId: profile.id, name: profile.name, image: profile.image, avatarUrl: profile.image }) });
      list.push({ key: "follow", kind: isFollowing ? "staticGold" : "primary", icon: isFollowing ? <Check size={14} /> : <UserPlus size={14} />, label: isFollowing ? "Suivi" : "Suivre", onClick: isFollowing ? undefined : () => onFollow?.(profile.id) });
      list.push({ key: "view", kind: "secondary", icon: null, label: "Voir la page", href: targetHref });
    } else {
      if (isMember) {
        list.push({ key: "leave", kind: "secondary", icon: <UserPlus size={14} />, label: "Quitter", onClick: () => onLeave?.(profile.id) });
      } else {
        list.push({ key: "join", kind: "primary", icon: <UserPlus size={14} />, label: "Joindre", onClick: () => onJoin?.(profile.id) });
      }
      list.push({ key: "view", kind: "secondary", icon: null, label: "Voir groupe", href: targetHref });
    }
    return list;
  }, [type, isFriend, isFollowing, isMember, onConnect, onRemove, onMessage, onFollow, onJoin, onLeave, profile.id, profile.name, profile.image, targetHref]);

  const actionStyle = (kind) => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
    flex: 1, minWidth: 0, padding: "8px 10px", borderRadius: 8,
    fontSize: 12.5, fontWeight: 800, lineHeight: 1, whiteSpace: "nowrap",
    textDecoration: "none",
    cursor: kind === "static" || kind === "staticGold" ? "default" : "pointer",
    ...(kind === "primary" ? {
      border: `1px solid ${C.gold600}`,
      background: "linear-gradient(135deg, #F6D374, #D9A536)",
      color: C.navy900,
      boxShadow: "0 2px 6px rgba(217,165,54,0.28)",
    } : kind === "staticGold" ? {
      border: `1px solid ${C.gold600}`,
      background: "#FFF8E5",
      color: C.navy800,
    } : kind === "static" ? {
      border: `1px solid ${C.line}`,
      background: C.white,
      color: C.muted,
    } : {
      border: `1px solid ${C.line}`,
      background: C.white,
      color: C.navy800,
    }),
  });

  if (disabled || !hoverCapable) return children;

  const popup = open && placement && (
    <>
      <style>{CARD_STYLE_CSS}</style>
      <span
        ref={popupRef}
        role="dialog"
        aria-label={`Aperçu de ${profile.name}`}
        className="php-card"
        onMouseEnter={() => clearTimeout(closeTimerRef.current)}
        onMouseLeave={hide}
        onBlur={handlePopupBlur}
        style={{
          position: "fixed", zIndex: 1200,
          top: placement.top != null ? placement.top : undefined,
          bottom: placement.bottom != null ? placement.bottom : undefined,
          left: placement.left,
          width: `min(${CARD_WIDTH}px, calc(100vw - 16px))`,
          overflow: "hidden",
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          background: C.white,
          color: C.ink,
          boxShadow: "0 18px 44px rgba(15,51,82,.24), 0 2px 8px rgba(15,51,82,.08)",
          textAlign: "left",
        }}
      >
        {/* Couverture cliquable ( fallback dégradé navy LynoraLink ) */}
        <Link href={targetHref} aria-label={`Ouvrir le profil de ${profile.name}`} style={{ display: "block" }}>
          <span style={{ display: "block", height: 96, background: profile.cover ? `linear-gradient(180deg, rgba(15,51,82,.10), rgba(15,51,82,.42)), url(${profile.cover}) center/cover` : navyGrad }} />
        </Link>

        <span style={{ display: "block", padding: "0 16px 14px" }}>
          {/* Avatar chevauchant la couverture ( cercle, anneau blanc ) */}
          <Link
            href={targetHref}
            aria-label={`Ouvrir le profil de ${profile.name}`}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: -32, width: 64, height: 64, borderRadius: "50%", overflow: "hidden", border: `3px solid ${C.white}`, background: "#dce7f1", color: C.navy900, fontSize: 19, fontWeight: 800, boxShadow: "0 2px 8px rgba(15,51,82,.18)", textDecoration: "none" }}
          >
            {profile.image ? <img src={profile.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : getInitials(profile.name)}
          </Link>

          {/* Nom + titre ( cliquables ) */}
          <Link href={targetHref} style={{ display: "block", marginTop: 8, fontSize: 16, lineHeight: 1.25, fontWeight: 800, color: C.ink, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.name}</Link>
          <span style={{ display: "block", marginTop: 2, color: C.muted, fontSize: 12.5 }}>{profile.title}</span>

          {/* Bio tronquée à deux lignes ( comme Facebook ) */}
          {profile.bio && (
            <span style={{ display: "-webkit-box", marginTop: 8, overflow: "hidden", color: C.muted, fontSize: 12.5, lineHeight: 1.45, WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{profile.bio}</span>
          )}

          {/* Informations : localisation, membres, abonnés */}
          {(profile.location || membersLabel || followersLabel) && (
            <span style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10, color: C.muted, fontSize: 11.5 }}>
              {profile.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={13} style={{ flexShrink: 0 }} />{profile.location}</span>}
              {membersLabel && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Users size={13} style={{ flexShrink: 0 }} />{membersLabel}</span>}
              {followersLabel && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Users size={13} style={{ flexShrink: 0 }} />{followersLabel}</span>}
            </span>
          )}
        </span>

        {/* Actions façon Facebook : primaire ( doré ) + secondaire ( contour ) */}
        {actions.length > 0 && (
          <span style={{ display: "flex", gap: 8, padding: "11px 16px 14px", borderTop: `1px solid ${C.line}`, background: "rgba(15,51,82,0.03)" }}>
            {actions.map((action) => action.href ? (
              <Link
                key={action.key}
                href={action.href}
                onClick={(event) => event.stopPropagation()}
                className={`php-btn php-btn-${action.kind}`}
                style={actionStyle(action.kind)}
              >
                {action.icon}
                <span>{action.label}</span>
                {action.external ? <ExternalLink size={11} style={{ flexShrink: 0 }} /> : null}
              </Link>
            ) : (
              <button
                key={action.key}
                type="button"
                onClick={(event) => { event.stopPropagation(); action.onClick?.(); }}
                className={`php-btn php-btn-${action.kind}`}
                style={actionStyle(action.kind)}
                disabled={!action.onClick && action.kind !== "static" && action.kind !== "staticGold"}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </span>
        )}
      </span>
    </>
  );

  return (
    <>
      <span
        ref={triggerRef}
        style={{ display: "inline-flex", position: "relative" }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={handleTriggerBlur}
        onClick={hideNow}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {children}
      </span>
      {typeof document !== "undefined" && popup ? createPortal(popup, document.body) : null}
    </>
  );
}
