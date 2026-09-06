import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Bell, BellOff, X, Check, CheckCheck, MoreHorizontal, Trash2, EyeOff, Eye,
  Settings, ArrowLeft,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faThumbsUp, faComment, faUserPlus, faAt, faBookOpen, faEye } from "@fortawesome/free-solid-svg-icons";
import { DEFAULT_REACTIONS } from "@/components/ReactionPicker";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { fetchBackendApi } from "@/lib/backend-api";

/* ------------------------------------------------------------------ */
/*  TOKENS — identiques à LynoraLinkFeed.jsx pour rester cohérent      */
/* ------------------------------------------------------------------ */
const C = {
  navy900: "#0F3352",
  navy800: "#1B5386",
  navy700: "#2C6BA0",
  navy100: "var(--app-border)",
  navy50: "var(--app-bg)",
  gold400: "#F6D374",
  gold600: "#D9A536",
  ink: "var(--app-text)",
  muted: "var(--app-muted)",
  mutedLight: "var(--app-muted-light)",
  line: "var(--app-border)",
  surface: "var(--app-surface)",
  white: "#FFFFFF",
  danger: "#C24444",
  danger50: "#FBEDED",
  success: "#2E9E5B",
};
const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;

/* Typologie des notifications : icône, couleur, libellé (utilisé pour le filtrage/mute) */
const NOTIF_TYPES = {
  like: { icon: faThumbsUp, color: C.gold600, label: "Réactions" },
  comment: { icon: faComment, color: C.navy700, label: "Commentaires" },
  connection: { icon: faUserPlus, color: C.success, label: "Invitations" },
  birthday: { icon: faBell, color: C.gold600, label: "Anniversaires" },
  page: { icon: faUserPlus, color: C.navy800, label: "Pages suivies" },
  suggestion: { icon: faUserPlus, color: C.navy700, label: "Suggestions" },
  mention: { icon: faAt, color: C.navy800, label: "Mentions" },
  article: { icon: faBookOpen, color: C.gold600, label: "Articles" },
  story: { icon: faEye, color: C.navy700, label: "Stories" },
  security_alert: { icon: faBell, color: C.danger, label: "Sécurité" },
};

/* Données de démonstration — utilisées uniquement si le composant est monté sans props */
const now = Date.now();
const m = 60000;
const h = 3600000;
const j = 86400000;

// Les notifications doivent être chargées depuis Prisma via l'API
export const DEMO_NOTIFICATIONS = [];

function normalizeNotification(notification) {
  if (!notification || typeof notification !== "object") return null;
  if (notification.type === "message") return null;
  const kind = notification.type && ["like", "comment", "connection", "page", "suggestion", "mention", "article", "story", "security_alert"].includes(notification.type)
    ? notification.type
    : (notification.type === "warning" || notification.type === "danger" ? "article" : "article");

  const actor = notification.actor || notification.meta?.actor || "LynoraLink";
  const isPlatformNotification = actor === "LynoraLink" || actor === "Assistant IA" || actor === "IA" || ["admin_ai_tasks", "support_reply", "security_alert"].includes(notification.type);
  const displayActor = isPlatformNotification ? "LynoraLink" : actor;
  const initials = isPlatformNotification ? "LL" : (notification.initials || (typeof displayActor === "string" ? displayActor.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "L" : "L"));

  const meta = notification.meta && typeof notification.meta === "object" ? notification.meta : {};
  const explicitAvatar = isPlatformNotification ? "/logo_lynora.svg" : (notification.avatarUrl || notification.imageUrl || meta.avatarUrl || meta.actorAvatar || meta.image || meta.imageUrl || (typeof notification.user?.image === "string" ? notification.user.image : null) || null);
  const explicitCover = notification.coverUrl || meta.coverUrl || meta.groupCover || meta.groupImage || (typeof notification.group?.coverUrl === "string" ? notification.group.coverUrl : null) || null;
  const avatarUrl = explicitAvatar || (displayActor === "LynoraLink" ? "/logo_lynora.svg" : null);
  const coverUrl = explicitCover || null;
  const isGroupNotification = Boolean(meta.groupId || /^group_/.test(String(meta.kind || "")) || /group/i.test(String(notification.actor || "")));

  return {
    id: notification.id,
    type: kind,
    actor: displayActor,
    initials,
    avatarUrl,
    coverUrl,
    isGroupNotification,
    text: notification.text || notification.message || "Nouvelle notification",
    time: notification.createdAt || notification.time || new Date().toISOString(),
    read: Boolean(notification.read),
    meta: { ...meta, ...(explicitAvatar ? { avatarUrl: explicitAvatar, actorAvatar: explicitAvatar } : {}), ...(coverUrl ? { coverUrl } : {}) },
  };
}

