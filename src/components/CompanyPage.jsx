
import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import {
  ArrowLeft, ArrowRightLeft, MapPin, Globe, Users, Briefcase, Image as ImageIcon,
  LayoutDashboard, UserCheck, Activity, Settings, Bell, Search, ChevronRight, ChevronLeft,
  UserPlus, UserMinus, PenSquare, Rocket, Megaphone, Camera, UploadCloud, Loader2, Plus,
  UtensilsCrossed, Palette, SlidersHorizontal, UserRoundPlus, Clock, ExternalLink,
  CircleDot, Filter, Menu, Eye, ThumbsUp, MessageCircle, X, Check, Wand2,
  Heart, Building2, TrendingUp, CalendarDays, MoreHorizontal, Trash2, HeartPulse,
  LayoutGrid, Compass, GraduationCap, ShoppingBag, Landmark, Wallet, Bookmark,
  Share2, Sparkles, ChevronDown, ChevronUp, Info, Smartphone, Columns3, Target,
  MousePointerClick, Users2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import CompanyComposer from "./CompanyComposer";
import PostCard from "./PostCard";
import PostViewerPreview from "./PostViewerPreview";
import PremiumBadge from "./PremiumBadge";
import EnterpriseBadge from "./EnterpriseBadge";
import { getCampaignSchedule } from "@/lib/campaignSchedule";
import { fetchBackendApi } from "@/lib/backend-api";

/* ---------------------------------------------------------------
   Design tokens — Updated palette inspired by reference images
----------------------------------------------------------------*/
const C = {
  ink: "#161A24",
  inkSoft: "#5B6272",
  inkFaint: "#8B92A3",
  surface: "#F5F7FC",
  card: "#FFFFFF",
  border: "#E7E9F2",
  /* Navy Blue palette */
  navy: "#0E1B3D",
  navyMid: "#1B2C58",
  navyDeep: "#080F26",
  navyLight: "#EAEFFC",
  navySoft: "#F1F4FB",
  navyGlow: "#2E4784",
  /* Golden Yellow palette */
  gold: "#EEAF23",
  goldBright: "#FFCE55",
  goldDeep: "#A66A16",
  goldLight: "#FFF8EA",
  goldSoft: "#FDF1D6",
  /* Aliases for backward compatibility */
  blue: "#0E1B3D",
  blueDeep: "#0E1B3D",
  blueSoft: "#EAEFFC",
  blueMid: "#1B2C58",
  green: "#22946A",
  greenSoft: "#E6F6EF",
  red: "#D6483F",
  redSoft: "#FDEEEE",
  orange: "#F2790F",
  orangeSoft: "#FFF3E8",
  /* Signature gradients */
  navyGradSolid: "linear-gradient(135deg, #1B2C58 0%, #080F26 100%)",
  goldGrad: "linear-gradient(135deg, #FFCE55 0%, #A66A16 100%)",
  /* Elevation scale — soft, layered, tuned to the navy hue for a more premium feel */
  shadowXs: "0 1px 2px rgba(14,27,61,.05)",
  shadowSm: "0 2px 8px rgba(14,27,61,.06)",
  shadowMd: "0 8px 24px rgba(14,27,61,.10)",
  shadowLg: "0 20px 48px rgba(14,27,61,.16)",
  shadowGold: "0 8px 20px rgba(166,106,22,.24)",
  /* Radius scale */
  r_sm: 10,
  r_md: 14,
  r_lg: 20,
  r_xl: 26,
};

/* Sidebar navigation items for the Pages directory */
const SIDEBAR_NAV_PRIMARY = [
  { id: "suite", label: "Ma page", icon: LayoutDashboard, chevron: true },
  { id: "messagerie", label: "Messagerie", icon: MessageCircle, chevron: true },
  { id: "statistiques", label: "Statistiques", icon: Activity, chevron: true },
];
const SIDEBAR_NAV_SECONDARY = [
  { id: "decouvrir", label: "Découvrir", icon: Compass },
  { id: "followed", label: "Pages suivies", icon: Bookmark },
  { id: "invitations", label: "Invitations", icon: UserRoundPlus },
];

function CompanyDirectorySettingsModal({ open, onClose, onSaved }) {
  const [settings, setSettings] = useState({ showSuggestions: true, compactCards: false, emailNotifications: true });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    fetchBackendApi("/api/company/directory-settings", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "Impossible de charger les paramètres.");
        setSettings(data.settings);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetchBackendApi("/api/company/directory-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Impossible d’enregistrer les paramètres.");
      onSaved?.(data.settings);
      onClose();
    } catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  };
  const options = [
    { key: "showSuggestions", label: "Afficher les suggestions", description: "Proposer des pages à découvrir." },
    { key: "compactCards", label: "Cartes compactes", description: "Afficher davantage de pages à l’écran." },
    { key: "emailNotifications", label: "Notifications par e-mail", description: "Recevoir les invitations et mises à jour importantes." },
  ];
  return <div className="company-directory-settings-overlay" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(19,28,51,.55)" }}>
    <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 480, borderRadius: 14, background: C.card, boxShadow: "0 24px 64px rgba(19,28,51,.25)", overflow: "hidden" }}>
      <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.blueDeep, color: "#fff" }}><div><div style={{ color: "#FFD77A", fontSize: 10, fontWeight: 800, letterSpacing: .8, textTransform: "uppercase" }}>Préférences</div><h2 style={{ margin: "4px 0 0", fontSize: 18 }}>Paramètres des pages</h2></div><button type="button" onClick={onClose} aria-label="Fermer" style={{ width: 32, height: 32, border: 0, borderRadius: 8, background: "rgba(255,255,255,.14)", color: "#fff", cursor: "pointer" }}><X size={15} /></button></div>
      <div style={{ padding: 20 }}>{loading ? <div style={{ padding: 24, textAlign: "center", color: C.inkFaint }}>Chargement...</div> : options.map((option) => <label key={option.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}><input type="checkbox" checked={Boolean(settings[option.key])} onChange={(event) => setSettings((current) => ({ ...current, [option.key]: event.target.checked }))} style={{ width: 18, height: 18, accentColor: C.gold }} /><span style={{ flex: 1 }}><strong style={{ display: "block", color: C.ink, fontSize: 13 }}>{option.label}</strong><small style={{ display: "block", marginTop: 3, color: C.inkFaint, fontSize: 11.5 }}>{option.description}</small></span></label>)}{error && <p style={{ margin: "14px 0 0", color: C.red, fontSize: 12 }}>{error}</p>}</div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "0 20px 20px" }}><button type="button" onClick={onClose} style={{ padding: "9px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.inkSoft, fontWeight: 700, cursor: "pointer" }}>Annuler</button><button type="button" onClick={save} disabled={loading || saving} style={{ padding: "9px 16px", border: 0, borderRadius: 8, background: C.gold, color: C.blueDeep, fontWeight: 800, cursor: "pointer", opacity: loading || saving ? .6 : 1 }}>{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
    </div>
  </div>;
}

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
      className="company-stat-card min-w-0 rounded-[16px] p-3.5 sm:p-4 flex flex-col gap-2 sm:gap-2.5 relative overflow-hidden"
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        boxShadow: C.shadowXs,
        transition: "transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s ease, border-color .2s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = C.shadowMd; e.currentTarget.style.borderColor = (tone || C.navy) + "45"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = C.shadowXs; e.currentTarget.style.borderColor = C.border; }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${tone || C.navy}1F, ${tone || C.navy}0A)` }}>
          <Icon size={15} className="sm:hidden" style={{ color: tone }} />
          <Icon size={17} className="hidden sm:block" style={{ color: tone }} />
        </div>
        {delta && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md" style={{ color: C.green, background: C.greenSoft }}>{delta}</span>}
      </div>
      <div>
        <span className="block text-lg sm:text-[22px] font-extrabold tracking-tight truncate" style={{ color: C.navy }}>{value}</span>
        <span className="block min-w-0 truncate mt-0.5 text-[10.5px] sm:text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: C.inkFaint }}>{label}</span>
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
      fetchBackendApi("/api/users", { cache: "no-store" }),
      fetchBackendApi("/api/company/pages", { cache: "no-store" }),
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
      if (selected.type === "Page") {
        setMessage("Sélectionnez une personne, pas une page.");
        return;
      }
      const response = await fetchBackendApi("/api/company/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: selected.id }),
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
          <div><p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#FFD77A" }}>Administration de la page</p><h2 id="company-invite-title" className="text-xl font-bold mt-1" style={{ color: "#fff" }}>Inviter à suivre la page</h2><p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.72)" }}>Envoyez une invitation à suivre votre page entreprise.</p></div>
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
        <div className="px-5 sm:px-6 py-4 flex justify-end gap-2" style={{ borderTop: `1px solid ${C.border}` }}><button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ color: C.inkSoft }}>Annuler</button><button type="button" onClick={sendInvite} disabled={!selected || selected.type === "Page" || sending} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ background: C.blueDeep, color: "#fff", opacity: !selected || selected.type === "Page" || sending ? 0.5 : 1 }}><UserRoundPlus size={15} /> {sending ? "Envoi..." : "Inviter à suivre"}</button></div>
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

function JobsTab({ jobs = [], company, canManage = false, onCreateJob, onUpdateJob, onJobAction }) {
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
          <PostCard variant="job" post={{ ...j, jobType: j.type, jobTitle: j.title, title: j.title, text: j.description, isPremium: company?.isPremium, isPlatformAdmin: company?.isPlatformAdmin }} onJobAction={onJobAction} />
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
        <button onClick={() => company?.isPremium && onOpenSponsor()} disabled={!company?.isPremium} title={!company?.isPremium ? "Réservé aux Pages Entreprise Premium" : undefined} className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-50" style={{ background: C.gold, color: C.blueDeep }}><Megaphone size={16} /> Sponsoriser</button>
      </div>
    </div>
  );
}

