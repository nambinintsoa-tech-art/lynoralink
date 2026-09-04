"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import {
  Plus, X, Type, Image as ImageIcon, Upload, ChevronLeft, ChevronRight,
  Heart, Send, MoreHorizontal, Trash2, Eye, Flag, UserMinus, Loader2,
  Volume2, VolumeX, Camera, Check, Users, Lock, Reply, SmilePlus,
  ChevronUp, Sparkles, Zap, Clock, Share2, Bookmark, Copy, Play, Pause,
} from "lucide-react";
import ReactionPicker from "./ReactionPicker";
import { SkeletonStoryRail } from "./StorySkeleton";
import { fetchBackendApi } from "@/lib/backend-api";

/* ================================================================== *
 *  STORY — Composant professionnel réutilisable                         *
 *  ------------------------------------------------------------------ *
 *  - Gère son propre état (aucune dépendance à un parent)             *
 *  - Fonctionne "out of the box" avec des données de démo             *
 *  - Contrôlable via props si l'app hôte veut piloter les données     *
 *  - Intègre ReactionPicker pour les réactions                        *
 *  - Supporte : swipe tactile, clavier, animations fluides            *
 *  - Inclut : rail, modal création, modal upload, viewer plein écran   *
 * ================================================================== */

/* ---- Design Tokens ---- */
const C = {
  navy900: "#0F3352",
  navy800: "#1B5386",
  navy700: "#2C6BA0",
  navy600: "#3A7FBE",
  navy100: "var(--app-border)",
  navy50: "var(--app-bg)",
  gold400: "#F6D374",
  gold600: "#D9A536",
  ink: "#132433",
  muted: "var(--app-muted)",
  mutedLight: "#8CA0B3",
  line: "var(--app-border)",
  lineSoft: "var(--app-border)",
  surface: "var(--app-surface)",
  pageBg: "var(--app-bg)",
  white: "#FFFFFF",
  danger: "#D9534F",
  success: "#2D9B6E",
};

const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;
const ringGrad = `conic-gradient(from 0deg, ${C.gold400}, ${C.gold600}, ${C.navy700}, ${C.gold400})`;
const fbRingGrad = `conic-gradient(from 0deg, #F15BB5, #FEE440, #00BBF9, #F15BB5)`;

const shadow = {
  xs: "0 1px 2px rgba(6,20,33,0.04)",
  sm: "0 2px 8px rgba(6,20,33,0.07)",
  md: "0 6px 20px -6px rgba(6,20,33,0.12)",
  lg: "0 12px 32px -8px rgba(6,20,33,0.18)",
  xl: "0 40px 80px -24px rgba(6,20,33,0.55)",
  gold: "0 8px 20px -8px rgba(217,165,54,0.5)",
};

const glassDark = "rgba(9,20,32,0.42)";
const glassPanel = {
  background: "rgba(255,255,255,0.10)",
  backdropFilter: "blur(18px) saturate(1.4)",
  WebkitBackdropFilter: "blur(18px) saturate(1.4)",
  border: "1px solid rgba(255,255,255,0.14)",
};
const glassPanelStrong = {
  background: "rgba(255,255,255,0.16)",
  backdropFilter: "blur(24px) saturate(1.6)",
  WebkitBackdropFilter: "blur(24px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.18)",
};

const STORY_DURATION = 6000;
const STORY_TTL_MS = 24 * 60 * 60 * 1000; // les stories expirent au bout de 24h

const STORY_BACKGROUNDS = [
  { id: "navy", css: "linear-gradient(160deg, #2C6BA0 0%, #0F3352 100%)" },
  { id: "gold", css: "linear-gradient(135deg, #F6D374 0%, #B9781F 100%)" },
  { id: "slate", css: "linear-gradient(160deg, #47566B 0%, #131C27 100%)" },
  { id: "teal", css: "linear-gradient(160deg, #1E8A80 0%, #0D3B36 100%)" },
  { id: "plum", css: "linear-gradient(160deg, #7C4FCE 0%, #3A1F63 100%)" },
  { id: "forest", css: "linear-gradient(160deg, #3A8F5C 0%, #163B26 100%)" },
];

/* ---- Story Reactions pour ReactionPicker ---- */
const STORY_REACTIONS = [
  { key: "love", label: "Love", src: "/emoji_picker/love.png" },
  { key: "ok", label: "J'aime", src: "/emoji_picker/j'aime.png" },
  { key: "waouh", label: "Waouh", src: "/emoji_picker/waouh.png" },
  { key: "hahaha", label: "Hahaha", src: "/emoji_picker/hahaha.png" },
  { key: "triste", label: "Triste", src: "/emoji_picker/triste.png" },
  { key: "colere", label: "Colere", src: "/emoji_picker/colere.png" },
];

const STORY_PRIVACY_OPTIONS = [
  { id: "network", label: "Toutes mes relations", description: "Vos relations acceptees", icon: Users },
  { id: "close", label: "Contacts proches", description: "Votre cercle proche", icon: Lock },
  { id: "private", label: "Moi uniquement", description: "Personne d'autre", icon: Eye },
];

function timeAgo(ts) {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return "a l'instant";
  if (diffMin < 60) return `${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} j`;
}

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* Fond de secours pour la carte-apercu d'une story (texte/pas d'item). */
function storyPreviewBg(item) {
  if (!item) return navyGrad;
  if (item.type === "text") return item.bg || navyGrad;
  return "#0B1A28";
}