/* ------------------------------------------------------------------ */
/*  PETITS COMPOSANTS D'APPUI                                         */
/* ------------------------------------------------------------------ */
function Avatar({ initials, size = 40, imageUrl, variant = "circle" }) {
  const hasImage = Boolean(imageUrl);
  const radius = variant === "square" ? 10 : "50%";
  return (
    <div
      style={{
        width: size, height: size, borderRadius: radius, background: hasImage ? "transparent" : navyGrad, color: C.white,
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
        fontSize: size * 0.36, fontFamily: "'Sora', sans-serif", flexShrink: 0, letterSpacing: "-0.02em",
        overflow: "hidden", position: "relative",
        boxShadow: hasImage ? "0 0 0 1px rgba(15,51,82,0.08)" : "none",
      }}
    >
      {hasImage ? (
        <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: variant === "square" ? "cover" : "cover", display: "block" }} />
      ) : (
        initials
      )}
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{ width: 36, height: 21, borderRadius: 999, border: "none", cursor: "pointer", background: checked ? goldGrad : C.line, position: "relative", flexShrink: 0, transition: "background 0.2s ease" }}
    >
      <span style={{ position: "absolute", top: 2.5, left: checked ? 17 : 2.5, width: 16, height: 16, borderRadius: "50%", background: C.white, boxShadow: "0 1px 3px rgba(15,51,82,0.35)", transition: "left 0.2s ease" }} />
    </button>
  );
}

