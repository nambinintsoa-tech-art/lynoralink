import React, { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect, forwardRef } from "react";
import {
  Users, Users2, Building2, MessageSquare, ChevronDown,
  User, X, Monitor, Smartphone, RotateCw,
  Mail, Bell, FileText, Bookmark, BookOpen, Megaphone, Sparkles,
} from "lucide-react";
import {
  FaHouse, FaUserGroup, FaBriefcase,
  FaUser, FaGear, FaCrown, FaRightFromBracket, FaMagnifyingGlass, FaShieldHalved,
} from "react-icons/fa6";
import { Skeleton, SkeletonAvatar } from "./Skeleton";

/* ---------------------------------------------------------------------- */
/*  Design tokens                                                          */
/* ---------------------------------------------------------------------- */

const C = {
  ink: "var(--app-text)",
  navy950: "#081C30",
  navy900: "#0D2C48",
  navy800: "#164470",
  navy700: "#1F5C8F",
  navy100: "var(--app-border)",
  navy50: "var(--app-bg)",
  gold600: "#A9781F",
  gold500: "#C99A3C",
  gold300: "#E8C874",
  gold100: "var(--app-accent-soft)",
  border: "var(--app-border)",
  muted: "var(--app-muted)",
  mutedLight: "var(--app-muted-light)",
  danger: "#C4433A",
  danger50: "#FBEAE8",
  white: "var(--app-surface)",
  bg: "var(--app-bg)",
  logoInk: "var(--app-text)",
};