function StoryPrivacyPicker({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 7 }}>
      {STORY_PRIVACY_OPTIONS.map(({ id, label, description, icon: Icon }) => (
        <button key={id} type="button" onClick={() => onChange(id)} style={{ minWidth: 0, padding: "9px 6px", borderRadius: 11, border: `1.5px solid ${value === id ? C.navy800 : C.lineSoft}`, background: value === id ? navyGrad : C.white, color: value === id ? C.white : C.muted, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", textAlign: "center" }}>
          <Icon size={14} />
          <span style={{ fontSize: 10.5, fontWeight: 800, lineHeight: 1.15 }}>{label}</span>
          <span style={{ fontSize: 9, opacity: 0.78, lineHeight: 1.1 }}>{description}</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Sous-composants UI                                                  *
 * ------------------------------------------------------------------ */
function Avatar({ initials, size = 48, imgUrl = null, ring = "none", showOnline = false }) {
  const ringStyles = {
    none: { padding: 0, background: "transparent" },
    new: { padding: 3, background: fbRingGrad },
    seen: { padding: 3, background: C.lineSoft },
    mine: { padding: 3, background: goldGrad },
  };
  const rs = ringStyles[ring] || ringStyles.none;
  return (
    <div style={{ position: "relative", width: size + rs.padding * 2, height: size + rs.padding * 2, flexShrink: 0 }}>
      <div
        style={{
          width: "100%", height: "100%", borderRadius: "50%", background: rs.background, padding: rs.padding, boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%", height: "100%", borderRadius: "50%",
            background: imgUrl ? C.navy100 : navyGrad,
            color: C.white, display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: size * 0.36, fontFamily: "'Sora', sans-serif",
            overflow: "hidden", border: `2.5px solid ${C.white}`, boxSizing: "border-box", boxShadow: shadow.sm,
          }}
        >
          {imgUrl ? (
            <img src={imgUrl} alt={initials} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            initials
          )}
        </div>
      </div>
      {showOnline && (
        <div style={{
          position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: "50%",
          background: C.success, border: `2.5px solid ${C.white}`, boxShadow: shadow.xs,
        }} />
      )}
    </div>
  );
}

/* ---- Animated Counter ---- */
function AnimatedNumber({ value, duration = 400 }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const animRef = useRef(null);

  useEffect(() => {
    if (value === prevRef.current) return;
    const start = prevRef.current;
    const end = value;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    prevRef.current = value;
    return () => cancelAnimationFrame(animRef.current);
  }, [value, duration]);

  return <span>{display}</span>;
}

/* ---- Tooltip ---- */
function Tooltip({ children, text, position = "bottom" }) {
  const [show, setShow] = useState(false);
  const posStyles = {
    bottom: { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 6 },
    top: { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 6 },
  };
  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && text && (
        <div style={{
          ...posStyles[position], position: "absolute", whiteSpace: "nowrap", padding: "5px 10px",
          borderRadius: 8, background: "rgba(15,51,82,0.94)", color: "#fff", fontSize: 11, fontWeight: 600,
          boxShadow: "0 6px 16px rgba(15,51,82,0.2)", pointerEvents: "none", zIndex: 50,
          animation: "story-tooltip-in 0.15s ease",
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

/* ---- Modal Shell ---- */
function ModalShell({ children, onClose, maxWidth = 420 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const modal = (
    <div
      className="story-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1400,
        background: "radial-gradient(120% 120% at 50% 0%, rgba(15,51,82,0.55) 0%, rgba(6,15,24,0.72) 100%)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        className="story-modal-card"
        style={{
          position: "relative", width: "100%", maxWidth, maxHeight: "88vh", overflow: "auto",
          background: C.white, borderRadius: 28,
          boxShadow: `${shadow.xl}, 0 0 0 1px rgba(15,51,82,0.06)`,
          border: `1px solid rgba(255,255,255,0.6)`,
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "28px 28px 0 0", background: goldGrad, opacity: 0.9 }} />
        {children}
      </div>
    </div>
  );
  return typeof document === "undefined" ? null : createPortal(modal, document.body);
}

function ModalHeader({ title, onClose, onBack, subtitle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 16px", borderBottom: `1px solid ${C.lineSoft}` }}>
      {onBack && (
        <button onClick={onBack} className="story-icon-btn" style={iconBtnStyle}>
          <ChevronLeft size={17} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: "-0.01em", color: C.ink }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.mutedLight, marginTop: 2, fontWeight: 500 }}>{subtitle}</div>}
      </div>
      <button onClick={onClose} className="story-icon-btn" style={iconBtnStyle}>
        <X size={17} />
      </button>
    </div>
  );
}

const iconBtnStyle = {
  width: 36, height: 36, borderRadius: 999, border: `1px solid ${C.lineSoft}`, background: C.navy50,
  color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
  boxShadow: shadow.xs,
};

/* ------------------------------------------------------------------ *
 *  Modal 1 - Creer une story (choix texte / media)                    *
 * ------------------------------------------------------------------ */
function CreateStoryModal({ onClose, onGoUpload, onPublishText, currentUser }) {
  const [mode, setMode] = useState("choice");
  const [text, setText] = useState("");
  const [bgId, setBgId] = useState(STORY_BACKGROUNDS[0].id);
  const [fontSize, setFontSize] = useState(21);
  const [audience, setAudience] = useState("network");
  const bg = STORY_BACKGROUNDS.find((b) => b.id === bgId)?.css;
  const maxLen = 220;

  return (
    <ModalShell onClose={onClose} maxWidth={mode === "text" ? 400 : 420}>
      <ModalHeader
        title={mode === "choice" ? "Creer un moment" : "Story texte"}
        subtitle={mode === "choice" ? "Partagez avec votre reseau" : "Personnalisez votre message"}
        onClose={onClose}
        onBack={mode === "text" ? () => setMode("choice") : null}
      />

      {/* Avatar de l'utilisateur connecté */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "0 18px" }}>
        <Avatar
          initials={currentUser?.initials || "U"}
          imgUrl={currentUser?.image || null}
          size={40}
          ring="mine"
        />
        <div>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>
            {currentUser?.name || "Invités"}
          </div>
          <div style={{ fontSize: 11, color: C.mutedLight }}>
            Appuyez pour créer une story
          </div>
        </div>
      </div>

      {mode === "choice" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "18px 18px 24px" }}>
          <button onClick={() => setMode("text")} className="story-option-btn" style={optionBtnStyle}>
            <div style={{ ...optionIconWrap, background: navyGrad, color: C.white }}>
              <Type size={19} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={optionTitleStyle}>Story texte</div>
              <div style={optionSubStyle}>Partagez une pensee ou une annonce</div>
            </div>
            <div className="story-option-chevron" style={optionChevronWrap}>
              <ChevronRight size={15} color={C.navy700} />
            </div>
          </button>

          <button onClick={onGoUpload} className="story-option-btn" style={optionBtnStyle}>
            <div style={{ ...optionIconWrap, background: goldGrad, color: C.navy900 }}>
              <ImageIcon size={19} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={optionTitleStyle}>Photo ou video</div>
              <div style={optionSubStyle}>Importez un fichier depuis votre appareil</div>
            </div>
            <div className="story-option-chevron" style={optionChevronWrap}>
              <ChevronRight size={15} color={C.navy700} />
            </div>
          </button>
        </div>
      )}

      {mode === "text" && (
        <div style={{ padding: "16px 18px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Preview */}
          <div
            style={{
              position: "relative", background: bg, borderRadius: 22, aspectRatio: "9 / 14", width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 28, boxSizing: "border-box",
              boxShadow: `${shadow.md}, inset 0 0 0 1px rgba(255,255,255,0.08)`, overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.15))", pointerEvents: "none" }} />
            {/* Decorative dots pattern */}
            <div style={{ position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none", backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxLen))}
              placeholder="Ecrivez quelque chose..."
              rows={5}
              style={{
                position: "relative", width: "100%", background: "transparent", border: "none", outline: "none", resize: "none",
                color: C.white, fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize, textAlign: "center",
                lineHeight: 1.35, textShadow: "0 2px 10px rgba(0,0,0,0.25)",
              }}
            />
          </div>

          {/* Font size control */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: C.mutedLight, fontWeight: 600 }}>Aa</span>
            <input
              type="range" min={16} max={32} value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="story-font-slider"
              style={{ width: 120, accentColor: C.navy700 }}
            />
            <span style={{ fontSize: 15, color: C.mutedLight, fontWeight: 600 }}>Aa</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 9 }}>
              {STORY_BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBgId(b.id)}
                  aria-label={`Fond ${b.id}`}
                  className="story-swatch"
                  style={{
                    width: 26, height: 26, borderRadius: "50%", background: b.css, border: "none", cursor: "pointer",
                    boxShadow: bgId === b.id
                      ? `0 0 0 2px ${C.white}, 0 0 0 4px ${C.navy800}, ${shadow.sm}`
                      : `0 0 0 1px rgba(15,51,82,0.08), ${shadow.xs}`,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.mutedLight, fontVariantNumeric: "tabular-nums" }}>
              {text.length}/{maxLen}
            </span>
          </div>

          <StoryPrivacyPicker value={audience} onChange={setAudience} />

          <button
            onClick={() => text.trim() && onPublishText({ text: text.trim(), bg, fontSize, audience })}
            disabled={!text.trim()}
            className="story-publish-btn"
            style={{
              ...publishBtnStyle,
              opacity: text.trim() ? 1 : 0.5,
              cursor: text.trim() ? "pointer" : "default",
            }}
          >
            <Sparkles size={15} strokeWidth={2} /> Publier
          </button>
        </div>
      )}
    </ModalShell>
  );
}

const optionBtnStyle = {
  display: "flex", alignItems: "center", gap: 14, padding: "16px 16px", borderRadius: 18,
  border: `1.5px solid ${C.lineSoft}`, background: C.white, cursor: "pointer", width: "100%", boxSizing: "border-box",
  boxShadow: shadow.xs,
};
const optionIconWrap = {
  width: 46, height: 46, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
const optionChevronWrap = {
  width: 28, height: 28, borderRadius: "50%", background: C.navy50,
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
const optionTitleStyle = { fontSize: 14.5, fontWeight: 700, color: C.ink, letterSpacing: "-0.005em" };
const optionSubStyle = { fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.45 };
const publishBtnStyle = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 16px",
  borderRadius: 999, border: "none", background: goldGrad, color: C.navy900, fontWeight: 700, fontSize: 14,
  letterSpacing: "-0.005em", boxShadow: shadow.gold,
};

/* ------------------------------------------------------------------ *
 *  Modal 2 - Upload photo / video                                     *
 * ------------------------------------------------------------------ */
function UploadModal({ onClose, onBack, onPublishMedia }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState("network");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const xhrRef = useRef(null);
  const publishedRef = useRef(false);

  /* On ne revoque l'URL locale que si l'upload n'a jamais abouti
     (annulation, changement de fichier, fermeture avant publication).
     Sinon on casserait l'aperçu/la story qui vient d'être publiée. */
  useEffect(() => {
    return () => {
      if (previewUrl && !publishedRef.current) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => { xhrRef.current?.abort(); };
  }, []);

  const handleFile = (f) => {
    if (!f || !(f.type.startsWith("image/") || f.type.startsWith("video/"))) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    publishedRef.current = false;
    setError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const startUpload = () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError(null);

    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", mediaType);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress((e.loaded / e.total) * 100);
    };

    xhr.onload = () => {
      setUploading(false);
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !data?.url) {
        setError(data?.error || "Échec de l'envoi du fichier. Réessayez.");
        return;
      }
      publishedRef.current = true;
      onPublishMedia({
        type: data.type || mediaType,
        mediaUrl: data.url,
        text: caption.trim(),
        audience,
      });
    };

    xhr.onerror = () => {
      setUploading(false);
      setError("Échec de l'envoi du fichier. Vérifiez votre connexion.");
    };

    xhr.send(formData);
  };

  return (
    <ModalShell onClose={onClose} maxWidth={420}>
      <ModalHeader title="Importer un media" subtitle="Photo ou video" onClose={onClose} onBack={onBack} />

      <div style={{ padding: "16px 18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        {!previewUrl ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className="story-dropzone"
            style={{
              border: `2px dashed ${dragOver ? C.navy700 : C.line}`, borderRadius: 22,
              background: dragOver ? C.navy50 : "#FAFCFE",
              aspectRatio: "9 / 12", display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, cursor: "pointer",
              transition: "border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
              transform: dragOver ? "scale(1.01)" : "scale(1)",
              boxShadow: dragOver ? shadow.md : shadow.xs,
            }}
          >
            <div style={{
              width: 60, height: 60, borderRadius: 20, background: navyGrad, display: "flex", alignItems: "center",
              justifyContent: "center", color: C.white, boxShadow: shadow.sm,
            }}>
              <Upload size={22} strokeWidth={1.8} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, letterSpacing: "-0.005em" }}>Glissez un fichier ici</div>
            <div style={{ fontSize: 12, color: C.mutedLight }}>ou cliquez pour parcourir vos fichiers</div>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {["JPG", "PNG", "GIF", "MP4"].map((t) => (
                <span key={t} style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.02em", color: C.muted, background: C.navy50,
                  border: `1px solid ${C.line}`, borderRadius: 6, padding: "3px 8px",
                }}>
                  {t}
                </span>
              ))}
            </div>
            <input
              ref={inputRef} type="file" accept="image/*,video/*"
              onChange={(e) => handleFile(e.target.files?.[0])} style={{ display: "none" }}
            />
          </div>
        ) : (
          <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", aspectRatio: "9 / 12", background: C.ink, boxShadow: shadow.md }}>
            {file?.type.startsWith("video/") ? (
              <video src={previewUrl} muted autoPlay loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <img src={previewUrl} alt="Apercu" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 90, background: "linear-gradient(0deg, rgba(0,0,0,0.5), rgba(0,0,0,0))", pointerEvents: "none" }} />
            {caption && (
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, textAlign: "center", padding: "0 16px" }}>
                <span style={{
                  background: "rgba(0,0,0,0.45)", color: C.white, fontSize: 13, fontWeight: 600,
                  padding: "6px 12px", borderRadius: 10, display: "inline-block", lineHeight: 1.4,
                  backdropFilter: "blur(6px)",
                }}>
                  {caption}
                </span>
              </div>
            )}
            {!uploading && (
              <button
                onClick={() => { setFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
                className="story-icon-btn"
                style={{ ...iconBtnStyle, position: "absolute", top: 10, right: 10, ...glassPanel, color: C.white, border: "1px solid rgba(255,255,255,0.25)" }}
                aria-label="Retirer le fichier"
              >
                <X size={15} />
              </button>
            )}
            {uploading && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(5,15,25,0.6)", backdropFilter: "blur(2px)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
              }}>
                <Loader2 size={26} color={C.white} className="story-spin" />
                <div style={{ width: "68%", height: 6, borderRadius: 999, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: goldGrad, borderRadius: 999, transition: "width 0.1s linear" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.white, fontVariantNumeric: "tabular-nums" }}>{Math.round(progress)}%</span>
              </div>
            )}
          </div>
        )}

        {previewUrl && !uploading && (
          <>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 120))}
              placeholder="Ajouter une legende (optionnel)"
              className="story-input"
              style={{
                border: `1.5px solid ${C.lineSoft}`, borderRadius: 14, padding: "12px 14px", fontSize: 13.5,
                outline: "none", color: C.ink, fontFamily: "'Inter', sans-serif", boxShadow: shadow.xs,
              }}
            />

            <StoryPrivacyPicker value={audience} onChange={setAudience} />

            {error && (
              <div style={{
                fontSize: 12.5, fontWeight: 600, color: C.danger, background: "rgba(217,83,79,0.08)",
                border: `1px solid rgba(217,83,79,0.25)`, borderRadius: 12, padding: "10px 12px",
              }}>
                {error}
              </div>
            )}

            <button onClick={startUpload} className="story-publish-btn" style={publishBtnStyle}>
              <Upload size={15} /> Publier la story
            </button>
          </>
        )}
      </div>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ *
 *  Reaction Badge (affiche les reactions sur une story)                *
 * ------------------------------------------------------------------ */