function IconBtn({ icon: Icon, onClick, title, size = 16 }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: C.muted, cursor: "pointer", flexShrink: 0 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon size={size} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  MENU D'OPTIONS PAR NOTIFICATION                                   */
/* ------------------------------------------------------------------ */
function NotificationMenu({ notification, typeLabel, onMarkRead, onMarkUnread, onMuteType, onDelete, onCloseMenu }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onCloseMenu(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onCloseMenu]);

  const item = (icon, label, onClick, danger) => (
    <button
      onClick={onClick}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", background: "transparent", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: danger ? C.danger : C.ink, textAlign: "left" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? C.danger50 : C.navy50)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {React.createElement(icon, { size: 14 })}
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: "absolute", top: 30, right: 8, width: 226, background: C.surface, borderRadius: 12, border: `1px solid ${C.line}`, boxShadow: "0 12px 32px rgba(15,51,82,0.25)", zIndex: 50, overflow: "hidden" }}>
      {notification.read
        ? item(Eye, "Marquer comme non lue", onMarkUnread)
        : item(Check, "Marquer comme lue", onMarkRead)}
      {item(EyeOff, `Ne plus recevoir : ${typeLabel}`, onMuteType)}
      <div style={{ height: 1, background: C.line }} />
      {item(Trash2, "Supprimer la notification", onDelete, true)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LIGNE DE NOTIFICATION                                             */
/* ------------------------------------------------------------------ */
function NotificationItem({ notification, menuOpen, onToggleMenu, onCloseMenu, onOpen, onMarkRead, onMarkUnread, onMuteType, onDelete, onSecurityResponse }) {
  const cfg = NOTIF_TYPES[notification.type] || { icon: faBell, color: C.navy700, label: "Autre" };
  const relativeTime = useRelativeTime(notification.time);
  const reaction = DEFAULT_REACTIONS.find((item) => item.key === notification.meta?.reaction);
  const isGroup = Boolean(
    notification.isGroupNotification ||
    notification.meta?.groupId ||
    notification.meta?.kind === "group" ||
    notification.meta?.type === "group"
  );
  const primaryImage = isGroup ? (notification.coverUrl || notification.avatarUrl || null) : (notification.avatarUrl || notification.coverUrl || null);
  const avatarVariant = isGroup ? "square" : "circle";

  return (
    <div
      style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 14px", cursor: "pointer", background: notification.read ? "transparent" : C.navy50, borderBottom: `1px solid ${C.line}` }}
      onClick={() => onOpen(notification)}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar initials={notification.initials} size={38} imageUrl={primaryImage} variant={avatarVariant} />
        <span style={{ position: "absolute", bottom: -3, right: -3, width: 18, height: 18, borderRadius: "50%", background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px var(--app-surface)" }}>
          {reaction ? (
            <img src={reaction.src} alt={reaction.label} style={{ width: 12, height: 12, objectFit: "contain" }} />
          ) : (
            <FontAwesomeIcon icon={cfg.icon} style={{ width: 10, height: 10, color: cfg.color }} />
          )}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.45 }}>
          <span style={{ fontWeight: 700 }}>{notification.actor}</span> {notification.text}
        </div>
        <div style={{ fontSize: 10.5, color: C.mutedLight, marginTop: 3 }}>{relativeTime}</div>
        {notification.type === "security_alert" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }} onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => onSecurityResponse?.(notification, "yes")} style={{ border: "none", borderRadius: 7, padding: "6px 8px", background: C.success, color: C.white, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>
              Oui, c'est moi
            </button>
            <button type="button" onClick={() => onSecurityResponse?.(notification, "no")} style={{ border: `1px solid ${C.danger}`, borderRadius: 7, padding: "6px 8px", background: C.danger50, color: C.danger, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>
              Non, sécuriser
            </button>
          </div>
        )}
      </div>

      {!notification.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold600, marginTop: 4, flexShrink: 0 }} />}

      <button
        onClick={(e) => { e.stopPropagation(); onToggleMenu(notification.id); }}
        style={{ width: 24, height: 24, borderRadius: 7, border: "none", background: "transparent", color: C.mutedLight, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = C.navy100)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <MoreHorizontal size={15} />
      </button>

      {menuOpen && (
        <NotificationMenu
          notification={notification}
          typeLabel={cfg.label}
          onMarkRead={(e) => { e.stopPropagation(); onMarkRead(notification.id); onCloseMenu(); }}
          onMarkUnread={(e) => { e.stopPropagation(); onMarkUnread(notification.id); onCloseMenu(); }}
          onMuteType={(e) => { e.stopPropagation(); onMuteType(notification.type); onCloseMenu(); }}
          onDelete={(e) => { e.stopPropagation(); onDelete(notification.id); onCloseMenu(); }}
          onCloseMenu={onCloseMenu}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ÉCRAN DE RÉGLAGES — activer/désactiver par type de notification   */
/* ------------------------------------------------------------------ */
function SettingsView({ mutedTypes, onToggleType, onBack }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: `1px solid ${C.line}` }}>
        <IconBtn icon={ArrowLeft} onClick={onBack} title="Retour" />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>Préférences de notification</span>
      </div>
      <div style={{ padding: "6px 4px" }}>
        {Object.entries(NOTIF_TYPES).map(([key, cfg]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: C.navy50, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FontAwesomeIcon icon={cfg.icon} style={{ width: 13, height: 13, color: cfg.color }} />
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{cfg.label}</span>
            </div>
            <Switch checked={!mutedTypes.has(key)} onChange={() => onToggleType(key)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PANNEAU PRINCIPAL — liste filtrable + en-tête                     */
/* ------------------------------------------------------------------ */
export function NotificationsPanel({
  notifications, mutedTypes, onMarkRead, onMarkUnread, onMarkAllRead, onMuteType, onDelete, onOpen,
  onClose, showClose, variant, onSecurityResponse,
}) {
  const [tab, setTab] = useState("all");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const visible = notifications.filter((n) => !mutedTypes.has(n.type));
  const list = tab === "unread" ? visible.filter((n) => !n.read) : visible;
  const unreadCount = visible.filter((n) => !n.read).length;

  if (showSettings) {
    return (
      <div style={{ width: "100%" }}>
        <SettingsView mutedTypes={mutedTypes} onToggleType={onMuteType} onBack={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className="lynora-notification-panel" style={{ width: "100%", height: variant === "dropdown" ? "auto" : "100%", minHeight: 0, display: "flex", flexDirection: "column", maxHeight: variant === "dropdown" ? 480 : "none" }}>
      <div className="lynora-notification-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "13px 14px", borderBottom: `1px solid ${C.line}` }}>
        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 15, color: C.ink }}>Notifications</span>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconBtn icon={Settings} title="Préférences" onClick={() => setShowSettings(true)} />
          {unreadCount > 0 && <IconBtn icon={CheckCheck} title="Tout marquer comme lu" onClick={onMarkAllRead} />}
          {showClose && <IconBtn icon={X} title="Fermer" onClick={onClose} />}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "8px 12px 0" }}>
        {[{ id: "all", label: "Toutes" }, { id: "unread", label: `Non lues${unreadCount ? ` (${unreadCount})` : ""}` }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ padding: "6px 10px", marginBottom: -1, borderRadius: 999, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700, color: tab === t.id ? C.navy900 : C.muted, background: tab === t.id ? C.navy100 : "transparent" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="lynora-notification-list" style={{ overflowY: "auto", flex: "1 1 auto", minHeight: 0, marginTop: 6 }}>
        {list.length === 0 ? (
          <div style={{ padding: "36px 20px", textAlign: "center", color: C.mutedLight }}>
            <BellOff size={26} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 12.5 }}>Rien à signaler pour le moment.</div>
          </div>
        ) : (
          list.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              menuOpen={openMenuId === n.id}
              onToggleMenu={(id) => setOpenMenuId((cur) => (cur === id ? null : id))}
              onCloseMenu={() => setOpenMenuId(null)}
              onOpen={onOpen}
              onMarkRead={onMarkRead}
              onMarkUnread={onMarkUnread}
              onMuteType={onMuteType}
              onDelete={onDelete}
              onSecurityResponse={onSecurityResponse}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  COMPOSANT EXPORTÉ — CLOCHE + PANNEAU DÉROULANT                    */
/*  Utilisation :                                                      */
/*    <NotificationBell />                                             */
/*    <NotificationBell notifications={data} onChange={setData} />     */
/* ------------------------------------------------------------------ */
export function NotificationBell({ notifications: controlled, onChange, onOpenNotification, onSecurityResponse }) {
  const [internal, setInternal] = useState([]);
  const [mutedTypes, setMutedTypes] = useState(() => new Set());
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const notifications = useMemo(() => (controlled ?? internal).map(normalizeNotification).filter(Boolean), [controlled, internal]);
  useEffect(() => {
    if (controlled !== undefined) return undefined;
    let active = true;
    const loadNotifications = async () => {
      if (document.hidden) return; // Skip polling when tab is inactive
      try {
        const response = await fetchBackendApi("/api/notifications", { cache: "no-store" });
        const data = response.ok ? await response.json() : null;
        if (active && Array.isArray(data?.notifications)) setInternal(data.notifications);
      } catch {}
    };
    loadNotifications();
    const interval = setInterval(loadNotifications, 8000); // Increased from 3s to 8s
    window.addEventListener("focus", loadNotifications);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", loadNotifications);
    };
  }, [controlled]);
  const setNotifications = (updater) => {
    const next = typeof updater === "function" ? updater(notifications) : updater;
    if (onChange) onChange(next);
    else setInternal(next);
  };

  useEffect(() => {
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onEsc); };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read && !mutedTypes.has(n.type)).length,
    [notifications, mutedTypes]
  );

  const updateBackend = (body) => {
    if (controlled !== undefined) return;
    fetchBackendApi("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  };
  const markRead = (id) => { setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n))); updateBackend({ id, read: true }); };
  const markUnread = (id) => { setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: false } : n))); updateBackend({ id, read: false }); };
  const markAllRead = () => { setNotifications((ns) => ns.map((n) => ({ ...n, read: true }))); updateBackend({ markAllRead: true, read: true }); };
  const remove = (id) => { setNotifications((ns) => ns.filter((n) => n.id !== id)); if (controlled === undefined) fetchBackendApi(`/api/notifications?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {}); };
  const muteType = (type) => setMutedTypes((prev) => { const next = new Set(prev); next.has(type) ? next.delete(type) : next.add(type); return next; });
  const openOne = (n) => { markRead(n.id); onOpenNotification && onOpenNotification(n); };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 10, border: "none", background: open ? C.navy50 : "transparent", color: C.navy800, cursor: "pointer" }}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span style={{ position: "absolute", top: 2, right: 2, minWidth: 15, height: 15, padding: "0 3px", borderRadius: 999, background: C.danger, color: C.white, fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="lynora-notification-dropdown" style={{ position: "absolute", top: 46, right: 0, width: 360, background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`, boxShadow: "0 20px 50px rgba(15,51,82,0.3)", zIndex: 60, overflow: "hidden" }}>
          <NotificationsPanel
            notifications={notifications}
            mutedTypes={mutedTypes}
            onMarkRead={markRead}
            onMarkUnread={markUnread}
            onMarkAllRead={markAllRead}
            onMuteType={muteType}
            onDelete={remove}
            onOpen={openOne}
            onSecurityResponse={onSecurityResponse}
            onClose={() => setOpen(false)}
            showClose
            variant="dropdown"
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VARIANTE PLEINE PAGE — même logique, sans dropdown                */
/*    <NotificationsPage />                                            */
/* ------------------------------------------------------------------ */
export function NotificationsPage({ notifications: controlled, onChange, onOpenNotification, onSecurityResponse, modal = false, onClose }) {
  const [internal, setInternal] = useState([]);
  const [mutedTypes, setMutedTypes] = useState(() => new Set());
  const notifications = useMemo(() => (controlled ?? internal).map(normalizeNotification).filter(Boolean), [controlled, internal]);
  useEffect(() => {
    if (controlled !== undefined) return undefined;
    let active = true;
    const loadNotifications = async () => {
      if (document.hidden) return; // Skip polling when tab is inactive
      try {
        const response = await fetchBackendApi("/api/notifications", { cache: "no-store" });
        const data = response.ok ? await response.json() : null;
        if (active && Array.isArray(data?.notifications)) setInternal(data.notifications);
      } catch {}
    };
    loadNotifications();
    const interval = setInterval(loadNotifications, 8000); // Increased from 3s to 8s
    window.addEventListener("focus", loadNotifications);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", loadNotifications);
    };
  }, [controlled]);
  const setNotifications = (updater) => {
    const next = typeof updater === "function" ? updater(notifications) : updater;
    if (onChange) onChange(next);
    else setInternal(next);
  };

  const updateBackend = (body) => {
    if (controlled !== undefined) return;
    fetchBackendApi("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  };
  const markRead = (id) => { setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n))); updateBackend({ id, read: true }); };
  const markUnread = (id) => { setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: false } : n))); updateBackend({ id, read: false }); };
  const markAllRead = () => { setNotifications((ns) => ns.map((n) => ({ ...n, read: true }))); updateBackend({ markAllRead: true, read: true }); };
  const remove = (id) => { setNotifications((ns) => ns.filter((n) => n.id !== id)); if (controlled === undefined) fetchBackendApi(`/api/notifications?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {}); };
  const muteType = (type) => setMutedTypes((prev) => { const next = new Set(prev); next.has(type) ? next.delete(type) : next.add(type); return next; });
  const openOne = (n) => { markRead(n.id); onOpenNotification && onOpenNotification(n); };

  return (
    <div
      className={modal ? "notification-page-modal" : undefined}
      style={modal
        ? { height: "100%", background: C.surface, borderRadius: 24, overflow: "hidden", border: `1px solid ${C.line}`, boxShadow: "0 24px 80px rgba(15,51,82,0.14)", fontFamily: "'Inter', sans-serif" }
        : { maxWidth: 640, margin: "0 auto", padding: "24px 16px 60px", fontFamily: "'Inter', sans-serif" }}
    >
      <div style={modal ? { height: "100%", minHeight: 0, display: "flex", flexDirection: "column", background: C.surface } : { background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`, overflow: "hidden" }}>
        <NotificationsPanel
          notifications={notifications}
          mutedTypes={mutedTypes}
          onMarkRead={markRead}
          onMarkUnread={markUnread}
          onMarkAllRead={markAllRead}
          onMuteType={muteType}
          onDelete={remove}
          onOpen={openOne}
          onSecurityResponse={onSecurityResponse}
          onClose={onClose}
          showClose={modal}
          variant="page"
        />
      </div>
    </div>
  );
}

export default NotificationBell;
