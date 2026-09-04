"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { fetchBackendApi } from "@/lib/backend-api";
import {
  Users, MessageCircle, UserPlus, Check, UserX, X, Clock,
  Building2, ChevronRight, Contact, Gift, ListChecks, Settings,
  Plus, Pencil, Trash2, Search, Sparkles,
} from "lucide-react";

/* ================================================================== *
 *  RÉSEAU — page "Ami(e)s"                                            *
 *  ------------------------------------------------------------------ *
 *  Rendu fidèle à la maquette fournie :                               *
 *   - sidebar blanche large, FIXE (ne défile jamais avec le contenu)  *
 *   - grille "Vous connaissez peut-être" avec cartes photo + actions  *
 *   - couleurs identiques à la maquette (bleu Facebook, gris clair)   *
 *   - entièrement responsive : bascule en barre horizontale sur       *
 *     mobile/smartphone, grille en 2 colonnes                         *
 *   - composant autonome : gère son propre état, fonctionne avec des  *
 *     données de démo, et reste pilotable via props par l'app hôte    *
 * ================================================================== */

/* ---- Palette identique à la maquette (ne pas modifier) ---- */
const FB = {
  pageBg: "#F0F2F5",
  sidebarBg: "#FFFFFF",
  cardBg: "#FFFFFF",
  border: "#DADDE1",
  borderSoft: "#E4E6EB",
  text: "#050505",
  textSecondary: "#65676B",
  blue: "#1877F2",
  blueLight: "#E7F3FF",
  blueLightHover: "#DBE7F5",
  gray: "#E4E6EB",
  grayHover: "#D8DADF",
  iconDark: "#3A3B3C",
  white: "#FFFFFF",
};

const SIDEBAR_WIDTH = 360;

/* ------------------------------------------------------------------ *
 *  Sous-composants UI                                                 *
 * ------------------------------------------------------------------ */
