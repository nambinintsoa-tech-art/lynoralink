
import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  ArrowLeft, ArrowRightLeft, MapPin, Globe, Users, Briefcase, Image as ImageIcon,
  LayoutDashboard, UserCheck, Activity, Settings, Bell, Search, ChevronRight, ChevronLeft,
  UserPlus, UserMinus, PenSquare, Rocket, Megaphone, Camera, UploadCloud, Loader2, Plus,
  UtensilsCrossed, Palette, SlidersHorizontal, UserRoundPlus, Clock, ExternalLink,
  CircleDot, Filter, Menu, Eye, ThumbsUp, MessageCircle, X, Check, Wand2,
  Heart, Building2, TrendingUp, CalendarDays, MoreHorizontal, Trash2, HeartPulse,
  LayoutGrid, Compass, GraduationCap, ShoppingBag, Landmark, Wallet
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import CompanyComposer from "./CompanyComposer";
import PostCard from "./PostCard";
import PostViewerPreview from "./PostViewerPreview";
import PremiumBadge from "./PremiumBadge";
import { getCampaignSchedule } from "@/lib/campaignSchedule";

/* ---------------------------------------------------------------
   Design tokens — Updated palette inspired by reference images
----------------------------------------------------------------*/
const C = {
  ink: "var(--app-text)",
  inkSoft: "var(--app-muted)",
  inkFaint: "var(--app-muted-light)",
  surface: "var(--app-bg)",
  card: "var(--app-surface)",
  border: "var(--app-border)",
  gold: "#F5A623",
  goldDeep: "#D4891A",
  goldSoft: "var(--app-bg)",
  blue: "#3868C7",
  blueDeep: "#1D2F5C",
  blueSoft: "var(--app-bg)",
  blueMid: "#2563EB",
  green: "#2E9E6D",
  greenSoft: "#E8F6EF",
  red: "#D8544A",
  redSoft: "#FEF2F2",
  orange: "#F97316",
  orangeSoft: "#FFF7ED",
};

/* ---------------------------------------------------------------
   Subtle weave divider
----------------------------------------------------------------*/
function Weave({ height = 10, from = C.gold, to = C.blue }) {
  return (
    <svg width="100%" height={height} viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="weaveGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      {Array.from({ length: 40 }).map((_, i) => (
        <path
          key={i}
          d={`M${i * 5} 10 L${i * 5 + 5} 0`}
          stroke="url(#weaveGrad)"
          strokeWidth="1.4"
          opacity={i % 2 === 0 ? 0.9 : 0.35}
        />
      ))}
    </svg>
  );
}

const STATUS_STYLE = {
  Actif: { bg: C.greenSoft, fg: C.green },
  "En attente": { bg: C.goldSoft, fg: C.goldDeep },
  Bloqué: { bg: C.redSoft, fg: C.red },
};