function ReactionBadge({ reactions = {} }) {
  const entries = Object.entries(reactions)
    .filter(([, count]) => Number(count) > 0)
    .sort(([, first], [, second]) => Number(second) - Number(first));
  if (entries.length === 0) return null;

  const reactionMeta = {
    love: { src: "/emoji_picker/love.png", label: "Love" },
    ok: { src: "/emoji_picker/j'aime.png", label: "J'aime" },
    waouh: { src: "/emoji_picker/waouh.png", label: "Waouh" },
    hahaha: { src: "/emoji_picker/hahaha.png", label: "Hahaha" },
    triste: { src: "/emoji_picker/triste.png", label: "Triste" },
    colere: { src: "/emoji_picker/colere.png", label: "Colere" },
  };

  const total = entries.reduce((sum, [, c]) => sum + Number(c), 0);
  const displayEntries = entries.slice(0, 3);

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px 3px 4px", borderRadius: 999, background: "rgba(0,0,0,0.42)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.18)" }} title={`${total} réaction${total !== 1 ? "s" : ""}`}>
      <span style={{ display: "inline-flex", alignItems: "center", paddingLeft: 2 }}>
      {displayEntries.map(([key]) => {
        const meta = reactionMeta[key];
        if (!meta) return null;
        return (
          <span
            key={key}
            style={{
              width: 24, height: 24, marginLeft: -4, borderRadius: "50%", background: C.white,
              border: `2px solid ${C.white}`, display: "inline-flex", alignItems: "center", justifyContent: "center",
              position: "relative", zIndex: displayEntries.length,
            }}
          >
            <img src={meta.src} alt={meta.label} style={{ width: 18, height: 18, objectFit: "contain" }} />
          </span>
        );
      })}
      </span>
      <span style={{ fontSize: 11, fontWeight: 800, color: C.white }}>{total}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Viewer plein ecran                                                 *
 * ------------------------------------------------------------------ */