function Avatar({ initials, size = 44, imgUrl = null, radius = "50%" }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: radius,
        background: imgUrl ? FB.borderSoft : "#CFD5DB",
        color: FB.textSecondary,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: size * 0.36, flexShrink: 0, overflow: "hidden",
      }}
    >
      {imgUrl ? (
        <img src={imgUrl} alt={initials} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        initials
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "64px 20px", width: "100%" }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, background: FB.borderSoft, display: "flex", alignItems: "center", justifyContent: "center", color: FB.textSecondary }}>
        <Icon size={24} strokeWidth={1.8} />
      </div>
      <span style={{ fontSize: 14, color: FB.textSecondary, textAlign: "center", maxWidth: 320, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function MutualRow({ mutual, label = "relations en commun", avatars = [] }) {
  if (mutual === undefined || mutual === null) return null;
  const slots = avatars.filter(Boolean).slice(0, 2);
  return (
    <div className="fb-mutual-row">
      <span className="fb-mutual-avatars">
        {slots.map((url, i) => (
          <span
            key={i}
            className="fb-mutual-avatar"
            style={{
              backgroundImage: `url(${url})`,
              marginLeft: i ? -7 : 0,
              zIndex: 2 - i,
            }}
          />
        ))}
      </span>
      <span className="fb-mutual-text">{mutual} {label}</span>
    </div>
  );
}

function NetworkTabSkeleton({ tab }) {
  if (tab === "connections") {
    return <div className="fb-network-skeleton-list">{Array.from({ length: 5 }).map((_, index) => <div className="fb-network-skeleton-row" key={index}><span className="fb-skeleton-circle" /><span className="fb-skeleton-line fb-skeleton-line-wide" /><span className="fb-skeleton-line fb-skeleton-line-short" /></div>)}</div>;
  }
  if (tab === "anniversaires") {
    return <div className="fb-network-skeleton-list">{Array.from({ length: 4 }).map((_, index) => <div className="fb-network-skeleton-row" key={index}><span className="fb-skeleton-calendar" /><span className="fb-skeleton-line fb-skeleton-line-wide" /><span className="fb-skeleton-line fb-skeleton-line-short" /></div>)}</div>;
  }
  if (tab === "listes") {
    return <div className="fb-network-skeleton-list">{Array.from({ length: 3 }).map((_, index) => <div className="fb-network-skeleton-list-card" key={index}><span className="fb-skeleton-line fb-skeleton-line-wide" /><span className="fb-skeleton-line fb-skeleton-line-medium" /><span className="fb-skeleton-button" /></div>)}</div>;
  }
  return <div className="fb-network-skeleton-grid">{Array.from({ length: 6 }).map((_, index) => <div className="fb-network-skeleton-card" key={index}><span className="fb-skeleton-cover" /><span className="fb-skeleton-avatar" /><span className="fb-skeleton-line fb-skeleton-line-medium" /><span className="fb-skeleton-line fb-skeleton-line-short" /><span className="fb-skeleton-button" /></div>)}</div>;
}

function NetworkOpeningSkeleton() {
  return (
    <div className="fb-network-opening-skeleton" aria-label="Chargement du réseau" role="status">
      <aside className="fb-network-opening-sidebar">
        <span className="fb-skeleton-line fb-skeleton-line-title" />
        {Array.from({ length: 6 }).map((_, index) => <div className="fb-network-opening-nav" key={index}><span className="fb-skeleton-circle" /><span className="fb-skeleton-line fb-skeleton-line-wide" /></div>)}
      </aside>
      <main className="fb-network-opening-content">
        <div className="fb-network-opening-header"><span className="fb-skeleton-line fb-skeleton-line-heading" /><span className="fb-skeleton-line fb-skeleton-line-short" /></div>
        <NetworkTabSkeleton tab="suggestions" />
      </main>
      <style>{`
        .fb-network-opening-skeleton { display: flex; min-height: calc(100dvh - var(--lynora-header-offset, 0px)); height: 100%; background: ${FB.pageBg}; color: ${FB.text}; }
        .fb-network-opening-sidebar { width: ${SIDEBAR_WIDTH}px; flex: 0 0 ${SIDEBAR_WIDTH}px; padding: 24px 16px; border-right: 1px solid ${FB.border}; background: ${FB.sidebarBg}; }
        .fb-network-opening-content { flex: 1; min-width: 0; padding: 28px; overflow: hidden; }
        .fb-network-opening-nav { display: flex; align-items: center; gap: 12px; min-height: 52px; }
        .fb-network-opening-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .fb-network-skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
        .fb-network-skeleton-card { display: flex; flex-direction: column; align-items: center; gap: 10px; min-height: 220px; padding: 12px; overflow: hidden; border: 1px solid ${FB.border}; border-radius: 12px; background: ${FB.cardBg}; }
        .fb-skeleton-cover { width: calc(100% + 24px); height: 62px; margin: -12px -12px 2px; background: ${FB.borderSoft}; }
        .fb-skeleton-avatar, .fb-skeleton-circle { display: block; flex-shrink: 0; width: 48px; height: 48px; border-radius: 50%; background: ${FB.borderSoft}; }
        .fb-skeleton-circle { width: 36px; height: 36px; }
        .fb-skeleton-line { display: block; height: 10px; border-radius: 999px; background: ${FB.borderSoft}; }
        .fb-skeleton-line-wide { width: min(70%, 220px); }
        .fb-skeleton-line-medium { width: 68%; }
        .fb-skeleton-line-short { width: 38%; }
        .fb-skeleton-button { display: block; width: 82%; height: 28px; margin-top: auto; border-radius: 6px; background: ${FB.borderSoft}; }
        .fb-skeleton-line-title { width: 128px; height: 22px; margin-bottom: 24px; }
        .fb-skeleton-line-heading { width: 220px; height: 22px; }
        .fb-network-opening-skeleton .fb-network-skeleton-card, .fb-network-opening-skeleton .fb-network-opening-nav, .fb-network-opening-skeleton .fb-skeleton-line { animation: fb-skeleton-pulse 1.1s ease-in-out infinite alternate; }
        @media (max-width: 700px) {
          .fb-network-opening-sidebar { display: none; }
          .fb-network-opening-content { padding: 18px 12px; }
        }
      `}</style>
    </div>
  );
}

function Toast({ message, icon: Icon, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", zIndex: 60,
        display: "flex", alignItems: "center", gap: "0.625rem", borderRadius: 9999, padding: "0.75rem 1.25rem",
        background: "#16232C", color: "#FFFFFF",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)",
        animation: "fb-toast-in 300ms cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {Icon && <Icon size={16} style={{ color: FB.blue, flexShrink: 0 }} />}
      <span style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap" }}>{message}</span>
      <button
        onClick={onClose}
        style={{ marginLeft: "0.375rem", borderRadius: 9999, padding: "0.125rem", border: "none", background: "none", cursor: "pointer", color: "#9AA6B0" }}
        aria-label="Fermer"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  RÉSEAU — composant principal                                       *
 * ------------------------------------------------------------------ *
 *  Props (toutes optionnelles) :                                      *
 *   - connections, invitations, suggestions : données initiales       *
 *   - onConnectionsChange(nextConnections)                            *
 *   - onInvitationsChange(nextInvitations)                            *
 *   - onMessageUser(connection)  -> callback bouton "Message"         *
 *   - onDismissSuggestion(id)    -> callback bouton "Supprimer"       *
 *   - style : personnalisation du conteneur                           *
 * ------------------------------------------------------------------ */
export default function Reseau({
  connections: connectionsProp,
  invitations: invitationsProp,
  suggestions: suggestionsProp,
  pendingRequestIds: pendingRequestIdsProp,
  accountMode = "personal",
  pageProfile = null,
  onConnectionsChange,
  onInvitationsChange,
  onMessageUser,
  onConnectSuggestion,
  onCancelConnectionRequest,
  onDismissSuggestion,
  onTabChange,
  onOpenSettings,
  initialTab = "accueil",
  style,
}) {
  const isPageMode = accountMode === "company";
  const { status: sessionStatus } = useSession();
  const [connections, setConnections] = useState(connectionsProp ?? []);
  const [invitations, setInvitations] = useState(invitationsProp ?? []);
  const [suggestions, setSuggestions] = useState(suggestionsProp ?? []);
  const [connectedIds, setConnectedIds] = useState([]);
  const [acceptedInvitationIds, setAcceptedInvitationIds] = useState([]);
  const [pendingRequestIds, setPendingRequestIds] = useState([]);
  const [removingConnectionIds, setRemovingConnectionIds] = useState([]);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState([]);
  const [toast, setToast] = useState(null);
  const [suggestionLimit, setSuggestionLimit] = useState(10);
  const [openingLoading, setOpeningLoading] = useState(
    connectionsProp === undefined || invitationsProp === undefined || suggestionsProp === undefined
  );
  const [isMobile, setIsMobile] = useState(false);
  const [lists, setLists] = useState([]);
  const [listForm, setListForm] = useState({ name: "", description: "", color: "#D4A72C" });
  const [editingListId, setEditingListId] = useState(null);
  const [listSearch, setListSearch] = useState("");
  const [listBusyId, setListBusyId] = useState(null);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    activity: true,
    requests: true,
    suggestions: true,
    email: false,
  });
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);

  useEffect(() => {
    const loadNetworkNotificationSettings = async () => {
      try {
        const response = await fetchBackendApi("/api/settings", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const network = data?.notifications?.network || {};
        setNotificationSettings({
          activity: network.activity ?? true,
          requests: network.requests ?? true,
          suggestions: network.suggestions ?? true,
          email: network.email ?? false,
        });
      } catch {
        // ignore missing backend config
      }
    };

    loadNetworkNotificationSettings();
  }, []);

  const saveNetworkNotificationSettings = async () => {
    setSavingNotificationSettings(true);
    try {
      const response = await fetchBackendApi("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifications: {
            network: {
              activity: notificationSettings.activity,
              requests: notificationSettings.requests,
              suggestions: notificationSettings.suggestions,
              email: notificationSettings.email,
            },
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Impossible d’enregistrer les préférences.");
      }
      showToast("Préférences enregistrées", Check);
      setNotificationSettingsOpen(false);
    } catch (error) {
      showToast(error.message || "Impossible d’enregistrer les préférences", X);
    } finally {
      setSavingNotificationSettings(false);
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 880px)");
    const updateMobile = () => setIsMobile(mediaQuery.matches);
    updateMobile();
    mediaQuery.addEventListener?.("change", updateMobile);
    return () => mediaQuery.removeEventListener?.("change", updateMobile);
  }, []);

  useEffect(() => {
    setSuggestionLimit(isMobile ? 6 : 10);
  }, [isMobile]);

  const [tab, setTab] = useState(
    initialTab === "suggestions" ? "suggestions" : (invitationsProp ?? []).length > 0 ? "invitations" : initialTab
  );

  useEffect(() => {
    if (["accueil", "invitations", "suggestions", "connections", "anniversaires", "listes"].includes(initialTab)) {
      setTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (connectionsProp !== undefined) setConnections(connectionsProp);
  }, [connectionsProp]);

  useEffect(() => {
    if (invitationsProp !== undefined) setInvitations(invitationsProp);
  }, [invitationsProp]);

  useEffect(() => {
    if (suggestionsProp !== undefined) setSuggestions(suggestionsProp);
  }, [suggestionsProp]);

  useEffect(() => {
    if (pendingRequestIdsProp !== undefined) setPendingRequestIds(pendingRequestIdsProp);
  }, [pendingRequestIdsProp]);

  const handleTabChange = (nextTab) => {
    if (nextTab === tab) return;
    setTab(nextTab);
    onTabChange?.(nextTab);
  };

  const updateConnections = (next) => {
    setConnections(next);
    onConnectionsChange?.(next);
  };
  const updateInvitations = (next) => {
    setInvitations(next);
    onInvitationsChange?.(next);
  };

  const refreshConnections = async () => {
    if (sessionStatus !== "authenticated") return;
    try {
      const res = await fetchBackendApi("/api/connections");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.connections)) updateConnections(data.connections);
      if (Array.isArray(data.invitations)) updateInvitations(data.invitations);
      if (Array.isArray(data.pendingRequests)) {
        setPendingRequestIds(data.pendingRequests.map((pr) => pr.userId));
      }
    } catch (error) {
      // ignore refresh failures
    }
  };

  const refreshSuggestions = async () => {
    if (sessionStatus !== "authenticated") return;
    try {
      const res = await fetchBackendApi("/api/users");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions);
    } catch (error) {
      // ignore refresh failures
    }
  };

  const showToast = (message, icon) => setToast({ message, icon });

  const acceptInvitation = async (id) => {
    const inv = invitations.find((i) => i.id === id);
    if (!inv) return;
    setAcceptedInvitationIds((current) => current.includes(id) ? current : [...current, id]);
    try {
      const response = await fetchBackendApi("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: inv.userId, action: "accept" }),
      });
      if (!response.ok) {
        setAcceptedInvitationIds((current) => current.filter((invitationId) => invitationId !== id));
        return;
      }
      const data = await response.json();
      if (data?.accepted || data?.connection) {
        showToast(`Vous êtes maintenant en relation avec ${inv.name}`, Check);
        await refreshConnections();
        await refreshSuggestions();
      }
    } catch (error) {
      setAcceptedInvitationIds((current) => current.filter((invitationId) => invitationId !== id));
    }
  };

  const declineInvitation = async (id) => {
    const inv = invitations.find((i) => i.id === id);
    if (!inv) return;
    try {
      const response = await fetchBackendApi("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: inv.userId, action: "decline" }),
      });
      if (!response.ok) return;
      await refreshConnections();
      await refreshSuggestions();
    } catch (error) {
      // ignore update if persistence failed
    }
  };

  const removeConnection = async (connection) => {
    const connectionId = connection.id;
    if (removingConnectionIds.includes(connectionId)) return;
    setRemovingConnectionIds((ids) => [...ids, connectionId]);
    try {
      const response = await fetchBackendApi("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: connection.userId || connection.id, action: "remove" }),
      });
      if (!response.ok) return;
      setConnections((current) => {
        const next = current.filter((item) => item.id !== connectionId);
        onConnectionsChange?.(next);
        return next;
      });
      showToast(`${connection.name} a été retiré(e) de vos ami(e)s`, UserX);
    } catch (error) {
      // keep the relation visible if persistence fails
    } finally {
      setRemovingConnectionIds((ids) => ids.filter((id) => id !== connectionId));
    }
  };

  const connectSuggestion = async (id) => {
    const suggestion = suggestions.find((s) => s.id === id);
    if (!suggestion || pendingRequestIds.includes(id)) return;

    if (onConnectSuggestion) {
      await onConnectSuggestion(id);
      return;
    }

    if (suggestion.type === "company") {
      setConnectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      showToast(`Vous suivez désormais ${suggestion.name}`, Check);
      return;
    }

    setPendingRequestIds((prev) => [...prev, id]);
    showToast("Demande envoyée", Clock);

    try {
      const response = await fetchBackendApi("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: id }),
      });
      if (!response.ok) {
        setPendingRequestIds((prev) => prev.filter((pid) => pid !== id));
        return;
      }
      await refreshConnections();
      await refreshSuggestions();
    } catch (error) {
      setPendingRequestIds((prev) => prev.filter((pid) => pid !== id));
    }
  };

  const dismissSuggestion = (id) => {
    setDismissedSuggestionIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    onDismissSuggestion?.(id);
  };

  useEffect(() => {
    if (sessionStatus !== "authenticated") return undefined;
    if (connectionsProp || invitationsProp) return undefined;
    let mounted = true;
    fetchBackendApi("/api/connections")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted || !data) return;
        if (Array.isArray(data.connections) && data.connections.length > 0) setConnections(data.connections);
        if (Array.isArray(data.invitations) && data.invitations.length > 0) setInvitations(data.invitations);
        if (Array.isArray(data.pendingRequests) && data.pendingRequests.length > 0) {
          setPendingRequestIds(data.pendingRequests.map((pr) => pr.userId));
        }
        setOpeningLoading(false);
      })
      .catch(() => setOpeningLoading(false));
    return () => { mounted = false; };
  }, [connectionsProp, invitationsProp, sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return undefined;
    if (suggestionsProp && suggestionsProp.length > 0) return undefined;
    let mounted = true;
    fetchBackendApi("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted || !data) return;
        if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions);
      })
      .catch(() => setSuggestions([]));
    return () => { mounted = false; };
  }, [suggestionsProp, sessionStatus]);

  const mergedSuggestions = useMemo(() => {
    const connectedIdSet = new Set(connections.map((c) => c.id));
    return suggestions.filter((s) => !connectedIdSet.has(s.id) && !dismissedSuggestionIds.includes(s.id));
  }, [suggestions, connections, dismissedSuggestionIds]);

  const visibleSuggestions = mergedSuggestions.slice(0, suggestionLimit);

  useEffect(() => {
    let active = true;
    const loadLists = async () => {
      try {
        const response = await fetchBackendApi("/api/network-lists", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!active || !Array.isArray(data.lists)) return;
        setLists(data.lists);
      } catch {
        // ignore backend absence
      }
    };

    if (sessionStatus === "authenticated") {
      loadLists();
    }

    return () => { active = false; };
  }, [sessionStatus]);

  const counts = {
    invitations: invitations.length,
    connections: connections.length,
    suggestions: mergedSuggestions.length,
    lists: lists.length,
  };

  const handleSaveList = async (event) => {
    event.preventDefault();
    const trimmedName = listForm.name.trim();
    if (!trimmedName) {
      showToast("Le nom de la liste est requis.", X);
      return;
    }

    try {
      const method = editingListId ? "PATCH" : "POST";
      const payload = {
        ...(editingListId ? { id: editingListId } : {}),
        name: trimmedName,
        description: listForm.description,
        color: listForm.color,
      };

      const response = await fetchBackendApi("/api/network-lists", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible d’enregistrer la liste.");
      const nextLists = Array.isArray(data.lists) ? data.lists : [...lists];
      setLists(nextLists);
      setListForm({ name: "", description: "", color: "#D4A72C" });
      setEditingListId(null);
      showToast(editingListId ? "Liste mise à jour" : "Liste créée", Check);
    } catch (error) {
      showToast(error.message || "Impossible d’enregistrer la liste", X);
    }
  };

  const handleDeleteList = async (listId) => {
    try {
      setListBusyId(listId);
      const response = await fetchBackendApi(`/api/network-lists?id=${encodeURIComponent(listId)}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Suppression impossible.");
      setLists(Array.isArray(data.lists) ? data.lists : lists.filter((list) => list.id !== listId));
      showToast("Liste supprimée", Check);
    } catch (error) {
      showToast(error.message || "Suppression impossible", X);
    } finally {
      setListBusyId(null);
    }
  };

  const handleTogglePersonInList = async (listId, userId) => {
    const targetList = lists.find((list) => list.id === listId);
    if (!targetList) return;

    const memberIds = Array.isArray(targetList.memberIds) ? targetList.memberIds : [];
    const nextMemberIds = memberIds.includes(String(userId))
      ? memberIds.filter((id) => String(id) !== String(userId))
      : [...memberIds, String(userId)];

    try {
      setListBusyId(listId);
      const response = await fetchBackendApi("/api/network-lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: listId, memberIds: nextMemberIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Mise à jour impossible.");
      setLists(Array.isArray(data.lists) ? data.lists : lists.map((list) => list.id === listId ? { ...list, memberIds: nextMemberIds } : list));
      showToast(nextMemberIds.includes(String(userId)) ? "Personne ajoutée à la liste" : "Personne retirée de la liste", Check);
    } catch (error) {
      showToast(error.message || "Mise à jour impossible", X);
    } finally {
      setListBusyId(null);
    }
  };

  const filteredLists = useMemo(() => {
    const term = listSearch.trim().toLowerCase();
    if (!term) return lists;
    return lists.filter((list) => list.name.toLowerCase().includes(term) || (list.description || "").toLowerCase().includes(term));
  }, [lists, listSearch]);

  const birthdayConnections = useMemo(() => {
    if (!Array.isArray(connections)) return [];

    const parseDate = (value) => {
      if (!value) return null;
      const date = new Date(`${value}T12:00:00`);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const today = new Date();

    return connections
      .map((connection) => {
        const birthDate = parseDate(connection.birthDate);
        if (!birthDate) return null;

        const isToday = birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate();
        if (!isToday) return null;

        const label = birthDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

        return {
          ...connection,
          birthDate,
          label,
          isToday: true,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.birthDate - b.birthDate);
  }, [connections]);

  /* ---- Navigation latérale (libellés adaptés au mode "page") ---- */
  const NAV_ITEMS = [
    { id: "accueil", label: "Accueil", icon: Users },
    { id: "invitations", label: isPageMode ? "Demandes" : "Invitations", icon: UserPlus, count: counts.invitations },
    { id: "suggestions", label: "Suggestions", icon: Contact, count: counts.suggestions },
    { id: "connections", label: isPageMode ? "Abonnés" : "Mes relations", icon: Users, count: counts.connections },
    { id: "anniversaires", label: "Anniversaires", icon: Gift },
    { id: "listes", label: "Listes personnalisées", icon: ListChecks, count: counts.lists },
  ];

  const suggestionHeader = tab === "accueil" ? "Vous connaissez peut-être" : "Suggestions pour vous";

  const profileHref = (id) => `/feed?view=profile&userId=${encodeURIComponent(id)}`;

  if (openingLoading) return <NetworkOpeningSkeleton />;

  return (
    <div
      className="fb-page"
      style={{
        fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
        width: "100%", background: FB.pageBg, boxSizing: "border-box",
        ...style,
      }}
    >
      <style>{`
        .fb-page * { box-sizing: border-box; }

        /* Le panneau (sidebar + contenu) occupe toute la hauteur restante de l'écran.
           La sidebar est un bloc fixe qui ne bouge jamais ; seul .fb-content défile,
           dans sa propre zone de scroll indépendante. */
        .fb-page {
          position: relative;
          height: calc(100dvh - var(--lynora-header-offset, 0px));
          min-height: calc(100dvh - var(--lynora-header-offset, 0px));
          overflow: hidden;
          box-sizing: border-box;
          margin-top: 0;
          padding-top: 0;
        }

        .fb-shell {
          display: flex;
          align-items: stretch;
          height: calc(100dvh - var(--lynora-header-offset, 0px));
          min-height: calc(100dvh - var(--lynora-header-offset, 0px));
          min-height: 0;
          margin-top: 0;
        }

        .fb-sidebar {
          position: fixed;
          top: var(--lynora-header-offset, 0px);
          left: 0;
          bottom: 0;
          flex: 0 0 ${SIDEBAR_WIDTH}px;
          width: ${SIDEBAR_WIDTH}px;
          height: calc(100dvh - var(--lynora-header-offset, 0px));
          background: ${FB.sidebarBg};
          border-right: 1px solid ${FB.border};
          overflow-y: auto;
          padding: 18px 12px 24px;
          align-self: stretch;
          z-index: 3;
        }

        .fb-content {
          flex: 1;
          min-width: 0;
          height: 100%;
          margin-left: ${SIDEBAR_WIDTH}px;
          width: calc(100% - ${SIDEBAR_WIDTH}px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 20px 28px 64px;
        }

        .fb-sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px 18px; }
        .fb-sidebar-header h1 { font-size: 25px; font-weight: 800; color: ${FB.text}; margin: 0; letter-spacing: -0.01em; }
        .fb-gear-btn {
          width: 36px; height: 36px; border-radius: 50%; background: ${FB.gray}; border: none;
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: ${FB.text};
          transition: background 0.15s ease;
        }
        .fb-gear-btn:hover { background: ${FB.grayHover}; }

        .fb-nav-list { display: flex; flex-direction: column; gap: 2px; }
        .fb-nav-btn {
          display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 8px; border: none;
          background: transparent; cursor: pointer; text-align: left; width: 100%; color: ${FB.text};
          font-size: 15px; font-weight: 500; transition: background 0.12s ease;
        }
        .fb-nav-btn:hover { background: ${FB.borderSoft}; }
        .fb-nav-btn.active { background: rgba(212, 167, 44, 0.12); font-weight: 700; }
        .fb-nav-icon {
          width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; background: ${FB.iconDark}; color: ${FB.white};
        }
        .fb-nav-btn.active .fb-nav-icon { background: #D4A72C; color: #fff; }
        .fb-nav-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .fb-nav-chevron { color: #8A8D91; flex-shrink: 0; }
        .fb-nav-badge {
          min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: #D4A72C;
          color: ${FB.white}; font-size: 11.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        .fb-content-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; gap: 12px; }
        .fb-content-header h2 { font-size: 20px; font-weight: 800; color: ${FB.text}; margin: 0; }
        .fb-see-all { color: ${FB.blue}; font-size: 15px; font-weight: 600; cursor: pointer; background: none; border: none; padding: 0; flex-shrink: 0; }
        .fb-see-all:hover { text-decoration: underline; }

        .fb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }

        .fb-card {
          background: ${FB.cardBg}; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05);
          transition: box-shadow 0.15s ease;
        }
        .fb-card:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05); }
        .fb-card-photo-wrap { position: relative; width: 100%; padding-top: 108%; background: ${FB.borderSoft}; overflow: hidden; display: block; }
        .fb-card-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
        .fb-card-body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .fb-card-name {
          font-size: 15px; font-weight: 700; color: ${FB.text}; text-decoration: none; line-height: 1.3;
          overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .fb-card-title { font-size: 12.5px; color: ${FB.textSecondary}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .fb-mutual-row { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: ${FB.textSecondary}; min-height: 18px; }
        .fb-mutual-avatars { display: inline-flex; align-items: center; flex-shrink: 0; }
        .fb-mutual-avatar { width: 16px; height: 16px; border-radius: 50%; background-size: cover; background-position: center; border: 1.5px solid ${FB.white}; display: inline-block; }
        .fb-mutual-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .fb-network-skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
        .fb-network-skeleton-card, .fb-network-skeleton-list-card { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 10px; padding: 12px; border: 1px solid ${FB.border}; border-radius: 12px; background: ${FB.cardBg}; }
        .fb-network-skeleton-card { min-height: 220px; align-items: center; }
        .fb-network-skeleton-list { display: flex; flex-direction: column; gap: 10px; }
        .fb-network-skeleton-row { display: flex; align-items: center; gap: 14px; min-height: 72px; padding: 12px 14px; border: 1px solid ${FB.border}; border-radius: 10px; background: ${FB.cardBg}; }
        .fb-skeleton-cover { width: calc(100% + 24px); height: 62px; margin: -12px -12px 2px; background: ${FB.borderSoft}; }
        .fb-skeleton-avatar, .fb-skeleton-circle, .fb-skeleton-calendar { display: block; flex-shrink: 0; background: ${FB.borderSoft}; }
        .fb-skeleton-avatar { width: 48px; height: 48px; margin-top: -28px; border: 3px solid ${FB.cardBg}; border-radius: 50%; }
        .fb-skeleton-circle { width: 44px; height: 44px; border-radius: 50%; }
        .fb-skeleton-calendar { width: 38px; height: 38px; border-radius: 8px; }
        .fb-skeleton-line, .fb-skeleton-button { display: block; height: 10px; border-radius: 999px; background: ${FB.borderSoft}; }
        .fb-skeleton-line-wide { width: min(54%, 230px); }
        .fb-skeleton-line-medium { width: 68%; }
        .fb-skeleton-line-short { width: 38%; }
        .fb-skeleton-button { width: 72%; height: 28px; margin-top: auto; border-radius: 6px; }
        .fb-network-skeleton-card > .fb-skeleton-button { width: 82%; }
        .fb-network-skeleton-card, .fb-network-skeleton-list-card, .fb-network-skeleton-row { animation: fb-skeleton-pulse 1.1s ease-in-out infinite alternate; }
        @keyframes fb-skeleton-pulse { from { opacity: .55; } to { opacity: 1; } }

        .fb-btn {
          width: 100%; border-radius: 6px; border: none; padding: 7px 10px; font-size: 14px; font-weight: 600;
          cursor: pointer; margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 6px;
          transition: background 0.15s ease;
        }
        .fb-btn:disabled { cursor: default; }
        .fb-btn-primary { background: ${FB.blueLight}; color: ${FB.blue}; }
        .fb-btn-primary:hover:not(:disabled) { background: ${FB.blueLightHover}; }
        .fb-btn-primary.done { background: ${FB.gray}; color: ${FB.textSecondary}; }
        .fb-btn-secondary { background: ${FB.gray}; color: ${FB.text}; }
        .fb-btn-secondary:hover { background: ${FB.grayHover}; }

        .fb-list { display: flex; flex-direction: column; }
        .fb-list-row {
          display: flex; align-items: center; gap: 14px; padding: 14px 8px; border-bottom: 1px solid ${FB.borderSoft};
        }
        .fb-list-row:last-child { border-bottom: none; }
        .fb-list-info { flex: 1; min-width: 0; }
        .fb-list-name { font-size: 15px; font-weight: 700; color: ${FB.text}; text-decoration: none; }
        .fb-list-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .fb-list-btn {
          border-radius: 6px; border: none; padding: 8px 16px; font-size: 14px; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; gap: 6px; white-space: nowrap; transition: background 0.15s ease;
        }
        .fb-list-btn-primary { background: ${FB.blue}; color: ${FB.white}; }
        .fb-list-btn-primary:hover { background: #166FE5; }
        .fb-list-btn-secondary { background: ${FB.gray}; color: ${FB.text}; }
        .fb-list-btn-secondary:hover { background: ${FB.grayHover}; }
        .fb-icon-btn {
          width: 38px; height: 38px; border-radius: 50%; border: none; background: ${FB.gray}; color: ${FB.text};
          display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s ease;
        }
        .fb-icon-btn:hover { background: ${FB.grayHover}; }
        .fb-icon-btn-primary { background: ${FB.blue}; color: ${FB.white}; }
        .fb-icon-btn-primary:hover { background: #166FE5; }

        @keyframes fb-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        button:focus-visible, input:focus-visible { outline: 2px solid ${FB.blue}; outline-offset: 2px; }

        @media (max-width: 880px) {
          .fb-page {
            height: calc(100dvh - var(--lynora-header-offset, 0px));
            min-height: calc(100dvh - var(--lynora-header-offset, 0px));
            overflow: hidden;
          }
          .fb-shell {
            flex-direction: column;
            height: calc(100dvh - var(--lynora-header-offset, 0px));
            min-height: calc(100dvh - var(--lynora-header-offset, 0px));
          }
          .fb-sidebar {
            position: sticky;
            top: 0;
            flex: 0 0 auto;
            width: 100%;
            height: auto;
            max-height: 120px;
            overflow-x: auto;
            overflow-y: hidden;
            border-right: none;
            border-bottom: 1px solid ${FB.border};
            padding: 12px 10px;
            z-index: auto;
          }
          .fb-content {
            width: 100%;
            height: calc(100dvh - var(--lynora-header-offset, 0px) - 120px);
            margin-left: 0;
            overflow-y: auto;
            padding: 14px 12px 24px;
          }
          .fb-nav-list {
            flex-direction: row;
            overflow-x: auto;
            gap: 6px;
            padding-bottom: 2px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .fb-nav-list::-webkit-scrollbar { display: none; }
          .fb-nav-btn { flex-direction: column; width: auto; flex-shrink: 0; min-width: 78px; text-align: center; gap: 6px; padding: 8px 6px; }
          .fb-nav-label { font-size: 11px; white-space: normal; line-height: 1.2; }
          .fb-nav-chevron, .fb-nav-badge { display: none; }
          .fb-nav-icon { width: 34px; height: 34px; }
        }

        @media (max-width: 520px) {
          .fb-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .fb-card-name { font-size: 13.5px; }
          .fb-card-title { font-size: 11.5px; }
          .fb-mutual-row { font-size: 11px; }
          .fb-btn { font-size: 12.5px; padding: 7px 6px; }
          .fb-content-header h2 { font-size: 18px; }
          .fb-list-row { gap: 10px; padding: 12px 4px; flex-wrap: wrap; }
          .fb-list-actions { width: 100%; justify-content: flex-end; }
          .fb-list-btn { padding: 7px 12px; font-size: 13px; }
        }
      `}</style>

      <div className="fb-shell">
        {/* ============================= SIDEBAR ============================= */}
        <aside className="fb-sidebar">
          <div className="fb-sidebar-header">
            <h1>{isPageMode ? "Communauté" : "Relation"}</h1>
            <button
              className="fb-gear-btn"
              aria-label="Paramètres de notification"
              onClick={() => setNotificationSettingsOpen(true)}
              type="button"
            >
              <Settings size={17} />
            </button>
          </div>

          <nav className="fb-nav-list">
            {NAV_ITEMS.map((item) => {
              const active = tab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`fb-nav-btn ${active ? "active" : ""}`}
                >
                  <span className="fb-nav-icon">
                    <Icon size={17} strokeWidth={2.2} />
                  </span>
                  <span className="fb-nav-label">{item.label}</span>
                  {!!item.count && <span className="fb-nav-badge">{item.count}</span>}
                  {!active && <ChevronRight size={17} className="fb-nav-chevron" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ============================= CONTENU ============================= */}
        <main className="fb-content">
          {isPageMode && pageProfile && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <Avatar initials={pageProfile.initials} size={44} imgUrl={pageProfile.avatarUrl || pageProfile.image || null} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: FB.text }}>{pageProfile.name}</div>
                <div style={{ fontSize: 12.5, color: FB.textSecondary }}>Gérez et développez votre communauté</div>
              </div>
            </div>
          )}

          <>
          {/* ---- Accueil / Suggestions ---- */}
          {(tab === "accueil" || tab === "suggestions") && (
            <>
              <div className="fb-content-header">
                <h2>{suggestionHeader}</h2>
                <span style={{ minWidth: 22, height: 22, borderRadius: 999, background: "rgba(212, 167, 44, 0.18)", color: "#B98B00", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 8px", flexShrink: 0 }}>{mergedSuggestions.length}</span>
                {visibleSuggestions.length < mergedSuggestions.length && (
                  <button className="fb-see-all" onClick={() => setSuggestionLimit(mergedSuggestions.length)}>
                    Voir tout
                  </button>
                )}
              </div>

              {mergedSuggestions.length === 0 ? (
                <EmptyState icon={UserPlus} text={isPageMode ? "Aucun profil à suggérer pour le moment." : "Aucune suggestion pour le moment. Votre réseau est à jour."} />
              ) : (
                <div className="fb-grid">
                  {visibleSuggestions.map((s) => {
                    const isCompany = s.type === "company";
                    const done = connectedIds.includes(s.id);
                    const pending = pendingRequestIds.includes(s.id);
                    const avatarUrl = s.avatarUrl || s.image || s.logoUrl || s.photoUrl || null;
                    const coverUrl = s.coverUrl || s.cover || s.bannerUrl || s.backgroundImage || null;
                    const mutualLabel = isCompany ? "abonnés" : "relations en commun";
                    const mutualValue = isCompany ? (s.followers ?? s.mutual ?? 0) : s.mutual;

                    return (
                      <div
                        key={s.id}
                        className="fb-card"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          borderRadius: 12,
                          overflow: "hidden",
                          border: "1px solid #E4E6EB",
                          background: FB.cardBg,
                          boxShadow: "0 2px 8px rgba(15,51,82,0.05)",
                          transition: "all 0.2s ease",
                          minWidth: 0,
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            height: 74,
                            background: coverUrl
                              ? `linear-gradient(180deg, rgba(15, 51, 82, 0.12), rgba(15, 51, 82, 0.32)), url(${coverUrl}) center/cover no-repeat`
                              : "linear-gradient(135deg, #F9D77B 0%, #D4A72C 100%)",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              bottom: -22,
                              left: "50%",
                              transform: "translateX(-50%)",
                              zIndex: 2,
                            }}
                          >
                            <a href={profileHref(s.id)} aria-label={`Voir le profil de ${s.name}`}>
                              <Avatar
                                initials={s.initials || (s.name || "?").slice(0, 2).toUpperCase()}
                                size={52}
                                imgUrl={avatarUrl}
                                radius="50%"
                              />
                            </a>
                          </div>
                        </div>

                        <div className="fb-card-body" style={{ padding: "28px 10px 10px", textAlign: "center", gap: 6 }}>
                          <a href={profileHref(s.id)} className="fb-card-name" style={{ fontSize: 14, lineHeight: 1.25, textAlign: "center" }}>
                            {isCompany && <Building2 size={12} style={{ marginRight: 4, verticalAlign: -1, color: FB.textSecondary }} />}
                            {s.name}
                          </a>
                          <div style={{ fontSize: 11, color: FB.textSecondary, fontWeight: 500, minHeight: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.title || (isCompany ? "Entreprise" : "Professionnel")}
                          </div>
                          <MutualRow mutual={mutualValue} label={mutualLabel} avatars={s.mutualAvatars} />

                          <button
                            onClick={() => (pending ? onCancelConnectionRequest?.(s.id) : connectSuggestion(s.id))}
                            disabled={done}
                            className={`fb-btn ${done ? "done" : "fb-btn-primary"}`}
                            style={{
                              background: done ? FB.gray : pending ? FB.white : "#D4A72C",
                              color: done ? FB.textSecondary : pending ? "#D32F2F" : FB.white,
                              border: pending ? "1px solid #E4E6EB" : "none",
                              boxShadow: pending ? "none" : "0 1px 2px rgba(15, 51, 82, 0.12)",
                              fontSize: 11,
                              padding: "7px 10px",
                              marginTop: 4,
                            }}
                          >
                            {done ? (<><Check size={14} /> {isCompany ? "Suivi" : "Connecté"}</>)
                              : pending ? (<><X size={14} /> Annuler</>)
                              : (<><UserPlus size={14} /> {isCompany ? "Suivre" : "Se connecter"}</>)}
                          </button>
                          <button className="fb-btn fb-btn-secondary" onClick={() => dismissSuggestion(s.id)} style={{ fontSize: 11, padding: "7px 10px", marginTop: 0 }}>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ---- Invitations ---- */}
          {tab === "invitations" && (
            <>
              <div className="fb-content-header">
                <h2>{isPageMode ? "Demandes d’abonnement" : "Invitations"}</h2>
              </div>
              {invitations.length === 0 ? (
                <EmptyState icon={Users} text={isPageMode ? "Aucune demande d’abonnement en attente." : "Aucune invitation en attente pour le moment."} />
              ) : (
                <div className="fb-grid">
                  {invitations.map((inv) => {
                    const accepted = acceptedInvitationIds.includes(inv.id);
                    const coverUrl = inv.coverUrl || inv.bannerUrl || inv.backgroundImage || null;
                    const avatarUrl = inv.image || inv.avatarUrl || inv.logoUrl || inv.photoUrl || null;
                    const title = inv.title || "Professionnel";

                    return (
                      <div
                        key={inv.id}
                        className="fb-card"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          borderRadius: 12,
                          overflow: "hidden",
                          border: "1px solid #E4E6EB",
                          background: FB.cardBg,
                          boxShadow: "0 2px 8px rgba(15,51,82,0.05)",
                          transition: "all 0.2s ease",
                          minWidth: 0,
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            height: 74,
                            background: coverUrl
                              ? `linear-gradient(180deg, rgba(15, 51, 82, 0.12), rgba(15, 51, 82, 0.32)), url(${coverUrl}) center/cover no-repeat`
                              : "linear-gradient(135deg, #F9D77B 0%, #D4A72C 100%)",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              bottom: -22,
                              left: "50%",
                              transform: "translateX(-50%)",
                              zIndex: 2,
                            }}
                          >
                            <a href={profileHref(inv.userId || inv.id)} aria-label={`Voir le profil de ${inv.name}`}>
                              <Avatar
                                initials={inv.initials || (inv.name || "?").slice(0, 2).toUpperCase()}
                                size={52}
                                imgUrl={avatarUrl}
                                radius="50%"
                              />
                            </a>
                          </div>
                        </div>

                        <div className="fb-card-body" style={{ padding: "28px 10px 10px", textAlign: "center", gap: 6 }}>
                          <a href={profileHref(inv.userId || inv.id)} className="fb-card-name" style={{ fontSize: 14, lineHeight: 1.25, textAlign: "center" }}>
                            {inv.name}
                          </a>
                          <div style={{ fontSize: 11, color: FB.textSecondary, fontWeight: 500, minHeight: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {title}
                          </div>
                          <MutualRow mutual={inv.mutual} label={isPageMode ? "abonnés" : "relations en commun"} avatars={inv.mutualAvatars || []} />

                          <button
                            onClick={() => acceptInvitation(inv.id)}
                            disabled={accepted}
                            className="fb-btn fb-btn-primary"
                            style={{
                              background: accepted ? "#2E9C7C" : "#D4A72C",
                              color: FB.white,
                              border: "none",
                              boxShadow: "0 1px 2px rgba(15, 51, 82, 0.12)",
                              fontSize: 11,
                              padding: "7px 10px",
                              marginTop: 4,
                            }}
                          >
                            <Check size={14} /> {accepted ? "Connecté" : (isPageMode ? "Accepter" : "Confirmer")}
                          </button>
                          {!accepted && (
                            <button
                              onClick={() => declineInvitation(inv.id)}
                              className="fb-btn fb-btn-secondary"
                              style={{ fontSize: 11, padding: "7px 10px", marginTop: 0 }}
                            >
                              Refuser
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ---- Tou(te)s les ami(e)s / Abonnés ---- */}
          {tab === "connections" && (
            <>
              <div className="fb-content-header">
                <h2>{isPageMode ? "Abonnés" : "Mes relations"}</h2>
                <span style={{ minWidth: 22, height: 22, borderRadius: 999, background: "rgba(212, 167, 44, 0.18)", color: "#B98B00", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 8px", flexShrink: 0 }}>{connections.length}</span>
              </div>
              {connections.length === 0 ? (
                <EmptyState icon={Users} text={isPageMode ? "Votre page n’a pas encore d’abonné." : "Vous n'avez pas encore d'ami(e)."} />
              ) : (
                <div className="fb-list">
                  {connections.map((c) => (
                    <div key={c.id} className="fb-list-row">
                      <a href={profileHref(c.userId || c.id)} aria-label={`Voir le profil de ${c.name}`} style={{ display: "inline-flex", flexShrink: 0 }}>
                        <Avatar initials={c.initials} size={56} imgUrl={c.image || null} radius="50%" />
                      </a>
                      <div className="fb-list-info">
                        <a href={profileHref(c.userId || c.id)} className="fb-list-name">{c.name}</a>
                        <div style={{ fontSize: 12.5, color: FB.textSecondary, marginTop: 2 }}>{c.title}</div>
                      </div>
                      <div className="fb-list-actions">
                        <button onClick={() => onMessageUser?.(c)} className="fb-list-btn fb-list-btn-secondary">
                          <MessageCircle size={14} /> Message
                        </button>
                        <button
                          onClick={() => removeConnection(c)}
                          disabled={removingConnectionIds.includes(c.id)}
                          className="fb-list-btn fb-list-btn-secondary"
                          style={{ opacity: removingConnectionIds.includes(c.id) ? 0.6 : 1 }}
                        >
                          <UserX size={14} /> {removingConnectionIds.includes(c.id) ? "Retrait…" : "Retirer"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ---- Anniversaires ---- */}
          {tab === "anniversaires" && (
            <>
              <div className="fb-content-header">
                <h2>Anniversaires</h2>
                <span style={{ minWidth: 22, height: 22, borderRadius: 999, background: "rgba(212, 167, 44, 0.18)", color: "#B98B00", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 8px", flexShrink: 0 }}>{birthdayConnections.length}</span>
              </div>

              {birthdayConnections.length === 0 ? (
                <EmptyState icon={Gift} text="Aucun anniversaire à venir pour le moment." />
              ) : (
                <div className="fb-list">
                  {birthdayConnections.map((person) => (
                    <div key={person.id} className="fb-list-row">
                      <a href={profileHref(person.userId || person.id)} aria-label={`Voir le profil de ${person.name}`} style={{ display: "inline-flex", flexShrink: 0 }}>
                        <Avatar initials={person.initials} size={56} imgUrl={person.image || null} radius="50%" />
                      </a>
                      <div className="fb-list-info">
                        <a href={profileHref(person.userId || person.id)} className="fb-list-name">{person.name}</a>
                        <div style={{ fontSize: 12.5, color: FB.textSecondary, marginTop: 2 }}>
                          {person.isToday ? "C’est aujourd’hui !" : `Anniversaire le ${person.label}`}
                        </div>
                      </div>
                      <div className="fb-list-actions">
                        <button onClick={() => onMessageUser?.(person)} className="fb-list-btn fb-list-btn-secondary">
                          <MessageCircle size={14} /> Message
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ---- Listes personnalisées ---- */}
          {tab === "listes" && (
            <>
              <div className="fb-content-header" style={{ alignItems: "center" }}>
                <h2>Listes personnalisées</h2>
                <span style={{ minWidth: 22, height: 22, borderRadius: 999, background: "rgba(212, 167, 44, 0.18)", color: "#B98B00", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 8px", flexShrink: 0 }}>{counts.lists}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <form onSubmit={handleSaveList} style={{ display: "flex", flexDirection: "column", gap: 12, background: FB.cardBg, border: `1px solid ${FB.borderSoft}`, borderRadius: 16, padding: 16, boxShadow: "0 1px 2px rgba(15,51,82,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: FB.text }}>{editingListId ? "Modifier la liste" : "Créer une liste"}</div>
                    {editingListId && (
                      <button type="button" onClick={() => { setEditingListId(null); setListForm({ name: "", description: "", color: "#D4A72C" }); }} style={{ border: "none", background: "transparent", color: FB.textSecondary, cursor: "pointer", fontWeight: 600 }}>
                        Annuler
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="color"
                      value={listForm.color}
                      onChange={(event) => setListForm((current) => ({ ...current, color: event.target.value }))}
                      aria-label="Couleur de la liste"
                      style={{ width: 42, height: 42, border: `1px solid ${FB.border}`, borderRadius: 10, background: "transparent", padding: 0, cursor: "pointer" }}
                    />
                    <input
                      type="text"
                      value={listForm.name}
                      placeholder="Nom de la liste"
                      onChange={(event) => setListForm((current) => ({ ...current, name: event.target.value }))}
                      style={{ flex: 1, border: `1px solid ${FB.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, background: FB.white, color: FB.text }}
                    />
                  </div>

                  <textarea
                    value={listForm.description}
                    onChange={(event) => setListForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Description (optionnelle)"
                    rows={2}
                    style={{ border: `1px solid ${FB.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, resize: "vertical", background: FB.white, color: FB.text }}
                  />

                  <button type="submit" style={{ alignSelf: "flex-start", border: "none", borderRadius: 999, background: "#D4A72C", color: FB.white, padding: "10px 18px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Plus size={15} /> {editingListId ? "Enregistrer" : "Créer la liste"}
                  </button>
                </form>

                <div style={{ background: FB.cardBg, border: `1px solid ${FB.borderSoft}`, borderRadius: 16, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Search size={15} color={FB.textSecondary} />
                    <input
                      type="text"
                      value={listSearch}
                      onChange={(event) => setListSearch(event.target.value)}
                      placeholder="Rechercher une liste"
                      style={{ flex: 1, border: "none", background: "transparent", fontSize: 14, color: FB.text, outline: "none" }}
                    />
                  </div>

                  {filteredLists.length === 0 ? (
                    <div style={{ color: FB.textSecondary, fontSize: 14, padding: "12px 0 4px" }}>
                      {lists.length === 0 ? "Aucune liste pour le moment. Créez votre première liste." : "Aucune liste ne correspond à votre recherche."}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {filteredLists.map((list) => {
                        const listMembers = connections.filter((person) => (list.memberIds || []).includes(String(person.userId || person.id)));
                        return (
                          <div key={list.id} style={{ border: `1px solid ${FB.borderSoft}`, borderRadius: 14, padding: 14, background: "#F9FAFB" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                <div style={{ width: 12, height: 12, borderRadius: 999, background: list.color || "#D4A72C" }} />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 15, fontWeight: 700, color: FB.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{list.name}</div>
                                  {list.description && <div style={{ fontSize: 12, color: FB.textSecondary, marginTop: 2 }}>{list.description}</div>}
                                </div>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <button type="button" onClick={() => { setEditingListId(list.id); setListForm({ name: list.name, description: list.description || "", color: list.color || "#D4A72C" }); }} style={{ border: "none", background: "transparent", color: FB.textSecondary, cursor: "pointer", display: "flex", alignItems: "center" }} aria-label={`Modifier ${list.name}`}>
                                  <Pencil size={15} />
                                </button>
                                <button type="button" onClick={() => handleDeleteList(list.id)} disabled={listBusyId === list.id} style={{ border: "none", background: "transparent", color: "#C24444", cursor: "pointer", display: "flex", alignItems: "center" }} aria-label={`Supprimer ${list.name}`}>
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>

                            <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                              <span style={{ fontSize: 12, color: FB.textSecondary, fontWeight: 600 }}>{listMembers.length} personne{listMembers.length > 1 ? "s" : ""}</span>
                              <span style={{ fontSize: 12, color: FB.textSecondary }}>Liste personnalisée</span>
                            </div>

                            {listMembers.length === 0 ? (
                              <div style={{ marginTop: 10, fontSize: 12, color: FB.textSecondary }}>Aucune personne dans cette liste pour le moment.</div>
                            ) : (
                              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                                {listMembers.map((person) => (
                                  <div key={person.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: FB.white, border: `1px solid ${FB.borderSoft}`, borderRadius: 12, padding: "8px 10px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <Avatar initials={person.initials} size={28} imgUrl={person.image || null} radius="50%" />
                                      <div style={{ fontSize: 13, fontWeight: 600, color: FB.text }}>{person.name}</div>
                                    </div>
                                    <button type="button" onClick={() => handleTogglePersonInList(list.id, person.userId || person.id)} style={{ border: "none", background: "transparent", color: "#C24444", fontWeight: 600, cursor: "pointer" }}>
                                      Retirer
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                              {connections.filter((person) => !(list.memberIds || []).includes(String(person.userId || person.id))).slice(0, 4).map((person) => (
                                <button
                                  key={`${list.id}-${person.userId || person.id}`}
                                  type="button"
                                  onClick={() => handleTogglePersonInList(list.id, person.userId || person.id)}
                                  style={{ width: "100%", border: `1px dashed ${FB.border}`, borderRadius: 10, background: FB.white, padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                    <Avatar initials={person.initials} size={24} imgUrl={person.image || null} radius="50%" />
                                    <span style={{ fontSize: 12.5, color: FB.text, fontWeight: 600 }}>{person.name}</span>
                                  </div>
                                  <span style={{ fontSize: 11, color: FB.textSecondary, fontWeight: 700 }}>Ajouter</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          </>
        </main>
      </div>

      {notificationSettingsOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? 0 : 20,
            zIndex: 80,
          }}
          onClick={() => setNotificationSettingsOpen(false)}
        >
          <div
            style={{
              width: isMobile ? "100%" : "100%",
              maxWidth: isMobile ? "100%" : 440,
              height: isMobile ? "100dvh" : "auto",
              background: FB.cardBg,
              borderRadius: isMobile ? 0 : 18,
              border: isMobile ? "none" : `1px solid ${FB.border}`,
              boxShadow: isMobile ? "none" : "0 28px 80px rgba(15, 51, 82, 0.22)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "18px 18px 12px" : "18px 18px 14px", borderBottom: `1px solid ${FB.borderSoft}` }}>
              <div style={{ fontSize: isMobile ? 20 : 18, fontWeight: 800, color: FB.text }}>Paramètres de notification</div>
              {isMobile ? (
                <button
                  type="button"
                  aria-label="Fermer"
                  onClick={() => setNotificationSettingsOpen(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: FB.blue,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 700,
                    padding: 0,
                  }}
                >
                  <X size={14} />
                  Fermer
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Fermer"
                  onClick={() => setNotificationSettingsOpen(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "none",
                    background: FB.gray,
                    color: FB.text,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div style={{ padding: isMobile ? "12px 18px 8px" : "14px 18px 8px", fontSize: 14, color: FB.textSecondary, lineHeight: 1.5 }}>
              Vous pouvez gérer la manière dont vous recevez les notifications relatives à l’actualité de vos amis.
            </div>

            <div style={{ padding: isMobile ? "8px 16px 16px" : "8px 18px 18px", display: "flex", flexDirection: "column", gap: 12, flex: 1, overflowY: "auto" }}>
              {[
                { key: "activity", label: "Activité de mes amis" },
                { key: "requests", label: "Demandes de connexion" },
                { key: "suggestions", label: "Suggestions de réseau" },
                { key: "email", label: "Rappels par e-mail" },
              ].map((option) => (
                <div
                  key={option.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: isMobile ? "12px 14px" : "10px 12px",
                    background: FB.pageBg,
                    borderRadius: 12,
                    border: `1px solid ${FB.borderSoft}`,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: FB.text }}>{option.label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notificationSettings[option.key]}
                    onClick={() => setNotificationSettings((current) => ({ ...current, [option.key]: !current[option.key] }))}
                    style={{
                      position: "relative",
                      width: 40,
                      height: 22,
                      borderRadius: 999,
                      border: "none",
                      background: notificationSettings[option.key] ? "#D4A72C" : FB.border,
                      cursor: "pointer",
                      transition: "background 0.2s ease",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 2,
                        left: notificationSettings[option.key] ? 20 : 2,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: FB.white,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        transition: "left 0.2s ease",
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: isMobile ? "stretch" : "flex-end", gap: 8, padding: isMobile ? "0 16px 16px" : "0 18px 18px" }}>
              <button
                type="button"
                onClick={() => setNotificationSettingsOpen(false)}
                style={{
                  border: `1px solid ${FB.border}`,
                  background: FB.white,
                  color: FB.text,
                  borderRadius: 999,
                  padding: isMobile ? "12px 16px" : "9px 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                  flex: isMobile ? 1 : "initial",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={saveNetworkNotificationSettings}
                disabled={savingNotificationSettings}
                style={{
                  border: "none",
                  background: "#D4A72C",
                  color: FB.white,
                  borderRadius: 999,
                  padding: isMobile ? "12px 16px" : "9px 18px",
                  fontWeight: 700,
                  cursor: savingNotificationSettings ? "default" : "pointer",
                  opacity: savingNotificationSettings ? 0.7 : 1,
                  flex: isMobile ? 1 : "initial",
                }}
              >
                {savingNotificationSettings ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} icon={toast.icon} onClose={() => setToast(null)} />}
    </div>
  );
}