const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy950} 100%)`;
const goldGrad = `linear-gradient(135deg, ${C.gold300} 0%, ${C.gold600} 100%)`;
const COMPACT_BREAKPOINT = 860;

/* ---------------------------------------------------------------------- */
/*  Icônes personnalisées (pack fourni par l'utilisateur)                  */
/*  Rendues en <img>, taille source 96×96, style plat noir/blanc.          */
/* ---------------------------------------------------------------------- */


/* ---------------------------------------------------------------------- */
/*  Mock data (for the preview only)                                       */
/* ---------------------------------------------------------------------- */

const CURRENT_USER = {
  name: "Claire Dubreuil",
  title: "Directrice Produit · Aurellia Group",
  avatarUrl: null,
};

const NAV_ITEMS = [
  { id: "feed", icon: FaHouse, label: "Accueil" },
  { id: "network", icon: Users, label: "Réseau" },
  { id: "groups", icon: FaUserGroup, label: "Groupes" },
  { id: "company", icon: FaBriefcase, label: "Entreprise" },
];

const MOCK_RESULTS = [
  { id: 1, type: "Relation", title: "Marc Lefèvre", subtitle: "VP Ventes chez Norvex · 2e relation", icon: User, iconBg: C.navy50, iconColor: C.navy800 },
  { id: 2, type: "Relation", title: "Sophie Nguyen", subtitle: "Cheffe de projet chez Kairo Studio", icon: User, iconBg: C.navy50, iconColor: C.navy800 },
  { id: 3, type: "Entreprise", title: "Aurellia Group", subtitle: "Conseil en stratégie · 4 200 abonnés", icon: Building2, iconBg: C.gold100, iconColor: C.gold600 },
  { id: 4, type: "Groupe", title: "Product Leaders France", subtitle: "3 108 membres · Groupe privé", icon: Users2, iconBg: C.navy50, iconColor: C.navy800 },
  { id: 5, type: "Article", title: "Repenser l'onboarding B2B en 2026", subtitle: "Publié par Claire Dubreuil · il y a 3 jours", icon: MessageSquare, iconBg: C.navy50, iconColor: C.navy800 },
];

/* ---------------------------------------------------------------------- */
/*  Small helpers / building blocks                                        */
/* ---------------------------------------------------------------------- */

function LogoLynora({ size = 52 }) {
  return (
    <img
      src="/logo_lynora.svg"
      alt=""
      width={size}
      height={size}
      draggable={false}
      style={{
        display: "block",
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
        flex: "none",
        objectFit: "contain",
        borderRadius: 12,
        filter: "drop-shadow(0 3px 8px rgba(13,44,72,0.35))",
      }}
    />
  );
}

function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean).map((p) => p[0]?.toUpperCase());
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0];
  return (parts[0] + parts[parts.length - 1]).slice(0, 2);
}

function Avatar({ initials, imgUrl, size = 40, ring = false, online = false }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        position: "relative",
      }}
    >
      <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: imgUrl ? `url(${imgUrl}) center/cover` : navyGrad,
        color: C.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.36,
        fontFamily: "'Sora', sans-serif",
        overflow: "hidden",
        boxShadow: ring ? `0 0 0 3px ${C.white}, 0 0 0 5px ${C.gold400 || C.gold300}` : "none",
      }}>
        {!imgUrl && initials}
      </div>
      {online && <span aria-label="En ligne" style={{ position: "absolute", right: 0, bottom: 0, width: 10, height: 10, boxSizing: "border-box", borderRadius: "50%", background: "#22C55E", border: `2px solid ${C.white}`, boxShadow: "0 0 0 1px #15803D" }} />}
    </div>
  );
}

function Badge({ count, size = "md" }) {
  if (!count || count <= 0) return null;
  const dims = size === "sm" ? 17 : 19;
  return (
    <span
      style={{
        position: "absolute",
        top: -7,
        right: -7,
        minWidth: dims,
        height: dims,
        padding: "0 4px",
        borderRadius: 999,
        background: C.danger,
        color: C.white,
        fontSize: dims === 17 ? 10.5 : 11.5,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        border: `1.5px solid ${C.white}`,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ProfileMenuSkeleton() {
  const menuRows = [58, 72, 48, 78, 64];

  return (
    <div aria-label="Chargement du profil et du menu" aria-busy="true" style={{ background: C.white }}>
      <div style={{ padding: "16px", background: navyGrad, display: "flex", alignItems: "center", gap: 11 }}>
        <SkeletonAvatar size={42} style={{ background: "rgba(255,255,255,0.22)" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width="68%" height={14} radius={5} style={{ background: "rgba(255,255,255,0.28)" }} />
          <Skeleton width="84%" height={11} radius={4} style={{ background: "rgba(255,255,255,0.18)" }} />
        </div>
      </div>
      <div style={{ padding: "11px 16px 6px" }}>
        <Skeleton width={46} height={10} radius={4} />
      </div>
      <div style={{ padding: "0 8px 7px", display: "flex", flexDirection: "column", gap: 5 }}>
        {menuRows.map((width, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 9px" }}>
            <Skeleton width={31} height={31} radius={10} />
            <Skeleton width={`${width}%`} height={12} radius={4} />
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "11px 16px 6px" }}>
        <Skeleton width={88} height={10} radius={4} />
      </div>
      <div style={{ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: 5 }}>
        {[62, 76, 54, 70, 60].map((width, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 9px" }}>
            <Skeleton width={31} height={31} radius={10} />
            <Skeleton width={`${width}%`} height={12} radius={4} />
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "6px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 9px" }}>
          <Skeleton width={31} height={31} radius={10} />
          <Skeleton width="42%" height={12} radius={4} />
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, imgSrc, label, onClick, danger, meta, accent, premium, badge }) {
  return (
    <button
      onClick={onClick}
      className={premium ? "tn-menu-item tn-menu-item-premium" : "tn-menu-item"}
      data-danger={danger || undefined}
      style={{
        width: "calc(100% - 16px)",
        margin: "1px 8px",
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "8px 9px",
        background: premium ? `linear-gradient(135deg, ${C.gold100} 0%, rgba(251,241,218,0.4) 100%)` : "transparent",
        border: premium ? `1px solid ${C.gold300}` : "1px solid transparent",
        borderRadius: 10,
        cursor: "pointer",
        fontSize: 13.5,
        fontWeight: 600,
        color: danger ? C.danger : C.ink,
        textAlign: "left",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {imgSrc ? (
        <span style={{ width: 31, height: 31, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <img src={imgSrc} width={26} height={26} alt="" draggable={false} style={{ display: "block" }} />
        </span>
      ) : (
        <IconChip
          icon={Icon}
          color={danger ? C.danger : accent ? C.gold600 : C.navy800}
          bg={danger ? C.danger50 : accent ? C.white : C.navy50}
        />
      )}
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge > 0 && (
        <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: C.danger, color: C.white, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, border: `1.5px solid ${C.white}` }}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {meta && !badge && (
        <span style={{ fontSize: 10, fontWeight: 800, color: C.white, background: goldGrad, padding: "3px 7px", borderRadius: 6, letterSpacing: "0.03em" }}>
          {meta}
        </span>
      )}
    </button>
  );
}

/**
 * Bouton icône unifié pour les actions du header (recherche, messages,
 * notifications…). Remplace les icônes "nues" par un vrai composant
 * d'interface : conteneur arrondi, halo léger au survol, relief discret
 * à l'état actif — un langage visuel cohérent façon suite SaaS moderne.
 */
function IconButton({ icon: Icon, imgSrc, label, onClick, active, badge, size = 22, boxSize = 44, badgeSize = "md", strokeWidth }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tn-icon-btn"
      aria-label={label}
      data-active={active || undefined}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: boxSize,
        height: boxSize,
        border: "none",
        borderRadius: "50%",
        cursor: "pointer",
        background: "transparent",
        color: active ? C.navy800 : C.muted,
        flexShrink: 0,
      }}
    >
      <span style={{ position: "relative", display: "inline-flex", lineHeight: 0 }}>
        {imgSrc ? (
          <NavIconImg src={imgSrc} size={size + 2} active={active} />
        ) : (
          <Icon size={size} strokeWidth={strokeWidth ?? (active ? 2.2 : 1.85)} />
        )}
        {badge != null && <Badge count={badge} size={badgeSize} />}
      </span>
    </button>
  );
}

/**
 * Petite puce colorée pour une icône (utilisée dans le menu profil) :
 * remplace l'icône seule par une icône "posée" sur un fond teinté, plus
 * lisible et plus proche des design systems pro actuels.
 */
function IconChip({ icon: Icon, color, bg, size = 17, box = 31 }) {
  return (
    <span
      style={{
        width: box,
        height: box,
        borderRadius: 8,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={size} color={color} strokeWidth={2.1} />
    </span>
  );
}

/**
 * Icône fournie par l'utilisateur (PNG plat, cercle noir/blanc intégré).
 * Rendue telle quelle ; seule l'opacité varie selon l'état actif pour ne
 * pas dénaturer le style du pack d'icônes.
 */
function NavIconImg({ src, size = 24, active = false }) {
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      draggable={false}
      style={{ display: "block", flexShrink: 0, opacity: active ? 1 : 0.62, transition: "opacity .15s ease" }}
    />
  );
}

/**
 * Repli pour un élément sans icône dédiée dans le pack fourni : icône
 * lucide affichée directement, plus grande et avec un trait plus épais
 * (sans contour circulaire) pour rester lisible à côté des icônes image.
 */
function NavIconFallback({ icon: Icon, size = 24, active = false }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        opacity: active ? 1 : 0.62,
        color: active ? C.navy800 : C.muted,
      }}
    >
      <Icon size={size} strokeWidth={active ? 2.6 : 2.3} />
    </span>
  );
}

/* ---------------------------------------------------------------------- */
/*  TopNav                                                                  */
/* ---------------------------------------------------------------------- */

export const TopNav = forwardRef(function TopNav({
  profile = CURRENT_USER,
  accountMode = "personal",
  personalAccount = null,
  onSwitchAccount = () => {},
  view = "feed",
  onNavigate = () => {},
  onRequestLogout = () => {},
  unreadMessages = 3,
  unreadNotifications = 7,
  adminBadge = 0,
  networkBadge = 0,
  feedBadge = 0,
  groupBadge = 0,
  companyBadge = 0,
  isAdmin = false,
  isPremium = false,
  onSearch = () => {},
  onSelectSearchResult = null,
  searchResults = [],
  searchLoading = false,
  profileLoading = false,
  companyPages = [],
  onOpenCompanyPage = null,
  onOpenCampaign = null,
}, ref) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuLoading, setProfileMenuLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [containerWidth, setContainerWidth] = useState(1200);
  const headerRef = useRef(null);
  const profileMenuRef = useRef(null);
  const inputRef = useRef(null);
  const profileAvatar = profile?.avatarUrl || profile?.image || profile?.photoUrl || null;
  const isPageMode = accountMode === "company" || profile?.accountType === "company";
  const publicPages = companyPages.filter((page) => page.isPublic && String(page.id) !== String(profile?.id));
  const inactiveCompanyPages = companyPages.filter((page) => !page.isPublic && (!isPageMode || String(page.id) !== String(profile?.id)));
  const inactiveAccounts = isPageMode
    ? [
        ...(personalAccount ? [{ ...personalAccount, type: "personal", displayName: personalAccount.displayName || personalAccount.name || "Compte classique" }] : []),
        ...publicPages.map((page) => ({ ...page, type: "company", isPublic: true })),
      ]
    : inactiveCompanyPages.map((page) => ({ ...page, type: "company", displayName: page.displayName || page.name || "Page entreprise" }));

  const isCompact = containerWidth < COMPACT_BREAKPOINT;

  useEffect(() => {
    if (!menuOpen) {
      setProfileMenuLoading(false);
      return undefined;
    }
    setProfileMenuLoading(true);
    const timeout = setTimeout(() => setProfileMenuLoading(false), 400);
    return () => clearTimeout(timeout);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen || !isCompact) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [menuOpen, isCompact]);

  useEffect(() => {
    if (!menuOpen && !searchOpen) return undefined;
    const handleOutsidePointerDown = (event) => {
      if (menuOpen && profileMenuRef.current && !profileMenuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  }, [menuOpen, searchOpen]);

  const goHome = () => {
    onNavigate("feed");
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const isDevicePreview = new URLSearchParams(window.location.search).get("devicePreview") === "1";
    document.documentElement.toggleAttribute("data-device-preview", isDevicePreview);
    return undefined;
  }, []);

  // Mesure la largeur réelle du header (qui occupe toute la largeur de son parent)
  // plutôt que du viewport, pour que le composant reste responsive même intégré
  // dans un panneau étroit. On évite volontairement un <div> englobant supplémentaire :
  // un tel wrapper romprait le "position: sticky" du header et de la tabbar, qui doivent
  // partager le même parent DOM que le contenu de page pour rester immobiles sur toute
  // la hauteur du scroll (sticky est borné par la boîte de son parent direct).
  useLayoutEffect(() => {
    if (!headerRef.current) return;
    const el = headerRef.current;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setContainerWidth(rect.width);
      document.documentElement.style.setProperty("--lynora-scrollbar-width", `${Math.max(0, window.innerWidth - document.documentElement.clientWidth)}px`);
      document.documentElement.style.setProperty("--lynora-header-offset", `${rect.height}px`);
    };
    measure();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        document.documentElement.style.setProperty("--lynora-scrollbar-width", `${Math.max(0, window.innerWidth - document.documentElement.clientWidth)}px`);
        document.documentElement.style.setProperty("--lynora-header-offset", `${entry.target.getBoundingClientRect().height}px`);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e) => e.key === "Escape" && setSearchOpen(false);
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      clearTimeout(t);
    };
  }, [searchOpen]);

  const results = useMemo(() => {
    if (!Array.isArray(searchResults)) return [];
    return searchResults;
  }, [searchResults]);

  const grouped = useMemo(() => {
    const acc = {};
    results.forEach((r) => {
      (acc[r.type] = acc[r.type] || []).push(r);
    });
    return acc;
  }, [results]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery("");
  }, []);

  const mobileTabs = [
    { id: "feed", icon: FaHouse, label: "Accueil", badge: feedBadge },
    { id: "network", icon: Users, label: "Réseau", badge: networkBadge },
    { id: "groups", icon: FaUserGroup, label: "Groupes", badge: groupBadge },
    { id: "messages", icon: Mail, label: "Messages", badge: unreadMessages },
  ];
  const mobileProfileShortcuts = [
    { id: "my-posts", icon: FileText, label: "Mes posts" },
    { id: "my-articles", icon: BookOpen, label: "Mes articles" },
    { id: "saved", icon: Bookmark, label: "Enregistrés" },
    { id: "groups", icon: Users2, label: "Mes groupes" },
    { id: "ai-assistant", icon: Sparkles, label: "Assistant IA" },
  ];

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* Header                                                        */}
      {/* ------------------------------------------------------------- */}
      <header
        className="lynora-topnav-header"
        ref={(node) => {
          headerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          isolation: "isolate",
          fontFamily: "'Inter', sans-serif",
          background: C.white,
          borderBottom: `1px solid ${C.border}`,
          boxShadow: "0 1px 0 rgba(13,44,72,0.04), 0 12px 28px -20px rgba(13,44,72,0.3)",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: isCompact ? 12 : 16,
            padding: isCompact ? "6px 10px" : "10px 24px",
          }}
        >
          {/* Gauche: Logo + Recherche */}
          <div style={{ display: "flex", alignItems: "center", gap: isCompact ? 8 : 12, flexShrink: 0 }}>
            {/* Logo */}
            <button
              type="button"
              onClick={goHome}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}
              aria-label="Aller à l'accueil"
            >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: isCompact ? 32 : 52, height: isCompact ? 32 : 52, flexShrink: 0 }}>
                <LogoLynora size={isCompact ? 32 : 52} />
              </span>
              {isCompact && (
                <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 15.5, color: C.logoInk, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
                  Lynora<span style={{ color: C.gold600 }}>Link</span>
                </span>
              )}
            </button>

            {/* Recherche (desktop = pill, mobile = icône) */}
            {!isCompact ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSearchOpen(true);
                }}
                className="tn-search-pill"
                style={{
                  flex: "1 1 620px", maxWidth: 620, minWidth: 0, display: "flex", alignItems: "center", gap: 9,
                  background: C.navy50, border: `1px solid ${C.border}`, borderRadius: 9999,
                  padding: "8px 14px", cursor: "pointer", color: C.mutedLight, textAlign: "left",
                }}
              >
                <FaMagnifyingGlass size={18} color={C.mutedLight} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>Rechercher…</span>
                <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: C.mutedLight, border: `1px solid ${C.border}`, borderRadius: 5, padding: "1px 6px", fontFamily: "monospace" }}>
                  /
                </span>
              </button>
            ) : (
              <IconButton icon={FaMagnifyingGlass} label="Rechercher" onClick={() => setSearchOpen(true)} size={18} boxSize={34} />
            )}
          </div>

          {/* Centre: Navigation principale (desktop) */}
          {!isCompact && (
            <nav aria-label="Navigation principale" style={{ flex: 1, display: "flex", alignItems: "center", gap: 48, justifyContent: "center", padding: 0 }}>
              {NAV_ITEMS.map(({ id, icon: Icon, iconSrc, label }) => {
                const active = view === id;
                return (
                  <button
                    key={id}
                    onClick={() => id === "feed" ? goHome() : onNavigate(id)}
                    className="tn-item"
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                    style={{
                      position: "relative", display: "flex", alignItems: "center", justifyContent: "center", border: "none",
                      width: 52, height: 52, flex: "0 0 52px", padding: 0, borderRadius: "50%", cursor: "pointer",
                      whiteSpace: "nowrap",
                      color: active ? C.navy800 : C.muted,
                    }}
                  >
                    <span style={{ position: "relative", display: "inline-flex", lineHeight: 0 }}>
                      {iconSrc ? (
                        <NavIconImg src={iconSrc} size={28} active={active} />
                      ) : (
                        <NavIconFallback icon={Icon} size={28} active={active} />
                      )}
                      {id === "feed" && <Badge count={feedBadge} size="sm" />}
                      {id === "network" && <Badge count={networkBadge} size="sm" />}
                      {id === "groups" && <Badge count={groupBadge} size="sm" />}
                      {id === "company" && <Badge count={companyBadge} size="sm" />}
                    </span>
                  </button>
                );
              })}
            </nav>
          )}

          {isCompact && <div style={{ flex: 1 }} />}

          {/* Droite: Icônes d'action + Menu profil */}
          <div style={{ display: "flex", alignItems: "center", gap: isCompact ? 8 : 20, flexShrink: 0 }}>
            {!isCompact && (
              <>
                <IconButton
                  icon={Mail}
                  label="Messages"
                  onClick={() => onNavigate("messages")}
                  active={view === "messages"}
                  badge={unreadMessages}
                  size={28}
                  boxSize={46}
                />
                <IconButton
                  icon={Bell}
                  label="Notifications"
                  onClick={() => onNavigate("notifications")}
                  active={view === "notifications"}
                  badge={unreadNotifications}
                  size={28}
                  boxSize={46}
                />
              </>
            )}

            {isCompact && (
              <>
                <IconButton
                  icon={Bell}
                  label="Notifications"
                  onClick={() => onNavigate("notifications")}
                  active={view === "notifications"}
                  badge={unreadNotifications}
                  badgeSize="sm"
                  size={20}
                  boxSize={34}
                />
              </>
            )}

            {/* Menu profil */}
            <div ref={profileMenuRef} style={{ position: "relative" }}>
              {!isCompact && (
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="tn-avatar-trigger"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  style={{ background: "none", border: "none", borderRadius: 9999, padding: "3px 7px 3px 3px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                >
                  {profileLoading || profileMenuLoading ? <SkeletonAvatar size={38} /> : <Avatar initials={getInitials(profile.name)} imgUrl={profileAvatar} size={38} ring online={profile.showOnlineStatus !== false} />}
                  <ChevronDown size={16} color={C.muted} style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                </button>
              )}

              {isCompact && (
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="tn-avatar-trigger"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  style={{ background: "none", border: "none", borderRadius: 10, padding: 6, cursor: "pointer", display: "flex" }}
                >
                  {profileLoading || profileMenuLoading ? <SkeletonAvatar size={32} /> : <Avatar initials={getInitials(profile.name)} imgUrl={profileAvatar} size={32} online={profile.showOnlineStatus !== false} />}
                </button>
              )}

              {menuOpen && (
                <>
                  {isCompact && (
                    <div className="tn-profile-menu-backdrop" style={{ position: "fixed", inset: 0, zIndex: 39, background: "var(--app-surface)" }} onClick={() => setMenuOpen(false)} />
                  )}
                  <div
                    role="menu"
                    className="tn-anim-pop tn-profile-menu"
                    style={{
                      position: "absolute", top: "calc(100% + 8px)", right: 0, width: 304, maxWidth: "calc(100vw - 24px)", background: C.white, borderRadius: 16,
                      boxShadow: "0 24px 55px -12px rgba(8,28,48,0.4), 0 4px 14px -6px rgba(13,44,72,0.18)",
                      border: `1px solid ${C.border}`, zIndex: 40,
                      overflow: "hidden", transformOrigin: "top right",
                    }}
                  >
                    <div style={{ height: 3, background: goldGrad }} />
                    {isCompact && (
                      <button
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        aria-label="Fermer le menu profil"
                        className="tn-profile-menu-close"
                        style={{ position: "absolute", top: 12, right: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 10, background: "rgba(255,255,255,0.12)", color: C.white, cursor: "pointer" }}
                      >
                        <X size={20} />
                      </button>
                    )}
                    {profileLoading || profileMenuLoading ? <ProfileMenuSkeleton /> : <>
                    <button
                      type="button"
                      onClick={() => { onNavigate(isPageMode ? "company" : "profile"); setMenuOpen(false); }}
                      className="tn-profile-card"
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "16px",
                        background: navyGrad, border: "none", cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <Avatar initials={getInitials(profile.name)} imgUrl={profileAvatar} size={42} ring online={profile.showOnlineStatus !== false} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <div style={{ minWidth: 0, flex: 1, fontSize: 14, lineHeight: 1.25, fontWeight: 700, color: C.white, whiteSpace: "normal", overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, wordBreak: "break-word" }}>{profile.name || (isPageMode ? "Page entreprise" : "Compte classique")}</div>
                          {isPageMode && profile.isPremium && <FaCrown size={12} color={C.gold300} title="Page Premium" aria-label="Page Premium" />}
                        </div>
                        <div style={{ fontSize: 11.5, lineHeight: 1.35, color: "rgba(228,236,243,0.75)", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden", wordBreak: "break-word", marginTop: 3 }}>{profile.title || (isPageMode ? "Page entreprise" : "Membre LynoraLink")}</div>
                      </div>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.12)", flexShrink: 0 }}>
                        <ChevronDown size={13} color={C.gold300} style={{ transform: "rotate(-90deg)" }} />
                      </span>
                    </button>
                    <div className="tn-profile-menu-section" style={{ padding: "6px 0" }}>
                      <div className="tn-profile-section-title" style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 8px 5px", color: C.muted, fontSize: 10.5, lineHeight: 1.2, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        <User size={13} color={C.gold600} aria-hidden="true" />
                        <span>Compte</span>
                      </div>
                      <MenuItem icon={FaBriefcase} label="Mon entreprise" onClick={() => { onNavigate("company"); setMenuOpen(false); }} />
                      {isPageMode && onOpenCampaign && <MenuItem icon={Megaphone} label="Créer une publicité" onClick={() => { onOpenCampaign(); setMenuOpen(false); }} />}
                      <MenuItem icon={FaGear} label="Paramètres" onClick={() => { onNavigate("settings"); setMenuOpen(false); }} />
                      {!isAdmin && !isPremium && <MenuItem icon={FaCrown} label="Passer à Premium" meta="NOUVEAU" accent premium onClick={() => { onNavigate("abonnement"); setMenuOpen(false); }} />}
                      {isAdmin && <MenuItem icon={FaShieldHalved} label="Administration" badge={adminBadge} onClick={() => { window.location.href = "/admin"; setMenuOpen(false); }} />}
                      <MenuItem icon={FileText} label="Informations légales" onClick={() => { onNavigate("legal"); setMenuOpen(false); }} />
                    </div>
                    <div className="tn-mobile-shortcuts tn-profile-menu-section" aria-label="Raccourcis personnels">
                      <div style={{ padding: "10px 16px 5px", borderTop: `1px solid ${C.border}`, fontSize: 10.5, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Mes raccourcis
                      </div>
                      {mobileProfileShortcuts.map(({ id, icon: Icon, label }) => (
                        <MenuItem
                          key={id}
                          icon={Icon}
                          imgSrc={id === "ai-assistant" ? "/assistant-icone.svg" : undefined}
                          label={label}
                          onClick={() => { onNavigate(id); setMenuOpen(false); }}
                        />
                      ))}
                    </div>
                    {inactiveAccounts.length > 0 && (
                      <div className="tn-profile-account-switcher" style={{ padding: "10px 8px 8px", borderTop: `1px solid ${C.border}`, background: "#FBFCFE" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 8px 7px", fontSize: 10.5, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          <Building2 size={13} color={C.gold600} /> {isPageMode ? "Autres comptes" : "Compte entreprise"}
                        </div>
                        {inactiveAccounts.map((page) => {
                          const isPersonalAccount = page.type === "personal";
                          const pageName = isPersonalAccount
                            ? (page.displayName || page.name || "Compte classique")
                            : (page.displayName || page.name || "Page entreprise");
                          const pageAvatar = page.avatarUrl || page.logoUrl || page.image || page.photoUrl || page.avatar || null;
                          return (
                            <button
                              type="button"
                              key={page.id || pageName}
                              onClick={() => {
                                if (page.isPublic) onOpenCompanyPage?.(page);
                                else onSwitchAccount(isPersonalAccount ? null : page);
                                setMenuOpen(false);
                              }}
                              onMouseEnter={(event) => { event.currentTarget.style.background = C.navy50; }}
                              onMouseLeave={(event) => { event.currentTarget.style.background = C.white; }}
                              className="tn-menu-item"
                              aria-label={`Basculer vers ${pageName}`}
                              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", borderRadius: 10, background: C.white, border: `1px solid ${C.border}`, cursor: "pointer", textAlign: "left", fontFamily: "'Inter', sans-serif", boxShadow: "0 2px 6px rgba(13,44,72,0.04)", transition: "background .15s ease, box-shadow .15s ease, transform .15s ease" }}
                            >
                              <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
                                <Avatar initials={getInitials(pageName)} imgUrl={pageAvatar} size={36} />
                                <span className="tn-page-switch-ring" aria-hidden="true">
                                  <RotateCw size={47} strokeWidth={1.5} />
                                </span>
                              </span>
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                  <span style={{ minWidth: 0, flex: 1, fontSize: 13, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pageName}</span>
                                  {!isPersonalAccount && (page.isPremium || page.creatorSubscribed) && (
                                    <span title="Page Premium" aria-label="Page Premium" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: C.gold100, color: C.gold600 }}>
                                      <FaCrown size={10} />
                                    </span>
                                  )}
                                </span>
                                <span style={{ display: "block", fontSize: 10.5, color: C.muted, marginTop: 2 }}>{isPersonalAccount ? "Utiliser comme compte classique" : page.isPublic ? "Ouvrir la page" : "Utiliser comme page"}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ height: 1, background: C.border }} />
                    <div className="tn-profile-menu-section tn-profile-menu-footer" style={{ padding: "6px 0" }}>
                      <MenuItem icon={FaRightFromBracket} label="Déconnexion" danger onClick={() => { setMenuOpen(false); onRequestLogout(); }} />
                    </div>
                    </>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* filet de signature */}
        <div style={{ height: 2, background: goldGrad, opacity: 0.9 }} />

        {/* ------------------------------------------------------------- */}
        {/* Barre de navigation mobile (haut d'écran)                     */}
        {/* ------------------------------------------------------------- */}
        {isCompact && (
          <nav
            aria-label="Navigation principale mobile"
            style={{
              width: "100%",
              fontFamily: "'Inter', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              gap: 2,
              padding: "max(4px, env(safe-area-inset-top)) 4px calc(4px + env(safe-area-inset-bottom))",
              background: C.white,
              backdropFilter: "saturate(180%) blur(16px)",
              WebkitBackdropFilter: "saturate(180%) blur(16px)",
              borderTop: `1px solid ${C.border}`,
              boxShadow: "0 -1px 0 rgba(13,44,72,0.04)",
              position: "relative",
              zIndex: 1,
            }}
          >
          {mobileTabs.map(({ id, icon: Icon, iconSrc, label, badge }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className="tn-tab"
                aria-current={active ? "page" : undefined}
                style={{
                  position: "relative",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  minHeight: 44,
                  background: "none",
                  border: "none",
                  padding: "3px 2px 2px",
                  cursor: "pointer",
                }}
              >
                <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {iconSrc ? (
                    <NavIconImg src={iconSrc} size={18} active={active} />
                  ) : (
                    <NavIconFallback icon={Icon} size={18} active={active} />
                  )}
                  <Badge count={badge} size="sm" />
                </span>
                <span style={{
                  fontSize: 8.5,
                  lineHeight: 1.1,
                  letterSpacing: "0.01em",
                  fontWeight: active ? 700 : 500,
                  color: active ? C.navy800 : C.muted,
                  whiteSpace: "nowrap",
                }}>{label}</span>
                {active && <span style={{ position: "absolute", bottom: -4, width: 14, height: 2, borderRadius: 999, background: goldGrad }} />}
              </button>
            );
          })}
        </nav>
      )}
      </header>

      {/* ------------------------------------------------------------- */}
      {/* Overlay de recherche                                          */}
      {/* ------------------------------------------------------------- */}
      {searchOpen && (
        <div
          className="tn-anim-fade tn-search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Recherche"
          style={{
            position: "fixed", inset: 0, zIndex: 1200, background: "rgba(8,28,48,0.55)",
            backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: 0,
          }}
          onClick={(e) => e.target === e.currentTarget && closeSearch()}
        >
          <div
            className="tn-anim-pop tn-search-dialog"
            style={{
              width: "100vw", maxWidth: "none", background: C.white,
              borderRadius: 0, boxShadow: "none",
              overflow: "hidden", height: "100dvh", maxHeight: "none",
              display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
              <FaMagnifyingGlass size={19} color={C.mutedLight} style={{ flexShrink: 0, marginLeft: 4 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  e.preventDefault();
                  setQuery(e.target.value);
                  onSearch(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                placeholder="Rechercher des personnes, entreprises, groupes…"
                autoComplete="off"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.ink, fontSize: 15.5, fontWeight: 500 }}
              />
              {query && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setQuery("");
                    onSearch("");
                  }}
                  aria-label="Effacer"
                  style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: C.mutedLight, display: "flex" }}
                >
                  <X size={19} />
                </button>
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  closeSearch();
                }}
                className="tn-close-btn"
                style={{ background: C.navy50, border: `1px solid ${C.border}`, padding: "7px 13px", cursor: "pointer", color: C.ink, fontSize: 12.5, fontWeight: 700, borderRadius: 9 }}
              >
                Fermer
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {!query.trim() ? (
                <div style={{ padding: "48px 20px", textAlign: "center", color: C.mutedLight }}>
                  <FaMagnifyingGlass size={32} color={C.mutedLight} style={{ display: "block", margin: "0 auto 12px", opacity: 0.55 }} />
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Commencez à taper pour rechercher</div>
                </div>
              ) : searchLoading ? (
                <div style={{ padding: "48px 20px", textAlign: "center", color: C.mutedLight }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 5 }}>Recherche en cours…</div>
                  <div style={{ fontSize: 13.5, color: C.muted }}>Recherche de personnes, pages et groupes.</div>
                </div>
              ) : results.length === 0 ? (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 5 }}>Aucun résultat</div>
                  <div style={{ fontSize: 13.5, color: C.muted }}>
                    Rien ne correspond à « {query} ». Essayez un autre mot-clé.
                  </div>
                </div>
              ) : (
                Object.entries(grouped).map(([type, items]) => (
                  <div key={type}>
                    <div style={{ padding: "10px 18px 6px", fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", background: C.navy50 }}>
                      {type}s · {items.length}
                    </div>
                    {items.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (onSelectSearchResult) {
                            onSelectSearchResult(r);
                          } else {
                            onNavigate(r.view || "feed");
                          }
                          closeSearch();
                        }}
                        className="tn-result"
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: "12px 18px", background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, cursor: "pointer", textAlign: "left" }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: r.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <r.icon size={22} color={r.iconColor} strokeWidth={2} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                          <div style={{ fontSize: 12.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            {query.trim() && (
              <div className="tn-search-footer" style={{ padding: "10px 18px", borderTop: `1px solid ${C.border}`, background: C.navy50, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>
                  <strong style={{ color: C.navy800 }}>{results.length}</strong> résultat{results.length !== 1 ? "s" : ""}
                </span>
                <span style={{ fontSize: 11, color: C.mutedLight, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ padding: "1.5px 6px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 5, fontFamily: "monospace" }}>ESC</span>
                  pour fermer
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});

/* ---------------------------------------------------------------------- */
/*  Démo / aperçu                                                          */
/* ---------------------------------------------------------------------- */

export default function TopNavPreview() {
  const [view, setView] = useState("feed");
  const [device, setDevice] = useState("desktop");

  const frameWidth = device === "mobile" ? 400 : "100%";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "18px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.gold600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
              Aperçu du composant
            </div>
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 19, fontWeight: 800, color: C.navy950, margin: 0 }}>TopNav — redesign</h1>
          </div>
          <div style={{ display: "flex", gap: 6, background: C.white, border: `1px solid ${C.border}`, borderRadius: 11, padding: 4 }}>
            <button
              onClick={() => setDevice("desktop")}
              style={{
                display: "flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8, padding: "7px 13px", cursor: "pointer",
                background: device === "desktop" ? C.navy900 : "transparent", color: device === "desktop" ? C.white : C.muted,
                fontSize: 12.5, fontWeight: 700,
              }}
            >
              <Monitor size={16} /> Desktop
            </button>
            <button
              onClick={() => setDevice("mobile")}
              style={{
                display: "flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8, padding: "7px 13px", cursor: "pointer",
                background: device === "mobile" ? C.navy900 : "transparent", color: device === "mobile" ? C.white : C.muted,
                fontSize: 12.5, fontWeight: 700,
              }}
            >
              <Smartphone size={16} /> Mobile
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: device === "mobile" ? "0 20px 40px" : "0" }}>
        <div
          style={{
            width: frameWidth,
            maxWidth: "100%",
            background: C.white,
            borderRadius: device === "mobile" ? 28 : 0,
            border: device === "mobile" ? `8px solid ${C.navy950}` : "none",
            boxShadow: device === "mobile" ? "0 25px 60px -20px rgba(8,28,48,0.45)" : "none",
            overflow: "hidden",
            // le conteneur défilant (overflow-y: auto) sert d'ancrage de scroll pour le
            // header et la tabbar en position sticky : ils restent immobiles pendant
            // que ce cadre défile.
            position: "relative",
            maxHeight: device === "mobile" ? "78vh" : "min(640px, 78vh)",
            overflowY: "auto",
          }}
        >
          <TopNav
            profile={CURRENT_USER}
            view={view}
            onNavigate={setView}
            onRequestLogout={() => alert("Déconnexion (démo)")}
            unreadMessages={3}
            unreadNotifications={7}
            isAdmin={false}
          />

          {/* Contenu factice pour donner du contexte visuel */}
          <div style={{ padding: device === "mobile" ? "18px 16px 28px" : "32px 28px 60px", background: C.bg, minHeight: device === "mobile" ? 420 : 380 }}>
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.mutedLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  Section active
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>
                  {NAV_ITEMS.find((n) => n.id === view)?.label || (view === "messages" ? "Messages" : "Accueil")}
                </div>
                <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6, marginTop: 8 }}>
                  Cliquez sur les éléments de navigation, ouvrez la recherche ou le menu de profil pour tester les interactions.
                  Basculez entre Desktop et Mobile ci-dessus, et faites défiler ce cadre : le header (et la barre du bas en mobile) restent immobiles.
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "1fr 1fr", gap: 12 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, height: 90, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.navy50, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 10, width: "60%", borderRadius: 4, background: C.navy100, marginBottom: 8 }} />
                      <div style={{ height: 8, width: "40%", borderRadius: 4, background: C.navy50 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