function StoryViewer({ groups, startGroupIndex, currentUserId, onClose, onMarkSeen, onReply, onReact, onDelete, reactions: reactionsMap }) {
  const [groupIndex, setGroupIndex] = useState(startGroupIndex);
  const [itemIndex, setItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [holdPaused, setHoldPaused] = useState(false); // pause temporaire (appui maintenu)
  const [manualPaused, setManualPaused] = useState(false); // pause persistante (bouton / barre espace)
  const paused = holdPaused || manualPaused;
  const [reply, setReply] = useState("");
  const [showViewers, setShowViewers] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [muted, setMuted] = useState(true);
  const [hearts, setHearts] = useState([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [slideDirection, setSlideDirection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const pausedRef = useRef(false);
  const elapsedRef = useRef(0);
  const lastTickRef = useRef(0);
  const rafRef = useRef(null);
  const videoRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const replyInputRef = useRef(null);
  const reactionBtnRef = useRef(null);
  const longPressTimer = useRef(null);
  const reactionHoverTimer = useRef(null);

  const group = groups[groupIndex];
  const item = group?.items[itemIndex];
  const isOwn = group?.user.id === currentUserId;
  const isVideo = item?.type === "video";
  const itemReactions = reactionsMap?.[item?.id] || item?.reactions || {};

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  /* Close menus/reaction picker on story change */
  useEffect(() => {
    setShowReactionPicker(false);
    setShowMenu(false);
  }, [groupIndex, itemIndex]);

  /* Close reaction picker when clicking outside */
  useEffect(() => {
    if (!showReactionPicker) return;
    const handleClick = (e) => {
      if (reactionBtnRef.current && !reactionBtnRef.current.contains(e.target)) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showReactionPicker]);

  const goNext = useCallback((direction = 1) => {
    if (isAnimating) return;
    if (!group) return;
    if (itemIndex < group.items.length - 1) {
      setSlideDirection(direction);
      setIsAnimating(true);
      setTimeout(() => { setItemIndex((i) => i + 1); setIsAnimating(false); }, 180);
    } else if (groupIndex < groups.length - 1) {
      setSlideDirection(direction);
      setIsAnimating(true);
      setTimeout(() => { setGroupIndex((g) => g + 1); setItemIndex(0); setIsAnimating(false); }, 180);
    } else {
      onClose();
    }
  }, [group, itemIndex, groupIndex, groups.length, isAnimating, onClose]);

  const goPrev = useCallback(() => {
    if (isAnimating) return;
    if (itemIndex > 0) {
      setSlideDirection(-1);
      setIsAnimating(true);
      setTimeout(() => { setItemIndex((i) => i - 1); setIsAnimating(false); }, 180);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setSlideDirection(-1);
      setIsAnimating(true);
      setTimeout(() => { setGroupIndex((g) => g - 1); setItemIndex(prevGroup.items.length - 1); setIsAnimating(false); }, 180);
    }
  }, [itemIndex, groupIndex, groups, isAnimating]);

  /* Mark seen + reset on story change */
  useEffect(() => {
    setProgress(0);
    setShowViewers(false);
    setShowMenu(false);
    setReply("");
    if (item) onMarkSeen?.(group.id, item.id);
  }, [groupIndex, itemIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Timer for text/image stories */
  useEffect(() => {
    if (!item || isVideo) return undefined;
    elapsedRef.current = 0;
    lastTickRef.current = performance.now();

    const tick = (now) => {
      if (!pausedRef.current) {
        elapsedRef.current += now - lastTickRef.current;
      }
      lastTickRef.current = now;
      const pct = Math.min(100, (elapsedRef.current / STORY_DURATION) * 100);
      setProgress(pct);
      if (pct >= 100) { goNext(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [groupIndex, itemIndex, isVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Video progress */
  useEffect(() => {
    if (!isVideo) return undefined;
    const v = videoRef.current;
    if (!v) return undefined;
    const onTime = () => { if (v.duration) setProgress((v.currentTime / v.duration) * 100); };
    const onEnd = () => goNext();
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnd);
    return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("ended", onEnd); };
  }, [groupIndex, itemIndex, isVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isVideo && videoRef.current) {
      if (paused) videoRef.current.pause();
      else videoRef.current.play().catch(() => {});
    }
  }, [paused, isVideo]);

  /* Keyboard navigation */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
      else if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === " " && !e.target.closest('input, textarea')) { e.preventDefault(); setManualPaused((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose]);

  /* Touch / Swipe handling */
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goNext(1);
      else goPrev();
    }
    if (dy > 60 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
    }
  };

  if (!group || !item) return null;

  const spawnHeart = (x, y) => {
    const id = uid("heart");
    setHearts((h) => [...h, { id, x, y }]);
    setTimeout(() => setHearts((h) => h.filter((hh) => hh.id !== id)), 1000);
  };

  const handleDoubleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    spawnHeart(e.clientX - rect.left, e.clientY - rect.top);
    onReact?.(group.id, item.id, "love");
  };

  const sendReply = () => {
    if (!reply.trim()) return;
    onReply?.(group.id, item.id, reply.trim(), { story: item, author: group.user });
    setReply("");
  };

  const handleReactionSelect = (reactionKey) => {
    onReact?.(group.id, item.id, reactionKey);
    setShowReactionPicker(false);
    spawnHeart(
      reactionBtnRef.current ? reactionBtnRef.current.offsetWidth / 2 : 50,
      20
    );
  };

  /* Long press to show ReactionPicker */
  const handleReactionPointerDown = () => {
    longPressTimer.current = setTimeout(() => {
      setShowReactionPicker(true);
    }, 300);
  };
  const handleReactionPointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleReactionClick = () => {
    if (!showReactionPicker && !longPressTimer.current) {
      setShowReactionPicker((prev) => !prev);
    }
  };
  const openReactionPicker = () => {
    if (reactionHoverTimer.current) clearTimeout(reactionHoverTimer.current);
    setShowReactionPicker(true);
  };
  const closeReactionPicker = () => {
    if (reactionHoverTimer.current) clearTimeout(reactionHoverTimer.current);
    reactionHoverTimer.current = setTimeout(() => setShowReactionPicker(false), 220);
  };

  const slideTransform = isAnimating
    ? `translateX(${slideDirection * 30}px)`
    : "translateX(0)";

  /* Rendu via un portail directement dans <body> : si <Story /> est monté
     a l'interieur d'un ancetre avec transform/filter/backdrop-filter/contain
     (frequent dans une carte de feed), cet ancetre devient le "containing
     block" d'un element position:fixed. Le viewer se retrouve alors
     confine/coupe dans les bornes de cet ancetre, et la zone d'action
     (bottom:0) disparait des l'ouverture, meme si le JSX est correct.
     Le portail garantit un positionnement toujours relatif au viewport. */
  const viewerContent = (
    <div
      className="story-viewer-backdrop"
      style={{
        position: "fixed", inset: 0, zIndex: 1400,
        background: "rgba(0,0,0,0.92)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          position: "relative", width: "100%", height: "100%", maxWidth: 480, paddingTop: "env(safe-area-inset-top)", boxSizing: "border-box",
          background: item.type === "text" ? item.bg : "#000",
          isolation: "isolate",
          transform: slideTransform,
          transition: isAnimating ? "transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease" : "none",
          opacity: isAnimating ? 0.85 : 1,
        }}
        onMouseDown={(e) => {
          if (e.target.closest('input, textarea, button, [data-no-pause]')) return;
          setHoldPaused(true);
        }}
        onMouseUp={() => setHoldPaused(false)}
        onMouseLeave={() => setHoldPaused(false)}
        onTouchStart={(e) => {
          if (e.target.closest('input, textarea, button, [data-no-pause]')) return;
          setHoldPaused(true);
        }}
        onTouchEnd={() => setHoldPaused(false)}
        onDoubleClick={handleDoubleClick}
      >
        {/* Media */}
        {item.type === "image" && (
          <img src={item.mediaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000", display: "block" }} />
        )}
        {item.type === "video" && (
          <video
            ref={videoRef} src={item.mediaUrl} muted={muted} autoPlay playsInline
            style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000", display: "block" }}
          />
        )}
        {item.type === "text" && (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 36, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none", backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <span style={{
              color: C.white, fontFamily: "'Sora', sans-serif", fontWeight: 700,
              fontSize: item.fontSize || 24, textAlign: "center", lineHeight: 1.4,
              textShadow: "0 2px 16px rgba(0,0,0,0.35)", position: "relative", maxWidth: "85%",
            }}>
              {item.text}
            </span>
          </div>
        )}
        {(item.type === "image" || item.type === "video") && item.text && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 110, textAlign: "center", padding: "0 20px" }}>
            <span style={{
              background: "rgba(0,0,0,0.4)", color: C.white, fontSize: 13.5, fontWeight: 600,
              padding: "7px 14px", borderRadius: 12, display: "inline-block", lineHeight: 1.4,
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            }}>
              {item.text}
            </span>
          </div>
        )}

        {/* Floating hearts */}
        {hearts.map((h) => (
          <Heart
            key={h.id} size={36}
            className="story-heart-burst"
            style={{ position: "absolute", left: h.x - 18, top: h.y - 18, color: "#FF5C7A", fill: "#FF5C7A", pointerEvents: "none" }}
          />
        ))}

        {/* Pause indicator */}
        {paused && (
          <div className="story-pause-indicator" style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(0,0,0,0.35)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none", zIndex: 10,
          }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ width: 5, height: 20, borderRadius: 3, background: "rgba(255,255,255,0.9)" }} />
              <div style={{ width: 5, height: 20, borderRadius: 3, background: "rgba(255,255,255,0.9)" }} />
            </div>
          </div>
        )}

        {/* Gradient overlays */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 130, background: "linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0))", pointerEvents: "none", zIndex: 2 }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, background: "linear-gradient(0deg, rgba(0,0,0,0.5), rgba(0,0,0,0))", pointerEvents: "none", zIndex: 1 }} />

        {/* Progress bars */}
        <div style={{ position: "absolute", top: 14, left: 14, right: 14, display: "flex", gap: 4, zIndex: 8 }}>
          {group.items.map((it, i) => (
            <div
              key={it.id}
              style={{
                flex: 1, height: 3.5, borderRadius: 999, background: "rgba(255,255,255,0.25)",
                overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  height: "100%", borderRadius: 999,
                  background: i < itemIndex
                    ? C.white
                    : i === itemIndex
                      ? `linear-gradient(90deg, ${C.white} 0%, rgba(255,255,255,0.85) 100%)`
                      : "transparent",
                  width: i < itemIndex ? "100%" : i === itemIndex ? `${progress}%` : "0%",
                  transition: i === itemIndex && !isVideo ? "none" : "width 0.15s linear",
                  boxShadow: i === itemIndex ? "0 0 8px rgba(255,255,255,0.4)" : "none",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{ position: "absolute", top: 26, left: 14, right: 14, display: "flex", alignItems: "center", gap: 10, zIndex: 8 }}>
          <Avatar initials={group.user.initials} size={32} imgUrl={group.user.image || null} showOnline={!isOwn} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.white, textShadow: "0 1px 4px rgba(0,0,0,0.5)", letterSpacing: "-0.005em" }}>
              {isOwn ? "Votre story" : group.user.name}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={9} style={{ opacity: 0.7 }} /> {timeAgo(item.createdAt)}
            </div>
          </div>

          {/* Pause / lecture — disponible pour tous les types de story */}
          <button
            onClick={() => setManualPaused((p) => !p)}
            aria-label={manualPaused ? "Reprendre la story" : "Mettre la story en pause"}
            className="story-icon-btn"
            style={{ ...iconBtnStyle, ...glassPanel, color: C.white }} data-no-pause
          >
            {manualPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>

          {isVideo && (
            <button
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Activer le son" : "Couper le son"}
              className="story-icon-btn"
              style={{ ...iconBtnStyle, ...glassPanel, color: C.white }} data-no-pause
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          )}

          {/* Reactions badge */}
          {Object.keys(itemReactions).length > 0 && <ReactionBadge reactions={itemReactions} />}

          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowMenu((m) => !m)} className="story-icon-btn"
              style={{ ...iconBtnStyle, ...glassPanel, color: C.white }} data-no-pause
            >
              <MoreHorizontal size={15} />
            </button>
            {showMenu && (
              <div className="story-menu-pop" style={{
                position: "absolute", top: 42, right: 0, background: C.white, borderRadius: 16,
                boxShadow: shadow.lg, overflow: "hidden", width: 210, zIndex: 20,
                border: `1px solid ${C.lineSoft}`,
              }}>
                <div style={{ padding: "6px 0" }}>
                  {!isOwn && (
                    <>
                      <button className="story-menu-item" style={menuItemStyle} onClick={() => setShowMenu(false)}>
                        <Bookmark size={14} /> Enregistrer
                      </button>
                      <button className="story-menu-item" style={menuItemStyle} onClick={() => setShowMenu(false)}>
                        <Share2 size={14} /> Partager
                      </button>
                      <button className="story-menu-item" style={menuItemStyle} onClick={() => setShowMenu(false)}>
                        <Copy size={14} /> Copier le lien
                      </button>
                      <div style={{ height: 1, background: C.lineSoft, margin: "4px 12px" }} />
                    </>
                  )}
                  {isOwn ? (
                    <button onClick={() => { onDelete?.(group.id, item.id); setShowMenu(false); }} className="story-menu-item" style={{ ...menuItemStyle, color: C.danger }}>
                      <Trash2 size={14} /> Supprimer la story
                    </button>
                  ) : (
                    <>
                      <button className="story-menu-item" style={menuItemStyle} onClick={() => setShowMenu(false)}>
                        <Flag size={14} /> Signaler
                      </button>
                      <button className="story-menu-item" style={menuItemStyle} onClick={() => setShowMenu(false)}>
                        <UserMinus size={14} /> Ne plus suivre
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onClose} className="story-icon-btn"
            style={{ ...iconBtnStyle, ...glassPanel, color: C.white }} data-no-pause
          >
            <X size={16} />
          </button>
        </div>

        {/* Touch zones prev/next */}
        <button
          aria-label="Story precedente" onClick={goPrev}
          style={{ position: "absolute", left: 0, top: 65, bottom: 75, width: "32%", background: "transparent", border: "none", cursor: "pointer", zIndex: 5 }}
        />
        <button
          aria-label="Story suivante" onClick={() => goNext(1)}
          style={{ position: "absolute", right: 0, top: 65, bottom: 75, width: "32%", background: "transparent", border: "none", cursor: "pointer", zIndex: 5 }}
        />
        {itemIndex > 0 || groupIndex > 0 ? (
          <button
            type="button"
            aria-label="Story precedente"
            onClick={goPrev}
            data-no-pause
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 38, height: 38, border: "1px solid rgba(255,255,255,0.28)", borderRadius: "50%", background: "rgba(0,0,0,0.42)", color: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 101, boxShadow: shadow.sm }}
          >
            <ChevronLeft size={20} />
          </button>
        ) : null}
        {itemIndex < group.items.length - 1 || groupIndex < groups.length - 1 ? (
          <button
            type="button"
            aria-label="Story suivante"
            onClick={() => goNext(1)}
            data-no-pause
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 38, height: 38, border: "1px solid rgba(255,255,255,0.28)", borderRadius: "50%", background: "rgba(0,0,0,0.42)", color: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 101, boxShadow: shadow.sm }}
          >
            <ChevronRight size={20} />
          </button>
        ) : null}

        {/* Action bar (bottom) */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 88, padding: "18px 14px max(20px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 10, zIndex: 100, pointerEvents: "auto", background: "linear-gradient(0deg, rgba(0,0,0,0.76), rgba(0,0,0,0.24) 72%, transparent)" }} data-no-pause>
          {isOwn ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
              <button
                onClick={() => setShowViewers((v) => !v)} className="story-icon-btn"
                style={{
                  display: "flex", alignItems: "center", gap: 7, ...glassPanelStrong, borderRadius: 999,
                  padding: "10px 16px", color: C.white, cursor: "pointer", alignSelf: "flex-start", width: "auto", height: "auto",
                }}
                data-no-pause
              >
                <Eye size={14} />
                <AnimatedNumber value={item.views?.length || 0} />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>vue{(item.views?.length || 0) > 1 ? "s" : ""}</span>
              </button>
              <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 80, ...glassPanelStrong, borderRadius: 999, padding: "10px 14px", gap: 8 }}>
                <Reply size={14} style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0 }} />
                <input
                  ref={replyInputRef}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                  placeholder="Repondre a votre story..."
                  data-no-pause
                  style={{ flex: 1, minWidth: 0, width: 0, background: "transparent", border: "none", outline: "none", color: C.white, fontSize: 13, fontFamily: "'Inter', sans-serif" }}
                />
              </div>
              <button
                type="button"
                onClick={sendReply}
                disabled={!reply.trim()}
                className="story-send-btn"
                style={{ ...sendBtnStyle, opacity: reply.trim() ? 1 : 0.45 }}
                data-no-pause
                aria-label="Envoyer la reponse"
              >
                <Send size={15} />
              </button>
              {/* Reaction summary for own story */}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                {Object.keys(itemReactions).length > 0 && <ReactionBadge reactions={itemReactions} />}
                <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 12 }}>Votre story</span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
              <div style={{ display: "flex", alignItems: "center", flex: 1, ...glassPanelStrong, borderRadius: 999, padding: "10px 16px", gap: 8 }}>
                <Reply size={14} style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0 }} />
                <input
                  ref={replyInputRef}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                  onFocus={() => setShowReactionPicker(false)}
                  placeholder={`Repondre a ${group.user.name.split(" ")[0]}...`}
                  data-no-pause
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none",
                    color: C.white, fontSize: 13, fontFamily: "'Inter', sans-serif",
                  }}
                />
              </div>

              {/* Reaction button - opens ReactionPicker */}
              <div style={{ position: "relative" }} ref={reactionBtnRef} onMouseEnter={openReactionPicker} onMouseLeave={closeReactionPicker}>
                <button
                  onClick={handleReactionClick}
                  onPointerDown={handleReactionPointerDown}
                  onPointerUp={handleReactionPointerUp}
                  onPointerLeave={handleReactionPointerUp}
                  className="story-react-btn-main"
                  style={{
                    width: 40, height: 40, borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.20)",
                    background: showReactionPicker ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)",
                    backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
                    color: C.white, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0, transition: "all 0.2s ease",
                  }}
                  data-no-pause
                  aria-label="Reagir"
                >
                  <SmilePlus size={18} />
                </button>

                {/* ReactionPicker */}
                {showReactionPicker && (
                  <div
                    className="story-reaction-pop"
                    onMouseEnter={openReactionPicker}
                    onMouseLeave={closeReactionPicker}
                    style={{
                      position: "absolute", bottom: 50, right: -10,
                      transformOrigin: "bottom right",
                    }}
                    data-no-pause
                  >
                    <ReactionPicker
                      reactions={STORY_REACTIONS}
                      onSelect={handleReactionSelect}
                      size={44}
                      imgSize={30}
                    />
                  </div>
                )}
              </div>

              <button
                onClick={sendReply} disabled={!reply.trim()}
                className="story-send-btn"
                style={{ ...sendBtnStyle, opacity: reply.trim() ? 1 : 0.45 }}
                data-no-pause
              >
                <Send size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Viewers panel (owner) */}
        {isOwn && showViewers && (
          <div
            className="story-sheet"
            style={{
              position: "absolute", left: 0, right: 0, bottom: 0, background: C.white,
              borderTopLeftRadius: 26, borderTopRightRadius: 26,
              maxHeight: "48%", overflowY: "auto", padding: "14px 20px 22px",
              boxShadow: "0 -20px 44px -14px rgba(0,0,0,0.4)",
              borderTop: `1px solid ${C.lineSoft}`, zIndex: 15,
            }}
            data-no-pause
          >
            <div style={{ width: 36, height: 4, borderRadius: 999, background: C.line, margin: "0 auto 14px" }} />
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 14, letterSpacing: "-0.005em", display: "flex", alignItems: "center", gap: 8 }}>
              <Eye size={15} color={C.muted} />
              Vu par <AnimatedNumber value={item.views?.length || 0} /> personne{(item.views?.length || 0) > 1 ? "s" : ""}
            </div>
            {(item.views?.length || 0) === 0 ? (
              <div style={{
                fontSize: 13, color: C.mutedLight, padding: "20px 0", textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              }}>
                <Eye size={28} style={{ opacity: 0.3 }} />
                <span>Personne n'a encore vu cette story.</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {item.views.map((v) => (
                  <div key={v.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "8px 10px",
                    borderRadius: 14, transition: "background 0.15s ease",
                  }} className="story-viewer-item">
                    <Avatar initials={v.initials} size={36} imgUrl={v.image || null} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{v.name}</span>
                      {v.time && <div style={{ fontSize: 11, color: C.mutedLight, marginTop: 1 }}>{v.time}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(viewerContent, document.body);
}

const menuItemStyle = {
  display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 15px",
  border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600,
  color: C.ink, textAlign: "left", transition: "background 0.12s ease",
};
const sendBtnStyle = {
  width: 40, height: 40, borderRadius: "50%", border: "none", background: goldGrad, color: C.navy900,
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
  boxShadow: shadow.gold,
};

/* ------------------------------------------------------------------ *
 *  STORY - Composant principal                                        *
 * ------------------------------------------------------------------ */
const EMPTY_USER = { id: "", name: "", initials: "", image: null, avatarUrl: null, photoUrl: null };

function normalizeCurrentUser(user = EMPTY_USER) {
  return {
    ...user,
    image: user.image || user.avatarUrl || user.photoUrl || null,
  };
}

/* Le backend (voir /api/stories) renvoie chaque item avec un champ
   `image`. Ce composant travaille en interne avec `mediaUrl` — on
   fait la conversion une seule fois, ici, a la reception. */
function normalizeItem(it) {
  const { image, ...rest } = it;
  const parsedCreatedAt = typeof it.createdAt === "number" ? it.createdAt : Date.parse(it.createdAt || "");
  return { ...rest, mediaUrl: image ?? it.mediaUrl ?? null, createdAt: Number.isFinite(parsedCreatedAt) ? parsedCreatedAt : Date.now() };
}
function normalizeGroups(groups = []) {
  return groups.map((g) => ({ ...g, items: (g.items || []).map(normalizeItem) }));
}
function groupsFromStories(stories = []) {
  const grouped = new Map();
  stories.forEach((story) => {
    const author = story.author || {};
    const userId = author.id || story.userId || "unknown";
    const group = grouped.get(userId) || {
      id: `user-${userId}`,
      user: { id: author.id || userId, name: author.name || "Utilisateur", image: author.image || null, authorType: author.authorType || "person", pageId: author.pageId || null },
      items: [],
    };
    group.items.push(normalizeItem(story));
    grouped.set(userId, group);
  });
  return [...grouped.values()];
}

export default function Story({
  groups: groupsProp,
  currentUser: currentUserProp,
  accountMode = "personal",
  onGroupsChange,
  onReply,
  onReact,
  style,
}) {
  const { status } = useSession();
  const [groups, setGroups] = useState(groupsProp ?? []);
  const [currentUser, setCurrentUser] = useState(normalizeCurrentUser(currentUserProp ?? EMPTY_USER));
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(null);
  const [reactions, setReactions] = useState({});
  const [replies, setReplies] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (groupsProp !== undefined) setGroups(groupsProp);
  }, [groupsProp]);
  useEffect(() => {
    const loadedReactions = {};
    groups.forEach((group) => group.items?.forEach((item) => {
      if (item.reactions) loadedReactions[item.id] = item.reactions;
    }));
    setReactions((previous) => ({ ...loadedReactions, ...previous }));
  }, [groups]);
  useEffect(() => {
    if (currentUserProp !== undefined) setCurrentUser(normalizeCurrentUser(currentUserProp));
  }, [currentUserProp]);

  /* Charge les vraies stories depuis l'API uniquement si le composant
     n'est pas piloté par props (mode "autonome"), et une fois la
     session next-auth établie. */
  useEffect(() => {
    if (groupsProp !== undefined) return;
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadStories = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetchBackendApi(`/api/stories?account=${accountMode}`);
        if (!res.ok) throw new Error("Failed to load stories");
        const data = await res.json();
        if (cancelled) return;
        setCurrentUser(data.currentUser ?? EMPTY_USER);
        setGroups(Array.isArray(data.groups) ? normalizeGroups(data.groups) : groupsFromStories(data.stories));
      } catch (err) {
        console.error("Failed to load stories:", err);
        if (!cancelled) setLoadError("Impossible de charger les stories.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStories();
    return () => { cancelled = true; };
  }, [accountMode, groupsProp, status]);

  /* Horloge interne : force un recalcul chaque minute pour faire
     disparaitre automatiquement les stories qui depassent 24h,
     sans jamais avoir besoin de recharger la page. */
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setClockTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const updateGroups = useCallback((next) => {
    setGroups((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      onGroupsChange?.(resolved);
      return resolved;
    });
  }, [onGroupsChange]);

  /* Filtre les items de plus de 24h et retire les groupes devenus vides.
     Les stories "vecues" restent donc au maximum 24h dans le rail,
     comme sur les plateformes qui inspirent ce composant. */
  const liveGroups = useMemo(() => {
    const cutoff = Date.now() - STORY_TTL_MS;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => (
          it.createdAt >= cutoff
          && (accountMode !== "company" || String(it.companyPageId || "") === String(currentUser.id || ""))
        )),
      }))
      .filter((g) => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, accountMode, currentUser.id]);

  const ownGroup = liveGroups.find((g) => g.user.id === currentUser.id);
  const otherGroups = liveGroups.filter((g) => g.user.id !== currentUser.id);
  const sortedOthers = [...otherGroups].sort((a, b) => {
    const aUnseen = a.items.some((i) => !i.seen) ? 0 : 1;
    const bUnseen = b.items.some((i) => !i.seen) ? 0 : 1;
    return aUnseen - bUnseen;
  });

  const [viewerOrder, setViewerOrder] = useState([]);
  const openViewer = (groupId) => {
    const orderedGroups = ownGroup ? [ownGroup, ...sortedOthers] : sortedOthers;
    const idx = orderedGroups.findIndex((g) => g.id === groupId);
    if (idx === -1) return;
    setViewerOrder(orderedGroups);
    setViewerGroupIndex(idx);
  };

  const markSeen = async (groupId, itemId) => {
    const markItemSeen = (source) => source.map((g) =>
      g.id === groupId
        ? { ...g, items: g.items.map((it) => (it.id === itemId ? { ...it, seen: true } : it)) }
        : g
    );
    updateGroups(markItemSeen);
    setViewerOrder(markItemSeen);
    if (status !== "authenticated") return;
    try {
      await fetchBackendApi(`/api/stories/${itemId}/views`, { method: "POST" });
    } catch (err) {
      console.error("Failed to mark story as seen:", err);
    }
  };

  const deleteStory = async (groupId, itemId) => {
    updateGroups((prev) =>
      prev
        .map((g) => (g.id === groupId ? { ...g, items: g.items.filter((it) => it.id !== itemId) } : g))
        .filter((g) => g.items.length > 0)
    );
    setViewerGroupIndex(null);
    if (status !== "authenticated") return;
    try {
      await fetchBackendApi(`/api/stories/${itemId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete story:", err);
    }
  };

  /* Reactions et réponses : mises à jour optimistes locales. Branche
     `onReact`/`onReply` sur tes propres endpoints si tu veux les
     persister côté serveur. */
  const reactToStory = useCallback(async (groupId, itemId, emoji) => {
    const result = await onReact?.(groupId, itemId, emoji);
    if (result?.reactions) {
      setReactions((prev) => ({ ...prev, [itemId]: result.reactions }));
      setViewerOrder((prev) => prev.map((g) => ({
        ...g,
        items: g.items.map((it) => (it.id === itemId ? { ...it, reactions: result.reactions } : it)),
      })));
      return;
    }
    setReactions((prev) => {
      const current = prev[itemId] || {};
      return { ...prev, [itemId]: { ...current, [emoji]: (current[emoji] || 0) + 1 } };
    });
  }, [onReact]);

  const replyToStory = (groupId, itemId, message) => {
    setReplies((prev) => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), { id: uid("r"), text: message, author: currentUser.name, time: Date.now() }],
    }));
    onReply?.(groupId, itemId, message, { story: groups.find((group) => group.id === groupId)?.items.find((item) => item.id === itemId), author: groups.find((group) => group.id === groupId)?.user });
  };

  const publishItem = async (payload) => {
    const optimisticItem = {
      id: uid("s"),
      type: payload.type,
      text: payload.text || "",
      companyPageId: accountMode === "company" ? currentUser.id : null,
      authorType: accountMode === "company" ? "page" : "person",
      bg: payload.bg,
      mediaUrl: payload.mediaUrl,
      fontSize: payload.fontSize,
      createdAt: Date.now(),
      seen: true,
      views: [],
    };
    updateGroups((prev) =>
      ownGroup
        ? prev.map((g) => (g.id === ownGroup.id ? { ...g, items: [optimisticItem, ...g.items] } : g))
        : [{ id: uid("g"), user: currentUser, items: [optimisticItem] }, ...prev]
    );
    setShowCreate(false);
    setShowUpload(false);

    if (status !== "authenticated") return;
    try {
      const res = await fetchBackendApi("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: payload.text,
          image: payload.mediaUrl,
          type: payload.type,
          privacy: payload.audience || "network",
          backgroundColor: payload.bg,
          account: accountMode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.id) throw new Error(data?.error || "Failed to publish story");
      updateGroups((prev) =>
        prev.map((g) => ({
          ...g,
          items: g.items.map((it) => (it.id === optimisticItem.id ? {
            ...it,
            id: data.id,
            companyPageId: accountMode === "company" ? currentUser.id : null,
            type: data.type || it.type,
            mediaUrl: data.image ?? it.mediaUrl,
            text: data.text ?? it.text,
            bg: data.bg ?? it.bg,
            privacy: data.privacy || payload.audience || "network",
            createdAt: data.createdAt || it.createdAt,
          } : it)),
        }))
      );
    } catch (err) {
      console.error("Failed to publish story:", err);
      updateGroups((prev) => prev.map((group) => ({
        ...group,
        items: group.items.filter((item) => item.id !== optimisticItem.id),
      })).filter((group) => group.items.length > 0));
    }
  };

  /* Unseen count badge */
  const totalUnseen = otherGroups.reduce((sum, g) => sum + g.items.filter((i) => !i.seen).length, 0);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", ...style }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');

        /* Scrollbar */
        .story-rail::-webkit-scrollbar { display: none; }
        .story-rail { scrollbar-width: none; }
        @media (max-width: 560px) {
          .story-backdrop {
            align-items: stretch !important;
            justify-content: stretch !important;
            padding: 0 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch;
          }
          .story-modal-card {
            width: 100% !important;
            max-width: none !important;
            min-height: 100dvh !important;
            max-height: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            padding-top: max(12px, env(safe-area-inset-top)) !important;
            padding-bottom: env(safe-area-inset-bottom) !important;
          }
          .story-rail {
            width: 100vw !important;
            min-width: 0 !important;
            max-width: none !important;
            margin-left: calc(50% - 50vw) !important;
            gap: 10px !important;
            padding: 10px 12px !important;
            border: none !important;
            border-radius: 18px !important;
            background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(244,246,251,0.08) 100%) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.2) !important;
            overscroll-behavior-x: contain;
            touch-action: pan-x;
          }
          .story-tile {
            width: 110px !important;
            height: 176px !important;
            border: 1px solid rgba(255,255,255,0.16) !important;
            border-radius: 16px !important;
            box-shadow: 0 10px 22px -18px rgba(15,51,82,0.5), inset 0 1px 0 rgba(255,255,255,0.14) !important;
          }
        }

        /* Rail & tiles */
        .story-rail {
          background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(244,246,251,0.96) 100%);
          border: 1px solid rgba(15,51,82,0.08);
          box-shadow: 0 14px 28px -22px rgba(15,51,82,0.35), inset 0 1px 0 rgba(255,255,255,0.8);
        }
        .story-tile {
          transition: transform 0.22s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.22s ease, filter 0.22s ease, border-color 0.22s ease;
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: 0 12px 24px -18px rgba(15,51,82,0.42), inset 0 1px 0 rgba(255,255,255,0.15);
          filter: saturate(1.04);
          background-clip: padding-box;
        }
        .story-tile:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 22px 40px -22px rgba(15,51,82,0.48), inset 0 1px 0 rgba(255,255,255,0.18);
          filter: saturate(1.12) brightness(1.03);
        }

        /* Option buttons */
        .story-option-btn { transition: all 0.2s ease; }
        .story-option-btn:hover { border-color: ${C.navy700}; background: ${C.navy50}; box-shadow: ${shadow.sm}; transform: translateY(-1px); }
        .story-option-btn:active { transform: scale(0.99) translateY(0); }
        .story-option-btn:hover .story-option-chevron { background: ${C.navy800}; }
        .story-option-btn:hover .story-option-chevron svg { color: #fff !important; }
        .story-option-chevron { transition: background 0.2s ease; }

        /* Publish button */
        .story-publish-btn { transition: all 0.2s ease; }
        .story-publish-btn:not(:disabled):hover { filter: brightness(1.04); transform: translateY(-1px); box-shadow: 0 14px 30px -10px rgba(217,165,54,0.6); }
        .story-publish-btn:active { transform: scale(0.98); }

        /* Chip */
        .story-chip { transition: all 0.2s ease; }
        .story-chip:hover { border-color: ${C.navy700} !important; }

        /* Swatch */
        .story-swatch { transition: transform 0.2s cubic-bezier(0.2,0.8,0.2,1); }
        .story-swatch:hover { transform: scale(1.15); }

        /* Input */
        .story-input { transition: border-color 0.2s ease, box-shadow 0.2s ease; }
        .story-input:focus { border-color: ${C.navy700} !important; box-shadow: 0 0 0 3.5px rgba(44,107,160,0.12) !important; }

        /* Menu */
        .story-menu-item { transition: background 0.12s ease; }
        .story-menu-item:hover { background: ${C.navy50}; }
        .story-menu-pop { animation: story-menu-in 0.16s cubic-bezier(0.2,0.8,0.2,1); transform-origin: top right; }
        @keyframes story-menu-in { from { opacity: 0; transform: scale(0.92) translateY(-6px); } to { opacity: 1; transform: scale(1) translateY(0); } }

        /* Reaction button */
        .story-react-btn-main { transition: all 0.2s ease; }
        .story-react-btn-main:hover { background: rgba(255,255,255,0.22) !important; transform: scale(1.06); }
        .story-react-btn-main:active { transform: scale(0.92); }
        .story-react-btn { transition: background 0.15s ease, transform 0.12s ease; }
        .story-react-btn:hover { background: rgba(255,255,255,0.24); transform: translateY(-1px); }
        .story-react-btn:active { transform: scale(0.94); }

        /* Send button */
        .story-send-btn { transition: all 0.2s ease; }
        .story-send-btn:not(:disabled):hover { filter: brightness(1.06); transform: translateY(-1px) scale(1.04); }
        .story-send-btn:active { transform: scale(0.92); }

        /* Icon button */
        .story-icon-btn { transition: all 0.15s ease; }
        .story-icon-btn:hover { filter: brightness(0.96); border-color: ${C.navy100}; background: rgba(255,255,255,0.08); }
        .story-icon-btn:active { transform: scale(0.9); }

        /* Viewer item hover */
        .story-viewer-item { transition: background 0.15s ease; }
        .story-viewer-item:hover { background: ${C.navy50}; }

        /* Dropzone */
        .story-dropzone { transition: all 0.2s ease; }
        .story-dropzone:hover { border-color: ${C.navy700}; }

        /* Font slider */
        .story-font-slider { height: 4px; border-radius: 999; }

        /* Spin */
        .story-spin { animation: story-spin 0.9s linear infinite; }
        @keyframes story-spin { to { transform: rotate(360deg); } }

        /* Heart burst */
        .story-heart-burst { animation: story-heart-pop 1s cubic-bezier(0.2,0.8,0.2,1) forwards; filter: drop-shadow(0 4px 12px rgba(255,92,122,0.45)); }
        @keyframes story-heart-pop {
          0% { opacity: 0; transform: scale(0.3) rotate(-10deg); }
          20% { opacity: 1; transform: scale(1.2) rotate(5deg); }
          100% { opacity: 0; transform: scale(0.9) rotate(-3deg) translateY(-50px); }
        }

        /* Reaction picker pop */
        .story-reaction-pop { animation: story-reaction-pop 0.2s cubic-bezier(0.2,0.8,0.2,1); }
        @keyframes story-reaction-pop {
          from { opacity: 0; transform: scale(0.8) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Pause indicator */
        .story-pause-indicator { animation: story-pause-in 0.15s ease; }
        @keyframes story-pause-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }

        /* Tooltip */
        @keyframes story-tooltip-in {
          from { opacity: 0; transform: translateX(-50%) translateY(2px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* Backdrop */
        .story-backdrop { animation: story-fade-in 0.22s ease; }
        .story-modal-card { animation: story-scale-in 0.26s cubic-bezier(0.2,0.8,0.2,1); }
        .story-sheet { animation: story-sheet-in 0.24s cubic-bezier(0.2,0.8,0.2,1); }
        .story-viewer-backdrop { animation: story-fade-in 0.2s ease; }
        @keyframes story-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes story-scale-in { from { opacity: 0; transform: scale(0.94) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes story-sheet-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .story-tile:hover { transform: none; }
          .story-heart-burst, .story-backdrop, .story-modal-card, .story-sheet, .story-menu-pop, .story-reaction-pop, .story-pause-indicator, .story-viewer-backdrop { animation: none; }
          .story-option-btn:hover, .story-react-btn-main:hover, .story-swatch:hover, .story-send-btn:not(:disabled):hover, .story-publish-btn:not(:disabled):hover { transform: none; }
        }
      `}</style>

      {/* Story Rail — defilement horizontal, chaque carte affiche un apercu de la story */}
      {loading && (
        <SkeletonStoryRail
          count={6}
          spacing={14}
          showAddButton={true}
          background={C.surface}
        />
      )}

      {!loading && loadError && (
        <div style={{
          padding: 20, background: C.surface, borderRadius: 20, border: `1px solid ${C.line}`,
          boxShadow: shadow.sm, fontSize: 13, color: C.muted, textAlign: "center",
        }}>
          {loadError}
        </div>
      )}

      {!loading && !loadError && (
      <div
        className="story-rail"
        style={{
          display: "flex", flexDirection: "row", flexWrap: "nowrap", gap: 16,
          padding: 18, background: C.surface, borderRadius: 20, border: `1px solid ${C.line}`,
          boxShadow: shadow.sm, overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Create story card — always visible in the same rail as the stories */}
        <div
          className="story-tile"
          onClick={() => setShowCreate(true)}
          style={{
            flex: "0 0 auto", width: 132, height: 206, borderRadius: 18, cursor: "pointer",
            position: "relative", overflow: "hidden",
            boxShadow: "0 16px 30px -24px rgba(15,51,82,0.55), inset 0 1px 0 rgba(255,255,255,0.15)",
            transition: "transform .15s ease, box-shadow .15s ease, filter .15s ease",
            background: currentUser.image ? "#0B1A28" : "linear-gradient(160deg, #3B6B92 0%, #132C43 58%, #091A29 100%)",
            border: `1px solid rgba(255,255,255,0.18)`,
            filter: "saturate(1.06)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = shadow.md; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = shadow.xs; }}
        >
          {currentUser.image ? (
            <>
              <div style={{ position: "absolute", inset: -12, backgroundImage: `url(${currentUser.image})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(12px)", opacity: 0.42 }} />
              <img src={currentUser.image} alt="Votre photo de profil" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 28%", background: "transparent" }} />
            </>
          ) : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.88)", fontSize: 58, fontWeight: 800, fontFamily: "'Sora', sans-serif", letterSpacing: 1 }}>{currentUser.initials || "U"}</div>}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,15,24,0.10) 0%, rgba(6,15,24,0.22) 42%, rgba(6,15,24,0.78) 100%)" }} />
          <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: C.white }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.white, color: C.navy800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: shadow.sm }}>
              <Plus size={20} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.white, textAlign: "center", padding: "0 8px", textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}>Créer une story</span>
          </div>
        </div>

        {/* Own story card */}
        {ownGroup && <div
          className="story-tile"
          onClick={() => openViewer(ownGroup.id)}
          style={{
            flex: "0 0 auto", width: 132, height: 206, borderRadius: 18, cursor: "pointer",
            position: "relative", overflow: "hidden",
            boxShadow: "0 16px 30px -24px rgba(15,51,82,0.55), inset 0 1px 0 rgba(255,255,255,0.15)",
            transition: "transform .15s ease, box-shadow .15s ease, filter .15s ease",
            background: ownGroup ? storyPreviewBg(ownGroup.items[0]) : C.navy50,
            border: ownGroup ? "1px solid rgba(255,255,255,0.14)" : `2px dashed ${C.navy100}`,
            filter: "saturate(1.06)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = shadow.md; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = shadow.xs; }}
        >
          <>
              {ownGroup.items[0].type === "image" && (
                <img src={ownGroup.items[0].mediaUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#0B1A28" }} />
              )}
              {ownGroup.items[0].type === "video" && (
                <video src={ownGroup.items[0].mediaUrl} muted playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#0B1A28" }} />
              )}
              {/* Voile sombre pour la lisibilite du texte/avatar */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,15,24,0.10) 0%, rgba(6,15,24,0.05) 45%, rgba(6,15,24,0.75) 100%)" }} />
              <div style={{ position: "absolute", top: 10, left: 10 }}>
                <Avatar initials={currentUser.initials} imgUrl={currentUser.image} size={36} ring="mine" />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
                aria-label="Ajouter une story"
                className="story-add-btn"
                style={{
                  position: "absolute", top: 34, left: 34, width: 22, height: 22, borderRadius: "50%",
                  background: goldGrad, border: `2px solid ${C.white}`, color: C.navy900,
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  boxShadow: shadow.gold, transition: "transform 0.15s ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <Plus size={11} strokeWidth={3} />
              </button>
              {ownGroup.items[0].type === "text" && (
                <span style={{
                  position: "absolute", top: 46, left: 10, right: 10, fontSize: 11, fontWeight: 600,
                  color: C.white, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical", overflow: "hidden", textShadow: "0 1px 4px rgba(0,0,0,0.35)",
                }}>
                  {ownGroup.items[0].text}
                </span>
              )}
              <span style={{ position: "absolute", bottom: 10, left: 10, right: 10, fontSize: 12, fontWeight: 700, color: C.white, textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
                Votre story
              </span>
              {ownGroup.items.length > 1 && <span style={{ position: "absolute", top: 10, right: 10, minWidth: 22, height: 22, padding: "0 6px", borderRadius: 999, background: "rgba(15,51,82,0.82)", color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, zIndex: 2 }}>{ownGroup.items.length}</span>}
          </>
        </div>}

        {/* Other stories — cartes-apercu */}
        {sortedOthers.map((g) => {
          const preview = g.items[0];
          const hasUnseen = g.items.some((i) => !i.seen);
          const unseenCount = g.items.filter((i) => !i.seen).length;
          return (
            <div
              key={g.id}
              className="story-tile"
              onClick={() => openViewer(g.id)}
              style={{
                flex: "0 0 auto", width: 132, height: 206, borderRadius: 18, cursor: "pointer",
                position: "relative", overflow: "hidden",
                boxShadow: "0 16px 30px -24px rgba(15,51,82,0.55), inset 0 1px 0 rgba(255,255,255,0.15)",
                transition: "transform .15s ease, box-shadow .15s ease, filter .15s ease",
                background: storyPreviewBg(preview),
                opacity: hasUnseen ? 1 : 0.85,
                border: "1px solid rgba(255,255,255,0.14)",
                filter: hasUnseen ? "saturate(1.06)" : "saturate(0.95)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = shadow.md; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = shadow.xs; }}
            >
              {preview.type === "image" && (
                <img src={preview.mediaUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#0B1A28" }} />
              )}
              {preview.type === "video" && (
                <video src={preview.mediaUrl} muted playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#0B1A28" }} />
              )}
              {/* Voile sombre pour la lisibilite du texte/avatar */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,15,24,0.10) 0%, rgba(6,15,24,0.05) 45%, rgba(6,15,24,0.75) 100%)" }} />

              <div style={{
                position: "absolute", top: 8, left: 8, borderRadius: "50%",
                boxShadow: hasUnseen ? `0 0 0 2.5px ${C.white}, 0 0 0 4.5px transparent` : "none",
              }}>
                <Avatar initials={g.user.initials} imgUrl={g.user.image} size={32} ring={hasUnseen ? "new" : "none"} />
              </div>

              {unseenCount > 1 && (
                <div style={{
                  position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%",
                  background: C.navy800, color: C.white, fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `2px solid ${C.white}`, boxShadow: shadow.sm, zIndex: 2,
                }}>
                  {unseenCount}
                </div>
              )}

              {preview.type === "text" && (
                <span style={{
                  position: "absolute", top: 44, left: 10, right: 10, fontSize: 11, fontWeight: 600,
                  color: C.white, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical", overflow: "hidden", textShadow: "0 1px 4px rgba(0,0,0,0.35)",
                }}>
                  {preview.text}
                </span>
              )}

              <span style={{
                position: "absolute", bottom: 10, left: 10, right: 10,
                fontSize: 12, fontWeight: hasUnseen ? 700 : 600, color: C.white,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                textShadow: "0 1px 4px rgba(0,0,0,0.4)",
              }}>
                {g.user.name.split(" ")[0]}
              </span>
              {g.items.length > 1 && <span style={{ position: "absolute", top: 8, right: 8, minWidth: 22, height: 22, padding: "0 6px", borderRadius: 999, background: "rgba(15,51,82,0.82)", color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, zIndex: 3 }}>{g.items.length}</span>}
            </div>
          );
        })}
      </div>
      )}

      {/* Unseen count indicator */}
      {totalUnseen > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginTop: 2, paddingLeft: 4,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%", background: C.navy700,
            boxShadow: `0 0 6px ${C.navy700}40`,
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: C.mutedLight }}>
            <AnimatedNumber value={totalUnseen} /> story{totalUnseen > 1 ? "s" : ""} non vue{totalUnseen > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Create Story Modal */}
      {showCreate && (
        <CreateStoryModal
          onClose={() => setShowCreate(false)}
          onGoUpload={() => { setShowCreate(false); setShowUpload(true); }}
          onPublishText={(payload) => publishItem({ type: "text", text: payload.text, bg: payload.bg, fontSize: payload.fontSize, audience: payload.audience })}
          currentUser={currentUser}
        />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onBack={() => { setShowUpload(false); setShowCreate(true); }}
          onPublishMedia={(payload) => publishItem(payload)}
        />
      )}

      {/* Full-screen Viewer */}
      {viewerGroupIndex !== null && viewerOrder.length > 0 && (
        <StoryViewer
          groups={viewerOrder}
          startGroupIndex={viewerGroupIndex}
          currentUserId={currentUser.id}
          onClose={() => setViewerGroupIndex(null)}
          onMarkSeen={markSeen}
          onReply={replyToStory}
          onReact={reactToStory}
          onDelete={deleteStory}
          reactions={reactions}
        />
      )}
    </div>
  );
}