/* ---------------------------------------------------------------
   Small building blocks
----------------------------------------------------------------*/
function Avatar({ label, image, size = 40, tone = C.blueDeep }) {
  const initials = label.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold shrink-0"
      style={{ width: size, height: size, background: tone, color: "#fff", fontSize: size * 0.38, overflow: "hidden" }}
    >
      {image ? <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
}

function Pill({ children, bg, fg }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value, delta, icon: Icon, tone }) {
  return (
    <div
      className="company-stat-card min-w-0 rounded-2xl p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2 transition-shadow hover:shadow-md"
      style={{ background: C.card, border: `1px solid ${C.border}` }}
    >
      <div className="flex items-center justify-between">
        <span className="min-w-0 truncate text-[11px] sm:text-xs font-medium" style={{ color: C.inkFaint }}>{label}</span>
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: tone + "15" }}>
          <Icon size={14} className="sm:hidden" style={{ color: tone }} />
          <Icon size={15} className="hidden sm:block" style={{ color: tone }} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-lg sm:text-xl font-bold tracking-tight truncate" style={{ color: C.ink }}>{value}</span>
        {delta && <span className="text-[11px] font-semibold mb-0.5" style={{ color: C.green }}>{delta}</span>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Media upload modal
----------------------------------------------------------------*/
function MediaUploadModal({ kind, onClose, onApply }) {
  const isAvatar = kind === "avatar";
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [phase, setPhase] = useState("pick");
  const [progress, setProgress] = useState(0);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const cropStageRef = useRef(null);
  const cropDragRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const startUpload = useCallback((dataUrl) => {
    setPreview(dataUrl);
    setCropOffset({ x: 0, y: 0 });
    const image = new Image();
    image.onload = () => setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = dataUrl;
    setPhase("uploading");
    setProgress(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + (6 + Math.random() * 10);
        if (next >= 100) {
          clearInterval(timerRef.current);
          setTimeout(() => setPhase("done"), 250);
          return 100;
        }
        return next;
      });
    }, 140);
  }, []);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => startUpload(e.target.result);
    reader.readAsDataURL(file);
  }, [startUpload]);

  const moveCrop = (event) => {
    const drag = cropDragRef.current;
    if (!drag) return;
    const stageSize = cropStageRef.current?.clientWidth || 360;
    const naturalWidth = imageSize.width || stageSize;
    const naturalHeight = imageSize.height || stageSize;
    const scale = Math.max(stageSize / naturalWidth, stageSize / naturalHeight);
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;
    const maxX = Math.max(0, (renderedWidth - stageSize) / 2);
    const maxY = Math.max(0, (renderedHeight - stageSize) / 2);
    setCropOffset({
      x: Math.max(-maxX, Math.min(maxX, drag.offsetX + event.clientX - drag.x)),
      y: Math.max(-maxY, Math.min(maxY, drag.offsetY + event.clientY - drag.y)),
    });
  };

  const startCrop = (event) => {
    if (!isAvatar || phase !== "done") return;
    event.preventDefault();
    cropDragRef.current = { x: event.clientX, y: event.clientY, offsetX: cropOffset.x, offsetY: cropOffset.y };
    cropStageRef.current?.setPointerCapture?.(event.pointerId);
  };

  const getCroppedAvatar = async (dataUrl) => {
    const image = new Image();
    image.src = dataUrl;
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const stageSize = cropStageRef.current?.clientWidth || 360;
    const scale = stageSize / side;
    const sourceX = Math.max(0, Math.min(image.naturalWidth - side, (image.naturalWidth - side) / 2 - cropOffset.x / scale));
    const sourceY = Math.max(0, Math.min(image.naturalHeight - side, (image.naturalHeight - side) / 2 - cropOffset.y / scale));
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Préparation de l’image impossible");
    context.drawImage(image, sourceX, sourceY, side, side, 0, 0, 800, 800);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const applyCroppedImage = async () => {
    if (!preview) return;
    const image = isAvatar ? await getCroppedAvatar(preview) : preview;
    onApply(image);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="company-media-modal-overlay fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(19,28,51,0.55)" }}>
      <div className="company-media-modal w-full max-w-md rounded-2xl overflow-hidden flex flex-col" style={{ background: C.card, animation: "modalPop .22s ease-out" }}>
        <div className="px-6 pt-5 pb-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h2 className="text-base font-bold" style={{ color: C.ink }}>{isAvatar ? "Changer l\'avatar" : "Changer la couverture"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: C.inkFaint }}><X size={18} /></button>
        </div>
        <div className="px-6 py-6 flex flex-col gap-4">
          {phase === "pick" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer flex flex-col items-center justify-center gap-3 text-center transition-all"
              style={{ border: `2px dashed ${dragOver ? C.blueMid : C.border}`, background: dragOver ? C.blueSoft : C.surface, borderRadius: isAvatar ? 20 : 16, height: isAvatar ? 220 : 180, transform: dragOver ? "scale(1.015)" : "scale(1)" }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: C.blueSoft }}><UploadCloud size={20} style={{ color: C.blueDeep }} /></div>
              <div>
                <p className="text-sm font-semibold" style={{ color: C.ink }}>Glissez une image ici</p>
                <p className="text-xs mt-0.5" style={{ color: C.inkFaint }}>ou cliquez pour parcourir · {isAvatar ? "carré recommandé, min 400×400" : "1600×400 recommandé"}</p>
              </div>
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>
          )}
          {phase !== "pick" && (
            <div className="flex flex-col items-center gap-4">
              <div ref={cropStageRef} className="relative overflow-hidden shrink-0" onPointerDown={startCrop} style={{ width: isAvatar ? "min(100%, 360px)" : "100%", aspectRatio: isAvatar ? "1" : undefined, height: isAvatar ? undefined : 140, borderRadius: 14, border: `2px dashed ${C.border}`, background: "#111827", boxShadow: "0 10px 24px rgba(19,28,51,0.14)", cursor: isAvatar ? "grab" : "default", touchAction: isAvatar ? "none" : "auto" }} onPointerMove={isAvatar ? moveCrop : undefined} onPointerUp={isAvatar ? () => { cropDragRef.current = null; } : undefined} onPointerCancel={isAvatar ? () => { cropDragRef.current = null; } : undefined}>
                <div role="img" aria-label="Aperçu" style={{ position: "absolute", inset: 0, backgroundImage: `url(${preview})`, backgroundRepeat: "no-repeat", backgroundSize: "cover", backgroundPosition: isAvatar ? `calc(50% + ${cropOffset.x}px) calc(50% + ${cropOffset.y}px)` : "center", userSelect: "none", pointerEvents: "none" }} />
                {isAvatar && <><div className="absolute inset-0 pointer-events-none" style={{ borderRadius: "50%", border: "3px solid #fff", boxShadow: "0 0 0 999px rgba(15,23,42,0.42)" }} /><span className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none px-2.5 py-1 rounded-full text-[11px] font-bold text-white" style={{ background: "rgba(15,51,82,0.82)" }}>ZONE VISIBLE</span></>}
                {phase === "uploading" && <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: "rgba(19,28,51,0.45)" }}><Loader2 size={26} color="#fff" style={{ animation: "spin 0.9s linear infinite" }} /></div>}
                {phase === "done" && <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: "rgba(46,158,109,0.30)" }}><div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: C.green, animation: "popIn .3s cubic-bezier(.34,1.56,.64,1)" }}><Check size={18} color="#fff" /></div></div>}
              </div>
              {isAvatar && <div className="w-full text-center text-xs" style={{ color: C.inkFaint }}>Faites glisser l’image pour ajuster le cadrage circulaire</div>}
              <div className="w-full flex flex-col gap-1.5">
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: C.border }}>
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${C.gold}, ${C.blue})`, transition: "width .15s ease-out" }} />
                </div>
                <span className="text-xs font-medium self-end" style={{ color: C.inkFaint }}>{phase === "done" ? "Importé avec succès" : `Import en cours… ${Math.min(100, Math.round(progress))}%`}</span>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => (phase === "pick" ? onClose() : setPhase("pick"))} className="px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-50 transition-colors" style={{ color: C.inkSoft }}>{phase === "pick" ? "Annuler" : "Choisir une autre image"}</button>
          <button onClick={() => phase === "done" && applyCroppedImage()} disabled={phase !== "done"} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity" style={{ background: C.blueDeep, opacity: phase === "done" ? 1 : 0.45, cursor: phase === "done" ? "pointer" : "default" }}><Check size={15} /> Appliquer</button>
        </div>
      </div>
      <style>{`@keyframes modalPop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }@keyframes popIn { from { opacity: 0; transform: scale(.5); } to { opacity: 1; transform: scale(1); } }@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }@media (max-width: 640px) { .company-media-modal-overlay { inset: 0 !important; padding: 0 !important; align-items: flex-start !important; } .company-media-modal { width: 100vw !important; max-width: none !important; height: 100dvh !important; max-height: none !important; min-height: 100dvh !important; border-radius: 0 !important; border: 0 !important; box-shadow: none !important; } .company-media-modal > div:nth-child(2) { flex: 0 0 auto; } .company-media-modal > div:nth-child(3) { overflow-y: auto; min-height: 0; } }`}</style>
    </div>
  );
}

function CompanyInviteModal({ open, onClose, company }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setFilterType("all");
    setSelected(null);
    setMessage("");
    setLoading(true);
    Promise.all([
      fetch("/api/users", { credentials: "include", cache: "no-store" }),
      fetch("/api/company/pages", { credentials: "include", cache: "no-store" }),
    ])
      .then(async ([usersResponse, pagesResponse]) => {
        if (!usersResponse.ok) throw new Error("Impossible de charger les utilisateurs.");
        const usersData = await usersResponse.json();
        const pagesData = pagesResponse.ok ? await pagesResponse.json() : { pages: [] };
        const profiles = (Array.isArray(usersData.users) ? usersData.users : usersData.suggestions || [])
          .map((user) => ({ ...user, type: "Profil", title: user.title || "Membre LynoraLink" }));
        const pages = (Array.isArray(pagesData.pages) ? pagesData.pages : [])
          .filter((page) => String(page.id) !== String(company?.id))
          .map((page) => ({ id: page.id, name: page.name || page.displayName || "Page entreprise", title: "Page entreprise", image: page.logoUrl || page.avatarUrl || page.image || null, type: "Page" }));
        const uniqueProfiles = [...profiles, ...pages].filter((profile, index, all) => all.findIndex((item) => String(item.id) === String(profile.id)) === index);
        setUsers(uniqueProfiles);
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, [open, company?.id]);

  if (!open) return null;
  const filteredUsers = users.filter((user) => {
    const matchesType = filterType === "all" || (filterType === "pages" ? user.type === "Page" : user.type === "Profil");
    const matchesQuery = `${user.name} ${user.title} ${user.type}`.toLowerCase().includes(query.toLowerCase());
    return matchesType && matchesQuery;
  });

  const sendInvite = async () => {
    if (!selected || sending) return;
    setSending(true);
    setMessage("");
    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: selected.id, action: "invite" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible d'envoyer l'invitation.");
      setMessage(`Invitation envoyée à ${selected.name}.`);
      setSelected(null);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="company-invite-modal-overlay fixed inset-0 z-[1400] flex items-center justify-center p-4" style={{ background: "rgba(19,28,51,0.58)" }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="company-invite-title" className="company-invite-modal w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: C.card, boxShadow: "0 24px 64px rgba(19,28,51,0.3)" }} onClick={(event) => event.stopPropagation()}>
        <div className="px-5 sm:px-6 py-5 flex items-start justify-between gap-3" style={{ background: C.blueDeep }}>
          <div><p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#FFD77A" }}>Administration de la page</p><h2 id="company-invite-title" className="text-xl font-bold mt-1" style={{ color: "#fff" }}>Inviter un membre</h2><p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.72)" }}>Envoyez une invitation de connexion à un collaborateur.</p></div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ color: "#fff", background: "rgba(255,255,255,0.12)" }}><X size={18} /></button>
        </div>
        <div className="p-5 sm:p-6">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un profil..." className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
          <div className="flex gap-2 mt-3 overflow-x-auto" role="tablist" aria-label="Filtrer les invitations">
            {[{ id: "all", label: "Tous" }, { id: "profiles", label: "Personnes" }, { id: "pages", label: "Pages" }].map((filter) => <button type="button" role="tab" aria-selected={filterType === filter.id} key={filter.id} onClick={() => setFilterType(filter.id)} className="px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap" style={{ background: filterType === filter.id ? C.blueDeep : C.surface, color: filterType === filter.id ? "#fff" : C.inkSoft, border: `1px solid ${filterType === filter.id ? C.blueDeep : C.border}` }}>{filter.label}</button>)}
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto flex flex-col gap-2">
            {loading && <p className="py-5 text-center text-sm" style={{ color: C.inkFaint }}>Chargement des profils...</p>}
            {!loading && filteredUsers.length === 0 && <p className="py-5 text-center text-sm" style={{ color: C.inkFaint }}>Aucun profil disponible.</p>}
            {filteredUsers.map((user) => <button type="button" key={`${user.type}-${user.id}`} onClick={() => setSelected(user)} className="flex items-center gap-3 p-3 rounded-xl text-left" style={{ border: `1px solid ${selected?.id === user.id ? C.blueMid : C.border}`, background: selected?.id === user.id ? C.blueSoft : C.card }}><Avatar label={user.name} size={38} tone={user.type === "Page" ? C.goldDeep : C.blueDeep} /><span className="min-w-0 flex-1"><strong className="block text-sm truncate" style={{ color: C.ink }}>{user.name}</strong><small className="block text-xs truncate" style={{ color: C.inkFaint }}>{user.type} · {user.title}</small></span>{selected?.id === user.id && <Check size={17} style={{ color: C.blueMid }} />}</button>)}
          </div>
          {message && <p className="mt-4 text-sm" style={{ color: message.startsWith("Invitation") ? C.green : C.red }}>{message}</p>}
        </div>
        <div className="px-5 sm:px-6 py-4 flex justify-end gap-2" style={{ borderTop: `1px solid ${C.border}` }}><button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ color: C.inkSoft }}>Annuler</button><button type="button" onClick={sendInvite} disabled={!selected || sending} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ background: C.blueDeep, color: "#fff", opacity: !selected || sending ? 0.5 : 1 }}><UserRoundPlus size={15} /> {sending ? "Envoi..." : "Envoyer l'invitation"}</button></div>
      </div>
      <style>{`@media (max-width: 640px) { .company-invite-modal-overlay { padding: 0 !important; align-items: flex-start !important; } .company-invite-modal { width: 100vw !important; max-width: none !important; height: 100dvh !important; max-height: 100dvh !important; min-height: 100dvh !important; border-radius: 0 !important; } .company-invite-modal > div:nth-child(2) { overflow-y: auto; min-height: 0; } }`}</style>
    </div>
  );
}

/* ---------------------------------------------------------------
   Publications tab — Redesigned with media gallery
----------------------------------------------------------------*/
function PublicationsTab({ company, posts = [], loading = false, error = "", onRetry, canCreatePost = false, onOpenComposer, currentUser, onToggleLike, onSelectReaction, onToggleBookmark, onAddComment, onReplyComment, onToggleCommentLike, onShare, onOpenPost, onOpenArticle, onFollowPage, followedPageIds = [], isCompanyAccount = false }) {
  return (
    <div className="flex flex-col gap-5" style={{ width: "100%", maxWidth: 716, minWidth: 0 }}>
      {canCreatePost && <CompanyComposer onOpen={onOpenComposer} avatarUrl={company?.avatarUrl || company?.logoUrl || company?.image || null} initials={(company?.displayName || company?.name || "Entreprise").split(" ").map((word) => word[0]).slice(0, 2).join("")} />}

      {loading && <p className="text-sm text-center py-8" style={{ color: C.inkFaint }}>Chargement des publications...</p>}
      {!loading && error && <div className="flex flex-col items-center gap-3 py-8 text-center"><p className="text-sm" style={{ color: C.red }}>{error}</p><button type="button" onClick={onRetry} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ border: `1px solid ${C.border}`, background: C.card, color: C.blueMid }}>Réessayer</button></div>}
      {!loading && !error && posts.length === 0 && <p className="text-sm text-center py-8" style={{ color: C.inkFaint }}>Aucune publication pour le moment.</p>}
      {!loading && !error && posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUser={currentUser}
          onToggleLike={onToggleLike}
          onSelectReaction={onSelectReaction}
          onToggleBookmark={onToggleBookmark}
          onAddComment={onAddComment}
          onReplyComment={onReplyComment}
          onToggleCommentLike={onToggleCommentLike}
          onShare={onShare}
          onOpenPost={onOpenPost}
          onOpenArticle={onOpenArticle}
          onFollowPage={onFollowPage}
          followedPageIds={followedPageIds}
          isCompanyAccount={isCompanyAccount}
        />
      ))}

    </div>
  );
}

function MediaGalleryCard({ media = [], onViewGallery }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Médias</h3>
        <button type="button" onClick={onViewGallery} className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: C.blueMid }}>Voir la galerie <ChevronRight size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {media.length === 0 && <p className="col-span-2 text-xs text-center py-6" style={{ color: C.inkFaint }}>Aucun média publié.</p>}
        {media.map((item, index) => (
          <button type="button" key={item.url || item.id || index} onClick={() => onViewGallery(index)} aria-label={`Ouvrir le média ${index + 1}`} className="group relative aspect-video rounded-xl overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2" style={{ background: C.surface }}>
            {item.url ? (item.type === "video" ? <video src={item.url} muted playsInline className="w-full h-full object-cover" /> : <img src={item.url} alt="" className="w-full h-full object-cover" />) : <ImageIcon size={18} style={{ color: C.inkFaint }} />}
            <span className="absolute inset-0 flex items-center justify-center bg-[#131C33]/45 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">Ouvrir</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MediaGalleryModal({ media = [], selectedIndex = 0, onClose, onSelect, onOpenPost, onDelete, onDownload, onSetAvatar, onSetCover }) {
  const currentIndex = Math.min(Math.max(selectedIndex, 0), Math.max(media.length - 1, 0));
  const currentMedia = media[currentIndex];
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[#131C33]/80 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Galerie de médias" onClick={onClose}>
      <div className="h-dvh w-screen max-w-none max-h-none overflow-y-auto rounded-none bg-white p-4 sm:h-auto sm:w-full sm:max-w-4xl sm:max-h-[90dvh] sm:rounded-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold" style={{ color: C.ink }}>Galerie de médias</h2>
          <button type="button" onClick={onClose} aria-label="Fermer la galerie" className="rounded-lg p-2" style={{ color: C.inkFaint }}><X size={18} /></button>
        </div>
        {media.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: C.inkFaint }}>Aucun média publié.</p>
        ) : (
          <div>
            <div className="relative aspect-video overflow-hidden rounded-xl" style={{ background: C.surface }}>
              {currentMedia?.type === "video" ? <video src={currentMedia.url} controls autoPlay playsInline onClick={() => currentMedia.post && onOpenPost?.(currentMedia.post)} className={`h-full w-full object-contain bg-black${currentMedia.post ? " cursor-pointer" : ""}`} /> : <img src={currentMedia?.url} alt="" onClick={() => currentMedia?.post && onOpenPost?.(currentMedia.post)} className={`h-full w-full object-contain${currentMedia?.post ? " cursor-pointer" : ""}`} />}
              {media.length > 1 && <>
                <button type="button" onClick={() => onSelect((currentIndex - 1 + media.length) % media.length)} aria-label="Média précédent" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"><ChevronLeft size={18} /></button>
                <button type="button" onClick={() => onSelect((currentIndex + 1) % media.length)} aria-label="Média suivant" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"><ChevronRight size={18} /></button>
              </>}
            </div>
            <div className="mt-3 text-center text-xs" style={{ color: C.inkFaint }}>{currentIndex + 1} / {media.length}</div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {currentMedia?.url && <a href={currentMedia.url} download target="_blank" rel="noreferrer" onClick={onDownload} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: C.blueSoft, color: C.blueDeep }}>Télécharger</a>}
              {currentMedia?.url && currentMedia.type !== "video" && <button type="button" onClick={() => onSetAvatar?.(currentMedia.url)} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: C.blueSoft, color: C.blueDeep }}>Définir comme profil</button>}
              {currentMedia?.url && currentMedia.type !== "video" && <button type="button" onClick={() => onSetCover?.(currentMedia.url)} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: C.goldSoft, color: C.goldDeep }}>Définir comme couverture</button>}
              {currentMedia?.url && <button type="button" onClick={() => { if (window.confirm("Supprimer définitivement ce média ?")) onDelete?.(currentMedia, currentIndex); }} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: C.redSoft, color: C.red }}>Supprimer</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function JobOfferModal({ form, update, submit, saving, onClose, editing = false }) {
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverDragActive, setCoverDragActive] = useState(false);
  useEffect(() => {
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [onClose]);

  const inputStyle = { border: `1px solid ${C.border}`, color: C.ink, background: C.card };
  const uploadCoverFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploadingCover(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");
      data.append("folder", "lynoralink/jobs");
      const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: data });
      const uploaded = await response.json();
      if (!response.ok || !uploaded.secure_url) throw new Error("Upload impossible");
      update({ target: { value: uploaded.secure_url } });
    } catch {
      // Keep the form usable if the image service is unavailable.
    } finally {
      setUploadingCover(false);
    }
  };
  const uploadCover = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    uploadCoverFile(file);
  };
  const handleCoverDrop = (event) => {
    event.preventDefault();
    setCoverDragActive(false);
    uploadCoverFile(event.dataTransfer.files?.[0]);
  };
  return <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="job-offer-modal-title" style={{ background: "rgba(19,28,51,0.58)" }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form onSubmit={submit} className="company-job-modal flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-none sm:h-auto sm:max-h-[min(760px,calc(100dvh-48px))] sm:rounded-2xl" style={{ background: C.card, boxShadow: "0 24px 70px rgba(19,28,51,.28)" }}>
      <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.08em]" style={{ color: C.blueMid }}><Briefcase size={14} /> Publication entreprise</div><h2 id="job-offer-modal-title" className="mt-1 text-lg font-bold" style={{ color: C.ink }}>Créer une annonce</h2><p className="mt-1 text-xs" style={{ color: C.inkFaint }}>Présentez clairement votre besoin aux candidats et partenaires.</p></div>
        <button type="button" onClick={onClose} aria-label="Fermer le formulaire" className="rounded-lg p-2" style={{ color: C.inkFaint }}><X size={19} /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: C.ink }}>Type d'annonce<select value={form.type} onChange={update("type")} className="rounded-lg p-2.5 text-sm font-normal" style={inputStyle}><option>Offre d'emploi</option><option>Appel d'offres</option><option>Avis de recrutement</option></select></label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: C.ink }}>Titre<input required value={form.title} onChange={update("title")} placeholder="Ex. Développeur frontend" className="rounded-lg p-2.5 text-sm font-normal" style={inputStyle} /></label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: C.ink }}>Contrat / modalité<input value={form.contract} onChange={update("contract")} placeholder="CDI, mission, freelance..." className="rounded-lg p-2.5 text-sm font-normal" style={inputStyle} /></label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold" style={{ color: C.ink }}>Lieu<input value={form.loc} onChange={update("loc")} placeholder="Paris, hybride, à distance..." className="rounded-lg p-2.5 text-sm font-normal" style={inputStyle} /></label>
        </div>
        <label className="mt-4 flex flex-col gap-1.5 text-xs font-semibold" style={{ color: C.ink }}>Description<textarea required value={form.description} onChange={update("description")} rows={7} maxLength={3000} placeholder="Missions, profil recherché, livrables et modalités de candidature..." className="rounded-lg p-2.5 text-sm font-normal" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} /><span className="text-right text-[11px] font-normal" style={{ color: C.inkFaint }}>{form.description.length}/3000</span></label>
        <div className="mt-4 flex flex-col gap-2 text-xs font-semibold" style={{ color: C.ink }}>
          <span>Image de couverture</span>
          <label onDragOver={(event) => { event.preventDefault(); setCoverDragActive(true); }} onDragLeave={() => setCoverDragActive(false)} onDrop={handleCoverDrop} className="flex min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-semibold" style={{ border: `1px dashed ${coverDragActive ? C.blueMid : C.border}`, background: coverDragActive ? C.blueSoft : C.surface, color: C.blueMid }}>
            <UploadCloud size={18} /> {uploadingCover ? "Envoi en cours..." : form.coverUrl ? "Glissez une nouvelle image ou cliquez pour remplacer" : "Glissez-déposez une image ou cliquez pour parcourir"}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadCover} disabled={uploadingCover} className="hidden" />
          </label>
          {form.coverUrl && <img src={form.coverUrl} alt="Aperçu de la couverture" className="h-32 w-full rounded-xl object-cover" />}
        </div>
        <div className="mt-5 overflow-hidden rounded-xl" style={{ border: `1px solid ${C.border}`, background: C.surface }}>
          <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-[.08em]" style={{ borderBottom: `1px solid ${C.border}`, color: C.blueMid }}>Aperçu de l'annonce</div>
          <div className="p-4">
            <div className="text-base font-bold" style={{ color: C.ink }}>{form.title || "Titre de l'offre"}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs" style={{ color: C.inkSoft }}>
              {form.type && <span className="rounded-full px-2.5 py-1" style={{ background: C.card, border: `1px solid ${C.border}` }}>{form.type}</span>}
              {form.contract && <span className="rounded-full px-2.5 py-1" style={{ background: C.card, border: `1px solid ${C.border}` }}>{form.contract}</span>}
              {form.loc && <span className="rounded-full px-2.5 py-1" style={{ background: C.card, border: `1px solid ${C.border}` }}>{form.loc}</span>}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: C.inkSoft }}>{form.description || "La description de votre annonce apparaîtra ici."}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end sm:px-6" style={{ borderTop: `1px solid ${C.border}` }}>
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-semibold" style={{ border: `1px solid ${C.border}`, color: C.inkSoft, background: "transparent" }}>Annuler</button>
        <button disabled={saving} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold" style={{ background: C.gold, color: C.blueDeep, opacity: saving ? .7 : 1 }}><Check size={15} /> {saving ? "Enregistrement..." : editing ? "Enregistrer les modifications" : "Publier l'annonce"}</button>
      </div>
    </form>
  </div>;
}

function JobsTab({ jobs = [], canManage = false, onCreateJob, onUpdateJob, onJobAction }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ type: "Offre d'emploi", title: "", contract: "CDI", loc: "", description: "" });
  const [saving, setSaving] = useState(false);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const closeForm = useCallback(() => setFormOpen(false), []);
  const openCreateForm = () => {
    setEditingId(null);
    setForm({ type: "Offre d'emploi", title: "", contract: "CDI", loc: "", description: "", coverUrl: "" });
    setFormOpen(true);
  };
  const openEditForm = (job) => {
    setEditingId(job.id);
    setForm({ type: job.type || "Offre d'emploi", title: job.title || "", contract: job.contract || "", loc: job.loc || "", description: job.description || "", coverUrl: job.coverUrl || "" });
    setFormOpen(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      if (editingId) await onUpdateJob?.(editingId, form);
      else await onCreateJob?.(form);
      setForm({ type: "Offre d'emploi", title: "", contract: "CDI", loc: "", description: "" });
      setEditingId(null);
      setFormOpen(false);
    } finally { setSaving(false); }
  };
  return (
    <div className="flex flex-col gap-3">
      {canManage && <div className="flex justify-end"><button type="button" onClick={() => formOpen ? closeForm() : openCreateForm()} className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold" style={{ background: C.blueMid, color: "#fff" }}><Plus size={15} /> {formOpen ? "Fermer" : "Publier une annonce"}</button></div>}
      {formOpen && <JobOfferModal form={form} update={update} submit={submit} saving={saving} onClose={closeForm} editing={Boolean(editingId)} />}
      {jobs.length === 0 && <p className="rounded-2xl p-8 text-center text-sm" style={{ background: C.card, border: `1px solid ${C.border}`, color: C.inkFaint }}>Aucune offre d'emploi publiée.</p>}
      {jobs.map((j) => (
        <div key={j.id || j.title} className="relative">
          {canManage && <button type="button" onClick={() => openEditForm(j)} title="Modifier l'annonce" aria-label={`Modifier ${j.title}`} className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold" style={{ background: C.card, border: `1px solid ${C.border}`, color: C.blueMid, boxShadow: "0 2px 8px rgba(19,28,51,.12)" }}><PenSquare size={13} /> Modifier</button>}
          <PostCard variant="job" post={{ ...j, jobType: j.type, jobTitle: j.title, title: j.title, text: j.description }} onJobAction={onJobAction} />
        </div>
      ))}
    </div>
  );
}

function AboutTab({ company }) {
  return (
    <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div>
        <h3 className="text-sm font-semibold mb-2" style={{ color: C.ink }}>Aperçu</h3>
        <p className="text-sm leading-relaxed" style={{ color: C.inkSoft }}>{company?.description || "Cette entreprise n'a pas encore ajouté de description."}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
        {[[Building2, company?.industry], [Users, company?.size], [MapPin, company?.location], [Globe, company?.website]].filter(([, label]) => label).map(([Icon, label]) => (
          <div key={label} className="flex items-center gap-2 text-sm" style={{ color: C.inkSoft }}><Icon size={16} style={{ color: C.inkFaint }} /> {label}</div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Administration — Dashboard
----------------------------------------------------------------*/
function AdminDashboard({ onOpenSponsor, company, analytics = [] }) {
  const stats = company?.stats || {};
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Abonnés" value={stats.followers ?? 0} icon={Users} tone={C.blue} />
        <StatCard label="Vues (7 j)" value={stats.views ?? 0} icon={Eye} tone={C.gold} />
        <StatCard label="Engagement" value={stats.engagement ?? "0 %"} icon={Heart} tone={C.green} />
        <StatCard label="Publications" value={stats.posts ?? 0} icon={Rocket} tone={C.blueDeep} />
      </div>
      <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Portée de la page</h3>
            <p className="text-xs" style={{ color: C.inkFaint }}>Vues des publications, 7 derniers jours</p>
          </div>
          <TrendingUp size={18} style={{ color: C.green }} />
        </div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs><linearGradient id="reachFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity={0.35} /><stop offset="100%" stopColor={C.blue} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke={C.border} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: C.inkFaint }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: C.inkFaint }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12 }} />
              <Area type="monotone" dataKey="views" stroke={C.blue} strokeWidth={2.5} fill="url(#reachFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-2xl p-5 flex items-center justify-between gap-4" style={{ background: `linear-gradient(120deg, ${C.blueDeep}, ${C.blue})` }}>
        <div>
          <p className="text-white font-semibold text-sm">Amplifiez votre prochaine publication</p>
          <p className="text-white text-xs opacity-80 mt-1">Touchez de nouvelles audiences à Antananarivo et au-delà.</p>
        </div>
        <button onClick={onOpenSponsor} className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background: C.gold, color: C.blueDeep }}><Megaphone size={16} /> Sponsoriser</button>
      </div>
    </div>
  );
}

function CampaignDashboard({ onOpenSponsor, company }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadCampaigns = () => {
    fetch("/api/company/campaigns", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : response.json().then((data) => Promise.reject(new Error(data.error))))
      .then((data) => setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []))
      .catch((requestError) => setError(requestError.message || "Impossible de charger les campagnes."))
      .finally(() => setLoading(false));
  };
  useEffect(loadCampaigns, []);
  const updateStatus = async (campaign, status) => {
    const response = await fetch("/api/company/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: campaign.storageId, status }) });
    if (!response.ok) return;
    const data = await response.json();
    setCampaigns((current) => current.map((item) => item.storageId === campaign.storageId ? data.campaign : item));
  };
  const totals = campaigns.reduce((sum, campaign) => {
    const analytics = campaign.analytics || {};
    return { impressions: sum.impressions + (analytics.impressions || 0), clicks: sum.clicks + (analytics.clicks || 0), conversions: sum.conversions + (analytics.conversions || 0), spent: sum.spent + (analytics.spent || 0) };
  }, { impressions: 0, clicks: 0, conversions: 0, spent: 0 });
  return <div className="flex flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold" style={{ color: C.ink }}>Publicité</h3><p className="text-sm" style={{ color: C.inkFaint }}>Pilotez vos campagnes et leurs performances.</p></div><button type="button" onClick={onOpenSponsor} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: C.gold, color: C.blueDeep }}><Megaphone size={16} /> Créer une campagne publicitaire</button></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[["Impressions", totals.impressions, Eye], ["Clics", totals.clicks, ExternalLink], ["Conversions", totals.conversions, Check], ["Dépenses", `${totals.spent} €`, Wallet]].map(([label, value, Icon]) => <StatCard key={label} label={label} value={value} icon={Icon} tone={C.blue} />)}</div>
    <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}><div className="p-4 font-semibold text-sm" style={{ color: C.ink }}>Mes campagnes</div>{loading && <p className="p-5 text-sm" style={{ color: C.inkFaint }}>Chargement...</p>}{error && <p className="p-5 text-sm" style={{ color: C.red }}>{error}</p>}{!loading && !error && campaigns.length === 0 && <p className="p-5 text-sm" style={{ color: C.inkFaint }}>Aucune campagne créée.</p>}{campaigns.map((campaign) => <div key={campaign.storageId} className="p-4 flex flex-wrap items-center justify-between gap-3" style={{ borderTop: `1px solid ${C.border}` }}><div><p className="font-semibold text-sm" style={{ color: C.ink }}>{campaign.title || "Campagne sans titre"}</p><p className="text-xs mt-1" style={{ color: C.inkFaint }}>{campaign.objective} · {campaign.budget} € / {campaign.budgetMode === "total" ? "global" : "jour"} · {campaign.status}</p></div><div className="flex items-center gap-2"><span className="text-xs" style={{ color: C.inkFaint }}>{(campaign.analytics?.clicks || 0).toLocaleString("fr-FR")} clics</span>{campaign.status === "PAUSED" ? <button type="button" onClick={() => updateStatus(campaign, "APPROVED")} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: C.greenSoft, color: C.green }}>Relancer</button> : campaign.status === "APPROVED" ? <button type="button" onClick={() => updateStatus(campaign, "PAUSED")} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: C.goldSoft, color: C.goldDeep }}>Pause</button> : <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: C.blueSoft, color: C.blueDeep }}>En modération</span>}</div></div>)}</div>
  </div>;
}

function AdminSubscribers({ subscribers = [], onOpenProfile }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => subscribers.filter((s) => (s.name || s.email || "").toLowerCase().includes(query.toLowerCase())), [subscribers, query]);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="p-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.inkFaint }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un abonné..." className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.ink }} />
        </div>
        <span className="text-xs font-medium shrink-0" style={{ color: C.inkFaint }}>{filtered.length} abonnés</span>
      </div>
      <div>
        {filtered.length === 0 && <p className="p-8 text-center text-sm" style={{ color: C.inkFaint }}>Aucun abonné à afficher.</p>}
        {filtered.map((s) => (
          <div key={s.id} className="company-admin-subscriber-row flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => onOpenProfile?.(s.id)} aria-label={`Voir le profil de ${s.name || "cet abonné"}`} title="Voir le profil" className="rounded-full shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2" style={{ color: C.blueMid }}><Avatar label={s.name || s.email || "Abonné"} image={s.image} size={42} tone={C.blue} /></button>
              <div>
                <button type="button" onClick={() => onOpenProfile?.(s.id)} className="text-sm font-semibold text-left hover:underline" style={{ color: C.ink }}>{s.name || s.email || "Abonné"}</button>
                <p className="text-xs" style={{ color: C.inkFaint }}>{s.role} · depuis le {s.since}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Pill bg={STATUS_STYLE[s.status].bg} fg={STATUS_STYLE[s.status].fg}>{s.status}</Pill>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: C.inkFaint }}><MoreHorizontal size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminActivity({ activity = [] }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: C.ink }}>Activité récente</h3>
      <div className="flex flex-col">
        {activity.length === 0 && <p className="text-sm" style={{ color: C.inkFaint }}>Aucune activité récente.</p>}
        {activity.map((a, i) => (
          <div key={a.id} className="flex gap-3 pb-5 relative">
            {i !== activity.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px" style={{ background: C.border }} />}
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10" style={{ background: a.color + "18" }}><a.icon size={15} style={{ color: a.color }} /></div>
            <div>
              <p className="text-sm" style={{ color: C.ink }}>{a.text}</p>
              <p className="text-xs mt-0.5" style={{ color: C.inkFaint }}>{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium" style={{ color: C.inkSoft }}>{label}</span>
      {children}
    </label>
  );
}
const inputStyle = { background: C.surface, border: `1px solid ${C.border}`, color: C.ink };
const AUTO_REPLY_FAQ_TEMPLATES = [
  { id: "welcome", label: "Bienvenue client", question: "Bonjour, comment pouvez-vous m'aider ?", answer: "Bonjour, merci de contacter {page}. Comment pouvons-nous vous aider ?" },
  { id: "hours", label: "Horaires d'ouverture", question: "Quels sont vos horaires ?", answer: "Nous sommes ouverts du lundi au vendredi, de 9h à 18h." },
  { id: "services", label: "Services proposés", question: "Quels services proposez-vous ?", answer: "Nous proposons des solutions adaptées à vos besoins professionnels. Contactez-nous pour en savoir plus." },
  { id: "contact", label: "Prise de contact", question: "Comment pouvez-vous être contactés ?", answer: "Envoyez-nous un message ici et notre équipe vous répondra dans les meilleurs délais." },
  { id: "pricing", label: "Tarifs", question: "Comment obtenir vos tarifs ?", answer: "Nos tarifs dépendent de votre besoin. Contactez-nous pour recevoir une proposition personnalisée." },
  { id: "appointment", label: "Rendez-vous", question: "Comment prendre rendez-vous ?", answer: "Indiquez-nous vos disponibilités et le motif de votre demande. Nous vous proposerons rapidement un créneau." },
  { id: "location", label: "Adresse", question: "Ou êtes-vous situés ?", answer: "Notre équipe vous communiquera l'adresse et les indications d'accès dans cette conversation." },
  { id: "delivery", label: "Délais", question: "Quels sont vos délais ?", answer: "Le délai dépend de votre demande. Envoyez-nous les détails du projet pour une estimation précise." },
  { id: "support", label: "Assistance", question: "J'ai besoin d'assistance", answer: "Nous sommes là pour vous aider. Décrivez votre demande et notre équipe reviendra vers vous." },
];
const AUTO_REPLY_DEFAULT_TEMPLATES = [
  { id: "welcome", label: "Bienvenue chaleureuse", text: "Bonjour, bienvenue sur la page {page} ! Merci pour votre message. Notre équipe revient vers vous rapidement." },
  { id: "business", label: "Accueil professionnel", text: "Bonjour, vous êtes bien sur la page {page}. Merci de nous avoir contactés. Indiquez-nous votre besoin et nous vous répondrons au plus vite." },
  { id: "hours", label: "Accueil avec horaires", text: "Bonjour, merci de contacter {page}. Nous répondons du lundi au vendredi, de 9h à 18h. Laissez-nous votre demande, nous reviendrons vers vous dès que possible." },
  { id: "afterhours", label: "Hors horaires", text: "Bonjour, vous avez contacté {page}. Notre équipe est actuellement indisponible, mais votre message a bien été reçu et sera traité dès notre retour." },
  { id: "appointment", label: "Prise de rendez-vous", text: "Bonjour, merci de contacter {page}. Pour préparer votre rendez-vous, indiquez-nous votre besoin et vos disponibilités." },
];

function AdminSettings({ company, onUpdateCompany, onDeleted }) {
  const [autoReply, setAutoReply] = useState(null);
  const [autoReplyLoading, setAutoReplyLoading] = useState(true);
  const [autoReplySaving, setAutoReplySaving] = useState(false);
  const [autoReplyError, setAutoReplyError] = useState("");
  const [selectedFaqTemplate, setSelectedFaqTemplate] = useState("");
  const [selectedDefaultTemplate, setSelectedDefaultTemplate] = useState("");
  const [autoReplyMediaUploading, setAutoReplyMediaUploading] = useState(false);
  const [notifs, setNotifs] = useState(true);
  const [confirmation, setConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const pageName = company?.displayName || company?.name || "Mon entreprise";
  useEffect(() => {
    fetch("/api/company/auto-reply", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Impossible de charger le répondeur automatique.");
        setAutoReply({ ...data, faq: Array.isArray(data.faq) ? data.faq : [] });
      })
      .catch((error) => setAutoReplyError(error.message || "Impossible de charger le répondeur automatique."))
      .finally(() => setAutoReplyLoading(false));
  }, []);
  const saveAutoReply = async (patch) => {
    const next = { ...autoReply, ...patch };
    setAutoReply(next);
    setAutoReplySaving(true);
    setAutoReplyError("");
    try {
      const response = await fetch("/api/company/auto-reply", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible d'enregistrer la configuration.");
      setAutoReply(data);
    } catch (error) { setAutoReplyError(error.message); }
    finally { setAutoReplySaving(false); }
  };
  const updateRule = (index, patch) => setAutoReply((current) => ({ ...current, rules: (current.rules || []).map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule) }));
  const saveRules = () => saveAutoReply({ rules: autoReply.rules || [] });
  const addFaqTemplate = () => {
    const template = AUTO_REPLY_FAQ_TEMPLATES.find((item) => item.id === selectedFaqTemplate);
    if (!template || !autoReply) return;
    const alreadyAdded = (autoReply.faq || []).some((item) => item.question === template.question);
    if (!alreadyAdded) {
      const faq = [...(autoReply.faq || []), { question: template.question, answer: template.answer }];
      saveAutoReply({ faq: faq.map((item) => ({ ...item, answer: item.answer.replaceAll("{page}", pageName) })) });
    }
    setSelectedFaqTemplate("");
  };
  const applyDefaultTemplate = () => {
    const template = AUTO_REPLY_DEFAULT_TEMPLATES.find((item) => item.id === selectedDefaultTemplate);
    if (!template || !autoReply) return;
    saveAutoReply({ autoReplyDefaultMessage: template.text.replaceAll("{page}", pageName) });
    setSelectedDefaultTemplate("");
  };
  const uploadAutoReplyMedia = async (file) => {
    if (!file || !autoReply) return;
    setAutoReplyMediaUploading(true);
    setAutoReplyError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", file.type.startsWith("video/") ? "video" : "image");
      const response = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || "Impossible d'envoyer le média.");
      await saveAutoReply({ media: [{ url: data.url, type: data.type, publicId: data.publicId }] });
    } catch (error) { setAutoReplyError(error.message || "Impossible d'envoyer le média."); }
    finally { setAutoReplyMediaUploading(false); }
  };
  const removeAutoReplyMedia = () => saveAutoReply({ media: [] });
  const deletePage = async () => {
    if (confirmation !== pageName || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/company", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible de supprimer la page.");
      onDeleted?.();
    } catch (error) {
      setDeleteError(error.message);
      setDeleteLoading(false);
    }
  };
  const saveField = (field) => (event) => {
    const value = event.currentTarget.value.trim();
    fetch("/api/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
      .then((response) => response.ok ? response.json() : null)
      .then((updated) => updated && onUpdateCompany?.(updated))
      .catch(() => {});
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Informations de la page</h3>
        <div className="company-admin-settings-grid grid grid-cols-2 gap-4">
          <Field label="Nom de la page"><input defaultValue={company?.displayName || company?.name || ""} onBlur={saveField("displayName")} className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} /></Field>
          <Field label="Catégorie"><input defaultValue={company?.industry || ""} onBlur={saveField("industry")} className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} /></Field>
          <Field label="Localisation"><input defaultValue={company?.location || ""} onBlur={saveField("location")} className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} /></Field>
          <Field label="Site web"><input defaultValue={company?.website || ""} onBlur={saveField("website")} className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} /></Field>
        </div>
        <Field label="Slogan"><input defaultValue={company?.slogan || ""} onBlur={saveField("slogan")} className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} /></Field>
      </div>
      <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3">
          <Bell size={17} style={{ color: C.inkFaint }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: C.ink }}>Notifications administrateur</p>
            <p className="text-xs" style={{ color: C.inkFaint }}>Recevez un résumé des abonnés et de l\'activité chaque semaine.</p>
          </div>
        </div>
        <button onClick={() => setNotifs((v) => !v)} className="w-11 h-6 rounded-full relative transition-colors" style={{ background: notifs ? C.green : C.border }} aria-pressed={notifs}>
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: notifs ? 22 : 2 }} />
        </button>
      </div>
      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Répondeur automatique Premium</h3>
            {autoReplyLoading && <p className="text-xs mt-1" style={{ color: C.inkFaint }}>Chargement de la configuration...</p>}
            {!autoReplyLoading && autoReply && <p className="text-xs mt-1" style={{ color: autoReply.autoReplyEnabled ? C.green : C.inkFaint }}>{autoReply.autoReplyEnabled ? "Répondeur automatique activé" : "Répondeur automatique désactivé"}</p>}
            {!autoReplyLoading && autoReplyError && <p className="text-xs mt-1" style={{ color: C.red }}>{autoReplyError}</p>}
          </div>
          {autoReply && <button type="button" onClick={() => saveAutoReply({ autoReplyEnabled: !autoReply.autoReplyEnabled })} disabled={autoReplySaving} aria-label={autoReply.autoReplyEnabled ? "Désactiver le répondeur automatique" : "Activer le répondeur automatique"} aria-pressed={autoReply.autoReplyEnabled} className="w-11 h-6 rounded-full relative transition-colors disabled:opacity-60" style={{ background: autoReply.autoReplyEnabled ? C.green : C.border }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: autoReply.autoReplyEnabled ? 22 : 2 }} />
          </button>}
        </div>
        {autoReply && <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tonalité"><select value={autoReply.autoReplyTone || "friendly"} onChange={(event) => saveAutoReply({ autoReplyTone: event.target.value })} className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}><option value="friendly">Amicale</option><option value="formal">Formelle</option></select></Field>
            <Field label="Message d'accueil de la page">
              <textarea value={autoReply.autoReplyDefaultMessage || ""} onChange={(event) => setAutoReply((current) => ({ ...current, autoReplyDefaultMessage: event.target.value }))} onBlur={() => saveAutoReply({ autoReplyDefaultMessage: autoReply.autoReplyDefaultMessage })} rows={3} maxLength={1000} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ ...inputStyle, resize: "vertical" }} placeholder={`Bonjour, merci de contacter ${pageName}...`} />
              <div className="flex gap-2 mt-2">
                <select value={selectedDefaultTemplate} onChange={(event) => setSelectedDefaultTemplate(event.target.value)} className="min-w-0 flex-1 px-2 py-2 rounded-lg text-xs outline-none" style={inputStyle}>
                  <option value="">Choisir un message predefini...</option>
                  {AUTO_REPLY_DEFAULT_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
                </select>
                <button type="button" onClick={applyDefaultTemplate} disabled={!selectedDefaultTemplate || autoReplySaving} className="px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: C.blueSoft, color: C.blueMid }}>Utiliser</button>
              </div>
            </Field>
          </div>
          <Field label="Média joint aux réponses (facultatif)">
            <label className="flex items-center gap-2 min-h-10 px-3 rounded-lg text-xs cursor-pointer" style={{ ...inputStyle, borderStyle: "dashed" }}>
              <UploadCloud size={15} />
              {autoReplyMediaUploading ? "Envoi en cours..." : "Choisir une image ou une vidéo"}
              <input type="file" accept="image/*,video/*" className="sr-only" disabled={autoReplyMediaUploading || autoReplySaving} onChange={(event) => { uploadAutoReplyMedia(event.target.files?.[0]); event.target.value = ""; }} />
            </label>
            {(autoReply.media || []).map((media) => <div key={media.url} className="mt-2 flex items-center gap-3 rounded-lg p-2" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              {media.type === "video" ? <video src={media.url} className="w-16 h-12 rounded object-cover" /> : <img src={media.url} alt="Média du répondeur" className="w-16 h-12 rounded object-cover" />}
              <span className="text-xs flex-1" style={{ color: C.inkSoft }}>Ce média sera joint automatiquement.</span>
              <button type="button" onClick={removeAutoReplyMedia} disabled={autoReplySaving} className="text-xs font-semibold" style={{ color: C.red }}>Retirer</button>
            </div>)}
          </Field>
          <Field label="FAQ personnalisée (une question et une réponse par ligne, séparées par |)">
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={selectedFaqTemplate} onChange={(event) => setSelectedFaqTemplate(event.target.value)} className="min-w-0 flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
                <option value="">Choisir un modèle de réponse...</option>
                {AUTO_REPLY_FAQ_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
              </select>
              <button type="button" onClick={addFaqTemplate} disabled={!selectedFaqTemplate} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: C.blueSoft, color: C.blueMid }}><Plus size={13} /> Ajouter</button>
            </div>
            <textarea value={(autoReply.faq || []).map((item) => `${item.question} | ${item.answer}`).join("\n")} onChange={(event) => setAutoReply((current) => ({ ...current, faq: event.target.value.split("\n").map((line) => { const [question, ...answer] = line.split("|"); return { question: question?.trim() || "", answer: answer.join("|").trim() }; }).filter((item) => item.question && item.answer) }))} onBlur={() => saveAutoReply({ faq: autoReply.faq })} rows={4} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ ...inputStyle, resize: "vertical" }} placeholder="Quels sont vos horaires ? | Nous sommes ouverts du lundi au vendredi." />
          </Field>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between"><span className="text-xs font-medium" style={{ color: C.inkSoft }}>Plages horaires (facultatif)</span><button type="button" onClick={() => setAutoReply((current) => ({ ...current, rules: [...(current.rules || []), { dayOfWeek: 1, startTime: "18:00", endTime: "23:00", enabled: true }] }))} className="text-xs font-semibold" style={{ color: C.blueMid }}>Ajouter une plage</button></div>
            {(autoReply.rules || []).map((rule, index) => <div key={`${index}-${rule.dayOfWeek}`} className="grid grid-cols-[1fr_0.8fr_0.8fr_auto] gap-2 items-center"><select value={rule.dayOfWeek} onChange={(event) => updateRule(index, { dayOfWeek: Number(event.target.value) })} className="px-2 py-2 rounded-lg text-xs outline-none" style={inputStyle}>{["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].map((day, dayIndex) => <option key={day} value={dayIndex}>{day}</option>)}</select><input type="time" value={rule.startTime} onChange={(event) => updateRule(index, { startTime: event.target.value })} className="px-2 py-2 rounded-lg text-xs outline-none" style={inputStyle} /><input type="time" value={rule.endTime} onChange={(event) => updateRule(index, { endTime: event.target.value })} className="px-2 py-2 rounded-lg text-xs outline-none" style={inputStyle} /><button type="button" onClick={() => saveAutoReply({ rules: (autoReply.rules || []).filter((_, ruleIndex) => ruleIndex !== index) })} aria-label="Supprimer la plage" className="p-2" style={{ color: C.red }}><Trash2 size={14} /></button></div>)}
            {(autoReply.rules || []).length > 0 && <button type="button" onClick={saveRules} disabled={autoReplySaving} className="self-start text-xs font-semibold" style={{ color: C.blueMid }}>Enregistrer les plages</button>}
          </div>
          {autoReplySaving && <p className="text-xs" style={{ color: C.inkFaint }}>Enregistrement...</p>}
          {autoReplyError && <p className="text-xs" style={{ color: C.red }}>{autoReplyError}</p>}
        </>}
      </div>
      {false && !autoReplyLoading && autoReply && (
        <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Répondeur automatique Premium</h3>
              <p className="text-xs mt-1" style={{ color: autoReply.autoReplyEnabled ? C.green : C.inkFaint }}>{autoReply.autoReplyEnabled ? "✅ Répondeur automatique activé" : "⛔ Répondeur automatique désactivé"}</p>
            </div>
            <button type="button" onClick={() => saveAutoReply({ autoReplyEnabled: !autoReply.autoReplyEnabled })} disabled={autoReplySaving} aria-label={autoReply.autoReplyEnabled ? "Désactiver le répondeur automatique" : "Activer le répondeur automatique"} aria-pressed={autoReply.autoReplyEnabled} className="w-11 h-6 rounded-full relative transition-colors disabled:opacity-60" style={{ background: autoReply.autoReplyEnabled ? C.green : C.border }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: autoReply.autoReplyEnabled ? 22 : 2 }} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tonalité"><select value={autoReply.autoReplyTone || "friendly"} onChange={(event) => saveAutoReply({ autoReplyTone: event.target.value })} className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}><option value="friendly">Amicale</option><option value="formal">Formelle</option></select></Field>
            <Field label="Message par défaut"><textarea value={autoReply.autoReplyDefaultMessage || ""} onChange={(event) => setAutoReply((current) => ({ ...current, autoReplyDefaultMessage: event.target.value }))} onBlur={() => saveAutoReply({ autoReplyDefaultMessage: autoReply.autoReplyDefaultMessage })} rows={3} maxLength={1000} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ ...inputStyle, resize: "vertical" }} placeholder="Merci de nous avoir contactés..." /></Field>
          </div>
          <Field label="FAQ personnalisée (une question et une réponse par ligne, séparées par |)"><textarea value={(autoReply.faq || []).map((item) => `${item.question} | ${item.answer}`).join("\n")} onChange={(event) => setAutoReply((current) => ({ ...current, faq: event.target.value.split("\n").map((line) => { const [question, ...answer] = line.split("|"); return { question: question?.trim() || "", answer: answer.join("|").trim() }; }).filter((item) => item.question && item.answer) }))} onBlur={() => saveAutoReply({ faq: autoReply.faq })} rows={4} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ ...inputStyle, resize: "vertical" }} placeholder="Quels sont vos horaires ? | Nous sommes ouverts du lundi au vendredi." /></Field>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between"><span className="text-xs font-medium" style={{ color: C.inkSoft }}>Plages horaires (facultatif)</span><button type="button" onClick={() => setAutoReply((current) => ({ ...current, rules: [...(current.rules || []), { dayOfWeek: 1, startTime: "18:00", endTime: "23:00", enabled: true }] }))} className="text-xs font-semibold" style={{ color: C.blueMid }}>Ajouter une plage</button></div>
            {(autoReply.rules || []).map((rule, index) => <div key={`${index}-${rule.dayOfWeek}`} className="grid grid-cols-[1fr_0.8fr_0.8fr_auto] gap-2 items-center"><select value={rule.dayOfWeek} onChange={(event) => updateRule(index, { dayOfWeek: Number(event.target.value) })} className="px-2 py-2 rounded-lg text-xs outline-none" style={inputStyle}>{["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].map((day, dayIndex) => <option key={day} value={dayIndex}>{day}</option>)}</select><input type="time" value={rule.startTime} onChange={(event) => updateRule(index, { startTime: event.target.value })} className="px-2 py-2 rounded-lg text-xs outline-none" style={inputStyle} /><input type="time" value={rule.endTime} onChange={(event) => updateRule(index, { endTime: event.target.value })} className="px-2 py-2 rounded-lg text-xs outline-none" style={inputStyle} /><button type="button" onClick={() => saveAutoReply({ rules: (autoReply.rules || []).filter((_, ruleIndex) => ruleIndex !== index) })} aria-label="Supprimer la plage" className="p-2" style={{ color: C.red }}><Trash2 size={14} /></button></div>)}
            {(autoReply.rules || []).length > 0 && <button type="button" onClick={saveRules} disabled={autoReplySaving} className="self-start text-xs font-semibold" style={{ color: C.blueMid }}>Enregistrer les plages</button>}
          </div>
          {autoReplySaving && <p className="text-xs" style={{ color: C.inkFaint }}>Enregistrement...</p>}
          {autoReplyError && <p className="text-xs" style={{ color: C.red }}>{autoReplyError}</p>}
        </div>
      )}
      <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: C.ink }}>Rôles d\'administration</h3>
        <div className="flex flex-col gap-3">
          {(company?.admins || []).map((admin) => {
            const name = admin.name || admin;
            return (
            <div key={name} className="flex items-center justify-between">
              <div className="flex items-center gap-3"><Avatar label={name} size={32} tone={C.blueDeep} /><span className="text-sm" style={{ color: C.ink }}>{name}</span></div>
              <button className="text-xs font-medium flex items-center gap-1" style={{ color: C.red }}><Trash2 size={13} /> Retirer</button>
            </div>
            );
          })}
          {(company?.admins || []).length === 0 && <p className="text-sm" style={{ color: C.inkFaint }}>Aucun administrateur supplémentaire.</p>}
        </div>
      </div>
      <div className="rounded-2xl p-5" style={{ background: C.redSoft, border: `1px solid ${C.red}40` }}>
        <h3 className="text-sm font-semibold" style={{ color: C.red }}>Supprimer la page</h3>
        <p className="text-xs mt-1 mb-4" style={{ color: C.inkSoft }}>Cette action supprime définitivement la page. Vos publications resteront sur votre profil personnel.</p>
        <Field label={`Saisissez « ${pageName} » pour confirmer`}>
          <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder={pageName} />
        </Field>
        {deleteError && <p className="text-xs mt-2" style={{ color: C.red }}>{deleteError}</p>}
        <button type="button" onClick={deletePage} disabled={confirmation !== pageName || deleteLoading} className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: C.red, color: "#fff" }}>
          <Trash2 size={15} /> {deleteLoading ? "Suppression..." : "Supprimer définitivement"}
        </button>
      </div>
    </div>
  );
}

function AdministrationTab({ onOpenSponsor, onUpdateCompany, onDeleted, onOpenProfile, company }) {
  const [section, setSection] = useState("dashboard");
  const items = [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { id: "advertising", label: "Publicité", icon: Megaphone },
    { id: "subscribers", label: "Abonnés", icon: UserCheck },
    { id: "activity", label: "Activité", icon: Activity },
    { id: "settings", label: "Paramètres", icon: Settings },
  ];
  return (
    <div className="company-admin-layout grid grid-cols-[240px_minmax(0,1fr)] gap-6">
      <nav className="rounded-2xl p-3 flex flex-col gap-1 h-fit lg:sticky lg:top-4" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 10px 28px rgba(19,28,51,0.06)" }}>
        <div className="px-3 pt-2 pb-3 mb-1" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: C.blueMid }}>Espace entreprise</div>
          <div className="text-sm font-bold mt-1" style={{ color: C.ink }}>Administration</div>
          <div className="text-xs mt-1 leading-relaxed" style={{ color: C.inkFaint }}>Pilotez votre page et vos activités.</div>
        </div>
        <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: C.inkFaint }}>Gestion de la page</div>
        {items.map((it) => {
          const active = section === it.id;
          return (
            <button key={it.id} onClick={() => setSection(it.id)} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-left transition-all hover:bg-gray-50" style={{ background: active ? C.blueSoft : "transparent", color: active ? C.blueDeep : C.inkSoft, boxShadow: active ? `inset 3px 0 0 ${C.blueMid}` : "none" }}>
              <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: active ? C.card : C.surface, color: active ? C.blueMid : C.inkFaint }}><it.icon size={16} /></span>
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>
      <div>
        {section === "dashboard" && <AdminDashboard onOpenSponsor={onOpenSponsor} company={company} analytics={company?.analytics || []} />}
        {section === "advertising" && <CampaignDashboard onOpenSponsor={onOpenSponsor} company={company} />}
        {section === "subscribers" && <AdminSubscribers subscribers={company?.subscribers || []} onOpenProfile={onOpenProfile} />}
        {section === "activity" && <AdminActivity activity={company?.activity || []} />}
        {section === "settings" && <AdminSettings company={company} onUpdateCompany={onUpdateCompany} onDeleted={onDeleted} />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Sponsor modal
----------------------------------------------------------------*/
const STEPS = ["Contenu", "Audience", "Budget & Paiement", "Aperçu"];
const OBJECTIVES = [
  { id: "visibilite", label: "Visibilité", sub: "Augmenter la notoriété", icon: Eye },
  { id: "clics", label: "Clics", sub: "Augmenter les visites", icon: ExternalLink },
  { id: "conversions", label: "Conversions", sub: "Obtenir des résultats", icon: Check },
];

function ReachDial({ pct }) {
  const r = 46, c = 2 * Math.PI * r;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} stroke={C.border} strokeWidth="10" fill="none" />
      <circle cx="60" cy="60" r={r} stroke="url(#dialGrad)" strokeWidth="10" fill="none" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} strokeLinecap="round" transform="rotate(-90 60 60)" />
      <defs><linearGradient id="dialGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={C.gold} /><stop offset="100%" stopColor={C.blue} /></linearGradient></defs>
      <text x="60" y="56" textAnchor="middle" fontSize="18" fontWeight="700" fill={C.ink}>{Math.round(pct)}%</text>
      <text x="60" y="74" textAnchor="middle" fontSize="9" fill={C.inkFaint}>score de portée</text>
    </svg>
  );
}

export function SponsorModal({ onClose, company }) {
  const [step, setStep] = useState(0);
  const [objective, setObjective] = useState("");
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("post");
  const [contentType, setContentType] = useState("text");
  const [description, setDescription] = useState("");
  const [cta, setCta] = useState("En savoir plus");
  const [media, setMedia] = useState(null);
  const [currency, setCurrency] = useState("eur");
  const [age, setAge] = useState([18, 45]);
  const [gender, setGender] = useState("Tous");
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState("");
  const [website, setWebsite] = useState(company?.website || "");
  const [whatsapp, setWhatsapp] = useState("");
  const [budget, setBudget] = useState(5);
  const [dailyBudget, setDailyBudget] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [published, setPublished] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const schedule = getCampaignSchedule(budget, dailyBudget);
  const reachPct = Math.min(96, 20 + budget * 1.6);
  const estViews = `${Math.round(budget * 500)} – ${Math.round(budget * 850)}`;
  const next = () => {
    if (step === 0 && !objective) { setError("Sélectionnez un objectif pour continuer."); return; }
    if (step === 1 && !location) { setError("Sélectionnez une zone pour votre audience."); return; }
    if (step === 2 && (!Number.isFinite(dailyBudget) || dailyBudget < 1 || dailyBudget > budget)) { setError("Le budget quotidien doit être compris entre 1 et le budget total."); return; }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  useEffect(() => {
    if (!company?.id) return;
    fetch("/api/company/campaigns", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : {})
      .then((data) => data.currency && setCurrency(String(data.currency).toUpperCase()))
      .catch(() => {});
  }, [company?.id]);

  const readMedia = (file) => {
    if (!file || !["image/", "video/"].some((prefix) => file.type.startsWith(prefix))) return;
    if (file.size > 10 * 1024 * 1024) { setError("Le fichier doit peser moins de 10 Mo."); return; }
    const reader = new FileReader();
    reader.onload = () => { setMedia({ url: reader.result, type: file.type.startsWith("video/") ? "video" : "image", name: file.name }); setContentType(file.type.startsWith("video/") ? "video" : "image"); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="company-sponsor-modal-overlay fixed left-0 right-0 bottom-0 z-50 flex items-start justify-center overflow-y-auto p-0 pt-0 sm:items-center sm:p-5" style={{ top: "var(--lynora-header-offset, 0px)", background: "rgba(19,28,51,0.62)", backdropFilter: "blur(5px)" }}>
      <div role="dialog" aria-modal="true" className="company-sponsor-modal my-0 sm:my-auto w-screen h-dvh sm:h-auto sm:w-full max-w-none sm:max-w-2xl rounded-none sm:rounded-[24px] overflow-hidden flex flex-col max-h-none sm:max-h-[calc(100dvh-var(--lynora-header-offset,0px)-40px)]" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 24px 64px rgba(19,28,51,0.3)", animation: "modalPop .28s cubic-bezier(.22,1,.36,1)" }}>
        <div className="sticky top-0 z-10 shrink-0 px-4 sm:px-7 pt-5 pb-5 flex items-start justify-between gap-3" style={{ background: `linear-gradient(135deg, ${C.blueDeep}, ${C.blue})`, borderBottom: `1px solid ${C.blueDeep}` }}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,166,35,0.18)", color: "#FFD77A" }}><Megaphone size={19} /></div>
            <div><div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#FFD77A" }}>Espace entreprise · Publicité</div><h2 className="text-xl font-bold mt-1" style={{ color: "#fff" }}>{published ? "Campagne programmée" : "Créer une campagne"}</h2><p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.72)" }}>Configurez votre diffusion en quelques étapes.</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors" style={{ color: "#fff" }}><X size={18} /></button>
        </div>
        {!published && (
          <div className="shrink-0 px-4 sm:px-7 pt-4 pb-1 grid grid-cols-4 gap-2" style={{ background: C.blueSoft }}>
            {STEPS.map((label, i) => (
              <button type="button" key={label} onClick={() => i < step && setStep(i)} className="flex flex-col items-center gap-1.5 pb-3" style={{ cursor: i < step ? "pointer" : "default" }}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: i <= step ? C.blueDeep : C.card, color: i <= step ? "#fff" : C.inkFaint, border: `1px solid ${i <= step ? C.blueDeep : C.border}`, boxShadow: i === step ? `0 0 0 3px ${C.gold}33` : "none" }}>{i + 1}</span>
                <span className="text-[10px] sm:text-xs font-semibold truncate max-w-full" style={{ color: i <= step ? C.blueDeep : C.inkFaint }}>{label}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 min-h-0 px-4 sm:px-6 py-5 overflow-y-auto">
          {published || paymentPending ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: paymentPending ? C.goldSoft : C.greenSoft }}><Check size={26} style={{ color: paymentPending ? C.goldDeep : C.green }} /></div>
              <p className="font-semibold" style={{ color: C.ink }}>{paymentPending ? "Paiement en attente de confirmation" : "Votre publicité est en cours de diffusion"}</p>
              <p className="text-sm max-w-sm" style={{ color: C.inkFaint }}>{paymentPending ? "Votre campagne sera activée dès que le paiement Mobile Money sera confirmé." : `Objectif « ${OBJECTIVES.find((o) => o.id === objective)?.label} » · ${budget} € / jour · audience ${age[0]}–${age[1]} ans, ${gender.toLowerCase()}.`}</p>
            </div>
          ) : (
            <>
              {step === 0 && (
                <div>
                  <Field label="Titre de la campagne"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Offre de rentrée" className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-4" style={inputStyle} /></Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 mb-5">
                    <Field label="Format de diffusion"><select value={format} onChange={(event) => setFormat(event.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}><option value="post">Post sponsorisé</option><option value="sidebar">Bannière sidebar</option><option value="story">Story / vidéo</option></select></Field>
                    <Field label="Contenu"><select value={contentType} onChange={(event) => setContentType(event.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}><option value="text">Texte sponsorisé</option><option value="image">Image</option><option value="video">Vidéo</option></select></Field>
                  </div>
                  <Field label={`Texte publicitaire (${description.length}/280)`}>
                    <textarea required value={description} maxLength={280} onChange={(event) => setDescription(event.target.value)} placeholder="Présentez votre offre en quelques mots..." className="w-full min-h-24 px-3 py-2 rounded-lg text-sm outline-none resize-y" style={inputStyle} />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 mb-5">
                    <Field label="Bouton d'action"><select value={cta} onChange={(event) => setCta(event.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}><option>En savoir plus</option><option>Acheter</option><option>Visiter</option></select></Field>
                    <Field label="Visuel (image ou vidéo)">
                      <label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); readMedia(event.dataTransfer.files[0]); }} className="flex items-center gap-2 min-h-10 px-3 rounded-lg text-xs cursor-pointer" style={{ ...inputStyle, borderStyle: "dashed" }}><UploadCloud size={15} /> {media ? media.name : "Glissez-déposez ou choisissez un fichier"}<input type="file" accept="image/*,video/*" className="sr-only" onChange={(event) => readMedia(event.target.files[0])} /></label>
                    </Field>
                  </div>
                  {media && (
                    <div className="mb-5 rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: C.surface }}>
                      <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
                        <span className="text-xs font-semibold" style={{ color: C.ink }}>Aperçu de la bannière</span>
                        <button type="button" onClick={() => setMedia(null)} className="text-xs font-semibold hover:underline" style={{ color: C.red }}>Retirer</button>
                      </div>
                      <div className="relative aspect-[16/6] min-h-[120px] max-h-52 overflow-hidden" style={{ background: C.blueDeep }}>
                        {media.type === "video" ? <video src={media.url} controls className="w-full h-full object-cover" /> : <img src={media.url} alt="Aperçu de la bannière publicitaire" className="w-full h-full object-cover" />}
                        <div className="absolute inset-x-0 bottom-0 px-3 py-2 pointer-events-none" style={{ background: "linear-gradient(transparent, rgba(19,28,51,0.78))" }}>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FFD77A" }}>Sponsorisé</span>
                          <p className="text-sm font-semibold truncate" style={{ color: "#fff" }}>{title || "Titre de votre campagne"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    <Field label="Lien externe">
                      <div className="flex items-center gap-2">
                        <Globe size={15} style={{ color: C.inkFaint }} />
                        <input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://votre-site.com" className="min-w-0 flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                      </div>
                    </Field>
                    <Field label="WhatsApp (indicatif pays inclus)">
                      <div className="flex items-center gap-2">
                        <MessageCircle size={15} style={{ color: "#25D366" }} />
                        <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="+261 34 00 000 00" className="min-w-0 flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                      </div>
                    </Field>
                  </div>
                  <h3 className="text-base font-semibold mb-1" style={{ color: C.ink }}>Objectif de la campagne</h3>
                  <p className="text-sm mb-4" style={{ color: C.inkFaint }}>Quel est votre objectif principal ?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {OBJECTIVES.map((o) => {
                      const active = objective === o.id;
                      return (
                        <button key={o.id} onClick={() => setObjective(o.id)} className="rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-colors hover:border-blue-300" style={{ border: `1.5px solid ${active ? C.blueDeep : C.border}`, background: active ? C.blueSoft : C.surface }}>
                          <o.icon size={22} style={{ color: active ? C.blueDeep : C.inkSoft }} />
                          <span className="text-sm font-semibold" style={{ color: C.ink }}>{o.label}</span>
                          <span className="text-xs" style={{ color: C.inkFaint }}>{o.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-base font-semibold" style={{ color: C.ink }}>Audience</h3>
                  <Field label="Pays ou région"><select value={location} onChange={(event) => setLocation(event.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}><option value="">Sélectionnez une zone</option><option value="Madagascar">Madagascar</option><option value="France">France</option><option value="Canada">Canada</option><option value="Belgique">Belgique</option><option value="Afrique francophone">Afrique francophone</option><option value="Monde">Monde</option></select></Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={`Âge : ${age[0]} – ${age[1]} ans`}>
                      <div className="flex items-center gap-2"><input aria-label="Âge minimum" type="number" min="13" max={age[1]} value={age[0]} onChange={(e) => setAge([Math.min(Number(e.target.value), age[1]), age[1]])} className="w-20 px-2 py-2 rounded-lg text-sm outline-none" style={inputStyle} /><span>à</span><input aria-label="Âge maximum" type="number" min={age[0]} max="65" value={age[1]} onChange={(e) => setAge([age[0], Math.max(Number(e.target.value), age[0])])} className="w-20 px-2 py-2 rounded-lg text-sm outline-none" style={inputStyle} /></div>
                      <input type="range" min="13" max="65" value={age[1]} onChange={(e) => setAge([age[0], Number(e.target.value)])} className="w-full mt-2" style={{ accentColor: C.blueDeep }} />
                    </Field>
                    <Field label="Genre">
                      <div className="flex gap-2">
                        {["Tous", "Homme", "Femme"].map((g) => (
                          <button key={g} onClick={() => setGender(g)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: gender === g ? C.blueDeep : C.surface, color: gender === g ? "#fff" : C.inkSoft, border: `1px solid ${C.border}` }}>{g}</button>
                        ))}
                      </div>
                    </Field>
                  </div>
                  <Field label="Centres d'intérêt"><div className="flex flex-wrap gap-2">{["Entrepreneuriat", "Technologie", "Mode", "Finance", "Voyage", "Formation"].map((interest) => { const active = interests.split(",").map((item) => item.trim()).includes(interest); return <button type="button" key={interest} onClick={() => setInterests(active ? interests.split(",").filter((item) => item.trim() !== interest).join(", ") : [interests, interest].filter(Boolean).join(", "))} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: active ? C.blueDeep : C.surface, color: active ? "#fff" : C.inkSoft, border: `1px solid ${active ? C.blueDeep : C.border}` }}>{interest}</button>; })}</div></Field>
                  <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: C.surface }}>
                    <ReachDial pct={reachPct} />
                    <p className="text-sm" style={{ color: C.inkSoft }}>Portée estimée : <span className="font-semibold" style={{ color: C.ink }}>{Math.round(budget * 120)} – {Math.round(budget * 260)} personnes</span> selon votre audience.</p>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="flex flex-col gap-5">
                  <h3 className="text-base font-semibold" style={{ color: C.ink }}>Budget, durée & paiement</h3>
                  <Field label="Budget total de la campagne">
                    <div className="flex items-center gap-2"><input type="number" min="5" max="10000" value={budget} onChange={(e) => { const nextBudget = Number(e.target.value); setBudget(nextBudget); setDailyBudget((current) => Math.min(current, nextBudget || 1)); }} className="w-32 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} /><span className="text-sm font-semibold" style={{ color: C.ink }}>{currency}</span></div>
                    <span className="text-xs mt-1" style={{ color: C.inkFaint }}>Montant maximum facturé pour toute la campagne.</span>
                  </Field>
                  <Field label="Budget quotidien souhaité">
                    <div className="flex items-center gap-2"><input type="number" min="1" max={Math.max(1, budget)} step="0.01" value={dailyBudget} onChange={(e) => setDailyBudget(Math.min(Number(e.target.value), budget || 1))} className="w-32 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} /><span className="text-sm font-semibold" style={{ color: C.ink }}>{currency} / jour</span></div>
                    <span className="text-xs mt-1" style={{ color: C.inkFaint }}>La durée s’adapte automatiquement à ce montant.</span>
                  </Field>
                  <Field label="Devise configurée"><select value={currency} disabled className="w-full px-3 py-2 rounded-lg text-sm outline-none opacity-80" style={inputStyle}><option value={currency}>{currency}</option></select></Field>
                  <Field label="Moyen de paiement"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}><option value="stripe">Carte bancaire / Stripe</option><option value="paypal">PayPal</option><option value="mobile_money">Mobile Money</option></select></Field>
                  <div className="rounded-xl p-4" style={{ background: C.blueSoft, border: `1px solid ${C.border}` }}>
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.ink }}><CalendarDays size={16} style={{ color: C.blue }} /> Période définie automatiquement</div>
                    <p className="text-xs mt-2" style={{ color: C.inkFaint }}>{budget} {currency} au total à raison de {dailyBudget} {currency} par jour, soit {schedule.durationDays} jour{schedule.durationDays > 1 ? "s" : ""} de diffusion.</p>
                    <p className="text-sm mt-1 font-semibold" style={{ color: C.blueDeep }}>{schedule.startDate} → {schedule.endDate}</p>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-base font-semibold" style={{ color: C.ink }}>Aperçu de la campagne</h3>
                  <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: C.surface }}>
                    <ReachDial pct={reachPct} />
                    <div className="text-sm" style={{ color: C.inkSoft }}>
                      <p><span className="font-semibold" style={{ color: C.ink }}>Campagne : </span>{title || "Sans titre"}</p>
                      <p><span className="font-semibold" style={{ color: C.ink }}>Objectif : </span>{OBJECTIVES.find((o) => o.id === objective)?.label}</p>
                      <p><span className="font-semibold" style={{ color: C.ink }}>Audience : </span>{age[0]}–{age[1]} ans, {gender}</p>
                      <p><span className="font-semibold" style={{ color: C.ink }}>Budget : </span>{budget} {currency} au total · {dailyBudget} {currency}/jour · {paymentMethod}</p>
                    </div>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                    {media?.type === "image" && <img src={media.url} alt="Aperçu de la publicité" className="w-full max-h-48 object-cover" />}
                    {media?.type === "video" && <video src={media.url} controls className="w-full max-h-48 object-cover" />}
                    <div className="p-4"><div className="text-[11px] font-bold" style={{ color: C.goldDeep }}>Sponsorisé</div><div className="font-semibold mt-1" style={{ color: C.ink }}>{title || "Votre campagne"}</div><p className="text-sm mt-1" style={{ color: C.inkSoft }}>{description || "Votre texte publicitaire apparaîtra ici."}</p><span className="inline-flex mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: C.blueDeep }}>{cta}</span></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="z-10 shrink-0 mx-3 mb-3 rounded-xl border px-3 sm:mx-0 sm:mb-0 sm:rounded-none sm:border-0 sm:px-6 py-3 flex items-center justify-between gap-3" style={{ borderColor: C.border, borderTop: `1px solid ${C.border}`, background: "rgba(243,245,249,0.7)" }}>
          {published || paymentPending ? (
            <button type="button" onClick={onClose} className="ml-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ background: C.blueDeep }}>Fermer</button>
          ) : (
            <>
              <button type="button" onClick={prev} disabled={step === 0} className="flex items-center gap-1.5 min-h-11 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ color: step === 0 ? C.inkFaint : C.inkSoft, opacity: step === 0 ? 0.5 : 1 }}><ChevronLeft size={16} /> Précédent</button>
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={next} className="flex items-center gap-1.5 min-h-11 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ background: C.blueDeep }}>Suivant <ChevronRight size={16} /></button>
              ) : (
                <button type="button" disabled={saving} onClick={async () => {
                  setSaving(true);
                  setError("");
                  try {
                    if (!title.trim() || !description.trim()) throw new Error("Ajoutez un titre et une description à la campagne.");
                    if (!location) throw new Error("Sélectionnez une zone pour votre audience.");
                    const postResponse = await fetch("/api/posts", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ text: description, media: media ? [media] : [], companyPageId: company?.id, isSponsored: true, visibility: "public" }),
                    });
                    const postData = await postResponse.json().catch(() => ({}));
                    if (!postResponse.ok) throw new Error(postData?.error || "Impossible de créer le contenu publicitaire.");
                    const response = await fetch("/api/company/campaigns", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ pageId: company?.id, postId: postData.post.id, title, description, cta, objective, website, whatsapp, ageMin: age[0], ageMax: age[1], gender, location, interests, budget, dailyBudget, budgetMode: "total", currency, format, contentType, paymentMethod }),
                    });
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) throw new Error(data?.error || "Impossible d'enregistrer la campagne.");
                    if (["stripe", "paypal", "mobile_money"].includes(paymentMethod)) {
                      const checkoutResponse = await fetch("/api/company/campaigns/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: data.campaign.id }) });
                      const checkout = await checkoutResponse.json().catch(() => ({}));
                      if (!checkoutResponse.ok) throw new Error(checkout?.error || "Impossible d'ouvrir le paiement.");
                      if (checkout.pending) { setPaymentPending(true); return; }
                      if (checkout.url) { window.location.href = checkout.url; return; }
                    }
                      window.dispatchEvent(new CustomEvent("lynoralink:ads-updated"));
                    setPublished(true);
                  } catch (requestError) {
                    setError(requestError.message);
                  } finally {
                    setSaving(false);
                  }
                }} className="flex items-center gap-1.5 min-h-11 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60" style={{ background: C.gold, color: C.blueDeep }}><Wand2 size={16} /> {saving ? "Enregistrement..." : "Publier la publicité"}</button>
              )}
            </>
          )}
        </div>
        {error && <p className="px-4 pb-3 text-xs text-right" style={{ color: C.red }}>{error}</p>}
      </div>
      <style>{`@media (max-width: 640px) { .company-sponsor-modal-overlay { top: var(--lynora-header-offset, 0px) !important; right: 0 !important; bottom: 0 !important; left: 0 !important; padding: 0 !important; align-items: flex-start !important; } .company-sponsor-modal { width: 100vw !important; max-width: none !important; height: calc(100dvh - var(--lynora-header-offset, 0px)) !important; max-height: calc(100dvh - var(--lynora-header-offset, 0px)) !important; min-height: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; } .company-sponsor-modal > div:nth-child(3) { overflow-y: auto; min-height: 0; } }`}</style>
    </div>
  );
}

/* ---------------------------------------------------------------
   Company detail page — REDESIGNED with hero banner, stats grid,
   media gallery, right sidebar (community + events)
----------------------------------------------------------------*/
export function CompanyPage({ company, onBack, onDeleted, isOwner = false, canCreatePost = false, onSwitchAccount, onUpdateCompany, onOpenComposer, onOpenProfile, onToggleFollow, onMessage, onToggleLike, onSelectReaction, onToggleBookmark, onAddComment, onReplyComment, onToggleCommentLike, onShare, onFollowPage, followedPageIds = [], isCompanyAccount = false, headerOffset = 0 }) {
  const [tab, setTab] = useState("publications");
  const [posts, setPosts] = useState([]);
  const [openPost, setOpenPost] = useState(null);
  const [postsLoading, setPostsLoading] = useState(Boolean(company?.id));
  const [postsError, setPostsError] = useState("");
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const [companyInviteOpen, setCompanyInviteOpen] = useState(false);
  const [uploadKind, setUploadKind] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(company?.avatarUrl || company?.logoUrl || company?.image || null);
  const [coverUrl, setCoverUrl] = useState(company?.coverUrl || company?.bannerUrl || company?.cover || null);
  const [coverHover, setCoverHover] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);
  const [followed, setFollowed] = useState(
    Boolean(company?.followed || followedPageIds.some((pageId) => String(pageId) === String(company?.id)))
  );
  const [followLoading, setFollowLoading] = useState(false);
  const [followError, setFollowError] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showCommunityMembers, setShowCommunityMembers] = useState(true);
  const [communityMenuOpen, setCommunityMenuOpen] = useState(false);
  const [pageAccountActive, setPageAccountActive] = useState(false);
  const [isPageScrolled, setIsPageScrolled] = useState(false);
  const [jobs, setJobs] = useState(Array.isArray(company?.jobs) ? company.jobs : []);
  const [stickyTop, setStickyTop] = useState(Number(headerOffset) || 0);
  const pageScrollRef = useRef(null);
  const viewingAsPage = isOwner && canCreatePost;

  useEffect(() => { setJobs(Array.isArray(company?.jobs) ? company.jobs : []); }, [company?.jobs]);

  const createJob = async (job) => {
    const nextJobs = [{ ...job, id: `job-${Date.now()}`, createdAt: new Date().toISOString() }, ...jobs];
    const response = await fetch("/api/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobs: nextJobs }) });
    const updated = await response.json();
    if (!response.ok) throw new Error(updated.error || "Impossible de publier l'annonce.");
    setJobs(nextJobs);
    onUpdateCompany?.(updated);
  };

  const updateJob = async (jobId, changes) => {
    const nextJobs = jobs.map((job) => job.id === jobId ? { ...job, ...changes } : job);
    const response = await fetch("/api/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobs: nextJobs }) });
    const updated = await response.json();
    if (!response.ok) throw new Error(updated.error || "Impossible de modifier l'annonce.");
    setJobs(nextJobs);
    onUpdateCompany?.(updated);
  };

  useEffect(() => {
    pageScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    if (!company?.id || viewingAsPage) return undefined;
    let mounted = true;
    fetch(`/api/company/follow?pageId=${encodeURIComponent(company.id)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (mounted && data) setFollowed(Boolean(data.followed));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [company?.id, viewingAsPage]);

  const handleToggleFollow = async () => {
    if (followLoading || !company?.id) return;
    
    setFollowLoading(true);
    setFollowError("");
    
    try {
      const response = await fetch("/api/company/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: company?.id }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Erreur ${response.status}`);
      }
      
      const data = await response.json();
      setFollowed(Boolean(data.followed));
      onToggleFollow?.(company, Boolean(data.followed));
    } catch (error) {
      console.error("Erreur lors du suivi de la page:", error);
      setFollowError(error.message || "Impossible de suivre cette page");
      // Réinitialiser l'erreur après 3 secondes
      setTimeout(() => setFollowError(""), 3000);
    } finally {
      setFollowLoading(false);
    }
  };

  useEffect(() => {
    if (!company?.id) return undefined;
    let mounted = true;
    const loadPagePosts = async () => {
      setPostsLoading(true);
      setPostsError("");
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(`/api/posts?companyPageId=${encodeURIComponent(company.id)}&limit=50`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Impossible de charger les publications.");
        const data = response.ok ? await response.json() : { posts: [] };
        if (mounted) {
          const pagePosts = Array.isArray(data.posts)
            ? data.posts.filter((post) => String(post.companyPageId) === String(company.id))
            : [];
          setPosts(pagePosts);
        }
      } catch (error) {
        if (mounted) {
          setPosts([]);
          setPostsError(error?.name === "AbortError" ? "Le chargement des publications a expiré." : "Impossible de charger les publications.");
        }
      } finally {
        window.clearTimeout(timeout);
        if (mounted) setPostsLoading(false);
      }
    };
    loadPagePosts();
    const refresh = () => loadPagePosts();
    window.addEventListener("lynoralink:company-posts-updated", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("lynoralink:company-posts-updated", refresh);
    };
  }, [company?.id]);

  useEffect(() => {
    const topnav = document.querySelector("header");
    if (!topnav) return;

    const measureTopnav = () => {
      const measuredBottom = Math.round(topnav.getBoundingClientRect().bottom);
      setStickyTop(Math.max(measuredBottom, Number(headerOffset) || 0));
    };
    measureTopnav();
    const observer = new ResizeObserver(measureTopnav);
    observer.observe(topnav);
    window.addEventListener("resize", measureTopnav);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureTopnav);
    };
  }, [headerOffset]);

  useEffect(() => {
    const scrollElement = pageScrollRef.current;
    if (!scrollElement) return undefined;
    const handleScroll = () => setIsPageScrolled(scrollElement.scrollTop > 180);
    handleScroll();
    scrollElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, []);

  const companyName = company?.displayName || company?.name || "Mon entreprise";
  const companySlogan = company?.slogan || company?.tagline || company?.title || "Présentez votre entreprise sur LynoraLink";
  const companyIndustry = company?.industry || company?.categoryLabel || company?.tag || "Entreprise";
  const companySize = company?.size || (company?.followers ? `${company.followers} abonnés` : "11-50 employés");
  const companyLocation = company?.location || "Antananarivo";
  const companyWebsite = company?.website || null;
  const communityMembers = Array.isArray(company?.community?.members) && company.community.members.length > 0
    ? company.community.members
    : (Array.isArray(company?.subscribers) ? company.subscribers : []);
  const communityCount = company?.community?.count ?? company?.stats?.followers ?? company?.followers ?? 0;
  const onlineCount = company?.community?.online ?? 0;
  const weeklyGrowth = company?.community?.weeklyGrowth ?? 0;
  const postMedia = posts.flatMap((post) => {
    if (!post.media) return [];
    return (Array.isArray(post.media) ? post.media : [post.media]).map((item) => ({ ...item, post }));
  }).filter((item) => item?.url);
  const pageMedia = [
    ...(Array.isArray(company?.media) ? company.media : []),
    ...postMedia,
  ].filter((item, index, media) => (
    media.findIndex((candidate) => candidate.url === item.url) === index
  ));

  const switchToPageAccount = () => {
    if (!isOwner) return;

    const nextAccount = {
      id: company?.id || company?.ownerId || "company-page",
      name: companyName,
      handle: company?.handle || `@${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      image: avatarUrl || null,
      cover: coverUrl || null,
      type: "company",
    };

    setPageAccountActive(true);
    onSwitchAccount?.(nextAccount);
    try {
      localStorage.setItem("activeAccount", JSON.stringify(nextAccount));
      localStorage.setItem("lynoralink:activeAccount", "company");
      window.dispatchEvent(new CustomEvent("lynora:account-switch", { detail: nextAccount }));
    } catch {
      // Ignore storage restrictions; the in-page state still updates.
    }
  };

  const tabs = [
    { id: "publications", label: "Publications" },
    { id: "jobs", label: "Offres d\'emploi" },
    { id: "about", label: "À propos" },
    ...(isOwner ? [{ id: "advertising", label: "Publicité" }] : []),
    ...(isOwner ? [{ id: "admin", label: "Administration" }] : []),
  ];

  const applyUpload = (dataUrl) => {
    if (uploadKind === "avatar") setAvatarUrl(dataUrl);
    if (uploadKind === "cover") setCoverUrl(dataUrl);
    const patch = uploadKind === "avatar" ? { logoUrl: dataUrl, avatarUrl: dataUrl } : { bannerUrl: dataUrl, coverUrl: dataUrl };
    fetch("/api/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) })
      .then((response) => response.ok ? response.json() : null)
      .then((updated) => updated && onUpdateCompany?.(updated))
      .catch(() => {});
    setUploadKind(null);
  };

  const setMediaAsCompanyImage = async (mediaUrl, kind) => {
    if (!mediaUrl || !["avatar", "cover"].includes(kind)) return;
    const patch = kind === "avatar" ? { logoUrl: mediaUrl, avatarUrl: mediaUrl } : { bannerUrl: mediaUrl, coverUrl: mediaUrl };
    const response = await fetch("/api/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const updated = await response.json().catch(() => ({}));
    if (!response.ok) return;
    if (kind === "avatar") setAvatarUrl(mediaUrl);
    else setCoverUrl(mediaUrl);
    onUpdateCompany?.(updated);
  };

  const deleteMedia = async (media, index) => {
    if (!media?.url) return;
    if (media.post?.id) {
      const response = await fetch(`/api/posts/${encodeURIComponent(media.post.id)}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mediaUrl: media.url }) });
      if (!response.ok) return;
      setPosts((current) => current.map((post) => post.id === media.post.id ? { ...post, media: (Array.isArray(post.media) ? post.media : []).filter((item) => item?.url !== media.url), mediaUrl: post.mediaUrl === media.url ? null : post.mediaUrl } : post));
    } else {
      const nextMedia = (Array.isArray(company?.media) ? company.media : []).filter((item) => item?.url !== media.url);
      const response = await fetch("/api/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ media: nextMedia }) });
      const updated = await response.json().catch(() => ({}));
      if (!response.ok) return;
      onUpdateCompany?.(updated);
    }
    if (pageMedia.length > 1) setGalleryIndex((index >= pageMedia.length - 1 ? index - 1 : index));
    else setGalleryOpen(false);
  };

  return (
    <div ref={pageScrollRef} className="company-page min-h-full w-full" style={{ height: "calc(100dvh - var(--lynora-header-offset, 0px))", overflowY: "auto", overflowX: "hidden", overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch", background: C.surface, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div
        style={{
          position: "fixed", top: "var(--lynora-header-offset, 0px)", left: 0, right: 0, zIndex: 50,
          display: "flex", alignItems: "center", gap: 10, minHeight: 58, padding: "8px 24px",
          background: "rgba(255,255,255,0.96)", borderBottom: `1px solid ${C.border}`,
          boxShadow: "0 5px 18px rgba(15,51,82,0.12)", backdropFilter: "blur(12px)",
          opacity: isPageScrolled ? 1 : 0,
          transform: isPageScrolled ? "translateY(0)" : "translateY(-100%)",
          pointerEvents: isPageScrolled ? "auto" : "none",
          transition: "opacity 180ms ease, transform 220ms ease",
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", display: "grid", placeItems: "center", flexShrink: 0, background: C.blueDeep, color: C.card, fontWeight: 800, fontSize: 13 }}>
          {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : companyName.split(" ").map((word) => word[0]).slice(0, 2).join("")}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{companyName}</div>
          <div style={{ fontSize: 11.5, color: C.inkFaint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{companySlogan}</div>
        </div>
      </div>
      <div className="company-detail-shell w-full max-w-[1400px] mx-auto px-4 sm:px-6 pb-16">
        {/* Back button */}
        <button
          type="button"
          aria-label="Retourner à la grille des pages entreprise"
          title="Retour à la grille"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onBack?.();
          }}
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-all hover:-translate-x-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            color: C.blueDeep,
            background: C.card,
            border: `1px solid ${C.border}`,
            boxShadow: "0 4px 12px rgba(19,28,51,0.06)",
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.25} /> Retour aux pages
        </button>

        {/* Hero banner — taller, more impactful with glassmorphism overlay */}
        <div
          onMouseEnter={() => setCoverHover(true)}
          onMouseLeave={() => setCoverHover(false)}
          className="company-page-hero relative mt-3 h-[145px] sm:h-[200px] rounded-2xl overflow-hidden"
          style={{
            background: coverUrl
              ? `center / cover no-repeat url(${coverUrl})`
              : `linear-gradient(135deg, ${C.blueDeep} 0%, ${C.blue} 50%, ${C.gold} 150%)`,
          }}
        >
          {/* Decorative particles / circles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
            <div className="absolute top-8 right-1/3 w-20 h-20 rounded-full" style={{ background: "rgba(245,166,35,0.15)" }} />
            <div className="absolute bottom-4 left-1/4 w-12 h-12 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
          {/* Radial light effect */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15), transparent 55%)" }} />
          {isOwner && (
            <div className="absolute inset-0 flex items-end justify-end p-4 transition-opacity" style={{ opacity: coverHover ? 1 : 0 }}>
              <button
                onClick={() => setUploadKind("cover")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold backdrop-blur-sm transition-transform hover:scale-105"
                style={{ background: "rgba(255,255,255,0.92)", color: C.ink, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
              >
                <Camera size={14} /> Changer la couverture
              </button>
            </div>
          )}
        </div>
        {/* Identity row — avatar overlaps banner + content */}
        <div className="company-page-identity flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-1 -mt-9 sm:-mt-10">
          <div className="flex items-end gap-3 sm:gap-4 min-w-0">
            <div
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
              className="relative w-[100px] h-[100px] sm:w-[152px] sm:h-[152px] rounded-full shrink-0"
              style={{ border: `4px solid ${C.card}`, borderRadius: "50%", overflow: "visible", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
            >
              <div
                className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                style={{ background: avatarUrl ? undefined : "#E5E7EB", borderRadius: "50%", color: "#6B7280" }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Logo de l'entreprise" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl sm:text-4xl font-semibold">{companyName.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span>
                )}
              </div>
              {isOwner && (
                <button
                  onClick={() => setUploadKind("avatar")}
                  aria-label="Changer l\'avatar"
                  className="absolute bottom-0 left-0 sm:bottom-1 sm:left-1 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105 z-10"
                  style={{ background: C.blueMid, border: `3px solid ${C.card}`, opacity: avatarHover || typeof window === "undefined" ? 1 : 0.92, boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}
                >
                  <Camera size={15} color="#fff" />
                </button>
              )}
            </div>
            <div className="pt-6 sm:pt-5 pb-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-[22px] font-bold tracking-tight truncate" style={{ color: C.ink }}>{companyName}</h1>
                {company?.isPremium ? <PremiumBadge size={19} label="Page Premium" /> : company?.verified && <Check size={18} style={{ color: C.blueMid }} />}
              </div>
              <p className="text-xs sm:text-sm mt-0.5 line-clamp-2" style={{ color: C.inkFaint }}>{companySlogan}</p>
            </div>
          </div>
          <div className="company-page-actions flex items-center gap-2 mt-3 sm:mt-12 shrink-0">
            {viewingAsPage ? (
              <button
                type="button"
                onClick={() => setCompanyInviteOpen(true)}
                className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold"
                style={{ border: `1px solid ${C.border}`, background: C.card, color: C.inkSoft }}
              >
                <UserRoundPlus size={15} /> Inviter
              </button>
            ) : isOwner ? (
              <button
                type="button"
                onClick={switchToPageAccount}
                className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all"
                style={{ border: `1px solid ${C.border}`, background: C.card, color: C.inkSoft }}
              >
                <ArrowRightLeft size={15} /> Basculer
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all"
                  style={{
                    border: `1px solid ${followed ? C.border : C.inkSoft}`,
                    background: followed ? C.card : "transparent",
                    color: followLoading ? C.inkFaint : C.inkSoft,
                    opacity: followLoading ? 0.6 : 1,
                  }}
                >
                  {followLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Chargement...
                    </>
                  ) : (
                    <>
                      {followed ? <Check size={15} /> : <UserRoundPlus size={15} />} {followed ? "Suivi" : "Suivre"}
                    </>
                  )}
                </button>
                {followError && (
                  <div className="text-xs font-medium" style={{ color: C.red }}>
                    {followError}
                  </div>
                )}
              </>
            )}
            {!viewingAsPage && (
              <button
                type="button"
                onClick={() => onMessage?.({
                  id: company?.ownerId || company?.id,
                  pageId: company?.id,
                  name: companyName,
                  title: companyIndustry,
                  image: avatarUrl,
                  avatarUrl,
                  initials: companyName.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join(""),
                })}
                className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all"
                style={{ border: `1px solid ${C.border}`, background: C.card, color: C.inkSoft }}
              >
                <MessageCircle size={15} /> Message
              </button>
            )}
            {isOwner && !viewingAsPage && (
              <>
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all"
                  style={{
                    border: `1px solid ${followed ? C.border : C.inkSoft}`,
                    background: followed ? C.card : "transparent",
                    color: followLoading ? C.inkFaint : C.inkSoft,
                    opacity: followLoading ? 0.6 : 1,
                  }}
                >
                  {followLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Chargement...
                    </>
                  ) : (
                    <>
                      {followed ? <Check size={15} /> : <UserRoundPlus size={15} />} {followed ? "Suivi" : "Suivre"}
                    </>
                  )}
                </button>
                {followError && (
                  <div className="text-xs font-medium" style={{ color: C.red }}>
                    {followError}
                  </div>
                )}
              </>
            )}
            {viewingAsPage && (
              <>
                <button
                  type="button"
                  onClick={() => setSponsorOpen(true)}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity"
                  style={{ border: `1px solid ${C.border}`, background: C.card, color: C.blueDeep }}
                >
                  <Rocket size={15} /> Campagne
                </button>
              </>
            )}
          </div>
        </div>

        {/* Metadata row with icons */}
        <div className="company-page-metadata flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1.5 px-1 mt-3 text-xs sm:text-sm" style={{ color: C.inkSoft }}>
          <span className="flex items-center gap-1.5"><Building2 size={14} style={{ color: C.inkFaint }} /> {companyIndustry}</span>
          {companySize && <span className="flex items-center gap-1.5"><Users size={14} style={{ color: C.inkFaint }} /> {companySize}</span>}
          <span className="flex items-center gap-1.5"><MapPin size={14} style={{ color: C.inkFaint }} /> {companyLocation}</span>
          {companyWebsite && (
            <a href={companyWebsite} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:underline" style={{ color: C.blueMid }}>
              <Globe size={14} /> Site web
            </a>
          )}
        </div>

        {Array.isArray(company?.subscribers) && company.subscribers.length > 0 && (
          <div className="flex items-center gap-3 px-1 mt-5" aria-label="Abonnés récents">
            <div className="flex items-center pl-1">
              {company.subscribers.slice(0, 5).map((subscriber, index) => (
                <button
                  key={subscriber.id || subscriber.userId || index}
                  type="button"
                  onClick={() => onOpenProfile?.(subscriber.id || subscriber.userId)}
                  aria-label={`Voir le profil de ${subscriber.name || "cet abonné"}`}
                  title={subscriber.name || "Voir le profil"}
                  className="group relative rounded-full transition-transform duration-150 hover:-translate-y-1 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ marginLeft: index === 0 ? 0 : -10, zIndex: 5 - index, border: `2px solid ${C.card}`, background: C.card }}
                >
                  <Avatar label={subscriber.name || subscriber.email || "Abonné"} image={subscriber.image} size={38} tone={[C.blue, C.gold, C.green, C.blueDeep, C.orange][index]} />
                  <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 max-w-24 -translate-x-1/2 truncate rounded-md px-1.5 py-1 text-[9px] font-semibold opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100" style={{ background: C.blueDeep, color: "#fff" }}>{subscriber.name || subscriber.email || "Abonné"}</span>
                </button>
              ))}
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: C.ink }}>{(company.stats?.followers ?? company.subscribers.length).toLocaleString("fr-FR")} abonnés</div>
              <div className="text-xs" style={{ color: C.inkFaint }}>Une communauté qui suit votre page</div>
            </div>
          </div>
        )}

        {/* Statistics cards row — 4-column grid */}
        <div className="company-page-stats grid grid-cols-4 gap-3 mt-5 px-1">
          <StatCard label="Chiffre d\'affaires" value={company?.stats?.revenue || "-"} icon={TrendingUp} tone={C.blue} />
          <StatCard label="Année de création" value={company?.createdAt ? new Date(company.createdAt).getFullYear() : "-"} icon={CalendarDays} tone={C.green} />
          <StatCard label="Suivis" value={company?.stats?.followers ?? 0} icon={Users} tone={C.goldDeep} />
          <StatCard label="Recrutements" value={company?.stats?.jobs ?? 0} icon={Briefcase} tone={C.orange} />
        </div>

        {/* Tabs + Content with sidebar layout */}
        <div className="company-page-tabs flex gap-1 mt-5 px-1 overflow-x-auto" style={{ borderBottom: `1px solid ${C.border}` }}>
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold relative hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
                style={{ color: active ? C.blueMid : C.inkFaint }}
              >
                {t.label}
                {active && <span className="absolute left-0 right-0 -bottom-px h-[2.5px] rounded-full" style={{ background: C.blueMid }} />}
              </button>
            );
          })}
          {tab !== "admin" && (
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Ouvrir la sidebar"
              className="lg:hidden ml-auto mb-1 shrink-0 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: C.blueSoft, color: C.blueDeep, border: `1px solid ${C.border}` }}
            >
              <Menu size={15} />
            </button>
          )}
        </div>

        {/* Two-column layout: main + sidebar (except for admin) */}
        {tab === "advertising" ? (
          <div className="mt-5 px-1">
            <CampaignDashboard onOpenSponsor={() => setSponsorOpen(true)} company={company} />
          </div>
        ) : tab === "admin" ? (
          <div className="mt-5 px-1">
            <AdministrationTab onOpenSponsor={() => setSponsorOpen(true)} onUpdateCompany={onUpdateCompany} onDeleted={onDeleted} onOpenProfile={onOpenProfile} company={{ ...company, posts, stats: { ...(company?.stats || {}), posts: posts.length } }} />
          </div>
        ) : (
          <div className="company-page-content mt-5 px-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
            <div className="min-w-0">
              {tab === "publications" && <PublicationsTab company={company} posts={posts} loading={postsLoading} error={postsError} onRetry={() => { setPostsError(""); window.dispatchEvent(new Event("lynoralink:company-posts-updated")); }} canCreatePost={canCreatePost} onOpenComposer={onOpenComposer} currentUser={{ id: company?.id, name: companyName, initials: companyName.split(" ").map((word) => word[0]).slice(0, 2).join(""), avatarUrl }} onToggleLike={onToggleLike} onSelectReaction={onSelectReaction} onToggleBookmark={onToggleBookmark} onAddComment={onAddComment} onReplyComment={onReplyComment} onToggleCommentLike={onToggleCommentLike} onShare={onShare} onOpenPost={setOpenPost} onOpenArticle={setOpenPost} onFollowPage={onFollowPage} followedPageIds={followedPageIds} isCompanyAccount={isCompanyAccount} />}
              {tab === "jobs" && <JobsTab jobs={jobs} canManage={isOwner} onCreateJob={createJob} onUpdateJob={updateJob} onJobAction={(job) => onMessage?.({ id: company?.ownerId || company?.id, pageId: company?.id, name: companyName, title: job.title, image: avatarUrl, avatarUrl, initials: companyName.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") })} />}
              {tab === "about" && <AboutTab company={company} />}
            </div>

            {/* Right sidebar — Community + Events */}
            <aside
              role={mobileSidebarOpen ? "dialog" : undefined}
              aria-modal={mobileSidebarOpen ? "true" : undefined}
              aria-labelledby={mobileSidebarOpen ? "company-sidebar-title" : undefined}
              className={`${mobileSidebarOpen ? "fixed flex" : "hidden"} company-page-right-sidebar lg:flex lg:sticky lg:bottom-4 flex-col gap-4 self-end z-[1200] lg:z-auto w-screen max-w-none lg:w-auto h-dvh lg:h-auto overflow-visible bg-white lg:bg-transparent shadow-2xl lg:shadow-none p-4 lg:p-0 rounded-none lg:rounded-none`}
              style={mobileSidebarOpen
                ? { top: 0, left: 0, right: 0, bottom: 0, maxHeight: "none" }
                : undefined}
            >
              <div className="flex items-center justify-between lg:hidden">
                <span id="company-sidebar-title" className="text-sm font-bold" style={{ color: C.ink }}>Informations de la page</span>
                <button type="button" onClick={() => { setMobileSidebarOpen(false); setCommunityMenuOpen(false); }} aria-label="Fermer la sidebar" className="p-1.5 rounded-lg" style={{ color: C.inkFaint }}><X size={18} /></button>
              </div>
              <MediaGalleryCard media={pageMedia} onViewGallery={(index = 0) => {
                setGalleryIndex(index);
                setGalleryOpen(true);
              }} />

              {/* Community card */}
              <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Communauté</h3>
                  <div className="relative">
                    <button type="button" onClick={() => setCommunityMenuOpen((open) => !open)} aria-label="Options de la communauté" aria-expanded={communityMenuOpen} className="p-1 rounded hover:bg-gray-100 transition-colors"><MoreHorizontal size={16} style={{ color: C.inkFaint }} /></button>
                    {communityMenuOpen && (
                      <div className="absolute right-0 top-8 z-10 min-w-44 rounded-xl border bg-white p-1 shadow-lg" style={{ borderColor: C.border }}>
                        <button type="button" onClick={() => { setShowCommunityMembers((visible) => !visible); setCommunityMenuOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-gray-50" style={{ color: C.ink }}>{showCommunityMembers ? "Masquer les membres" : "Voir les membres"}</button>
                        <button type="button" onClick={() => { setCommunityMenuOpen(false); setMobileSidebarOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-gray-50" style={{ color: C.inkFaint }}>Fermer</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  {communityMembers.length > 0 && <div className="flex -space-x-2">
                    {communityMembers.slice(0, 4).map((member, index) => (
                      <button key={member.id || member.userId || index} type="button" onClick={() => onOpenProfile?.(member.id || member.userId)} aria-label={`Voir le profil de ${member.name || "ce membre"}`} title={member.name || "Voir le profil"} className="group relative rounded-full transition-transform duration-150 hover:-translate-y-1 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
                        <Avatar label={member.name || member.email || "Membre"} image={member.image} size={32} tone={[C.blueDeep, C.gold, C.green, C.blue][index % 4]} />
                        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 max-w-24 -translate-x-1/2 truncate rounded-md px-1.5 py-1 text-[9px] font-semibold opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100" style={{ background: C.blueDeep, color: "#fff" }}>{member.name || member.email || "Membre"}</span>
                      </button>
                    ))}
                  </div>}
                  <span className="text-sm font-semibold" style={{ color: C.ink }}>{communityCount} membre{communityCount > 1 ? "s" : ""}</span>
                </div>
                <div className="flex gap-2 text-xs" style={{ color: C.inkFaint }}>
                  <span className="flex items-center gap-1"><CircleDot size={12} style={{ color: onlineCount > 0 ? C.green : C.inkFaint }} /> {onlineCount} en ligne</span>
                  <span>· +{weeklyGrowth} cette semaine</span>
                </div>
                {showCommunityMembers && (
                  <div className="mt-4 border-t pt-3" style={{ borderColor: C.border }}>
                    {communityMembers.length === 0 ? (
                      <p className="text-xs" style={{ color: C.inkFaint }}>Aucun membre pour le moment.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {communityMembers.map((member, index) => (
                          <button key={member.id || member.userId || index} type="button" onClick={() => onOpenProfile?.(member.id || member.userId)} className="flex items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-gray-50">
                            <Avatar label={member.name || member.email || "Membre"} image={member.image} size={30} tone={[C.blueDeep, C.gold, C.green, C.blue][index % 4]} />
                            <span className="text-xs font-medium" style={{ color: C.ink }}>{member.name || "Membre"}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* About card */}
              <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: C.ink }}>À propos</h3>
                  <button type="button" onClick={() => { setTab("about"); setMobileSidebarOpen(false); }} className="text-xs font-semibold hover:underline" style={{ color: C.blueMid }}>Voir plus</button>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: C.inkSoft }}>
                  {company?.description || company?.bio || companySlogan || "Cette entreprise n'a pas encore ajouté de description."}
                </p>
                <div className="flex flex-col gap-2 mt-4 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                  <span className="flex items-center gap-2 text-xs" style={{ color: C.inkSoft }}><Building2 size={14} style={{ color: C.inkFaint }} /> {companyIndustry}</span>
                  <span className="flex items-center gap-2 text-xs" style={{ color: C.inkSoft }}><MapPin size={14} style={{ color: C.inkFaint }} /> {companyLocation}</span>
                  {companyWebsite && <a href={companyWebsite} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs hover:underline" style={{ color: C.blueMid }}><Globe size={14} /> Site web</a>}
                </div>
              </div>
            </aside>
            {mobileSidebarOpen && <button type="button" aria-label="Fermer la sidebar" onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 z-[1100] bg-[#131C33]/45 lg:hidden" />}
          </div>
        )}
      </div>

      <style>{`@media (max-width: 640px) { .company-page-stats .company-stat-card { border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; padding: 8px 0 !important; } .company-page-stats .company-stat-card + .company-stat-card { border-left: 1px solid ${C.border} !important; padding-left: 8px !important; } .company-admin-layout { display: flex !important; flex-direction: column !important; gap: 12px !important; width: calc(100% + 24px) !important; margin-left: -12px !important; } .company-admin-layout > nav { display: flex !important; flex-direction: row !important; gap: 4px !important; width: 100% !important; overflow-x: auto !important; padding: 6px 12px !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; } .company-admin-layout > nav button { flex: 0 0 auto !important; white-space: nowrap !important; } .company-admin-layout > div { width: 100% !important; min-width: 0 !important; } .company-admin-layout .rounded-2xl { border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; } .company-admin-layout .rounded-2xl + .rounded-2xl { border-top: 1px solid ${C.border} !important; } .company-admin-settings-grid { grid-template-columns: minmax(0, 1fr) !important; gap: 12px !important; } .company-admin-subscriber-row { align-items: flex-start !important; gap: 10px !important; } .company-admin-subscriber-row > div:last-child { flex-shrink: 1 !important; } }`}</style>

      {sponsorOpen && <SponsorModal company={company} onClose={() => setSponsorOpen(false)} />}
      <CompanyInviteModal open={companyInviteOpen} company={company} onClose={() => setCompanyInviteOpen(false)} />
      {uploadKind && <MediaUploadModal kind={uploadKind} onClose={() => setUploadKind(null)} onApply={applyUpload} />}
      {galleryOpen && <MediaGalleryModal
        media={pageMedia}
        selectedIndex={galleryIndex}
        onSelect={setGalleryIndex}
        onOpenPost={(post) => { setGalleryOpen(false); setOpenPost(post); }}
        onDelete={deleteMedia}
        onSetAvatar={(url) => setMediaAsCompanyImage(url, "avatar")}
        onSetCover={(url) => setMediaAsCompanyImage(url, "cover")}
        onClose={() => setGalleryOpen(false)}
        onToggleLike={onToggleLike}
        onSelectReaction={onSelectReaction}
        onToggleBookmark={onToggleBookmark}
        onAddComment={onAddComment}
        onReplyComment={onReplyComment}
        onToggleCommentLike={onToggleCommentLike}
        onShare={onShare}
        currentUser={{ id: company?.id, name: companyName, initials: companyName.split(" ").map((word) => word[0]).slice(0, 2).join(""), avatarUrl }}
      />}
      {openPost && <PostViewerPreview post={openPost} currentUser={{ id: company?.id, name: companyName, initials: companyName.split(" ").map((word) => word[0]).slice(0, 2).join(""), avatarUrl }} onClose={() => setOpenPost(null)} onToggleLike={onToggleLike} onReact={onSelectReaction} onToggleBookmark={onToggleBookmark} onAddComment={onAddComment} onReplyComment={onReplyComment} onToggleCommentLike={onToggleCommentLike} onShare={onShare} onFollowPage={onFollowPage} followedPageIds={followedPageIds} isCompanyAccount={isCompanyAccount} />}
    </div>
  );
}

/* ---------------------------------------------------------------
   Company pages grid — REDESIGNED with clean header, filter tabs,
   horizontal category pills, and polished cards
----------------------------------------------------------------*/
const CATEGORIES = [
  { id: "toutes", label: "Toutes", icon: LayoutGrid },
  { id: "technologie", label: "Technologie", icon: Compass },
  { id: "education", label: "Éducation", icon: GraduationCap },
  { id: "sante", label: "Santé", icon: HeartPulse },
  { id: "commerce", label: "Commerce", icon: ShoppingBag },
  { id: "restauration", label: "Restauration", icon: UtensilsCrossed },
  { id: "creatif", label: "Créatif", icon: Palette },
  { id: "institution", label: "Institution", icon: Landmark },
];

export const PAGE_DIRECTORY = [];

/* Compact directory card matching the network suggestions pattern. */
function PageCard({ page, onOpen, followed, onFollow }) {
  const [g1, g2] = page.tone || [C.blue, C.blueDeep];
  const initials = page.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const avatarUrl = page.avatarUrl || page.logoUrl || page.image || page.photoUrl || null;
  return (
    <article className="group flex items-center gap-3 rounded-xl p-3 transition-shadow hover:shadow-md" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 4px 14px rgba(19,28,51,0.05)" }}>
      <button type="button" onClick={onOpen} aria-label={`Ouvrir la page ${page.name}`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, boxShadow: `0 4px 12px ${g1}30` }}>
          {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-white">{initials}</span>}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-bold" style={{ color: C.ink }}>{page.name}</h3>
            {page.verified && <Check size={14} style={{ color: C.blueMid, flexShrink: 0 }} />}
          </div>
          <p className="mt-0.5 truncate text-xs" style={{ color: C.inkFaint }}>{page.tag || "Page entreprise"}</p>
        </div>
      </button>
      <button type="button" onClick={(event) => { event.stopPropagation(); onFollow?.(page.id); }} className="shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: followed ? C.greenSoft : C.blueSoft, color: followed ? C.green : C.blueDeep }}>
        {followed ? <Check size={13} /> : <UserPlus size={13} />}
        {followed ? "Suivi" : "Suivre"}
      </button>
    </article>
  );
}

/* ---------------------------------------------------------------
   Create company page modal
----------------------------------------------------------------*/
const CREATE_STEPS = [
  { label: "Informations", hint: "Identité de la page" },
  { label: "Catégorie", hint: "Positionnement" },
  { label: "Médias", hint: "Image de marque" },
];

function CreateCompanyPageModal({ onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState("technologie");
  const [location, setLocation] = useState("Antananarivo");
  const [uploadKind, setUploadKind] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const [created, setCreated] = useState(false);
  const [createdPage, setCreatedPage] = useState(null);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const canNext = step === 0 ? name.trim().length > 1 : true;
  const applyUpload = (dataUrl) => {
    if (uploadKind === "avatar") setAvatarUrl(dataUrl);
    if (uploadKind === "cover") setCoverUrl(dataUrl);
    setUploadKind(null);
  };
  const next = () => setStep((s) => Math.min(s + 1, CREATE_STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));
  const catLabel = CATEGORIES.find((c) => c.id === category)?.label || category;
  const createPage = async () => {
    if (creating) return;
    setCreateError("");
    setCreating(true);
    try {
      const response = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, slogan: tagline, industry: catLabel, location, logoUrl: avatarUrl, bannerUrl: coverUrl }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Impossible de créer la page entreprise.");
      }
      setCreatedPage(data);
      setCreated(true);
    } catch (error) {
      setCreateError(error?.message || "Impossible de créer la page entreprise.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="company-create-modal-overlay fixed left-0 right-0 bottom-0 z-[1500] flex items-start justify-center overflow-y-auto p-3 pt-4 sm:items-center sm:p-5" style={{ top: "var(--lynora-header-offset, 0px)", background: "linear-gradient(135deg, rgba(29,47,92,0.78), rgba(19,28,51,0.64))", backdropFilter: "blur(6px)" }}>
      <div role="dialog" aria-modal="true" aria-labelledby="create-company-title" className="company-create-modal my-0 sm:my-auto w-[calc(100vw-24px)] sm:w-full max-w-xl rounded-2xl sm:rounded-[24px] overflow-hidden flex flex-col max-h-[calc(100dvh-var(--lynora-header-offset,0px)-32px)] sm:max-h-[calc(100dvh-var(--lynora-header-offset,0px)-40px)]" style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)", border: `1px solid rgba(255,255,255,0.82)`, boxShadow: "0 24px 64px rgba(19,28,51,0.3)", animation: "modalPop .28s cubic-bezier(.22,1,.36,1)" }}>
        <div className="px-4 sm:px-6 pt-5 pb-5 flex items-start justify-between gap-3" style={{ background: `linear-gradient(135deg, ${C.goldLight} 0%, ${C.gold} 58%, ${C.goldDeep} 100%)`, borderBottom: `1px solid ${C.goldDeep}` }}>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.blueDeep }}><Building2 size={14} /> Présence professionnelle</div>
            <h2 id="create-company-title" className="text-xl sm:text-2xl font-bold mt-2 leading-tight" style={{ color: C.blueDeep }}>{created ? "Votre page est prête" : "Créer une page entreprise"}</h2>
            <p className="text-sm mt-2 max-w-lg leading-relaxed" style={{ color: "rgba(29,47,92,0.82)" }}>{created ? "Votre vitrine est prête à être présentée au réseau." : "Présentez votre activité et rassemblez votre communauté."}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/40 transition-colors shrink-0" style={{ color: C.blueDeep }}><X size={18} /></button>
        </div>
        {!created && (
          <div className="px-4 sm:px-6 pt-4 grid grid-cols-3 gap-1 sm:gap-2" style={{ background: "rgba(234,240,252,0.55)" }}>
            {CREATE_STEPS.map((item, i) => (
              <button type="button" key={item.label} onClick={() => i < step && setStep(i)} className="flex items-start gap-2 text-left pb-4 relative" style={{ cursor: i < step ? "pointer" : "default" }}>
                <span className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: i < step ? C.green : i === step ? C.blueDeep : C.surface, color: i <= step ? "#fff" : C.inkFaint, border: `1px solid ${i < step ? C.green : i === step ? C.blueDeep : C.border}` }}>{i < step ? <Check size={13} /> : i + 1}</span>
                <span className="min-w-0"><span className="block text-[11px] sm:text-sm font-bold truncate" style={{ color: i <= step ? C.blueDeep : C.inkFaint }}>{item.label}</span><span className="hidden sm:block text-[11px] mt-0.5 truncate" style={{ color: C.inkFaint }}>{item.hint}</span></span>
              </button>
            ))}
          </div>
        )}
        <div className="px-4 sm:px-6 py-5 overflow-y-auto min-h-[220px]">
          {created ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.greenSoft }}><Check size={26} style={{ color: C.green }} /></div>
              <p className="font-semibold" style={{ color: C.ink }}>« {name} » est en ligne</p>
              <p className="text-sm max-w-sm" style={{ color: C.inkFaint }}>Catégorie {catLabel} · {location}. Vous pouvez maintenant publier et inviter des administrateurs.</p>
            </div>
          ) : (
            <>
              {step === 0 && (
                <div className="max-w-lg flex flex-col gap-4">
                  <div><h3 className="text-sm sm:text-base font-bold" style={{ color: C.ink }}>Commençons par votre identité</h3><p className="text-xs sm:text-sm mt-1" style={{ color: C.inkFaint }}>Ces informations seront visibles sur votre page publique.</p></div>
                  <Field label="Nom de la page"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Studio Lamba Créatif" className="px-3.5 py-3 rounded-xl text-sm outline-none" style={inputStyle} autoFocus /></Field>
                  <Field label="Slogan"><input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Une phrase qui résume votre page" className="px-3.5 py-3 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
                  <Field label="Localisation"><input value={location} onChange={(e) => setLocation(e.target.value)} className="px-3.5 py-3 rounded-xl text-sm outline-none" style={inputStyle} /></Field>
                </div>
              )}
              {step === 1 && (
                <div>
                  <h3 className="text-base font-bold mb-1" style={{ color: C.ink }}>Quel est votre secteur ?</h3>
                  <p className="text-sm mb-5" style={{ color: C.inkFaint }}>Choisissez la catégorie qui aidera les membres à vous trouver.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CATEGORIES.filter((c) => c.id !== "toutes").map((c) => {
                      const active = category === c.id;
                      return (
                        <button key={c.id} onClick={() => setCategory(c.id)} className="rounded-xl p-3.5 flex items-center gap-2.5 text-left transition-colors hover:border-blue-300" style={{ border: `1.5px solid ${active ? C.blueDeep : C.border}`, background: active ? C.blueSoft : C.surface }}>
                          <c.icon size={18} style={{ color: active ? C.blueDeep : C.inkSoft }} />
                          <span className="text-sm font-medium" style={{ color: C.ink }}>{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="flex flex-col gap-5">
                  <div><h3 className="text-base font-bold" style={{ color: C.ink }}>Donnez une image à votre page</h3><p className="text-sm mt-1" style={{ color: C.inkFaint }}>Ajoutez une couverture et un logo pour inspirer confiance dès le premier regard.</p></div>
                  <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}`, boxShadow: "0 8px 22px rgba(19,28,51,0.06)" }}>
                    <div className="relative h-24 flex items-center justify-center" style={{ background: coverUrl ? `center / cover no-repeat url(${coverUrl})` : C.surface }}>
                      {!coverUrl && <span className="text-xs" style={{ color: C.inkFaint }}>Aucune couverture</span>}
                      <button onClick={() => setUploadKind("cover")} className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity" style={{ background: "rgba(255,255,255,0.95)", color: C.ink }}><Camera size={13} /> Ajouter une couverture</button>
                      <div className="absolute left-4 -bottom-7 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: C.card, border: `3px solid ${C.card}`, boxShadow: "0 2px 8px rgba(19,28,51,0.15)" }}>
                        <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden" style={{ background: avatarUrl ? undefined : `linear-gradient(135deg, ${C.gold}, ${C.blue})` }}>
                          {avatarUrl ? <img src={avatarUrl} alt="Logo de la page" className="w-full h-full object-cover" /> : <Building2 size={20} style={{ color: C.inkFaint }} />}
                        </div>
                        <button onClick={() => setUploadKind("avatar")} aria-label="Changer l\'avatar" className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: "rgba(19,28,51,0.45)", opacity: 0 }} onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)} onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}><Camera size={14} color="#fff" /></button>
                      </div>
                    </div>
                    <div className="h-16 px-4 pb-3 flex items-end" style={{ background: C.card }}><span className="text-xs" style={{ color: C.inkFaint }}>Aperçu de la page</span></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3" style={{ borderTop: `1px solid ${C.border}`, background: "rgba(243,245,249,0.55)" }}>
          {created ? (
            <button type="button" onClick={() => onCreated?.(createdPage || { name, tagline, category, location, avatarUrl, coverUrl })} className="w-full min-h-11 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ background: C.blueDeep }}>Voir ma page <ChevronRight size={16} className="inline ml-1" /></button>
          ) : (
            <>
              <button type="button" onClick={prev} disabled={step === 0} className="flex items-center gap-1.5 min-h-11 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ color: step === 0 ? C.inkFaint : C.inkSoft, background: step === 0 ? "transparent" : C.card, border: `1px solid ${step === 0 ? "transparent" : C.border}`, opacity: step === 0 ? 0.5 : 1 }}><ChevronLeft size={16} /> Précédent</button>
              {step < CREATE_STEPS.length - 1 ? (
                <button type="button" onClick={next} disabled={!canNext} className="flex items-center gap-1.5 min-h-11 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity" style={{ background: C.blueDeep, opacity: canNext ? 1 : 0.5 }}>Suivant <ChevronRight size={16} /></button>
              ) : (
                <button type="button" onClick={createPage} disabled={creating} aria-busy={creating} className="flex items-center gap-1.5 min-h-11 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background: C.gold, color: C.blueDeep, opacity: creating ? 0.65 : 1, cursor: creating ? "wait" : "pointer" }}><Plus size={16} /> {creating ? "Création en cours…" : "Créer la page"}</button>
              )}
              {createError && <p className="text-xs font-semibold text-right max-w-xs" style={{ color: C.red }}>{createError}</p>}
            </>
          )}
        </div>
      </div>
      {uploadKind && <MediaUploadModal kind={uploadKind} onClose={() => setUploadKind(null)} onApply={applyUpload} />}
      <style>{`@keyframes modalPop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } } @media (max-width: 640px) { .company-sponsor-modal-overlay { inset: 0 !important; padding: 0 !important; align-items: flex-start !important; } .company-sponsor-modal { width: 100vw !important; max-width: none !important; height: 100dvh !important; max-height: none !important; min-height: 100dvh !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; } .company-sponsor-modal > div:nth-child(3) { overflow-y: auto; min-height: 0; } }`}</style>
    </div>
  );
}

export function CreateCompanyPage({ onBack, onCreate }) {
  return <CreateCompanyPageModal onClose={onBack} onCreated={(page) => onCreate?.(page)} />;
}

/* ---------------------------------------------------------------
   Company pages grid — REDESIGNED
   Inspired by reference: clean header, nav tabs, search,
   horizontal category pills, polished card grid
----------------------------------------------------------------*/
export function CompanyPagesGrille({ onOpenPage, onOpenCompany, onOpenMyPage, currentCompanyId, currentUserId, companyTab = "discover", onCompanyTabChange, canCreatePage = true, onUpgrade, initialPages = [], onPageCreated, followedPageIds = [], onFollowPage }) {
  const [activeCategory, setActiveCategory] = useState("toutes");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [pages, setPages] = useState(() => [
    ...PAGE_DIRECTORY,
    ...initialPages.map((page) => ({
      ...page,
      category: page.category || CATEGORIES.find((category) => category.label === page.industry)?.id || "institution",
      tag: page.tag || page.industry || "Page entreprise",
      desc: page.desc || page.description || "Découvrez cette page entreprise.",
      followers: Number(page.followers) || 0,
      tone: page.tone || [C.blue, C.blueDeep],
      managed: Boolean(page.managed),
    })),
  ]);
  const [activeTab, setActiveTab] = useState("toutes");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setPages([
      ...PAGE_DIRECTORY,
      ...initialPages.map((page) => ({
        ...page,
        category: page.category || CATEGORIES.find((category) => category.label === page.industry)?.id || "institution",
        tag: page.tag || page.industry || "Page entreprise",
        desc: page.desc || page.description || "Découvrez cette page entreprise.",
        followers: Number(page.followers) || 0,
        tone: page.tone || [C.blue, C.blueDeep],
        managed: Boolean(page.managed),
      })),
    ]);
  }, [initialPages]);

  const filtered = useMemo(() => {
    return pages.filter((p) => {
      const matchesCategory = activeCategory === "toutes" || p.category === activeCategory;
      const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [pages, activeCategory, query]);

  const managedCount = pages.filter((p) => p.managed).length;
  const totalFollowers = pages.reduce((total, page) => total + (Number(page.followers) || 0), 0);
  const activeCategoryLabel = activeCategory === "toutes"
    ? "Toutes les pages"
    : CATEGORIES.find((c) => c.id === activeCategory)?.label || "Pages entreprise";

  const handleCreated = (newPage) => {
    onPageCreated?.(newPage);
    setPages((prev) => [
      { id: Date.now(), name: newPage.name || "Nouvelle page", category: newPage.category, tag: CATEGORIES.find((c) => c.id === newPage.category)?.label || "Page", followers: "0", desc: newPage.tagline || "Nouvelle page entreprise.", tone: [C.blue, C.blueDeep], managed: true },
      ...prev,
    ]);
    setCreateOpen(false);
  };

  const openPage = (page) => {
    const isOwnPage = page.isOwn || page.managed || (currentCompanyId && String(page.id) === String(currentCompanyId)) || (currentUserId && page.ownerId && String(page.ownerId) === String(currentUserId));
    if (isOwnPage) {
      onOpenMyPage?.();
      return;
    }
    (onOpenPage || onOpenCompany)?.(page);
  };

  const navTabs = [
    { id: "toutes", label: "Toutes" },
    { id: "recommandees", label: "Recommandées" },
    { id: "populaires", label: "Populaires" },
    { id: "recentes", label: "Récentes" },
  ];

  return (
    <div className="company-pages-directory min-h-full w-full" style={{ background: C.surface, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div className="company-pages-shell w-full max-w-[1400px] mx-auto pb-16 px-4 sm:px-6">
        {/* Page header: remains visible below the global navigation while browsing. */}
        <div
          style={{
            background: "rgba(255,255,255,0.96)",
            border: `1px solid ${C.border}`,
            borderTop: `3px solid ${C.blueMid}`,
            borderRadius: 20,
            boxShadow: "0 14px 32px rgba(19,28,51,0.10)",
            top: "var(--lynora-header-offset, 0px)",
            animation: "companyHeaderIn 480ms cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
          className="group company-header-motion sticky z-20 -mt-2 px-4 sm:px-6 py-4 backdrop-blur-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105" style={{ background: `linear-gradient(135deg, ${C.blueSoft}, #fff)`, border: `1px solid ${C.border}`, animation: "companyIconPulse 2.8s ease-in-out 600ms infinite" }}>
                <Building2 size={19} style={{ color: C.blueMid }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold truncate" style={{ color: C.ink }}>Entreprises</h1>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: C.greenSoft, color: C.green }}>Réseau actif</span>
                </div>
                <p className="text-xs truncate" style={{ color: C.inkFaint }}>{activeCategoryLabel} · {filtered.length} résultat{filtered.length > 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium" style={{ color: C.inkFaint }}>
                <Users size={14} style={{ color: C.blueMid }} /> {totalFollowers} abonnés
              </div>
              <button onClick={() => setMobileSidebarOpen(true)} type="button" aria-label="Ouvrir les filtres" title="Ouvrir les filtres" className="lg:hidden flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold" style={{ background: C.blueSoft, color: C.blueMid, border: `1px solid ${C.border}` }}>
                <SlidersHorizontal size={16} />
                <span>Filtres</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
            {[
              { id: "mine", label: "Ma page" },
                { id: "followed", label: "Pages suivies" },
              { id: "discover", label: "Découvrir" },
            ].map((tab) => {
              const active = companyTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onCompanyTabChange?.(tab.id)}
                  className="px-3 py-2 text-sm font-semibold relative transition-colors"
                  style={{ color: active ? C.blueMid : C.inkFaint }}
                >
                  {tab.label}
                  {active && <span className="absolute left-0 right-0 -bottom-3 h-0.5 rounded-full" style={{ background: C.blueMid }} />}
                </button>
              );
            })}
          </div>
        </div>
        <style>{`
          @keyframes companyHeaderIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes companyIconPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(56,104,199,0); }
            50% { box-shadow: 0 0 0 6px rgba(56,104,199,0.10); }
          }
          @media (prefers-reduced-motion: reduce) {
            .company-header-motion { animation: none !important; }
          }
          .company-sidebar {
            top: var(--lynora-header-offset, 0px) !important;
            max-height: calc(100dvh - var(--lynora-header-offset, 0px) - 24px) !important;
          }
          @media (max-width: 640px) {
            .company-pages-directory {
              width: 100vw;
              min-height: 100dvh;
              margin-left: 50%;
              transform: translateX(-50%);
              overflow-x: hidden;
            }
            .company-pages-shell {
              padding-inline: 12px !important;
              padding-top: calc(var(--lynora-header-offset, 0px) + 145px) !important;
            }
            .company-pages-directory .company-header-motion {
              position: fixed !important;
              top: var(--lynora-header-offset, 0px) !important;
              left: 0;
              right: 0;
              z-index: 20;
              margin: 0;
              border-radius: 0 !important;
              border-left: 0;
              border-right: 0;
            }
            .company-pages-directory .company-pages-grid {
              grid-template-columns: minmax(0, 1fr);
              gap: 12px;
            }
            .company-pages-directory main {
              padding-top: 8px;
            }
            .company-page-stats .company-stat-card {
              border: 0 !important;
              border-radius: 0 !important;
              background: transparent !important;
              box-shadow: none !important;
              padding: 8px 0 !important;
            }
            .company-page-stats .company-stat-card + .company-stat-card {
              border-left: 1px solid ${C.border} !important;
              padding-left: 8px !important;
            }
            .company-pages-directory .company-pages-grid > button {
              min-width: 0;
            }
            .company-pages-directory .company-pages-grid > button > div:first-child {
              height: 72px;
            }
            .company-pages-directory .company-pages-grid > button > div:last-child {
              padding: 36px 14px 14px;
              gap: 10px;
            }
            .company-page { overflow-x: hidden; }
            .company-sidebar {
              top: var(--lynora-header-offset, 0px) !important;
              left: 0 !important;
              right: 0 !important;
              width: 100vw !important;
              height: calc(100dvh - var(--lynora-header-offset, 0px)) !important;
              max-height: calc(100dvh - var(--lynora-header-offset, 0px)) !important;
              border-radius: 0 !important;
              padding-bottom: env(safe-area-inset-bottom);
            }
            .company-sidebar > div {
              min-height: 100%;
              border-radius: 0 !important;
              border-left: 0 !important;
              border-right: 0 !important;
              box-shadow: none !important;
            }
            .company-page [role="dialog"] { width: 100% !important; max-width: none !important; max-height: calc(100dvh - var(--lynora-header-offset, 0px)) !important; border-radius: 0 !important; }
            .company-page [role="dialog"] input, .company-page [role="dialog"] textarea, .company-page [role="dialog"] select { font-size: 16px !important; }
            .company-media-modal-overlay,
            .company-create-modal-overlay {
              top: var(--lynora-header-offset, 0px) !important;
              right: 0 !important;
              bottom: 0 !important;
              left: 0 !important;
              padding: 0 !important;
              align-items: flex-start !important;
            }
            .company-media-modal,
            .company-create-modal {
              width: 100vw !important;
              max-width: none !important;
              height: calc(100dvh - var(--lynora-header-offset, 0px)) !important;
              max-height: calc(100dvh - var(--lynora-header-offset, 0px)) !important;
              min-height: 0 !important;
              border-radius: 0 !important;
              border: 0 !important;
              box-shadow: none !important;
            }
            .company-media-modal > div:nth-child(3),
            .company-create-modal > div:nth-child(3) {
              overflow-y: auto;
              min-height: 0;
            }
          }
          @media (min-width: 1024px) {
            .company-page-right-sidebar {
              position: sticky;
              top: calc(var(--lynora-header-offset, 0px) + 20px);
              align-self: start;
              max-height: calc(100dvh - var(--lynora-header-offset, 0px) - 40px);
              overflow-y: auto;
              scrollbar-width: thin;
            }
            .company-sidebar {
              top: calc(var(--lynora-header-offset, 0px) + 150px) !important;
              max-height: calc(100vh - var(--lynora-header-offset, 0px) - 174px) !important;
            }
          }
        `}</style>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 mt-6">
          <aside
            className={`${mobileSidebarOpen ? "fixed" : "hidden"} company-sidebar lg:block h-fit lg:fixed lg:z-10 lg:w-[280px] overflow-y-auto z-[1200] w-screen max-w-none bg-white lg:bg-transparent shadow-2xl lg:shadow-none`}
            style={{
              top: 0,
              left: "max(0px, calc((100vw - 1400px) / 2 + 24px))",
              right: 0,
              bottom: 0,
              maxHeight: "none",
            }}
          >
            <div className="rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 8px 24px rgba(19,28,51,0.04)" }}>
            <div className="flex items-center justify-between gap-2 mb-3 lg:hidden">
              <span className="text-sm font-bold" style={{ color: C.ink }}>Filtres</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    if (!canCreatePage) { onUpgrade?.(); return; }
                    setCreateOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-white"
                  style={{ background: C.blueMid }}
                >
                  <Plus size={14} /> Créer une page
                </button>
                <button type="button" onClick={() => setMobileSidebarOpen(false)} aria-label="Fermer les filtres" className="p-1.5 rounded-lg" style={{ color: C.inkFaint }}><X size={18} /></button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileSidebarOpen(false);
                if (!canCreatePage) {
                  onUpgrade?.();
                  return;
                }
                setCreateOpen(true);
              }}
              className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-sm"
              style={{ background: C.blueMid }}
            >
              <Plus size={16} /> Créer une page
            </button>

            <div className="mt-5 px-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.inkFaint }}>Filtrer les pages</div>
            <div className="flex flex-col gap-1 mt-2">
              {navTabs.map((t) => {
                const active = activeTab === t.id;
                return (
                  <button key={t.id} onClick={() => { setActiveTab(t.id); setMobileSidebarOpen(false); }} className="px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors" style={{ background: active ? C.blueSoft : "transparent", color: active ? C.blueDeep : C.inkSoft }}>
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="my-3" style={{ borderTop: `1px solid ${C.border}` }} />
            <div className="px-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.inkFaint }}>Secteur</div>
            <div className="flex flex-col gap-1 mt-2">
              {CATEGORIES.map((c) => {
                const active = activeCategory === c.id;
                return (
                  <button key={c.id} onClick={() => { setActiveCategory(c.id); setMobileSidebarOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors" style={{ background: active ? C.blueSoft : "transparent", color: active ? C.blueDeep : C.inkSoft }}>
                    <c.icon size={15} /> {c.label}
                  </button>
                );
              })}
            </div>
            </div>
          </aside>
          {mobileSidebarOpen && (
            <button
              aria-label="Fermer les filtres"
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 z-[1100] bg-[#131C33]/40 lg:hidden"
            />
          )}

          <main className="min-w-0 lg:col-start-2">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.inkFaint }} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une entreprise..." aria-label="Rechercher une page" className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none transition-colors" style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink }} />
              </div>
              <div className="flex items-center gap-4 text-xs font-medium" style={{ color: C.inkFaint }}>
                <span><strong style={{ color: C.ink }}>{pages.length}</strong> page{pages.length > 1 ? "s" : ""}</span>
                <span><strong style={{ color: C.ink }}>{managedCount}</strong> gérée{managedCount > 1 ? "s" : ""}</span>
                <span><strong style={{ color: C.ink }}>{totalFollowers}</strong> abonnés</span>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl p-10 flex flex-col items-center text-center gap-2 mt-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <SlidersHorizontal size={22} style={{ color: C.inkFaint }} />
                <p className="text-sm font-semibold" style={{ color: C.ink }}>Aucune page trouvée</p>
                <p className="text-xs" style={{ color: C.inkFaint }}>Essayez une autre catégorie ou un autre mot-clé.</p>
              </div>
            ) : (
              <div className="company-pages-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
                {filtered.map((p) => <PageCard key={p.id} page={p} followed={followedPageIds.includes(p.id)} onFollow={onFollowPage} onOpen={() => openPage(p)} />)}
              </div>
            )}
          </main>
        </div>
      </div>
      {createOpen && <CreateCompanyPageModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}

export default CompanyPage;