function CampaignDashboard({ onOpenSponsor, company }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadCampaigns = () => {
    fetchBackendApi("/api/company/campaigns", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : response.json().then((data) => Promise.reject(new Error(data.error))))
      .then((data) => setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []))
      .catch((requestError) => setError(requestError.message || "Impossible de charger les campagnes."))
      .finally(() => setLoading(false));
  };
  useEffect(loadCampaigns, []);
  const updateStatus = async (campaign, status) => {
    const response = await fetchBackendApi("/api/company/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: campaign.storageId, status }) });
    if (!response.ok) return;
    const data = await response.json();
    setCampaigns((current) => current.map((item) => item.storageId === campaign.storageId ? data.campaign : item));
  };
  const totals = campaigns.reduce((sum, campaign) => {
    const analytics = campaign.analytics || {};
    return { impressions: sum.impressions + (analytics.impressions || 0), clicks: sum.clicks + (analytics.clicks || 0), conversions: sum.conversions + (analytics.conversions || 0), spent: sum.spent + (analytics.spent || 0) };
  }, { impressions: 0, clicks: 0, conversions: 0, spent: 0 });
  return <div className="flex flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold" style={{ color: C.ink }}>Publicité</h3><p className="text-sm" style={{ color: C.inkFaint }}>Pilotez vos campagnes et leurs performances.</p></div><button type="button" onClick={() => company?.isPremium && onOpenSponsor()} disabled={!company?.isPremium} title={!company?.isPremium ? "Réservé aux Pages Entreprise Premium" : undefined} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50" style={{ background: C.gold, color: C.blueDeep }}><Megaphone size={16} /> Créer une campagne publicitaire</button></div>
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
    fetchBackendApi("/api/company/auto-reply", { cache: "no-store" })
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
      const response = await fetchBackendApi("/api/company/auto-reply", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
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
      const response = await fetchBackendApi("/api/upload", { method: "POST", body: formData });
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
      const response = await fetchBackendApi("/api/company", {
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
    fetchBackendApi("/api/company", {
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
   Sponsor modal — Facebook Ads-style creation experience
   (single scrollable form + live "rendu final" preview panel,
   mirroring Meta Ads Manager's "Boost / Créer une publicité" flow)
----------------------------------------------------------------*/
const OBJECTIVES = [
  { id: "visibilite", label: "Notoriété", sub: "Toucher un maximum de personnes", icon: Eye },
  { id: "clics", label: "Trafic", sub: "Générer des visites vers votre lien", icon: MousePointerClick },
  { id: "engagement", label: "Interactions", sub: "J'aime, commentaires, partages", icon: Heart },
  { id: "prospects", label: "Prospects", sub: "Messages, appels, contacts", icon: Users2 },
  { id: "conversions", label: "Ventes", sub: "Commandes et conversions", icon: Target },
];
const CTA_OPTIONS = ["En savoir plus", "Acheter maintenant", "Contacter", "S'inscrire", "Envoyer un message", "Télécharger", "Visiter le site", "Réserver"];
const PLACEMENT_OPTIONS = [
  { id: "post", label: "Fil d'actualité", sub: "Publication sponsorisée dans le fil", icon: LayoutGrid },
  { id: "story", label: "Stories", sub: "Format plein écran immersif", icon: Smartphone },
  { id: "sidebar", label: "Colonne de droite", sub: "Bannière discrète desktop", icon: Columns3 },
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

function SectionCard({ icon: Icon, title, subtitle, right, children }) {
  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="flex items-start gap-2.5 min-w-0">
          {Icon && <div className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.blueSoft, color: C.blueDeep }}><Icon size={16} /></div>}
          <div className="min-w-0">
            <h3 className="text-sm font-bold" style={{ color: C.ink }}>{title}</h3>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: C.inkFaint }}>{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function AdBadge() {
  return <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: C.inkFaint }}>Sponsorisé <Globe size={10} /></span>;
}

function FeedAdPreview({ pageName, avatarUrl, description, media, website, title, cta }) {
  const domain = website ? website.replace(/^https?:\/\//i, "").replace(/\/$/, "").split("/")[0] : null;
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        {avatarUrl ? <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" /> : <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: C.blueDeep }}>{(pageName || "P")[0]}</div>}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: C.ink }}>{pageName || "Votre page"}</p>
          <AdBadge />
        </div>
        <MoreHorizontal size={16} style={{ color: C.inkFaint }} />
      </div>
      {description && <p className="px-3 pb-2.5 text-[13px] whitespace-pre-wrap leading-snug" style={{ color: C.ink }}>{description}</p>}
      <div className="w-full">
        {media ? (media.type === "video" ? <video src={media.url} controls className="w-full max-h-64 object-cover block" /> : <img src={media.url} alt="" className="w-full max-h-64 object-cover block" />) : <div className="w-full h-40 flex items-center justify-center" style={{ background: C.surface }}><ImageIcon size={26} style={{ color: C.inkFaint }} /></div>}
      </div>
      {website && (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5" style={{ background: "#F0F2F5" }}>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide truncate" style={{ color: C.inkFaint }}>{domain}</p>
            <p className="text-[13px] font-semibold truncate" style={{ color: C.ink }}>{title || "Votre campagne"}</p>
          </div>
          <span className="shrink-0 px-3 py-1.5 rounded-md text-xs font-bold" style={{ background: "#E4E6EB", color: C.ink }}>{cta}</span>
        </div>
      )}
      <div className="flex items-center justify-around px-1 py-1" style={{ borderTop: `1px solid ${C.border}` }}>
        <span className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold" style={{ color: C.inkSoft }}><ThumbsUp size={14} /> J'aime</span>
        <span className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold" style={{ color: C.inkSoft }}><MessageCircle size={14} /> Commenter</span>
        <span className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold" style={{ color: C.inkSoft }}><Share2 size={14} /> Partager</span>
      </div>
    </div>
  );
}

function StoryAdPreview({ pageName, avatarUrl, description, media, cta }) {
  return (
    <div className="rounded-2xl overflow-hidden relative mx-auto" style={{ width: 190, height: 336, background: C.navyDeep }}>
      <div className="absolute top-0 inset-x-0 flex gap-1 p-1.5 z-10"><span className="flex-1 h-0.5 rounded-full" style={{ background: "rgba(255,255,255,.8)" }} /></div>
      <div className="absolute top-3 left-2 right-2 flex items-center gap-1.5 z-10">
        {avatarUrl ? <img src={avatarUrl} className="w-6 h-6 rounded-full object-cover" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,.6)" }} alt="" /> : <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: C.gold, color: C.blueDeep }}>{(pageName || "P")[0]}</div>}
        <span className="text-[11px] font-semibold truncate" style={{ color: "#fff" }}>{pageName || "Votre page"}</span>
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,.7)" }}>· Sponsorisé</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        {media ? (media.type === "video" ? <video src={media.url} className="w-full h-full object-cover" /> : <img src={media.url} className="w-full h-full object-cover" alt="" />) : <ImageIcon size={28} style={{ color: "rgba(255,255,255,.35)" }} />}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3 pb-4" style={{ background: "linear-gradient(transparent, rgba(0,0,0,.75))" }}>
        {description && <p className="text-[11px] mb-2" style={{ color: "rgba(255,255,255,.92)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{description}</p>}
        <span className="inline-flex items-center justify-center w-full py-1.5 rounded-full text-[11px] font-bold" style={{ background: "#fff", color: C.ink }}>{cta}</span>
      </div>
    </div>
  );
}

function ColumnAdPreview({ pageName, avatarUrl, title, description, media }) {
  return (
    <div className="rounded-lg overflow-hidden mx-auto" style={{ background: "#fff", border: `1px solid ${C.border}`, maxWidth: 220 }}>
      {media ? (media.type === "video" ? <video src={media.url} className="w-full h-28 object-cover" /> : <img src={media.url} className="w-full h-28 object-cover" alt="" />) : <div className="w-full h-28 flex items-center justify-center" style={{ background: C.surface }}><ImageIcon size={20} style={{ color: C.inkFaint }} /></div>}
      <div className="p-2.5">
        <p className="text-[10px] font-bold" style={{ color: C.inkFaint }}>Sponsorisé</p>
        <p className="text-[12px] font-semibold mt-0.5 truncate" style={{ color: C.ink }}>{title || "Votre campagne"}</p>
        {description && <p className="text-[11px] mt-0.5" style={{ color: C.inkSoft, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{description}</p>}
        <div className="flex items-center gap-1.5 mt-1.5">
          {avatarUrl ? <img src={avatarUrl} className="w-4 h-4 rounded-full object-cover" alt="" /> : null}
          <span className="text-[10px] truncate" style={{ color: C.inkFaint }}>{pageName}</span>
        </div>
      </div>
    </div>
  );
}

export function SponsorModal({ onClose, company }) {
  const [objective, setObjective] = useState("");
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("post");
  const [contentType, setContentType] = useState("text");
  const [description, setDescription] = useState("");
  const [cta, setCta] = useState("En savoir plus");
  const [media, setMedia] = useState(null);
  const [currency, setCurrency] = useState("eur");
  const [audienceMode, setAudienceMode] = useState("advantage");
  const [age, setAge] = useState([18, 65]);
  const [gender, setGender] = useState("Tous");
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState("");
  const [website, setWebsite] = useState(company?.website || "");
  const [whatsapp, setWhatsapp] = useState("");
  const [placementMode, setPlacementMode] = useState("automatic");
  const [budgetMode, setBudgetMode] = useState("daily");
  const [durationDays, setDurationDays] = useState(7);
  const [budget, setBudget] = useState(35);
  const [dailyBudget, setDailyBudget] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [published, setPublished] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pageName = company?.displayName || company?.name || "Votre page";
  const avatarUrl = company?.avatarUrl || company?.logoUrl || company?.image || null;
  const schedule = getCampaignSchedule(budget, dailyBudget);
  const reachPct = Math.min(96, 20 + budget * 1.6);
  const estReach = `${Math.round(budget * 120)} – ${Math.round(budget * 260)}`;
  const estResult = objective === "clics" ? `${Math.round(budget * 8)} – ${Math.round(budget * 15)} clics` : objective === "engagement" ? `${Math.round(budget * 10)} – ${Math.round(budget * 20)} interactions` : objective === "prospects" ? `${Math.round(budget * 1.2)} – ${Math.round(budget * 3)} contacts` : objective === "conversions" ? `${Math.round(budget * 0.6)} – ${Math.round(budget * 1.5)} conversions` : `${estReach} personnes touchées`;

  useEffect(() => {
    if (budgetMode !== "daily") return;
    setBudget(Number((dailyBudget * durationDays).toFixed(2)));
  }, [budgetMode, dailyBudget, durationDays]);
  useEffect(() => {
    if (budgetMode !== "total") return;
    setDailyBudget(Number((budget / Math.max(1, durationDays)).toFixed(2)));
  }, [budgetMode, budget, durationDays]);

  useEffect(() => {
    if (!company?.id) return;
    fetchBackendApi("/api/company/campaigns", { cache: "no-store" })
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

  const selectPlacement = (id) => { setPlacementMode("manual"); setFormat(id); };

  const publish = async () => {
    setSaving(true);
    setError("");
    try {
      if (!company?.isPremium) throw new Error("La création de campagnes sponsorisées est réservée aux Pages Entreprise Premium.");
      if (!objective) throw new Error("Sélectionnez un objectif pour votre campagne.");
      if (!title.trim() || !description.trim()) throw new Error("Ajoutez un titre et une description à la campagne.");
      if (!location) throw new Error("Indiquez une zone de diffusion pour votre audience.");
      if (!Number.isFinite(dailyBudget) || dailyBudget <= 0) throw new Error("Indiquez un budget quotidien valide.");
      const postResponse = await fetchBackendApi("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description, headline: title.trim(), excerpt: description, media: media ? [media] : [], companyPageId: company?.id, isSponsored: true, visibility: "public" }),
      });
      const postData = await postResponse.json().catch(() => ({}));
      if (!postResponse.ok) throw new Error(postData?.error || "Impossible de créer le contenu publicitaire.");
      const response = await fetchBackendApi("/api/company/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: company?.id, postId: postData.post.id, title, description, cta, objective, website, whatsapp, ageMin: age[0], ageMax: age[1], gender, location, interests, budget, dailyBudget, budgetMode: "total", currency, format, contentType, paymentMethod }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Impossible d'enregistrer la campagne.");
      if (["stripe", "paypal", "mobile_money"].includes(paymentMethod)) {
        let checkoutId = data.campaign?.storageId || null;
        if (!checkoutId) {
          const campaignsResponse = await fetchBackendApi("/api/company/campaigns", { cache: "no-store" });
          const campaignsData = await campaignsResponse.json().catch(() => ({}));
          checkoutId = campaignsData.campaigns?.find((campaign) => campaign.id === data.campaign?.id)?.storageId || null;
        }
        if (!checkoutId) throw new Error("Impossible de retrouver la campagne créée.");
        const checkoutResponse = await fetchBackendApi("/api/company/campaigns/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: checkoutId }) });
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
  };

  const renderPreviewPane = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: C.ink }}><Eye size={15} /> Aperçu</h3>
        <span className="text-[11px]" style={{ color: C.inkFaint }}>Rendu final</span>
      </div>
      <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: C.surface }}>
        {PLACEMENT_OPTIONS.map((p) => (
          <button type="button" key={p.id} onClick={() => setFormat(p.id)} className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors" style={{ background: format === p.id ? C.card : "transparent", color: format === p.id ? C.blueDeep : C.inkFaint, boxShadow: format === p.id ? C.shadowXs : "none" }}>{p.label}</button>
        ))}
      </div>
      <div className="flex items-center justify-center py-1">
        {format === "post" && <FeedAdPreview pageName={pageName} avatarUrl={avatarUrl} description={description} media={media} website={website} title={title} cta={cta} />}
        {format === "story" && <StoryAdPreview pageName={pageName} avatarUrl={avatarUrl} description={description} media={media} cta={cta} />}
        {format === "sidebar" && <ColumnAdPreview pageName={pageName} avatarUrl={avatarUrl} title={title} description={description} media={media} />}
      </div>
      <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <ReachDial pct={reachPct} />
        <div className="text-xs" style={{ color: C.inkSoft }}>
          <p className="font-semibold" style={{ color: C.ink }}>Résultats estimés</p>
          <p className="mt-1">Portée quotidienne : <span className="font-semibold" style={{ color: C.ink }}>{estReach}</span></p>
          <p className="mt-0.5">Résultat visé : <span className="font-semibold" style={{ color: C.ink }}>{estResult}</span></p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="company-sponsor-modal-overlay fixed left-0 right-0 bottom-0 z-50 flex items-start justify-center overflow-y-auto p-0 pt-0 sm:items-center sm:p-5" style={{ top: "var(--lynora-header-offset, 0px)", background: "rgba(19,28,51,0.62)", backdropFilter: "blur(5px)" }}>
      <div role="dialog" aria-modal="true" className="company-sponsor-modal my-0 sm:my-auto w-screen h-dvh sm:h-auto sm:w-full max-w-none sm:max-w-5xl rounded-none sm:rounded-[24px] overflow-hidden flex flex-col max-h-none sm:max-h-[calc(100dvh-var(--lynora-header-offset,0px)-40px)]" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 24px 64px rgba(19,28,51,0.3)", animation: "modalPop .28s cubic-bezier(.22,1,.36,1)" }}>
        <div className="sticky top-0 z-10 shrink-0 px-4 sm:px-7 pt-5 pb-5 flex items-start justify-between gap-3" style={{ background: `linear-gradient(135deg, ${C.blueDeep}, ${C.blue})`, borderBottom: `1px solid ${C.blueDeep}` }}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,166,35,0.18)", color: "#FFD77A" }}><Megaphone size={19} /></div>
            <div><div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#FFD77A" }}>Espace entreprise · Publicité</div><h2 className="text-xl font-bold mt-1" style={{ color: "#fff" }}>{published ? "Campagne programmée" : "Créer une publicité"}</h2><p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.72)" }}>Configurez le contenu, l'audience et le budget de votre campagne.</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors" style={{ color: "#fff" }}><X size={18} /></button>
        </div>

        {published || paymentPending ? (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-7 py-6">
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: paymentPending ? C.goldSoft : C.greenSoft }}><Check size={26} style={{ color: paymentPending ? C.goldDeep : C.green }} /></div>
              <p className="font-semibold" style={{ color: C.ink }}>{paymentPending ? "Paiement en attente de confirmation" : "Votre publicité est en cours de diffusion"}</p>
              <p className="text-sm max-w-sm" style={{ color: C.inkFaint }}>{paymentPending ? "Votre campagne sera activée dès que le paiement Mobile Money sera confirmé." : `Objectif « ${OBJECTIVES.find((o) => o.id === objective)?.label} » · ${dailyBudget} ${currency} / jour · audience ${audienceMode === "advantage" ? "automatique" : `${age[0]}–${age[1]} ans, ${gender.toLowerCase()}`}.`}</p>
            </div>
            <div className="max-w-sm mx-auto">
              <p className="text-xs font-semibold mb-2 text-center" style={{ color: C.inkFaint }}>Rendu final de votre publicité</p>
              <FeedAdPreview pageName={pageName} avatarUrl={avatarUrl} description={description} media={media} website={website} title={title} cta={cta} />
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-[1fr_380px]">
            <div className="overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
              {error && <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: C.redSoft, color: C.red }}>{error}</div>}

              <SectionCard icon={PenSquare} title="Contenu de la publicité" subtitle="Ce que verront les personnes ciblées">
                <Field label="Titre de la campagne"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Offre de rentrée" className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-4" style={inputStyle} /></Field>
                <Field label={`Texte publicitaire (${description.length}/3000)`}>
                  <textarea required value={description} maxLength={3000} onChange={(event) => setDescription(event.target.value)} placeholder="Présentez votre offre en détail..." className="w-full min-h-24 px-3 py-2 rounded-lg text-sm outline-none resize-y mb-4" style={inputStyle} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <Field label="Bouton d'action (CTA)"><select value={cta} onChange={(event) => setCta(event.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>{CTA_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></Field>
                  <Field label="Visuel (image ou vidéo)">
                    <label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); readMedia(event.dataTransfer.files[0]); }} className="flex items-center gap-2 min-h-10 px-3 rounded-lg text-xs cursor-pointer" style={{ ...inputStyle, borderStyle: "dashed" }}><UploadCloud size={15} /> {media ? media.name : "Glissez-déposez ou choisissez un fichier"}<input type="file" accept="image/*,video/*" className="sr-only" onChange={(event) => readMedia(event.target.files[0])} /></label>
                  </Field>
                </div>
                {media && (
                  <div className="mb-4 flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                    <span className="text-xs font-medium truncate" style={{ color: C.inkSoft }}>{media.name}</span>
                    <button type="button" onClick={() => setMedia(null)} className="text-xs font-semibold hover:underline shrink-0" style={{ color: C.red }}>Retirer</button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </SectionCard>

              <SectionCard icon={Target} title="Objectif de la campagne" subtitle="Quel résultat souhaitez-vous obtenir ?">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {OBJECTIVES.map((o) => {
                    const active = objective === o.id;
                    return (
                      <button type="button" key={o.id} onClick={() => setObjective(o.id)} className="rounded-xl p-3 flex flex-col items-center gap-1.5 text-center transition-colors" style={{ border: `1.5px solid ${active ? C.blueDeep : C.border}`, background: active ? C.blueSoft : C.surface }}>
                        <o.icon size={19} style={{ color: active ? C.blueDeep : C.inkSoft }} />
                        <span className="text-xs font-semibold" style={{ color: C.ink }}>{o.label}</span>
                        <span className="text-[10px] leading-tight" style={{ color: C.inkFaint }}>{o.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard icon={Users} title="Audience" subtitle="Qui doit voir votre publicité ?">
                <div className="flex gap-2 mb-4">
                  <button type="button" onClick={() => setAudienceMode("advantage")} className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-left" style={{ border: `1.5px solid ${audienceMode === "advantage" ? C.blueDeep : C.border}`, background: audienceMode === "advantage" ? C.blueSoft : C.surface }}>
                    <Sparkles size={16} style={{ color: audienceMode === "advantage" ? C.blueDeep : C.inkSoft }} />
                    <span><span className="block text-xs font-bold" style={{ color: C.ink }}>Audience avantage+</span><span className="block text-[10px]" style={{ color: C.inkFaint }}>Optimisation automatique (recommandé)</span></span>
                  </button>
                  <button type="button" onClick={() => setAudienceMode("manual")} className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-left" style={{ border: `1.5px solid ${audienceMode === "manual" ? C.blueDeep : C.border}`, background: audienceMode === "manual" ? C.blueSoft : C.surface }}>
                    <SlidersHorizontal size={16} style={{ color: audienceMode === "manual" ? C.blueDeep : C.inkSoft }} />
                    <span><span className="block text-xs font-bold" style={{ color: C.ink }}>Audience personnalisée</span><span className="block text-[10px]" style={{ color: C.inkFaint }}>Définir l'âge, le genre, les centres d'intérêt</span></span>
                  </button>
                </div>
                <Field label="Pays ou région"><select value={location} onChange={(event) => setLocation(event.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-4" style={inputStyle}><option value="">Sélectionnez une zone</option><option value="Madagascar">Madagascar</option><option value="France">France</option><option value="Canada">Canada</option><option value="Belgique">Belgique</option><option value="Afrique francophone">Afrique francophone</option><option value="Monde">Monde</option></select></Field>
                {audienceMode === "manual" ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <Field label={`Âge : ${age[0]} – ${age[1]} ans`}>
                        <div className="flex items-center gap-2"><input aria-label="Âge minimum" type="number" min="13" max={age[1]} value={age[0]} onChange={(e) => setAge([Math.min(Number(e.target.value), age[1]), age[1]])} className="w-20 px-2 py-2 rounded-lg text-sm outline-none" style={inputStyle} /><span>à</span><input aria-label="Âge maximum" type="number" min={age[0]} max="65" value={age[1]} onChange={(e) => setAge([age[0], Math.max(Number(e.target.value), age[0])])} className="w-20 px-2 py-2 rounded-lg text-sm outline-none" style={inputStyle} /></div>
                        <input type="range" min="13" max="65" value={age[1]} onChange={(e) => setAge([age[0], Number(e.target.value)])} className="w-full mt-2" style={{ accentColor: C.blueDeep }} />
                      </Field>
                      <Field label="Genre">
                        <div className="flex gap-2">
                          {["Tous", "Homme", "Femme"].map((g) => (
                            <button type="button" key={g} onClick={() => setGender(g)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: gender === g ? C.blueDeep : C.surface, color: gender === g ? "#fff" : C.inkSoft, border: `1px solid ${C.border}` }}>{g}</button>
                          ))}
                        </div>
                      </Field>
                    </div>
                    <Field label="Centres d'intérêt"><div className="flex flex-wrap gap-2">{["Entrepreneuriat", "Technologie", "Mode", "Finance", "Voyage", "Formation"].map((interest) => { const active = interests.split(",").map((item) => item.trim()).includes(interest); return <button type="button" key={interest} onClick={() => setInterests(active ? interests.split(",").filter((item) => item.trim() !== interest).join(", ") : [interests, interest].filter(Boolean).join(", "))} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: active ? C.blueDeep : C.surface, color: active ? "#fff" : C.inkSoft, border: `1px solid ${active ? C.blueDeep : C.border}` }}>{interest}</button>; })}</div></Field>
                  </>
                ) : (
                  <div className="rounded-xl px-3.5 py-3 flex items-start gap-2.5" style={{ background: C.goldLight }}>
                    <Info size={15} style={{ color: C.goldDeep, marginTop: 2 }} />
                    <p className="text-xs" style={{ color: C.goldDeep }}>Le système ajuste automatiquement l'âge, le genre et les centres d'intérêt pour maximiser vos résultats sur la zone sélectionnée.</p>
                  </div>
                )}
              </SectionCard>

              <SectionCard icon={LayoutGrid} title="Emplacements" subtitle="Où votre publicité doit-elle apparaître ?">
                <div className="flex gap-2 mb-4">
                  <button type="button" onClick={() => setPlacementMode("automatic")} className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-left" style={{ border: `1.5px solid ${placementMode === "automatic" ? C.blueDeep : C.border}`, background: placementMode === "automatic" ? C.blueSoft : C.surface }}>
                    <Sparkles size={16} style={{ color: placementMode === "automatic" ? C.blueDeep : C.inkSoft }} />
                    <span><span className="block text-xs font-bold" style={{ color: C.ink }}>Automatique</span><span className="block text-[10px]" style={{ color: C.inkFaint }}>Diffusion optimisée (recommandé)</span></span>
                  </button>
                  <button type="button" onClick={() => setPlacementMode("manual")} className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-left" style={{ border: `1.5px solid ${placementMode === "manual" ? C.blueDeep : C.border}`, background: placementMode === "manual" ? C.blueSoft : C.surface }}>
                    <SlidersHorizontal size={16} style={{ color: placementMode === "manual" ? C.blueDeep : C.inkSoft }} />
                    <span><span className="block text-xs font-bold" style={{ color: C.ink }}>Manuel</span><span className="block text-[10px]" style={{ color: C.inkFaint }}>Choisir précisément l'emplacement</span></span>
                  </button>
                </div>
                {placementMode === "manual" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {PLACEMENT_OPTIONS.map((p) => {
                      const active = format === p.id;
                      return (
                        <button type="button" key={p.id} onClick={() => selectPlacement(p.id)} className="rounded-xl p-3 flex flex-col items-center gap-1.5 text-center" style={{ border: `1.5px solid ${active ? C.blueDeep : C.border}`, background: active ? C.blueSoft : C.surface }}>
                          <p.icon size={18} style={{ color: active ? C.blueDeep : C.inkSoft }} />
                          <span className="text-xs font-semibold" style={{ color: C.ink }}>{p.label}</span>
                          <span className="text-[10px] leading-tight" style={{ color: C.inkFaint }}>{p.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard icon={Wallet} title="Budget, durée & paiement" subtitle="Combien souhaitez-vous investir ?">
                <div className="flex gap-2 mb-4">
                  <button type="button" onClick={() => setBudgetMode("daily")} className="flex-1 rounded-xl px-3 py-2.5 text-xs font-bold" style={{ border: `1.5px solid ${budgetMode === "daily" ? C.blueDeep : C.border}`, background: budgetMode === "daily" ? C.blueSoft : C.surface, color: C.ink }}>Budget quotidien</button>
                  <button type="button" onClick={() => setBudgetMode("total")} className="flex-1 rounded-xl px-3 py-2.5 text-xs font-bold" style={{ border: `1.5px solid ${budgetMode === "total" ? C.blueDeep : C.border}`, background: budgetMode === "total" ? C.blueSoft : C.surface, color: C.ink }}>Budget total</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {budgetMode === "daily" ? (
                    <Field label="Budget quotidien">
                      <div className="flex items-center gap-2"><input type="number" min="1" step="0.5" value={dailyBudget} onChange={(e) => setDailyBudget(Math.max(1, Number(e.target.value)))} className="w-28 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} /><span className="text-sm font-semibold" style={{ color: C.ink }}>{currency} / jour</span></div>
                    </Field>
                  ) : (
                    <Field label="Budget total">
                      <div className="flex items-center gap-2"><input type="number" min="5" step="1" value={budget} onChange={(e) => setBudget(Math.max(5, Number(e.target.value)))} className="w-28 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} /><span className="text-sm font-semibold" style={{ color: C.ink }}>{currency}</span></div>
                    </Field>
                  )}
                  <Field label="Durée de diffusion">
                    <div className="flex items-center gap-2"><input type="number" min="1" max="90" value={durationDays} onChange={(e) => setDurationDays(Math.max(1, Number(e.target.value)))} className="w-20 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} /><span className="text-sm font-semibold" style={{ color: C.ink }}>jour{durationDays > 1 ? "s" : ""}</span></div>
                  </Field>
                </div>
                <div className="rounded-xl p-4 mb-4" style={{ background: C.blueSoft, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.ink }}><CalendarDays size={16} style={{ color: C.blue }} /> Période estimée</div>
                  <p className="text-xs mt-2" style={{ color: C.inkFaint }}>{budgetMode === "daily" ? `${dailyBudget} ${currency}/jour` : `${budget} ${currency} au total`} · {durationDays} jour{durationDays > 1 ? "s" : ""} de diffusion, soit environ {budgetMode === "daily" ? budget.toFixed(2) : dailyBudget.toFixed(2)} {currency} {budgetMode === "daily" ? "au total" : "par jour"}.</p>
                  <p className="text-sm mt-1 font-semibold" style={{ color: C.blueDeep }}>{schedule.startDate} → {schedule.endDate}</p>
                </div>
                <Field label="Moyen de paiement"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}><option value="stripe">Carte bancaire / Stripe</option><option value="paypal">PayPal</option><option value="mobile_money">Mobile Money</option></select></Field>
              </SectionCard>

              <div className="lg:hidden rounded-2xl p-4 sm:p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                {renderPreviewPane()}
              </div>
            </div>

            <div className="hidden lg:flex flex-col overflow-y-auto px-5 py-5" style={{ background: C.surface, borderLeft: `1px solid ${C.border}` }}>
              {renderPreviewPane()}
            </div>
          </div>
        )}

        <div className="z-10 shrink-0 mx-3 mb-3 rounded-xl border px-3 sm:mx-0 sm:mb-0 sm:rounded-none sm:border-0 sm:px-6 py-3 flex items-center justify-between gap-3" style={{ borderColor: C.border, borderTop: `1px solid ${C.border}`, background: "rgba(243,245,249,0.7)" }}>
          {published || paymentPending ? (
            <button type="button" onClick={onClose} className="ml-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ background: C.blueDeep }}>Fermer</button>
          ) : (
            <>
              <span className="text-xs font-medium" style={{ color: C.inkFaint }}>Vous dépenserez environ <strong style={{ color: C.ink }}>{dailyBudget} {currency}/jour</strong> · <strong style={{ color: C.ink }}>{budget} {currency}</strong> au total sur {durationDays} jour{durationDays > 1 ? "s" : ""}.</span>
              <button type="button" disabled={saving} onClick={publish} className="flex items-center gap-1.5 min-h-11 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0" style={{ background: C.gold, color: C.blueDeep }}><Wand2 size={16} /> {saving ? "Enregistrement..." : "Publier la publicité"}</button>
            </>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 640px) { .company-sponsor-modal-overlay { top: var(--lynora-header-offset, 0px) !important; right: 0 !important; bottom: 0 !important; left: 0 !important; padding: 0 !important; align-items: flex-start !important; } .company-sponsor-modal { width: 100vw !important; max-width: none !important; height: calc(100dvh - var(--lynora-header-offset, 0px)) !important; max-height: calc(100dvh - var(--lynora-header-offset, 0px)) !important; min-height: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; } .company-sponsor-modal > div:nth-child(2) { overflow-y: auto; min-height: 0; } }`}</style>
    </div>
  );
}
/* ---------------------------------------------------------------
   Company detail page — REDESIGNED with hero banner, stats grid,
   media gallery, right sidebar (community + events)
----------------------------------------------------------------*/
export function CompanyPage({ company, onBack, onDeleted, isOwner = false, canCreatePost = false, onSwitchAccount, onUpdateCompany, onOpenComposer, onOpenSponsor, onOpenProfile, onToggleFollow, onMessage, onToggleLike, onSelectReaction, onToggleBookmark, onAddComment, onReplyComment, onToggleCommentLike, onShare, onFollowPage, followedPageIds = [], isCompanyAccount = false, headerOffset = 0 }) {
  const [tab, setTab] = useState("publications");
  const [posts, setPosts] = useState([]);
  const [openPost, setOpenPost] = useState(null);
  const [postsLoading, setPostsLoading] = useState(Boolean(company?.id));
  const [postsError, setPostsError] = useState("");
  const [companyReels, setCompanyReels] = useState([]);
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
    const response = await fetchBackendApi("/api/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobs: nextJobs }) });
    const updated = await response.json();
    if (!response.ok) throw new Error(updated.error || "Impossible de publier l'annonce.");
    setJobs(nextJobs);
    onUpdateCompany?.(updated);
  };

  const updateJob = async (jobId, changes) => {
    const nextJobs = jobs.map((job) => job.id === jobId ? { ...job, ...changes } : job);
    const response = await fetchBackendApi("/api/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobs: nextJobs }) });
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
    fetchBackendApi(`/api/company/follow?pageId=${encodeURIComponent(company.id)}`, { cache: "no-store" })
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
      const response = await fetchBackendApi("/api/company/follow", {
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
        const response = await fetchBackendApi(`/api/posts?companyPageId=${encodeURIComponent(company.id)}&limit=50`, { cache: "no-store", signal: controller.signal });
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
    if (!company?.id) return undefined;
    let mounted = true;
    fetchBackendApi(`/api/reels?pageId=${encodeURIComponent(company.id)}&limit=20`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { reels: [] })
      .then((data) => {
        if (mounted) setCompanyReels(Array.isArray(data.reels) ? data.reels : []);
      })
      .catch(() => {
        if (mounted) setCompanyReels([]);
      });
    return () => { mounted = false; };
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
    ...companyReels.map((reel) => ({
      id: `reel-media-${reel.id}`,
      url: reel.videoUrl || reel.poster,
      type: "video",
      label: reel.caption || "Reel",
    })),
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
    { id: "media", label: "Médias" },
    { id: "jobs", label: "Offres d\'emploi" },
    { id: "about", label: "À propos" },
    ...(isOwner ? [{ id: "advertising", label: "Publicité" }] : []),
    ...(isOwner ? [{ id: "admin", label: "Administration" }] : []),
  ];

  const applyUpload = (dataUrl) => {
    if (uploadKind === "avatar") setAvatarUrl(dataUrl);
    if (uploadKind === "cover") setCoverUrl(dataUrl);
    const patch = uploadKind === "avatar" ? { logoUrl: dataUrl, avatarUrl: dataUrl } : { bannerUrl: dataUrl, coverUrl: dataUrl };
    fetchBackendApi("/api/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) })
      .then((response) => response.ok ? response.json() : null)
      .then((updated) => updated && onUpdateCompany?.(updated))
      .catch(() => {});
    setUploadKind(null);
  };

  const setMediaAsCompanyImage = async (mediaUrl, kind) => {
    if (!mediaUrl || !["avatar", "cover"].includes(kind)) return;
    const patch = kind === "avatar" ? { logoUrl: mediaUrl, avatarUrl: mediaUrl } : { bannerUrl: mediaUrl, coverUrl: mediaUrl };
    const response = await fetchBackendApi("/api/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const updated = await response.json().catch(() => ({}));
    if (!response.ok) return;
    if (kind === "avatar") setAvatarUrl(mediaUrl);
    else setCoverUrl(mediaUrl);
    onUpdateCompany?.(updated);
  };

  const deleteMedia = async (media, index) => {
    if (!media?.url) return;
    if (media.post?.id) {
      const response = await fetchBackendApi(`/api/posts/${encodeURIComponent(media.post.id)}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mediaUrl: media.url }) });
      if (!response.ok) return;
      setPosts((current) => current.map((post) => post.id === media.post.id ? { ...post, media: (Array.isArray(post.media) ? post.media : []).filter((item) => item?.url !== media.url), mediaUrl: post.mediaUrl === media.url ? null : post.mediaUrl } : post));
    } else {
      const nextMedia = (Array.isArray(company?.media) ? company.media : []).filter((item) => item?.url !== media.url);
      const response = await fetchBackendApi("/api/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ media: nextMedia }) });
      const updated = await response.json().catch(() => ({}));
      if (!response.ok) return;
      onUpdateCompany?.(updated);
    }
    if (pageMedia.length > 1) setGalleryIndex((index >= pageMedia.length - 1 ? index - 1 : index));
    else setGalleryOpen(false);
  };

  return (
    <div ref={pageScrollRef} className="company-page lynora-page lynora-company-detail min-h-full w-full" style={{ height: "calc(100dvh - var(--lynora-header-offset, 0px))", overflowY: "auto", overflowX: "hidden", overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch", background: C.surface, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
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
      <div className="company-detail-shell lynora-detail-shell w-full max-w-[1400px] mx-auto px-4 sm:px-6 pb-16">
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
          className="lynora-detail-back-button mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-all hover:-translate-x-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            color: C.blueDeep,
            background: C.card,
            border: `1px solid ${C.border}`,
            boxShadow: "0 4px 12px rgba(19,28,51,0.06)",
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.25} /> Retour aux pages
        </button>

        {/* Hero banner — taller, more impactful, premium mesh + grain finish */}
        <div
          onMouseEnter={() => setCoverHover(true)}
          onMouseLeave={() => setCoverHover(false)}
          className="company-page-hero lynora-cover relative mt-3 h-[150px] sm:h-[215px] rounded-[22px] overflow-hidden"
          style={{
            background: coverUrl
              ? `center / cover no-repeat url(${coverUrl})`
              : `linear-gradient(120deg, ${C.navyDeep} 0%, ${C.navyMid} 46%, ${C.navyGlow} 78%, ${C.goldDeep} 130%)`,
            boxShadow: C.shadowLg,
          }}
        >
          {/* Mesh accents */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -right-12 w-72 h-72 rounded-full blur-2xl" style={{ background: "rgba(255,255,255,0.10)" }} />
            <div className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full blur-2xl" style={{ background: "rgba(238,175,35,0.16)" }} />
            <div className="absolute top-6 right-[28%] w-24 h-24 rounded-full blur-xl" style={{ background: "rgba(255,206,85,0.18)" }} />
          </div>
          {/* Radial light + subtle grain for texture */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 82% 15%, rgba(255,255,255,0.16), transparent 55%)" }} />
          <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" preserveAspectRatio="none" style={{ opacity: 0.05, mixBlendMode: "overlay" }}>
            <defs>
              <pattern id="heroGrain" width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.6" fill="#fff" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#heroGrain)" />
          </svg>
          {/* Bottom fade so the identity row reads cleanly over any photo */}
          <div className="absolute inset-x-0 bottom-0 h-14" style={{ background: "linear-gradient(180deg, transparent, rgba(8,15,38,.28))" }} />
          {isOwner && (
            <div className="absolute inset-0 flex items-end justify-end p-4 transition-opacity" style={{ opacity: coverHover ? 1 : 0 }}>
              <button
                onClick={() => setUploadKind("cover")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold backdrop-blur-md transition-transform hover:scale-105"
                style={{ background: "rgba(255,255,255,0.94)", color: C.ink, boxShadow: C.shadowMd }}
              >
                <Camera size={14} /> Changer la couverture
              </button>
            </div>
          )}
        </div>
        {/* Identity row — avatar overlaps banner + content */}
        <div className="company-page-identity lynora-header-identity flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-1 -mt-9 sm:-mt-10">
          <div className="flex items-end gap-3 sm:gap-4 min-w-0">
            <div
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
              className="relative w-[100px] h-[100px] sm:w-[152px] sm:h-[152px] rounded-full shrink-0"
              style={{ padding: 4, background: `linear-gradient(135deg, ${C.card}, ${C.card})`, borderRadius: "50%", overflow: "visible", boxShadow: `${C.shadowLg}, 0 0 0 1px ${C.border}` }}
            >
              <div
                className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                style={{ background: avatarUrl ? undefined : `linear-gradient(135deg, ${C.navyMid}, ${C.navyDeep})`, borderRadius: "50%", color: "#fff" }}
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
                {company?.isPlatformAdmin ? <EnterpriseBadge size={19} label="Officiel" /> : company?.isPremium ? <PremiumBadge size={19} label="Page Premium" /> : company?.verified && <Check size={18} style={{ color: C.blueMid }} />}
              </div>
              <p className="text-xs sm:text-sm mt-0.5 line-clamp-2" style={{ color: C.inkFaint }}>{companySlogan}</p>
            </div>
          </div>
          <div className="company-page-actions flex items-center gap-2 mt-3 sm:mt-12 shrink-0">
            {viewingAsPage ? (
              <button
                type="button"
                onClick={() => setCompanyInviteOpen(true)}
                className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all hover:-translate-y-0.5"
                style={{ border: `1px solid ${C.border}`, background: C.card, color: C.inkSoft }}
              >
                <UserRoundPlus size={15} /> Inviter
              </button>
            ) : isOwner ? (
              <button
                type="button"
                onClick={switchToPageAccount}
                className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all hover:-translate-y-0.5"
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
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all hover:-translate-y-0.5"
                  style={{
                    border: followed ? `1px solid ${C.border}` : "none",
                    background: followed ? C.card : C.goldGrad,
                    color: followLoading ? C.inkFaint : followed ? C.inkSoft : C.navyDeep,
                    boxShadow: followed ? "none" : C.shadowGold,
                    opacity: followLoading ? 0.7 : 1,
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
                className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all hover:-translate-y-0.5"
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
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all hover:-translate-y-0.5"
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
                  onClick={() => company?.isPremium && setSponsorOpen(true)}
                  disabled={!company?.isPremium}
                  title={!company?.isPremium ? "Réservé aux Pages Entreprise Premium" : undefined}
                  className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
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
                className="px-3.5 sm:px-4 py-2.5 mb-1 text-xs sm:text-sm font-semibold relative transition-all whitespace-nowrap shrink-0 rounded-full"
                style={{
                  color: active ? C.navy : C.inkFaint,
                  background: active ? C.navyLight : "transparent",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.surface; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                {t.label}
                {active && <span className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-5 h-[3px] rounded-full" style={{ background: C.goldGrad }} />}
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
            <CampaignDashboard onOpenSponsor={onOpenSponsor || (() => setSponsorOpen(true))} company={company} />
          </div>
        ) : tab === "admin" ? (
          <div className="mt-5 px-1">
            <AdministrationTab onOpenSponsor={onOpenSponsor || (() => setSponsorOpen(true))} onUpdateCompany={onUpdateCompany} onDeleted={onDeleted} onOpenProfile={onOpenProfile} company={{ ...company, posts, stats: { ...(company?.stats || {}), posts: posts.length } }} />
          </div>
        ) : (
          <div className="company-page-content lynora-detail-layout mt-5 px-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
            <div className="min-w-0">
              {tab === "publications" && <PublicationsTab company={company} posts={posts} loading={postsLoading} error={postsError} onRetry={() => { setPostsError(""); window.dispatchEvent(new Event("lynoralink:company-posts-updated")); }} canCreatePost={canCreatePost} onOpenComposer={onOpenComposer} currentUser={{ id: company?.id, name: companyName, initials: companyName.split(" ").map((word) => word[0]).slice(0, 2).join(""), avatarUrl }} onToggleLike={onToggleLike} onSelectReaction={onSelectReaction} onToggleBookmark={onToggleBookmark} onAddComment={onAddComment} onReplyComment={onReplyComment} onToggleCommentLike={onToggleCommentLike} onShare={onShare} onOpenPost={setOpenPost} onOpenArticle={setOpenPost} onFollowPage={onFollowPage} followedPageIds={followedPageIds} isCompanyAccount={isCompanyAccount} />}
              {tab === "media" && <MediaGalleryCard media={pageMedia} onViewGallery={(index = 0) => { setGalleryIndex(index); setGalleryOpen(true); }} />}
              {tab === "jobs" && <JobsTab jobs={jobs} company={company} canManage={isOwner} onCreateJob={createJob} onUpdateJob={updateJob} onJobAction={(job) => onMessage?.({ id: company?.ownerId || company?.id, pageId: company?.id, name: companyName, title: job.title, image: avatarUrl, avatarUrl, initials: companyName.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") })} />}
              {tab === "about" && <AboutTab company={company} />}
            </div>

            {/* Right sidebar — Community + Events */}
            <aside
              role={mobileSidebarOpen ? "dialog" : undefined}
              aria-modal={mobileSidebarOpen ? "true" : undefined}
              aria-labelledby={mobileSidebarOpen ? "company-sidebar-title" : undefined}
              className={`${mobileSidebarOpen ? "fixed flex" : "hidden"} company-page-right-sidebar lg:flex lg:sticky lg:bottom-4 flex-col gap-4 self-end z-[1200] lg:z-auto w-screen max-w-none lg:w-auto h-dvh lg:h-auto overflow-visible bg-white lg:bg-transparent shadow-2xl lg:shadow-none p-4 lg:p-0 rounded-none lg:rounded-none`}
              style={mobileSidebarOpen
                ? { top: 0, left: 0, right: 0, bottom: 0, maxHeight: "none", pointerEvents: "auto" }
                : { pointerEvents: "none" }}
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
              <div className="rounded-[18px] p-5" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: C.shadowXs }}>
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
              <div className="rounded-[18px] p-5" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: C.shadowXs }}>
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
            {mobileSidebarOpen && (
              <button
                type="button"
                aria-label="Fermer la sidebar"
                onClick={() => setMobileSidebarOpen(false)}
                className="fixed inset-0 z-[1100] bg-[#131C33]/45 lg:hidden"
                style={{ pointerEvents: "auto" }}
              />
            )}
          </div>
        )}
      </div>

      <style>{`@media (max-width: 640px) { .lynora-company-detail { height: auto !important; min-height: 100dvh !important; overflow: visible !important; } .lynora-company-detail .lynora-detail-shell { width: 100% !important; max-width: none !important; padding: 0 0 calc(40px + env(safe-area-inset-bottom)) !important; } .lynora-company-detail .lynora-detail-back-button { margin: 10px 14px 14px !important; } .lynora-company-detail .lynora-cover { height: 150px !important; border-radius: 0 !important; } .lynora-company-detail .company-page-identity { padding-inline: 16px !important; margin-top: -34px !important; } .lynora-company-detail .company-page-identity > div:first-child { min-width: 0 !important; } .lynora-company-detail .company-page-identity > div:first-child > div:last-child { min-width: 0 !important; padding-top: 48px !important; } .lynora-company-detail .company-page-actions { width: 100% !important; margin-top: 0 !important; display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } .lynora-company-detail .company-page-actions button { min-height: 42px !important; } .lynora-company-detail .company-page-metadata { padding-inline: 16px !important; margin-top: 14px !important; } .lynora-company-detail .company-page-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 0 !important; padding-inline: 16px !important; } .lynora-company-detail .company-page-tabs { margin-top: 16px !important; padding-inline: 14px !important; gap: 10px !important; } .lynora-company-detail .company-page-content { display: block !important; margin-top: 12px !important; padding-inline: 0 !important; } .lynora-company-detail .company-page-content > div:first-child { width: 100% !important; min-width: 0 !important; } .lynora-company-detail .company-page-right-sidebar { width: 100vw !important; max-width: none !important; min-height: 100dvh !important; padding: max(16px, env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom)) !important; } .company-page-stats .company-stat-card { border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; padding: 8px 0 !important; } .company-page-stats .company-stat-card + .company-stat-card { border-left: 1px solid ${C.border} !important; padding-left: 8px !important; } .company-admin-layout { display: flex !important; flex-direction: column !important; gap: 12px !important; width: calc(100% + 24px) !important; margin-left: -12px !important; } .company-admin-layout > nav { display: flex !important; flex-direction: row !important; gap: 4px !important; width: 100% !important; overflow-x: auto !important; padding: 6px 12px !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; } .company-admin-layout > nav button { flex: 0 0 auto !important; white-space: nowrap !important; } .company-admin-layout > div { width: 100% !important; min-width: 0 !important; } .company-admin-layout .rounded-2xl { border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; } .company-admin-layout .rounded-2xl + .rounded-2xl { border-top: 1px solid ${C.border} !important; } .company-admin-settings-grid { grid-template-columns: minmax(0, 1fr) !important; gap: 12px !important; } .company-admin-subscriber-row { align-items: flex-start !important; gap: 10px !important; } .company-admin-subscriber-row > div:last-child { flex-shrink: 1 !important; } }`}</style>

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

/* Page card matching the reference image style: avatar, name, actions, switch button. */
function PageCard({ page, onOpen, followed, onFollow, onMessage, isOwn = false }) {
  const [g1, g2] = page.tone || [C.navyMid, C.navyDeep];
  const initials = page.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const avatarUrl = page.avatarUrl || page.logoUrl || page.image || page.photoUrl || null;
  return (
    <article
      className="company-page-card group cursor-pointer"
      style={{
        background: C.card,
        borderRadius: C.r_lg,
        border: `1px solid ${C.border}`,
        boxShadow: C.shadowSm,
        overflow: "hidden",
        transition: "transform .22s cubic-bezier(.2,.8,.2,1), box-shadow .22s ease, border-color .22s ease",
      }}
      onClick={onOpen}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = C.shadowLg; e.currentTarget.style.borderColor = C.gold; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = C.shadowSm; e.currentTarget.style.borderColor = C.border; }}
    >
      <div
        className="company-page-card-cover"
        style={{
          height: 100,
          position: "relative",
          background: page.coverUrl || page.bannerUrl
            ? `linear-gradient(180deg, rgba(10,21,48,.15), rgba(10,21,48,.55)), url(${page.coverUrl || page.bannerUrl}) center/cover no-repeat`
            : `linear-gradient(135deg, ${g1} 0%, ${g2} 100%)`,
        }}
      >
        {!(page.coverUrl || page.bannerUrl) && (
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: .5 }} preserveAspectRatio="none">
            <defs>
              <pattern id={`pgpat-${page.id}`} width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
                <circle cx="2" cy="2" r="1.4" fill="rgba(255,255,255,.35)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#pgpat-${page.id})`} />
          </svg>
        )}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: C.goldGrad }} />
      </div>
      {/* Identity row */}
      <div className="company-page-card-header" style={{ position: "relative", display: "flex", alignItems: "flex-end", padding: "0 14px" }}>
        <div
          className="company-page-card-avatar"
          style={{
            position: "absolute", top: -29, left: 14,
            width: 58, height: 58, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, overflow: "hidden",
            background: `linear-gradient(135deg, ${g1}, ${g2})`,
            boxShadow: `0 6px 16px rgba(15,30,66,.28)`,
            border: `4px solid ${C.card}`,
          }}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            : <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{initials}</span>}
        </div>
        <div className="company-page-card-title-wrap" style={{ flex: 1, minWidth: 0, paddingLeft: 68, paddingBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: C.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {page.name}
            </h3>
            {page.verified && (
              <span style={{ width: 15, height: 15, borderRadius: "50%", background: C.navy, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Check size={9} style={{ color: C.gold, strokeWidth: 3 }} />
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "8px 14px 0", color: C.inkSoft, fontSize: 11.5, lineHeight: 1.4 }}>
        <span>{page.tag || page.industry || "Page entreprise"}</span>
        {page.location && <><span style={{ margin: "0 5px", color: C.inkFaint }}>·</span><span>{page.location}</span></>}
        <span style={{ margin: "0 5px", color: C.inkFaint }}>·</span><span>{Number(page.followers) || 0} abonné{Number(page.followers) === 1 ? "" : "s"}</span>
      </div>

      {/* Primary page action — navy by default, gold when active/followed */}
      <div className="company-page-card-actions" style={{ display: "flex", gap: 8, padding: "14px" }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (!isOwn && onFollow) onFollow(page.id); else onOpen(); }}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "10px 8px", borderRadius: 10, border: 0,
            background: !isOwn && followed ? C.goldGrad : C.navyGradSolid,
            color: !isOwn && followed ? C.navyDeep : "#fff",
            fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, cursor: "pointer",
            boxShadow: !isOwn && followed ? C.shadowGold : "0 4px 12px rgba(14,27,61,.28)",
            transition: "filter .15s ease, transform .15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
        >
          {!isOwn && followed ? <Check size={14} /> : !isOwn ? <UserPlus size={14} /> : <Globe size={14} />}
          {!isOwn ? (followed ? "Suivi" : "Suivre") : "Gérer"}
        </button>
        {!isOwn && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMessage?.(page); }}
            aria-label={`Envoyer un message à ${page.name}`}
            title="Envoyer un message"
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 8px", borderRadius: 10, border: `1.5px solid ${C.navy}`, background: C.navyLight, color: C.navy, fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, cursor: "pointer", transition: "background .15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.navy; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.navyLight; e.currentTarget.style.color = C.navy; }}
          >
            <FontAwesomeIcon icon={faPaperPlane} style={{ width: 13, height: 13 }} /> Message
          </button>
        )}
      </div>

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
      const response = await fetchBackendApi("/api/company", {
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
   Company pages grid — Facebook-inspired layout
   Left rail + centered feed column + horizontal category pills
   + card grid + right suggestions rail
   Lynora palette (navy/gold) & existing logic preserved
----------------------------------------------------------------*/
export function CompanyPagesGrille({ onOpenPage, onOpenCompany, onOpenMyPage, currentCompanyId, currentUserId, companyTab = "discover", onCompanyTabChange, onNavigate, onMessage, canCreatePage = true, onUpgrade, initialPages = [], onPageCreated, followedPageIds = [], onFollowPage }) {
  const [activeCategory, setActiveCategory] = useState("toutes");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarActive, setSidebarActive] = useState("suite");
  const [pageInvitations, setPageInvitations] = useState([]);
  const [pageInvitationsLoading, setPageInvitationsLoading] = useState(false);
  const [pageInvitationsError, setPageInvitationsError] = useState("");
  const [directorySettingsOpen, setDirectorySettingsOpen] = useState(false);
  const [directorySettings, setDirectorySettings] = useState({ compactCards: false });
  const [backendStats, setBackendStats] = useState(null);
  const [backendStatsLoading, setBackendStatsLoading] = useState(false);
  const [backendStatsError, setBackendStatsError] = useState("");
  const [pages, setPages] = useState(() => [
    ...PAGE_DIRECTORY,
    ...initialPages.map((page) => ({
      ...page,
      category: page.category || CATEGORIES.find((category) => category.label === page.industry)?.id || "institution",
      tag: page.tag || page.industry || "Page entreprise",
      desc: page.desc || page.description || "Découvrez cette page entreprise.",
      followers: Number(page.followers) || 0,
      tone: page.tone || [C.navy, C.gold],
      managed: Boolean(page.managed),
    })),
  ]);

  useEffect(() => {
    setPages([
      ...PAGE_DIRECTORY,
      ...initialPages.map((page) => ({
        ...page,
        category: page.category || CATEGORIES.find((category) => category.label === page.industry)?.id || "institution",
        tag: page.tag || page.industry || "Page entreprise",
        desc: page.desc || page.description || "Découvrez cette page entreprise.",
        followers: Number(page.followers) || 0,
        tone: page.tone || [C.navy, C.gold],
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

  useEffect(() => {
    setSidebarActive(companyTab === "mine" ? "suite" : companyTab === "followed" ? "followed" : "decouvrir");
  }, [companyTab]);

  useEffect(() => {
    fetchBackendApi("/api/company/directory-settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.settings) setDirectorySettings(data.settings); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPageInvitationsLoading(true);
    setPageInvitationsError("");
    fetchBackendApi("/api/company/invitations", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "Impossible de charger les invitations.");
        if (!cancelled) setPageInvitations(Array.isArray(data.invitations) ? data.invitations : []);
      })
      .catch((error) => { if (!cancelled) setPageInvitationsError(error.message); })
      .finally(() => { if (!cancelled) setPageInvitationsLoading(false); });
    return () => { cancelled = true; };
  }, [sidebarActive]);

  useEffect(() => {
    if (sidebarActive !== "statistiques") return;
    let cancelled = false;
    setBackendStatsLoading(true);
    setBackendStatsError("");
    fetchBackendApi("/api/company/statistics", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "Impossible de charger les statistiques.");
        if (!cancelled) setBackendStats(data?.stats || null);
      })
      .catch((error) => { if (!cancelled) setBackendStatsError(error.message); })
      .finally(() => { if (!cancelled) setBackendStatsLoading(false); });
    return () => { cancelled = true; };
  }, [sidebarActive]);

  const handlePageInvitation = async (invitationId, action) => {
    try {
      const response = await fetchBackendApi("/api/company/invitations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invitationId, action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Impossible de traiter l'invitation.");
      const invitation = pageInvitations.find((item) => item.id === invitationId);
      setPageInvitations((current) => current.filter((item) => item.id !== invitationId));
      if (action === "accept") {
        onCompanyTabChange?.("followed");
        (onOpenPage || onOpenCompany)?.({ id: invitation?.pageId, name: invitation?.pageName, avatarUrl: invitation?.pageImage });
      }
    } catch (error) {
      setPageInvitationsError(error.message);
    }
  };

  const handleSidebarNavigation = (itemId) => {
    setSidebarActive(itemId);
    setMobileSidebarOpen(false);
    if (itemId === "suite") return onCompanyTabChange?.("mine");
    if (itemId === "decouvrir") return onCompanyTabChange?.("discover");
    if (itemId === "followed") return onCompanyTabChange?.("followed");
    if (itemId === "messagerie") return onNavigate?.("messages");
    if (itemId === "statistiques") return;
    if (itemId === "invitations") return;
  };

  const directoryTitle = sidebarActive === "suite"
    ? "Ma page"
    : sidebarActive === "followed"
      ? "Pages suivies"
      : "Découvrir les pages entreprise";

  const pageStats = useMemo(() => {
    const followers = pages.reduce((total, page) => total + (Number(page.followers) || Number(page.stats?.followers) || 0), 0);
    const posts = pages.reduce((total, page) => total + (Number(page.stats?.posts) || Number(page.postsCount) || 0), 0);
    const jobs = pages.reduce((total, page) => total + (Array.isArray(page.jobs) ? page.jobs.length : Number(page.stats?.jobs) || 0), 0);
    const categories = CATEGORIES.filter((category) => category.id !== "toutes").map((category) => ({
      ...category,
      count: pages.filter((page) => page.category === category.id).length,
    })).filter((category) => category.count > 0);
    const leaders = [...pages].sort((first, second) => (Number(second.followers) || 0) - (Number(first.followers) || 0)).slice(0, 5);
    return { followers, posts, jobs, categories, leaders };
  }, [pages]);

  const handleCreated = (newPage) => {
    onPageCreated?.(newPage);
    setPages((prev) => [
      { id: Date.now(), name: newPage.name || "Nouvelle page", category: newPage.category, tag: CATEGORIES.find((c) => c.id === newPage.category)?.label || "Page", followers: "0", desc: newPage.tagline || "Nouvelle page entreprise.", tone: [C.navy, C.gold], managed: true },
      ...prev,
    ]);
    setCreateOpen(false);
  };

  const openPage = (page) => {
    (onOpenPage || onOpenCompany)?.(page);
  };

  return (
    <div
      className="company-pages-directory min-h-full w-full"
      style={{
        background: `radial-gradient(1200px 600px at 100% -10%, ${C.navyLight}55, transparent), ${C.surface}`,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div className="company-pages-shell" style={{ display: "flex", width: "100%", maxWidth: "none", margin: 0, minHeight: "100%" }}>
        {/* ===== LEFT SIDEBAR (360px) ===== */}
        <aside
          className={`company-sidebar ${mobileSidebarOpen ? "is-open" : ""}`}
          style={{
            width: 360, flexShrink: 0,
            background: C.card,
            borderRight: `1px solid ${C.border}`,
            padding: "0 12px 16px",
            height: "calc(100dvh - var(--lynora-header-offset, 0px))",
            position: "sticky",
            top: "var(--lynora-header-offset, 0px)",
            overflowY: "auto",
            alignSelf: "flex-start",
            display: mobileSidebarOpen ? "block" : "none",
            opacity: mobileSidebarOpen ? 1 : 0,
            visibility: mobileSidebarOpen ? "visible" : "hidden",
            pointerEvents: mobileSidebarOpen ? "auto" : "none",
          }}
        >
          {/* Sidebar header: "Pages" + settings — Facebook-style top bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 12px 8px",
            position: "sticky", top: 0,
            background: C.card, zIndex: 5,
          }}>
            <h2 style={{ fontSize: 23, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: -.3 }}>Pages</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                aria-label="Fermer la sidebar des pages"
                onClick={() => setMobileSidebarOpen(false)}
                className="company-sidebar-close"
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: C.surface, border: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: C.navy,
                }}
              >
                <X size={17} />
              </button>
              <button
                type="button"
                aria-label="Paramètres des pages"
                onClick={() => setDirectorySettingsOpen(true)}
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: C.surface, border: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", position: "relative",
                  transition: "background .15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.navySoft; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.surface; }}
              >
                <Settings size={17} style={{ color: C.navy }} />
              </button>
            </div>
          </div>

          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: C.inkFaint }} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une page"
              aria-label="Rechercher une page entreprise"
              style={{ width: "100%", height: 42, padding: "0 12px 0 36px", border: `1.5px solid ${C.border}`, borderRadius: 22, background: C.surface, color: C.ink, fontFamily: "inherit", fontSize: 13, outline: "none", transition: "border-color .15s ease, background .15s ease" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.background = C.card; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}
            />
          </div>

          {/* Create page button — Facebook-style primary CTA (Lynora navy) */}
          <button
            type="button"
            onClick={() => {
              setMobileSidebarOpen(false);
              if (!canCreatePage) { onUpgrade?.(); return; }
              setCreateOpen(true);
            }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "12px 12px",
              borderRadius: 10, border: 0,
              background: C.navyGradSolid,
              color: "#fff",
              fontFamily: "inherit", fontSize: 15, fontWeight: 700,
              cursor: "pointer",
              marginBottom: 8,
              boxShadow: "0 4px 12px rgba(14,27,61,.28)",
              transition: "background .15s ease, transform .15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 18px rgba(14,27,61,.34)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(14,27,61,.28)"; }}
          >
            <Plus size={17} /> Créer une Page
          </button>

          {/* Separator */}
          <div style={{ height: 1, background: C.border, margin: "6px 0 4px" }} />

          {/* Primary navigation items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
            {SIDEBAR_NAV_PRIMARY.map((item) => {
              const active = sidebarActive === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSidebarNavigation(item.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10, border: "none",
                    background: active ? C.navySoft : "transparent",
                    color: active ? C.navy : C.ink,
                    fontFamily: "inherit", fontSize: 15.5, fontWeight: active ? 700 : 600,
                    cursor: "pointer", width: "100%", textAlign: "left",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.surface; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{
                    width: 32, height: 32, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    background: active ? C.navyGradSolid : "#EEF1F6",
                  }}>
                    <item.icon size={16} style={{ color: active ? C.gold : C.navy }} />
                  </span>
                  {item.label}
                  {item.chevron && (
                    <ChevronRight size={14} style={{ marginLeft: "auto", color: active ? C.navy : "#8A8D91" }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: C.border, margin: "8px 0 4px" }} />

          {/* Secondary navigation items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SIDEBAR_NAV_SECONDARY.map((item) => {
              const active = sidebarActive === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSidebarNavigation(item.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10, border: "none",
                    background: active ? C.navySoft : "transparent",
                    color: active ? C.navy : C.ink,
                    fontFamily: "inherit", fontSize: 15.5, fontWeight: active ? 700 : 600,
                    cursor: "pointer", width: "100%", textAlign: "left",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.surface; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{
                    width: 32, height: 32, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    background: active ? C.navyGradSolid : "#EEF1F6",
                  }}>
                    <item.icon size={16} style={{ color: active ? C.gold : C.navy }} />
                  </span>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    {item.label}
                    {item.id === "invitations" && (
                      <div style={{ fontSize: 13, fontWeight: 400, color: active ? C.navyMid : "#65676B", marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, display: "inline-block" }} />
                        {pageInvitations.length} en attente
                      </div>
                    )}
                  </div>
                  <ChevronRight size={14} style={{ color: active ? C.navy : "#8A8D91" }} />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Mobile sidebar backdrop */}
        {mobileSidebarOpen && (
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 lg:hidden"
            style={{ top: "var(--lynora-header-offset, 0px)", zIndex: 45 }}
          />
        )}

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label="Ouvrir le menu des pages"
          onClick={() => setMobileSidebarOpen(true)}
          className="lg:hidden"
          style={{
            display: "none", position: "fixed",
            top: "calc(var(--lynora-header-offset, 0px) + 8px)", right: 16, zIndex: 50,
            width: 48, height: 48, borderRadius: "50%",
            background: C.navyGradSolid, color: C.gold, border: `2px solid ${C.gold}`,
            boxShadow: "0 6px 18px rgba(10,21,48,0.4)",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Menu size={22} />
        </button>

        {/* ===== MAIN CONTENT ===== */}
        <main className="company-pages-main" style={{ flex: 1, minWidth: 0, padding: "20px 28px 64px" }}>
          {sidebarActive === "statistiques" ? (
            <section className="company-pages-statistics" aria-labelledby="company-pages-statistics-title">
              <div style={{ marginBottom: 22 }}>
                <div style={{ color: C.goldDeep, fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Pilotage</div>
                <h1 id="company-pages-statistics-title" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: 0 }}>Statistiques des pages</h1>
                <p style={{ color: C.inkFaint, fontSize: 13, margin: "6px 0 0" }}>{backendStats?.pageName ? `${backendStats.pageName} · Données synchronisées` : "Vue d’ensemble de votre portefeuille de pages entreprise."}</p>
              </div>
              {backendStatsLoading && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: C.navySoft, color: C.blueDeep, fontSize: 12, fontWeight: 600 }}>Actualisation des données...</div>}
              {backendStatsError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: C.redSoft, color: C.red, fontSize: 12, fontWeight: 600 }}>{backendStatsError}</div>}
              <div className="company-pages-statistics-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Pages", value: backendStats?.pages ?? pages.length, icon: Building2, tone: C.blueDeep },
                  { label: "Pages gérées", value: backendStats?.managedPages ?? managedCount, icon: LayoutDashboard, tone: C.goldDeep },
                  { label: "Abonnés", value: (backendStats?.followers ?? pageStats.followers).toLocaleString("fr-FR"), icon: Users, tone: C.green },
                  { label: "Publications", value: backendStats?.posts ?? pageStats.posts, icon: Activity, tone: C.orange },
                ].map(({ label, value, icon: Icon, tone }) => (
                  <div key={label} style={{ padding: 16, borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><span style={{ color: C.inkFaint, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{label}</span><Icon size={16} style={{ color: tone }} /></div>
                    <strong style={{ display: "block", marginTop: 10, color: C.ink, fontSize: 24 }}>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="company-pages-statistics-columns" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
                <div style={{ padding: 18, borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                  <h2 style={{ margin: "0 0 16px", color: C.ink, fontSize: 16 }}>Répartition par secteur</h2>
                  {pageStats.categories.length === 0 ? <p style={{ color: C.inkFaint, fontSize: 13 }}>Aucune donnée disponible.</p> : pageStats.categories.map((category) => {
                    const ratio = Math.round((category.count / Math.max(1, pages.length)) * 100);
                    return <div key={category.id} style={{ marginBottom: 14 }}><div style={{ display: "flex", justifyContent: "space-between", color: C.inkSoft, fontSize: 12, marginBottom: 5 }}><span>{category.label}</span><strong>{category.count}</strong></div><div style={{ height: 7, borderRadius: 99, background: C.navySoft }}><div style={{ width: `${ratio}%`, height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${C.blueMid}, ${C.gold})` }} /></div></div>;
                  })}
                </div>
                <div style={{ padding: 18, borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                  <h2 style={{ margin: "0 0 16px", color: C.ink, fontSize: 16 }}>Pages les plus suivies</h2>
                  {pageStats.leaders.length === 0 ? <p style={{ color: C.inkFaint, fontSize: 13 }}>Aucune page disponible.</p> : pageStats.leaders.map((page, index) => <button key={page.id} type="button" onClick={() => openPage(page)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 0", border: 0, borderTop: index ? `1px solid ${C.border}` : 0, background: "transparent", color: C.ink, textAlign: "left", cursor: "pointer" }}><span style={{ width: 22, color: C.goldDeep, fontWeight: 800, fontSize: 12 }}>{String(index + 1).padStart(2, "0")}</span><Avatar label={page.name} image={page.avatarUrl || page.logoUrl || page.image} size={34} tone={C.blueDeep} /><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 700 }}>{page.name}</span><span style={{ color: C.inkFaint, fontSize: 11 }}>{Number(page.followers) || 0}</span></button>)}
                </div>
              </div>
            </section>
          ) : sidebarActive === "invitations" ? (
            <section className="company-pages-invitations company-pages-feed" aria-labelledby="page-invitations-title">
              <h1 id="page-invitations-title" style={{ fontSize: 24, fontWeight: 700, color: C.ink, margin: "0 0 16px" }}>Invitations à suivre une page</h1>
              {pageInvitationsLoading && <div style={{ padding: 32, textAlign: "center", color: C.inkFaint }}>Chargement des invitations...</div>}
              {!pageInvitationsLoading && pageInvitationsError && <div style={{ padding: 20, borderRadius: 8, background: C.redSoft, color: C.red, fontSize: 13 }}>{pageInvitationsError}</div>}
              {!pageInvitationsLoading && !pageInvitationsError && pageInvitations.length === 0 && <div style={{ padding: 40, borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, textAlign: "center", color: C.inkFaint }}>Aucune invitation à suivre une page pour le moment.</div>}
              {!pageInvitationsLoading && !pageInvitationsError && pageInvitations.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                  {pageInvitations.map((invitation) => (
                    <article className="company-page-invitation-card" key={invitation.id} style={{ position: "relative", padding: 18, borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 8px 24px rgba(29,47,92,0.07)", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${C.gold}, ${C.goldDeep})` }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingTop: 2 }}>
                        <div style={{ padding: 3, borderRadius: "50%", background: C.goldSoft }}><Avatar label={invitation.pageName} image={invitation.pageImage} size={52} tone={C.goldDeep} /></div>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ display: "block", marginBottom: 4, color: C.goldDeep, fontSize: 10, fontWeight: 800, letterSpacing: .8, textTransform: "uppercase" }}>Invitation de page</span>
                          <strong style={{ display: "block", color: C.ink, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{invitation.pageName}</strong>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 10px", borderRadius: 10, background: C.surface, color: C.inkSoft, fontSize: 12, lineHeight: 1.4 }}>
                        <Avatar label={invitation.inviterName} image={invitation.inviterImage} size={30} tone={C.blueDeep} />
                        <span><strong style={{ color: C.ink }}>{invitation.inviterName}</strong> vous invite à suivre cette page.</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                        <button type="button" onClick={() => handlePageInvitation(invitation.id, "accept")} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 10px", border: 0, borderRadius: 8, background: `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`, color: C.blueDeep, fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 10px rgba(212,137,26,0.2)" }}><Check size={13} /> Accepter</button>
                        <button type="button" onClick={() => handlePageInvitation(invitation.id, "decline")} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 10px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.inkSoft, fontSize: 12, fontWeight: 700, cursor: "pointer" }}><X size={13} /> Refuser</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
          <div className="company-pages-feed-layout">
            {/* ===== CENTER COLUMN — Facebook feed-style ===== */}
            <div className="company-pages-feed">
          {/* Heading */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: C.goldDeep, fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Annuaire</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: C.navy, margin: 0, letterSpacing: -.2 }}>{directoryTitle}</h1>
          </div>

          {/* Category pills — Facebook-style horizontal filters */}
          <div className="company-pages-pills" role="tablist" aria-label="Filtrer par catégorie">
            {CATEGORIES.map((category) => {
              const active = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategory(category.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "9px 16px",
                    borderRadius: 999, flexShrink: 0,
                    border: `1.5px solid ${active ? C.navy : C.border}`,
                    background: active ? C.navyGradSolid : C.card,
                    color: active ? "#fff" : C.inkSoft,
                    fontFamily: "inherit", fontSize: 13, fontWeight: active ? 800 : 600,
                    cursor: "pointer", whiteSpace: "nowrap",
                    transition: "background .15s ease, color .15s ease, border-color .15s ease",
                  }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = C.navySoft; e.currentTarget.style.color = C.navy; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = C.card; e.currentTarget.style.color = C.inkSoft; } }}
                >
                  <category.icon size={14} style={{ color: active ? C.goldBright : C.navy }} />
                  {category.label}
                </button>
              );
            })}
          </div>

          {/* Stats line */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "16px 0 18px" }}>
            {[
              [`${filtered.length} résultat${filtered.length > 1 ? "s" : ""}`, Filter],
              [`${pages.length} page${pages.length > 1 ? "s" : ""}`, Building2],
              [`${managedCount} gérée${managedCount > 1 ? "s" : ""}`, LayoutDashboard],
              [`${totalFollowers} abonnés`, Users],
            ].map(([text, Icon], i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: C.navySoft, border: `1px solid ${C.navyLight}`, fontSize: 12.5, fontWeight: 700, color: C.navy }}>
                <Icon size={13} style={{ color: C.goldDeep }} /> {text}
              </span>
            ))}
          </div>

          {/* Page cards list */}
          {filtered.length === 0 ? (
            <div
              style={{
                borderRadius: 16, padding: "48px 20px", textAlign: "center",
                background: C.card, border: `1.5px dashed ${C.navyLight}`,
              }}
            >
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.navySoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Building2 size={30} style={{ color: C.navy }} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>{sidebarActive === "suite" && !query ? "Vous n’avez pas encore de page" : "Aucune page trouvée"}</p>
              <p style={{ fontSize: 14, color: C.inkFaint, margin: 0 }}>{sidebarActive === "suite" && !query ? "Créez votre page entreprise depuis le bouton du menu." : "Essayez une autre catégorie ou un autre mot-clé."}</p>
            </div>
          ) : (
            <div className="company-page-card-grid" style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${directorySettings.compactCards ? 190 : 220}px, 1fr))`, gap: 16 }}>
              {filtered.map((p) => (
                <PageCard
                  key={p.id}
                  page={p}
                  followed={followedPageIds.includes(p.id)}
                  onFollow={onFollowPage}
                  onMessage={onMessage}
                  onOpen={() => openPage(p)}
                  isOwn={p.managed || (currentUserId && p.ownerId && String(p.ownerId) === String(currentUserId))}
                />
              ))}
            </div>
          )}
            </div>

            {/* ===== RIGHT RAIL — Facebook-style suggestions ===== */}
            <aside className="company-pages-right-rail" aria-label="Pages suggérées">
              <div className="company-pages-rail-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: C.r_lg, padding: 16, boxShadow: C.shadowSm }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.navy }}>Pages suggérées</h3>
                  <Sparkles size={16} style={{ color: C.gold }} />
                </div>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: C.inkFaint }}>Les pages les plus suivies de l'annuaire.</p>
                {pageStats.leaders.length === 0 ? (
                  <p style={{ padding: "14px 0", fontSize: 13, color: C.inkFaint, textAlign: "center" }}>Aucune suggestion pour le moment.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {pageStats.leaders.map((page, index) => (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => openPage(page)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 6px", borderRadius: 10, border: 0,
                          borderTop: index ? `1px solid ${C.border}` : 0,
                          background: "transparent", cursor: "pointer",
                          textAlign: "left", width: "100%",
                          transition: "background .15s ease",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = C.surface; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <Avatar label={page.name} image={page.avatarUrl || page.logoUrl || page.image} size={38} tone={C.blueDeep} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.name}</strong>
                          <small style={{ display: "block", fontSize: 11, color: C.inkFaint }}>{Number(page.followers) || 0} abonné{Number(page.followers) === 1 ? "" : "s"} · {page.tag || page.industry || "Page"}</small>
                        </span>
                        <ChevronRight size={14} style={{ color: C.inkFaint, flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Promotional rail card */}
              <div className="company-pages-rail-card" style={{ background: C.navyGradSolid, borderRadius: C.r_lg, padding: 18, color: "#fff", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, opacity: .14, backgroundImage: "radial-gradient(circle at 85% 15%, #fff , transparent 45%)" }} />
                <div style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Building2 size={15} style={{ color: C.goldBright }} />
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#FFD77A" }}>Votre vitrine</span>
                  </div>
                  <p style={{ margin: "0 0 12px", fontSize: 13.5, lineHeight: 1.45, color: "rgba(255,255,255,.9)" }}>Créez une page entreprise et rassemblez votre communauté autour de votre activité.</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canCreatePage) { onUpgrade?.(); return; }
                      setCreateOpen(true);
                    }}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: 0, background: C.goldGrad, color: C.navyDeep, fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, cursor: "pointer", boxShadow: C.shadowGold }}
                  >
                    + Créer une Page
                  </button>
                </div>
              </div>
            </aside>
          </div>
          )}
        </main>
      </div>

      <CompanyDirectorySettingsModal open={directorySettingsOpen} onClose={() => setDirectorySettingsOpen(false)} onSaved={setDirectorySettings} />

      {/* Responsive styles */}
      <style>{`
        /* ===== Facebook-style feed layout (centered column + right rail) ===== */
        .company-pages-feed-layout {
          display: grid;
          grid-template-columns: minmax(0, 760px);
          gap: 24px;
          justify-content: center;
          align-items: start;
          max-width: 1160px;
          margin: 0 auto;
        }
        .company-pages-feed {
          width: 100%;
          min-width: 0;
          max-width: 760px;
          margin-inline: auto;
        }
        .company-pages-pills {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 2px 2px 8px;
          margin: 0 -2px 4px;
          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-overflow-scrolling: touch;
        }
        .company-pages-pills::-webkit-scrollbar { display: none; }
        .company-pages-pills > button { -webkit-tap-highlight-color: transparent; }
        @media (min-width: 1280px) {
          .company-pages-feed-layout { grid-template-columns: minmax(0, 760px) 320px; }
          .company-pages-right-rail {
            display: flex;
            flex-direction: column;
            gap: 16px;
            position: sticky;
            top: calc(var(--lynora-header-offset, 0px) + 16px);
          }
        }
        @media (max-width: 1279px) {
          .company-pages-right-rail { display: none !important; }
        }

        .company-sidebar-close {
          display: none !important;
        }
        @media (max-width: 1023px) {
          .company-pages-directory {
            height: calc(100dvh - var(--lynora-header-offset, 0px)) !important;
            min-height: calc(100dvh - var(--lynora-header-offset, 0px)) !important;
            overflow: hidden !important;
          }
          .company-pages-shell {
            width: 100% !important;
            max-width: none !important;
            height: calc(100dvh - var(--lynora-header-offset, 0px)) !important;
            min-height: calc(100dvh - var(--lynora-header-offset, 0px)) !important;
            align-items: stretch !important;
          }
          .company-pages-main {
            height: 100% !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
          }
          .company-sidebar {
            position: fixed !important;
            top: var(--lynora-header-offset, 0px) !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            max-width: none !important;
            z-index: 46 !important;
            border-radius: 0 !important;
            border-right: 0 !important;
            box-shadow: 8px 0 30px rgba(0,0,0,0.2) !important;
            transform: translateX(-106%) !important;
            transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease !important;
            pointer-events: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
          .company-sidebar.is-open {
            transform: translateX(0) !important;
            pointer-events: auto !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          .company-sidebar-close {
            display: flex !important;
          }
          .company-pages-directory > div > button[aria-label="Ouvrir le menu des pages"] {
            display: flex !important;
            top: calc(var(--lynora-header-offset, 0px) + 8px) !important;
            right: 16px !important;
            bottom: auto !important;
            left: auto !important;
            width: 48px !important;
            height: 48px !important;
            border-radius: 50% !important;
            justify-content: center !important;
            padding: 0 !important;
            z-index: 50 !important;
            pointer-events: auto;
          }
        }
        @media (min-width: 1024px) {
          .company-pages-directory {
            height: calc(100dvh - var(--lynora-header-offset, 0px));
            min-height: calc(100dvh - var(--lynora-header-offset, 0px));
            overflow: hidden;
          }
          .company-pages-shell {
            display: block !important;
            height: 100% !important;
            min-height: 100% !important;
          }
          .company-sidebar {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            position: fixed !important;
            top: var(--lynora-header-offset, 0px) !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 360px !important;
            height: calc(100dvh - var(--lynora-header-offset, 0px)) !important;
            min-height: calc(100dvh - var(--lynora-header-offset, 0px)) !important;
            max-height: none !important;
            z-index: 3 !important;
            overflow-y: auto !important;
            padding-bottom: 32px !important;
          }
          .company-pages-main { width: calc(100% - 360px) !important; height: 100%; margin-left: 360px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
          .company-pages-directory > div > button[aria-label="Ouvrir le menu des pages"] {
            display: none !important;
          }
        }
        .company-pages-directory {
          width: 100%;
          min-height: 100dvh;
          overflow-x: hidden;
        }
        @media (max-width: 640px) {
          .company-pages-directory { height: auto !important; min-height: 100dvh !important; overflow: visible !important; }
          .company-pages-shell { display: block !important; width: 100% !important; max-width: none !important; min-height: 100dvh !important; }
          .company-pages-main { width: 100% !important; height: auto !important; overflow: visible !important; padding: calc(var(--lynora-header-offset, 0px) + 60px) 12px 56px !important; }
          .company-pages-feed-layout { display: block !important; max-width: none !important; }
          .company-pages-feed { max-width: none !important; }
          .company-pages-pills { padding-right: 56px; }
          .company-page-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; padding: 0 4px; }
          .company-page-card { border-radius: 14px !important; }
          .company-page-card-cover { height: 68px !important; }
          .company-page-card-header { padding-inline: 8px !important; gap: 6px !important; }
          .company-page-card-avatar { width: 46px !important; height: 46px !important; top: -23px !important; left: 8px !important; border-width: 2px !important; }
          .company-page-card-title-wrap { padding-left: 54px !important; }
          .company-page-card-header h3 { font-size: 12px !important; }
          .company-page-card-quick-actions { gap: 2px !important; }
          .company-page-card-quick-actions button { padding: 4px !important; }
          .company-page-card-actions { padding: 8px !important; }
          .company-page-card-actions button { font-size: 11px !important; padding: 9px 5px !important; border-radius: 8px !important; }
          .company-pages-statistics { padding: 0 14px; }
          .company-pages-statistics-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; }
          .company-pages-statistics-kpis > div { padding: 12px !important; }
          .company-pages-statistics-kpis strong { font-size: 20px !important; }
          .company-pages-statistics-columns { grid-template-columns: minmax(0, 1fr) !important; gap: 10px !important; }
        }
        .company-page { overflow-x: hidden; }
        .company-pages-directory, .company-page { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
        .company-pages-directory *:focus-visible, .company-page *:focus-visible {
          outline: 2px solid ${C.gold} !important;
          outline-offset: 2px;
        }
        .company-pages-main::-webkit-scrollbar, .company-sidebar::-webkit-scrollbar { width: 8px; }
        .company-pages-main::-webkit-scrollbar-thumb, .company-sidebar::-webkit-scrollbar-thumb {
          background: ${C.border}; border-radius: 8px;
        }
        .company-pages-main::-webkit-scrollbar-thumb:hover, .company-sidebar::-webkit-scrollbar-thumb:hover {
          background: ${C.navyGlow}55;
        }
      `}</style>

      {createOpen && <CreateCompanyPageModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}

export default CompanyPage;
