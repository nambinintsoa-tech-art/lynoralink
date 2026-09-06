const getInitials = (name = "Utilisateur") => name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "U";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import {
  MessageSquare, X, Search, MoreHorizontal, Send, Paperclip, Smile, Phone, Video, Link2, BookOpen,
  File, FileSpreadsheet, Presentation,
  Info, Pin, PinOff, Archive, ArchiveRestore, Bell, BellOff, Eye, EyeOff, Trash2, Copy, Ban,
  Flag, ArrowLeft, Check, CheckCheck, Plus, Mic, MicOff, VideoOff, PhoneOff, Download, Forward,
  Volume2, VolumeX, Maximize2, Minimize2, Image as ImageIcon, FileText, ShieldCheck,
  SmilePlus, CornerUpLeft, UsersRound, LogOut, UserPlus,
  ChevronRight, Inbox, UserX,
} from "lucide-react";
import ReactionPicker from "@/components/ReactionPicker";
import ReactionPickerContainer from "@/components/ReactionPickerContainer";
import Emojipicker from "@/components/Emojipicker";
import SkeletonMessage, { ChatSkeleton } from "@/components/SkeletonMessage";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSmile } from '@fortawesome/free-solid-svg-icons';
import { Room, RoomEvent } from "livekit-client";
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
  white: "var(--app-surface)",
  danger: "#C24444",
  danger50: "#FBEDED",
  success: "#2E9E5B",
  bubbleGreen400: "#A9DFC0",
  bubbleGreen600: "#6FBE8F",
};
const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;
const callGrad = `linear-gradient(175deg, ${C.navy800} 0%, #081B2C 100%)`;
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const REACTION_LIST = [
  { key: "ok", label: "J'aime", src: "/emoji_picker/j'aime.png" },
  { key: "love", label: "Love", src: "/emoji_picker/love.png" },
  { key: "triste", label: "Triste", src: "/emoji_picker/triste.png" },
  { key: "hahaha", label: "Hahaha", src: "/emoji_picker/hahaha.png" },
  { key: "colere", label: "Colère", src: "/emoji_picker/colere.png" },
  { key: "waouh", label: "Waouh", src: "/emoji_picker/waouh.png" },
];

const REACTION_MAP = REACTION_LIST.reduce((acc, r) => { acc[r.key] = r; return acc; }, {});

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function getMessageDate(message) {
  const timestamp = message.createdAt ? new Date(message.createdAt) : new Date();
  return Number.isNaN(timestamp.getTime()) ? new Date() : timestamp;
}

function getMessageDateKey(message) {
  const date = getMessageDate(message);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatMessageDateLabel(message) {
  const date = getMessageDate(message);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.round((startOfToday - startOfMessageDay) / 86400000);

  if (daysAgo <= 0) return "Aujourd'hui";
  if (daysAgo === 1) return "Hier";
  if (daysAgo < 7) return `Il y a ${daysAgo} jours`;
  if (daysAgo < 14) return "Il y a une semaine";
  if (daysAgo < 30) return `Il y a ${Math.floor(daysAgo / 7)} semaines`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function fileKind(file) {
  if (file.type.startsWith("video")) return "video";
  if (file.type.startsWith("image")) return "image";
  return "document";
}

/**
 * Upload d'un fichier vers Cloudinary avec suivi de progression (XHR pour bénéficier de
 * l'évènement `progress`).
 */
function uploadToCloudinary(file, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const kind = fileKind(file);
    if (kind === "document") {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "document");
      fetchBackendApi("/api/upload", { method: "POST", body: formData })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data?.url) throw new Error(data.error || "Échec de l'envoi du document");
          onProgress?.(100);
          resolve({ url: data.url, fallback: data.fallback });
        })
        .catch(reject);
      return;
    }
    const preset = kind === "video"
      ? process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_PRESET
      : process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const resourceType = kind === "video" ? "video" : "image";

    if (!cloudName || !preset) {
      return reject(new Error("Configuration Cloudinary incomplète"));
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", preset);
    formData.append("resource_type", resourceType);
    formData.append("folder", "lynoralink");

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url) {
          onProgress?.(100);
          resolve({ url: data.secure_url, fallback: false });
        } else {
          reject(new Error(data?.error?.message || data?.error || "Échec de l'envoi"));
        }
      } catch {
        reject(new Error("Réponse invalide du serveur"));
      }
    };

    xhr.onerror = () => reject(new Error("Erreur réseau pendant l'envoi"));
    xhr.onabort = () => reject(new Error("__aborted__"));

    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);
    xhr.send(formData);
  });
}

function getAttachmentProxyUrl(attachment) {
  if (!attachment?.url) return "";
  if (attachment.url.startsWith("data:")) return attachment.url;
  if (/\/image\/upload\//i.test(attachment.url)) return attachment.url;
  const mime = attachment.mime || (attachment.name?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
  const name = attachment.name || "piece-jointe";
  return `/api/messages/attachment?url=${encodeURIComponent(attachment.url)}&name=${encodeURIComponent(name)}${mime ? `&mime=${encodeURIComponent(mime)}` : ""}`;
}

function getAttachmentDisplayUrl(attachment) {
  if (!attachment?.url || attachment.url.startsWith("data:")) return attachment?.url || "";
  if (/\/image\/upload\//i.test(attachment.url)) return attachment.url;
  return getAttachmentProxyUrl(attachment);
}

function getAttachmentFileKind(attachment) {
  const name = attachment?.name || "";
  const mime = attachment?.mime || "";
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  if (/word|msword|officedocument\.wordprocessingml/i.test(mime) || /\.docx?$/i.test(name)) return "word";
  if (/excel|spreadsheetml/i.test(mime) || /\.(xlsx?|csv)$/i.test(name)) return "spreadsheet";
  if (/powerpoint|presentationml/i.test(mime) || /\.pptx?$/i.test(name)) return "presentation";
  if (/opendocument\.text|opendocument\.spreadsheet|opendocument\.presentation/i.test(mime) || /\.(odt|ods|odp)$/i.test(name)) return "open-document";
  return "file";
}

function AttachmentViewer({ attachment, onClose }) {
  const isImage = attachment?.type === "image" || attachment?.mime?.startsWith("image/");
  const isVideo = attachment?.type === "video" || attachment?.mime?.startsWith("video/");
  const fileKind = getAttachmentFileKind(attachment);
  const isPdf = fileKind === "pdf";
  const isDocument = ["word", "spreadsheet", "presentation", "open-document"].includes(fileKind);
  const FileTypeIcon = isPdf ? FileText : /(?:sheet|excel)|\.xlsx?$/i.test(`${attachment?.mime || ""} ${attachment?.name || ""}`) ? FileSpreadsheet : /(?:powerpoint|presentation)|\.pptx?$/i.test(`${attachment?.mime || ""} ${attachment?.name || ""}`) ? Presentation : File;
  const fileExtension = attachment?.name?.includes(".") ? attachment.name.split(".").pop().toUpperCase() : (isPdf ? "PDF" : "FICHIER");
  const FallbackIcon = isVideo ? Video : FileText;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const downloadAttachment = async () => {
    if (!attachment?.url || downloading) return;
    setDownloading(true);
    setDownloadError("");
    try {
      const response = await fetch(getAttachmentProxyUrl(attachment));
      if (!response.ok) throw new Error("download failed");
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = attachment.name || "fichier";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      setDownloadError("Téléchargement impossible. Réessayez.");
    } finally {
      setDownloading(false);
    }
  };

  return typeof document === "undefined" ? null : createPortal((
    <div
      role="dialog"
      aria-modal="true"
      aria-label={attachment?.name || "Pièce jointe"}
      onClick={onClose}
      className="lynora-attachment-viewer"
      style={{ position: "fixed", inset: 0, zIndex: 2147483000, background: "rgba(4,12,20,0.94)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, color: C.white }}
    >
      <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <div className="lynora-attachment-viewer-toolbar" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 700 }}>{attachment?.name || "Pièce jointe"}</span>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {attachment?.url && <button type="button" onClick={downloadAttachment} disabled={downloading} title="Télécharger directement" aria-label="Télécharger directement" style={{ width: 38, height: 38, border: 0, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.16)", color: C.white, cursor: downloading ? "default" : "pointer", opacity: downloading ? 0.6 : 1 }}><Download size={17} /></button>}
            <button type="button" onClick={onClose} title="Fermer" aria-label="Fermer" style={{ width: 38, height: 38, border: "none", borderRadius: 10, background: "rgba(255,255,255,0.16)", color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
          </div>
        </div>
        {downloadError && <div role="alert" style={{ color: "#F7B4B4", fontSize: 12 }}>{downloadError}</div>}
        <div style={{ flex: 1, width: "100%", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isImage ? <img src={attachment.url} alt={attachment.name || "Image"} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
            : isVideo ? <video src={attachment.url} controls autoPlay style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8, background: "#000" }} />
              : isPdf ? <iframe src={getAttachmentDisplayUrl(attachment)} title={attachment.name || "Document PDF"} style={{ width: "100%", height: "100%", minHeight: 420, border: 0, borderRadius: 8, background: C.white }} />
                : isDocument ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 32, borderRadius: 16, background: "rgba(255,255,255,0.1)", textAlign: "center" }}><FileTypeIcon size={52} /><span style={{ fontSize: 13, color: "rgba(255,255,255,0.78)" }}>Ce format s'ouvre avec l'application installee sur votre appareil.</span></div>
              : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 32, borderRadius: 16, background: "rgba(255,255,255,0.1)" }}><FallbackIcon size={52} /><span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Fichier prêt à télécharger</span></div>}
        </div>
      </div>
    </div>
  ), document.body);
}

function AttachmentPreview({ attachment, onOpen }) {
  const isArticle = attachment?.type === "article";
  const isLink = attachment?.type === "link";
  const isImage = attachment?.type === "image" || attachment?.mime?.startsWith("image/");
  const isVideo = attachment?.type === "video" || attachment?.mime?.startsWith("video/");
  const fileKind = getAttachmentFileKind(attachment);
  const isPdf = fileKind === "pdf";
  const isOfficeDocument = ["word", "spreadsheet", "presentation", "open-document"].includes(fileKind);
  const isDocument = isPdf || isOfficeDocument;
  const FileTypeIcon = isPdf ? FileText : /(?:sheet|excel)|\.xlsx?$/i.test(`${attachment?.mime || ""} ${attachment?.name || ""}`) ? FileSpreadsheet : /(?:powerpoint|presentation)|\.pptx?$/i.test(`${attachment?.mime || ""} ${attachment?.name || ""}`) ? Presentation : File;
  const fileExtension = attachment?.name?.includes(".") ? attachment.name.split(".").pop().toUpperCase() : (isPdf ? "PDF" : "FICHIER");
  const fileColor = fileKind === "pdf" ? "#C24444" : fileKind === "spreadsheet" ? "#2E9E5B" : fileKind === "presentation" ? "#D87532" : fileKind === "word" || fileKind === "open-document" ? "#2C6BA0" : C.navy800;


  const openPdfDirectly = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const url = getAttachmentDisplayUrl(attachment);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleOfficeOpen = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      const response = await fetch(getAttachmentProxyUrl(attachment));
      if (!response.ok) throw new Error("download failed");
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = attachment.name || "fichier";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      // Pas de protocole ms-word:/ms-excel:/ms-powerpoint: ici : ces schémas
      // ne fonctionnent qu'avec Microsoft Office. Le téléchargement seul
      // suffit : l'OS ouvre le fichier avec l'application par défaut associée
      // à l'extension (LibreOffice, WPS, Word, etc.) quand l'utilisateur clique
      // dessus dans la barre/le dossier de téléchargements — que ce soit sur
      // PC ou sur téléphone (partage vers l'app installée).
    } catch {
      const link = document.createElement("a");
      link.href = attachment.url;
      link.download = attachment.name || "fichier";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8, borderRadius: 12, background: "rgba(255,255,255,0.8)", border: `1px solid ${C.line}` }}>
      {isArticle ? (
        <a href={attachment.url} target="_blank" rel="noreferrer" style={{ display: "flex", gap: 10, alignItems: "center", color: C.ink, textDecoration: "none" }}>
          {attachment.thumbnail ? <img src={attachment.thumbnail} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 8 }} /> : <BookOpen size={20} color={C.navy800} />}
          <span style={{ minWidth: 0 }}><strong style={{ display: "block", fontSize: 12.5 }}>{attachment.title || attachment.name}</strong><span style={{ display: "block", fontSize: 11, color: C.muted }}>Article partagé</span></span>
        </a>
      ) : isLink ? (
        <a href={attachment.url} target="_blank" rel="noreferrer" style={{ display: "flex", gap: 8, alignItems: "center", color: C.navy800, fontSize: 12.5, fontWeight: 700, overflowWrap: "anywhere" }}>
          <Link2 size={16} />{attachment.name || attachment.url}
        </a>
      ) : isImage ? (
        <button type="button" onClick={() => onOpen(attachment)} title="Ouvrir" style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer", display: "block" }}><img src={attachment.url} alt={attachment.name} style={{ width: "100%", maxWidth: 220, maxHeight: 140, objectFit: "cover", borderRadius: 10, display: "block" }} /></button>
      ) : isVideo ? (
        <button type="button" onClick={() => onOpen(attachment)} title="Ouvrir" style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer", display: "block" }}><video src={attachment.url} muted style={{ width: "100%", maxWidth: 220, maxHeight: 140, objectFit: "cover", borderRadius: 10, display: "block", background: "#000" }} /></button>
      ) : isPdf || isDocument ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            type="button"
            onClick={isPdf ? openPdfDirectly : isOfficeDocument ? handleOfficeOpen : () => onOpen(attachment)}
            title={isPdf ? "Ouvrir le PDF dans le navigateur" : isOfficeDocument ? "Télécharger et ouvrir avec l'application associée" : "Aperçu du fichier"}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 280, minWidth: 0, padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 8, background: C.navy50, color: C.ink, textAlign: "left", cursor: "pointer" }}
          >
            <span style={{ width: 38, height: 42, flex: "0 0 38px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 7, background: fileColor, color: C.white }}><FileTypeIcon size={18} /><small style={{ fontSize: 7.5, fontWeight: 800, lineHeight: 1 }}>{fileExtension}</small></span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span title={attachment.name} style={{ display: "block", overflowWrap: "anywhere", fontSize: 11.5, fontWeight: 700, lineHeight: 1.3 }}>{attachment.name}</span>
              <span style={{ display: "block", marginTop: 3, color: C.muted, fontSize: 10.5 }}>{isPdf ? "PDF · ouverture navigateur" : isOfficeDocument ? "Document · téléchargement puis application associée" : "Document"}{attachment.size ? ` · ${formatBytes(attachment.size)}` : ""}</span>
            </span>
            <ChevronRight size={15} color={C.mutedLight} style={{ flexShrink: 0 }} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => onOpen(attachment)} title="Ouvrir le fichier" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 280, minWidth: 0, padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 8, background: C.navy50, color: C.ink, textAlign: "left", cursor: "pointer" }}>
          <div style={{ width: 38, height: 42, flex: "0 0 38px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 7, background: C.navy800, color: C.white }}>
            <FileTypeIcon size={18} />
            <small style={{ fontSize: 7.5, fontWeight: 800, lineHeight: 1 }}>{fileExtension}</small>
          </div>
          <div style={{ minWidth: 0 }}>
            <div title={attachment.name} style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, overflowWrap: "anywhere" }}>{attachment.name}</div>
            <div style={{ marginTop: 3, fontSize: 10.5, color: C.muted }}>Fichier{attachment.size ? ` · ${formatBytes(attachment.size)}` : ""}</div>
          </div>
          <ChevronRight size={15} color={C.mutedLight} style={{ marginLeft: "auto", flexShrink: 0 }} />
        </button>
      )}
    </div>
  );
}

function ProgressRing({ progress = 0, size = 36 }) {
  const deg = Math.max(0, Math.min(100, progress)) * 3.6;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `conic-gradient(${C.gold400} ${deg}deg, rgba(255,255,255,0.28) ${deg}deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: size - 8, height: size - 8, borderRadius: "50%", background: "rgba(15,36,51,0.85)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.white }}>{progress}%</div>
    </div>
  );
}

function SmallAttachmentTile({ attachment, onRemove }) {
  const isImage = attachment?.type === "image" || attachment?.mime?.startsWith("image/");
  const isVideo = attachment?.type === "video" || attachment?.mime?.startsWith("video/");
  const fileName = attachment?.name || "";
  const fileType = attachment?.mime || "";
  const extension = fileName.includes(".") ? fileName.split(".").pop().toUpperCase() : "FICHIER";
  const isPdf = fileType === "application/pdf" || /\.pdf$/i.test(fileName);
  const isSpreadsheet = /spreadsheet|excel/i.test(fileType) || /\.(xlsx?|csv)$/i.test(fileName);
  const isPresentation = /presentation|powerpoint/i.test(fileType) || /\.pptx?$/i.test(fileName);
  const fileIcon = isPdf ? FileText : isSpreadsheet ? FileSpreadsheet : isPresentation ? Presentation : File;
  const fileColor = isPdf ? "#C24444" : isSpreadsheet ? "#2E9E5B" : isPresentation ? "#D87532" : C.navy800;

  return (
    <div style={{ position: "relative", width: 120, height: 80, borderRadius: 10, overflow: "hidden", background: C.navy50, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {isImage ? (
        <img src={attachment.url} alt={attachment.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : isVideo ? (
        <video src={attachment.url} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#000" }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, width: "100%", height: "100%" }}>
          <div style={{ width: 42, height: 44, borderRadius: 8, background: fileColor, color: C.white, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            {React.createElement(fileIcon, { size: 19 })}
            <small style={{ fontSize: 7, fontWeight: 800, lineHeight: 1 }}>{extension}</small>
          </div>
          <span title={fileName} style={{ maxWidth: 104, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 9.5, fontWeight: 700, color: C.ink }}>{fileName}</span>
        </div>
      )}

      <button onClick={() => onRemove(attachment.id)} title="Supprimer" style={{ position: "absolute", top: 8, right: 8, border: "none", background: "rgba(15,36,51,0.6)", color: C.white, width: 26, height: 26, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <X size={12} color={C.white} />
      </button>

      {attachment.status !== "done" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,36,51,0.34)" }}>
          <ProgressRing progress={attachment.progress || 0} size={46} />
        </div>
      )}
    </div>
  );
}

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* Minuterie d'appel : simule la sonnerie puis la connexion, incrémente la durée */
function useCallTimer(active, connected) {
  const [status, setStatus] = useState("ringing"); // "ringing" | "connected"
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setStatus(active && connected ? "connected" : "ringing");
    if (!active) setElapsed(0);
  }, [active, connected]);

  useEffect(() => {
    if (status !== "connected") return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  return { status, elapsed };
}

function useCallTone(ringing, incoming = false) {
  useEffect(() => {
    if (!ringing || typeof window === "undefined") return undefined;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return undefined;

    const audioContext = new AudioContextClass();
    let stopped = false;
    let timer;

    const playTone = (startTime, duration = 0.42) => {
      if (stopped || audioContext.state === "closed") return;
      const firstOscillator = audioContext.createOscillator();
      const secondOscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      firstOscillator.type = "sine";
      secondOscillator.type = "sine";
      firstOscillator.frequency.setValueAtTime(440, startTime);
      secondOscillator.frequency.setValueAtTime(480, startTime);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.045, startTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration - 0.04);
      firstOscillator.connect(gain);
      secondOscillator.connect(gain);
      gain.connect(audioContext.destination);
      firstOscillator.start(startTime);
      secondOscillator.start(startTime);
      firstOscillator.stop(startTime + duration);
      secondOscillator.stop(startTime + duration);
    };

    audioContext.resume().catch(() => {});
    const playRingCycle = () => {
      const startTime = audioContext.currentTime + 0.03;
      if (incoming) {
        playTone(startTime);
        playTone(startTime + 0.62);
      } else {
        playTone(startTime, 1.2);
      }
    };
    playRingCycle();
    timer = setInterval(playRingCycle, incoming ? 3000 : 4000);

    return () => {
      stopped = true;
      clearInterval(timer);
      audioContext.close().catch(() => {});
    };
  }, [ringing, incoming]);
}

/* Accès réel au micro / à la caméra de l'appareil quand le navigateur l'autorise.
   En cas de refus ou d'environnement sans média, l'appel reste utilisable en mode simulé. */
function useLocalMedia(active, mode) {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    let localStream = null;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Micro/caméra indisponibles dans cet environnement — appel simulé.");
        return;
      }
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" });
        if (cancelled) { localStream.getTracks().forEach((t) => t.stop()); return; }
        setStream(localStream);
        setError(null);
      } catch {
        setError("Accès micro/caméra refusé — appel simulé.");
      }
    })();

    return () => {
      cancelled = true;
      localStream?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [active, mode]);

  return { stream, error };
}

/* Demo data removed — use provided `conversations` prop or start with an empty list. */

/* ------------------------------------------------------------------ */
/*  PETITS COMPOSANTS D'APPUI                                         */
/* ------------------------------------------------------------------ */
function Avatar({ initials, size = 42, imageUrl, online, onClick }) {
  const clickable = !!onClick;
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div
        onClick={onClick}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        title={clickable ? "Voir le profil" : undefined}
        onKeyDown={(e) => { if (clickable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(e); } }}
        style={{
          width: size, height: size, borderRadius: "50%", background: navyGrad, color: C.white,
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
          fontSize: size * 0.36, fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em",
          cursor: clickable ? "pointer" : "default", userSelect: "none", overflow: "hidden",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
        onMouseEnter={(e) => { if (clickable) { e.currentTarget.style.transform = "scale(1.07)"; e.currentTarget.style.boxShadow = `0 0 0 2px ${C.white}, 0 0 0 4px ${C.gold400}`; } }}
        onMouseLeave={(e) => { if (clickable) { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; } }}
      >
        {imageUrl ? <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
      </div>
      {online && <span aria-label="En ligne" style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#22C55E", border: `2px solid ${C.white}`, boxShadow: "0 0 0 1px #15803D" }} />}
    </div>
  );
}

function GroupAvatarStack({ members = [], size = 36, onOpenProfile }) {
  const visibleMembers = members.slice(0, 4);
  const remaining = Math.max(0, members.length - visibleMembers.length);
  return (
    <div style={{ display: "flex", alignItems: "center", flexShrink: 0, paddingLeft: visibleMembers.length > 1 ? 5 : 0 }}>
      {visibleMembers.map((member, index) => (
        <div key={member.id || index} onClick={(event) => { event.stopPropagation(); onOpenProfile?.(member.id); }} title={onOpenProfile ? `Voir le profil de ${member.name || "ce membre"}` : undefined} role={onOpenProfile ? "button" : undefined} style={{ width: size, height: size, marginLeft: index ? -10 : 0, borderRadius: "50%", overflow: "hidden", border: `2px solid ${C.white}`, background: navyGrad, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.3, fontWeight: 700, zIndex: visibleMembers.length - index, cursor: onOpenProfile ? "pointer" : "default" }}>
          {member.image ? <img src={member.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : member.initials || getInitials(member.name)}
        </div>
      ))}
      {remaining > 0 && <span style={{ marginLeft: 5, fontSize: 11, fontWeight: 800, color: C.muted }}>+{remaining}</span>}
    </div>
  );
}

/* Petit bouton rond utilisé dans la barre d'actions au survol d'un message */
function ToolbarBtn({ icon: Icon, onClick, title, danger }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick?.(event);
      }}
      title={title}
      style={{ width: 25, height: 25, borderRadius: "50%", border: "none", background: "transparent", color: danger ? C.danger : C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? C.danger50 : C.navy50)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon size={13} />
    </button>
  );
}

/* Indicateur "en train d'écrire…" — bulle avec trois points animés */
function TypingIndicator({ initials, imageUrl, online }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-end", gap: 6 }}>
      <style>{`
        @keyframes lynoraTypingBounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.45; } 30% { transform: translateY(-4px); opacity: 1; } }
        .lynora-typing-dot { width: 6px; height: 6px; border-radius: 50%; background: ${C.mutedLight}; display: inline-block; animation: lynoraTypingBounce 1.1s infinite; }
      `}</style>
      <Avatar initials={initials} imageUrl={imageUrl} size={24} online={online} />
      <div style={{ padding: "11px 14px", borderRadius: "14px 14px 14px 4px", background: C.navy50, display: "flex", gap: 4, alignItems: "center" }}>
        <span className="lynora-typing-dot" style={{ animationDelay: "0s" }} />
        <span className="lynora-typing-dot" style={{ animationDelay: "0.15s" }} />
        <span className="lynora-typing-dot" style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );
}

function DateSeparator({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 8px", color: C.mutedLight, fontSize: 10.5, fontWeight: 700 }}>
      <span style={{ height: 1, flex: 1, background: C.line }} />
      <span>{label}</span>
      <span style={{ height: 1, flex: 1, background: C.line }} />
    </div>
  );
}

function ParentMessagePreview({ replyTo, isMine = false, compact = false }) {
  if (!replyTo) return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        marginBottom: compact ? 0 : 7,
        padding: compact ? "3px 0 3px 9px" : "5px 0 5px 9px",
        borderLeft: `3px solid ${isMine ? "rgba(255,255,255,0.55)" : C.navy700}`,
        background: "transparent",
        minWidth: 0,
      }}
    >
      <span style={{ color: isMine ? "rgba(255,255,255,0.86)" : C.navy800, fontSize: compact ? 10 : 10.5, fontWeight: 700 }}>
        {replyTo.from === "me" ? "Vous" : replyTo.author || "Message parent"}
      </span>
      <span style={{ color: isMine ? "rgba(255,255,255,0.72)" : C.muted, fontSize: compact ? 10.5 : 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {replyTo.deletedForEveryone ? "Message supprimé" : replyTo.text || "Pièce jointe"}
      </span>
    </div>
  );
}

function IconBtn({ icon: Icon, onClick, title, size = 16, active }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      title={title}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 9, border: "none", background: active ? C.navy50 : "transparent", color: active ? C.navy800 : C.muted, cursor: "pointer", flexShrink: 0 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)}
      onMouseLeave={(e) => (e.currentTarget.style.background = active ? C.navy50 : "transparent")}
    >
      <Icon size={size} />
    </button>
  );
}

function Backdrop({ onClose, children, maxWidth = 420, maxHeight = 600, nonBlocking = false, mobile = false }) {
  if (nonBlocking && !mobile) {
    return (
      <div
        className="lynora-message-backdrop"
        style={{ position: "relative", width: "100%", height: "100%", minHeight: 0, background: "transparent", pointerEvents: "auto" }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className="lynora-message-backdrop"
      style={{
        position: mobile ? "fixed" : (nonBlocking ? "absolute" : "fixed"),
        inset: 0,
        background: mobile ? C.white : (nonBlocking ? "transparent" : "rgba(15,51,82,0.55)"),
        backdropFilter: mobile || nonBlocking ? "none" : "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: mobile ? 1200 : (nonBlocking ? 1 : 200),
        padding: nonBlocking || mobile ? 0 : 16,
        pointerEvents: mobile || !nonBlocking ? "auto" : "none",
        animation: mobile || nonBlocking ? "none" : "lynoraBackdropFade 0.15s ease",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes lynoraBackdropFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lynoraModalPop { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
      <div
        className="lynora-message-surface"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: mobile ? "none" : (nonBlocking ? "100%" : maxWidth),
          height: mobile ? "100dvh" : (nonBlocking ? "100%" : `min(${maxHeight}px, 90vh)`),
          maxHeight: mobile ? "100dvh" : (nonBlocking ? "100%" : "90vh"),
          background: C.white,
          borderRadius: mobile ? 0 : (nonBlocking ? 0 : 20),
          boxShadow: nonBlocking ? "none" : "0 24px 80px rgba(15,51,82,0.35)",
          overflow: "hidden",
          overflowX: "hidden",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          border: mobile || nonBlocking ? "none" : `1px solid rgba(15,51,82,0.08)`,
          animation: nonBlocking ? "none" : "lynoraModalPop 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
          pointerEvents: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MENU D'OPTIONS — CONVERSATION (liste)                             */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  DROPDOWN — briques partagées pour un style de menu moderne         */
/*    (utilisées par ConversationMenu et ChatMenu)                     */
/* ------------------------------------------------------------------ */
function MenuContainer({ innerRef, top, right, width = 240, className = "", position = "absolute", left, children }) {
  return (
    <div
      className={className}
      ref={innerRef}
      style={{
        position, top, right, left, width, background: C.white, borderRadius: 16,
        border: `1px solid ${C.line}`, boxShadow: "0 16px 40px rgba(15,51,82,0.22), 0 4px 10px rgba(15,51,82,0.08)",
        zIndex: 55, overflow: "hidden", padding: "6px 0", transformOrigin: "top right",
        animation: "lynoraMenuPop 0.16s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`@keyframes lynoraMenuPop { from { opacity: 0; transform: scale(0.96) translateY(-4px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
      {children}
    </div>
  );
}

function MenuRow({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "calc(100% - 12px)", margin: "1px 6px", display: "flex", alignItems: "center", gap: 10,
        padding: "8px 8px", background: "transparent", border: "none", borderRadius: 10, cursor: "pointer",
        fontSize: 12.5, fontWeight: 600, color: danger ? C.danger : C.ink, textAlign: "left",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? C.danger50 : C.navy50)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ width: 30, height: 30, borderRadius: 9, background: danger ? C.danger50 : C.navy50, color: danger ? C.danger : C.navy800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {React.createElement(icon, { size: 14 })}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
    </button>
  );
}

function MenuDivider() {
  return <div style={{ height: 1, background: C.line, margin: "6px 10px" }} />;
}

/* ------------------------------------------------------------------ */
/*  PARAMÈTRES DE LA DISCUSSION — interrupteur + lignes de navigation  */
/* ------------------------------------------------------------------ */
function ToggleSwitch({ checked, onChange, title }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      title={title}
      onClick={onChange}
      style={{
        width: 40, height: 24, borderRadius: 999, border: "none", cursor: "pointer", padding: 0,
        background: checked ? C.navy700 : C.line, position: "relative", flexShrink: 0,
        transition: "background 0.18s ease",
      }}
    >
      <span
        style={{
          position: "absolute", top: 2, left: checked ? 18 : 2, width: 20, height: 20,
          borderRadius: "50%", background: C.white, boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          transition: "left 0.18s ease",
        }}
      />
    </button>
  );
}

function SettingsToggleRow({ icon, label, description, checked, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "9px 16px" }}>
      <span style={{ marginTop: 2, color: C.navy800, flexShrink: 0 }}>{React.createElement(icon, { size: 17 })}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{label}</div>
        {description && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2, lineHeight: 1.35 }}>{description}</div>}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

function SettingsNavRow({ icon, label, value, onClick, chevron = true }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
        background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ color: C.ink, flexShrink: 0 }}>{React.createElement(icon, { size: 17 })}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: C.ink }}>
        {label}{value ? <span style={{ fontWeight: 500, color: C.muted }}> : {value}</span> : null}
      </span>
      {chevron && <ChevronRight size={15} color={C.mutedLight} />}
    </button>
  );
}

function SettingsRadioRow({ label, description, checked, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: "100%", display: "flex", alignItems: "flex-start", gap: 12, padding: "9px 16px",
        background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span
        style={{
          marginTop: 2, width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
          border: `1.5px solid ${checked ? C.navy800 : C.line}`, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {checked && <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.navy800 }} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{label}</div>
        {description && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2, lineHeight: 1.35 }}>{description}</div>}
      </div>
    </button>
  );
}

function SettingsSubHeader({ title, onBack, onClose, mobile }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: navyGrad, color: C.white }}>
      <button
        type="button"
        onClick={onBack}
        aria-label="Retour"
        title="Retour"
        style={{ width: 30, height: 30, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 9, background: "rgba(255,255,255,0.16)", color: C.white, cursor: "pointer" }}
      >
        <ArrowLeft size={16} />
      </button>
      <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 13.5, flex: 1, minWidth: 0 }}>{title}</span>
      {mobile && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer les paramètres"
          title="Fermer"
          style={{ width: 30, height: 30, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 9, background: "rgba(255,255,255,0.16)", color: C.white, cursor: "pointer" }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/* Panneau générique pour les listes de personnes gérées depuis les
   paramètres (invitations en attente, comptes restreints, comptes bloqués).
   Chaque instance appelle son propre endpoint et propose une action rapide. */
function SettingsPeoplePanel({ endpoint, emptyLabel, errorLabel, renderAction }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // "loading" | "ready" | "error"
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setState("loading");
    fetch(endpoint, { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((data) => {
        setItems(Array.isArray(data.users) ? data.users : Array.isArray(data.items) ? data.items : []);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const runAction = async (user, action) => {
    setBusyId(user.id);
    try {
      await action.onRun(user);
      setItems((current) => current.filter((item) => item.id !== user.id));
    } catch {
      /* on laisse l'utilisateur réessayer, la liste reste inchangée */
    } finally {
      setBusyId(null);
    }
  };

  if (state === "loading") {
    return <div style={{ padding: "24px 8px", textAlign: "center", color: C.mutedLight, fontSize: 12.5 }}>Chargement…</div>;
  }
  if (state === "error") {
    return (
      <div style={{ padding: "24px 16px", textAlign: "center" }}>
        <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 10 }}>{errorLabel}</div>
        <button type="button" onClick={load} style={{ border: `1px solid ${C.line}`, background: "transparent", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: C.navy800, cursor: "pointer" }}>Réessayer</button>
      </div>
    );
  }
  if (items.length === 0) {
    return <div style={{ padding: "24px 16px", textAlign: "center", color: C.mutedLight, fontSize: 12.5 }}>{emptyLabel}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "6px 6px" }}>
      {items.map((user) => {
        const action = renderAction(user);
        return (
          <div key={user.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px" }}>
            <Avatar initials={user.initials || getInitials(user.name)} imageUrl={user.image} size={34} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: "block", color: C.ink, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name || "Utilisateur"}</strong>
              <small style={{ color: C.muted, fontSize: 11 }}>{user.title || action.subLabel || "Membre LynoraLink"}</small>
            </span>
            {action && (
              <button
                type="button"
                disabled={busyId === user.id}
                onClick={() => runAction(user, action)}
                style={{
                  border: `1px solid ${action.danger ? C.danger : C.line}`, background: "transparent", borderRadius: 8,
                  padding: "5px 10px", fontSize: 11, fontWeight: 700, color: action.danger ? C.danger : C.navy800,
                  cursor: busyId === user.id ? "default" : "pointer", flexShrink: 0, opacity: busyId === user.id ? 0.6 : 1,
                }}
              >
                {busyId === user.id ? "…" : action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChatSettingsPanel({ settings, onToggle, onNavigate, onClose, top = 40, right = 0, mobile = false }) {
  const [panel, setPanel] = useState("main"); // "main" | "privacy" | "requests" | "receiving" | "restricted" | "blocked"
  const [renderedSub, setRenderedSub] = useState("privacy"); // garde le contenu affiché pendant l'animation de retour
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const goToSub = (target) => {
    if (target === "archived") { onNavigate(target); return; }
    setRenderedSub(target);
    setPanel(target);
  };
  const goToMain = () => setPanel("main");

  const titles = {
    privacy: "Confidentialité et sécurité",
    requests: "Invitations par message",
    receiving: mobile ? "Réception des messages" : "Paramètres de réception des messages",
    restricted: "Comptes restreints",
    blocked: "Paramètres de blocage",
  };
  const activeSub = panel === "main" ? renderedSub : panel;

  return (
    <div
      ref={ref}
      className="lynora-conversation-settings-menu"
      style={{
        position: "absolute", top, right, width: 296, maxHeight: 460, overflow: "hidden",
        background: C.white, borderRadius: 16, border: `1px solid ${C.line}`,
        boxShadow: "0 16px 40px rgba(15,51,82,0.22), 0 4px 10px rgba(15,51,82,0.08)",
        zIndex: 60, animation: "lynoraMenuPop 0.16s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        style={{
          display: "flex", width: "200%",
          transform: panel === "main" ? "translateX(0%)" : "translateX(-50%)",
          transition: "transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* ------- Menu principal ------- */}
        <div style={{ width: "50%", maxHeight: 460, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", background: navyGrad, color: C.white }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 13.5 }}>{mobile ? "Réglages des messages" : "Paramètres de la discussion"}</div>
              <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 2 }}>{mobile ? "Préférences de votre messagerie" : "Personnalisez votre expérience Messenger"}</div>
            </div>
            {mobile && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer les paramètres"
                title="Fermer"
                style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 9, background: "rgba(255,255,255,0.16)", color: C.white, cursor: "pointer" }}
              >
                <X size={17} />
              </button>
            )}
          </div>

          <div style={{ padding: "4px 0" }}>
            <SettingsToggleRow
              icon={Phone}
              label="Sons des appels entrants"
              checked={settings.incomingCallSounds}
              onChange={() => onToggle("incomingCallSounds")}
            />
            <SettingsToggleRow
              icon={Volume2}
              label="Sons des messages"
              checked={settings.messageSounds}
              onChange={() => onToggle("messageSounds")}
            />
            <SettingsToggleRow
              icon={Eye}
              label={mobile ? "Ouvrir les nouveaux messages" : "Afficher les nouveaux messages"}
              description={mobile ? "Ouverture automatique" : "Ouvre automatiquement les nouveaux messages."}
              checked={settings.autoOpenNewMessages}
              onChange={() => onToggle("autoOpenNewMessages")}
            />
          </div>

          <MenuDivider />

          <div style={{ padding: "4px 0" }}>
            <SettingsNavRow icon={ShieldCheck} label="Confidentialité et sécurité" onClick={() => goToSub("privacy")} />
            <SettingsNavRow
              icon={UsersRound}
              label="Statut En ligne"
              value={settings.onlineStatus ? "activé" : "désactivé"}
              chevron={false}
              onClick={() => onToggle("onlineStatus")}
            />
            <SettingsNavRow icon={MessageSquare} label="Invitations par message" onClick={() => goToSub("requests")} />
            <SettingsNavRow icon={Archive} label="Discussions archivées" onClick={() => goToSub("archived")} />
            <SettingsNavRow icon={Inbox} label={mobile ? "Réception des messages" : "Paramètres de réception des messages"} onClick={() => goToSub("receiving")} />
          </div>

          <MenuDivider />

          <div style={{ padding: "4px 0 6px" }}>
            <SettingsNavRow icon={UserX} label="Comptes restreints" onClick={() => goToSub("restricted")} />
            <SettingsNavRow icon={Ban} label="Paramètres de blocage" onClick={() => goToSub("blocked")} />
          </div>
        </div>

        {/* ------- Sous-page (glisse depuis la droite) ------- */}
        <div style={{ width: "50%", maxHeight: 460, overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <SettingsSubHeader title={titles[activeSub]} onBack={goToMain} onClose={onClose} mobile={mobile} />

          {activeSub === "privacy" && (
            <div style={{ padding: "4px 0" }}>
              <SettingsToggleRow
                icon={Eye}
                label="Confirmations de lecture"
                description="Les autres voient quand vous avez lu leurs messages."
                checked={settings.readReceipts}
                onChange={() => onToggle("readReceipts")}
              />
              <SettingsToggleRow
                icon={MessageSquare}
                label="Indicateur de saisie"
                description="Affiche « en train d'écrire… » pendant que vous tapez."
                checked={settings.typingIndicator}
                onChange={() => onToggle("typingIndicator")}
              />
              <SettingsToggleRow
                icon={UsersRound}
                label="Statut en ligne"
                description="Visible par vos contacts lorsque vous êtes connecté."
                checked={settings.onlineStatus}
                onChange={() => onToggle("onlineStatus")}
              />
            </div>
          )}

          {activeSub === "requests" && (
            <>
              <div style={{ padding: "4px 0" }}>
                <SettingsToggleRow
                  icon={Inbox}
                  label="Filtrer les invitations"
                  description="Les messages de personnes hors de votre réseau arrivent dans un dossier séparé."
                  checked={settings.filterRequests}
                  onChange={() => onToggle("filterRequests")}
                />
              </div>
              <MenuDivider />
              <div style={{ padding: "2px 16px 6px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.3 }}>En attente</div>
              {panel === "requests" && (
                <SettingsPeoplePanel
                  endpoint="/api/messages/requests"
                  emptyLabel="Aucune invitation en attente."
                  errorLabel="Impossible de charger les invitations."
                  renderAction={(user) => ({
                    label: "Accepter",
                    subLabel: "Souhaite vous écrire",
                    onRun: () => fetchBackendApi(`/api/messages/requests/${user.id}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "accept" }),
                    }).then((response) => { if (!response.ok) throw new Error("failed"); }),
                  })}
                />
              )}
            </>
          )}

          {activeSub === "receiving" && (
            <div style={{ padding: "4px 0" }}>
              <SettingsToggleRow
                icon={Bell}
                label="Notifications de nouveaux messages"
                checked={settings.newMessageNotifications}
                onChange={() => onToggle("newMessageNotifications")}
              />
              <SettingsToggleRow
                icon={Eye}
                label="Aperçu du contenu"
                description="Affiche le début du message dans la notification."
                checked={settings.messagePreview}
                onChange={() => onToggle("messagePreview")}
              />
              <MenuDivider />
              <div style={{ padding: "2px 16px 6px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.3 }}>Qui peut vous écrire</div>
              <SettingsRadioRow
                label="Tout le monde"
                description="N'importe quel membre peut démarrer une conversation."
                checked={settings.whoCanMessage === "everyone"}
                onSelect={() => onToggle("whoCanMessage", "everyone")}
              />
              <SettingsRadioRow
                label="Mes contacts uniquement"
                description="Seules les personnes de votre réseau peuvent vous écrire."
                checked={settings.whoCanMessage === "connections"}
                onSelect={() => onToggle("whoCanMessage", "connections")}
              />
              <SettingsRadioRow
                label="Personne"
                description="Vos conversations existantes restent actives."
                checked={settings.whoCanMessage === "nobody"}
                onSelect={() => onToggle("whoCanMessage", "nobody")}
              />
            </div>
          )}

          {activeSub === "restricted" && panel === "restricted" && (
            <SettingsPeoplePanel
              endpoint="/api/messages/restricted"
              emptyLabel="Aucun compte restreint."
              errorLabel="Impossible de charger les comptes restreints."
              renderAction={(user) => ({
                label: "Retirer",
                subLabel: "Compte restreint",
                onRun: () => fetchBackendApi(`/api/messages/restricted/${user.id}`, { method: "DELETE" })
                  .then((response) => { if (!response.ok) throw new Error("failed"); }),
              })}
            />
          )}

          {activeSub === "blocked" && panel === "blocked" && (
            <SettingsPeoplePanel
              endpoint="/api/messages/block"
              emptyLabel="Aucun compte bloqué."
              errorLabel="Impossible de charger les comptes bloqués."
              renderAction={(user) => ({
                label: "Débloquer",
                subLabel: "Compte bloqué",
                danger: true,
                onRun: () => fetchBackendApi(`/api/removed-connections?userId=${encodeURIComponent(user.id)}`, { method: "DELETE" })
                  .then((response) => { if (!response.ok) throw new Error("failed"); }),
              })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationMenu({ conv, anchorElement, onClose, onTogglePin, onToggleMute, onToggleArchive, onToggleRead, onDelete }) {
  const ref = useRef(null);
  const [placement, setPlacement] = useState(null);

  useEffect(() => {
    if (!anchorElement) return undefined;

    const updatePlacement = () => {
      const anchor = anchorElement.getBoundingClientRect();
      const menuHeight = ref.current?.getBoundingClientRect().height || 250;
      const top = anchor.bottom + 4 + menuHeight <= window.innerHeight
        ? anchor.bottom + 4
        : Math.max(8, anchor.top - menuHeight - 4);
      const left = Math.min(window.innerWidth - 248, Math.max(8, anchor.right - 248));
      setPlacement({ top, left });
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [anchorElement]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <MenuContainer innerRef={ref} position="fixed" top={placement?.top ?? 0} left={placement?.left ?? 0}>
      {conv.unread > 0
        ? <MenuRow icon={Check} label="Marquer comme lu" onClick={onToggleRead} />
        : <MenuRow icon={CheckCheck} label="Marquer comme non lu" onClick={onToggleRead} />}
      <MenuRow icon={conv.pinned ? PinOff : Pin} label={conv.pinned ? "Détacher la conversation" : "Épingler la conversation"} onClick={onTogglePin} />
      <MenuRow icon={conv.muted ? Bell : BellOff} label={conv.muted ? "Réactiver les notifications" : "Désactiver les notifications"} onClick={onToggleMute} />
      <MenuRow icon={conv.archived ? ArchiveRestore : Archive} label={conv.archived ? "Désarchiver" : "Archiver la conversation"} onClick={onToggleArchive} />
      <MenuDivider />
      <MenuRow icon={Trash2} label="Supprimer la conversation" onClick={onDelete} danger />
    </MenuContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  MODAL 1 — LISTE DE CONVERSATIONS, AVEC OPTIONS                    */
/*    <ConversationListModal isOpen onClose onOpenChat={(id)=>{}} />   */
/* ------------------------------------------------------------------ */
export function ConversationListModal({
  isOpen, onClose, conversations: controlled, onChange, onOpenChat, onNewMessage, onOpenProfile, onOpenChatSettings, nonBlocking = false, loading = false, mobile = false,
}) {
  const [internal, setInternal] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [menuId, setMenuId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const actionButtons = useRef(new Map());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatSettings, setChatSettings] = useState({
    incomingCallSounds: true,
    messageSounds: true,
    autoOpenNewMessages: false,
    onlineStatus: true,
    readReceipts: true,
    typingIndicator: true,
    messagePreview: true,
    filterRequests: false,
    newMessageNotifications: true,
    whoCanMessage: "everyone",
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    fetchBackendApi("/api/messages/settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.settings) setChatSettings((current) => ({ ...current, ...data.settings }));
      })
      .then(() => fetchBackendApi("/api/settings", { cache: "no-store" }))
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.notifications?.showOnlineStatus !== undefined) {
          setChatSettings((current) => ({ ...current, onlineStatus: Boolean(data.notifications.showOnlineStatus) }));
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const conversations = controlled ?? internal;
  const setConversations = (updater) => {
    const next = typeof updater === "function" ? updater(conversations) : updater;
    if (onChange) onChange(next);
    else setInternal(next);
  };

  if (!isOpen) return null;

  const updatePreference = async (id, key, value) => {
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
    try {
      const response = await fetchBackendApi("/api/messages/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id, key, value }),
      });
      if (!response.ok) throw new Error("Impossible d'enregistrer la préférence.");
    } catch {
      setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, [key]: !value } : c)));
    }
  };
  const togglePin = (id) => {
    const conversation = conversations.find((item) => item.id === id);
    if (conversation) updatePreference(id, "pinned", !conversation.pinned);
  };
  const toggleMute = (id) => {
    const conversation = conversations.find((item) => item.id === id);
    if (conversation) updatePreference(id, "muted", !conversation.muted);
  };
  const toggleArchive = (id) => {
    const conversation = conversations.find((item) => item.id === id);
    if (conversation) updatePreference(id, "archived", !conversation.archived);
  };
  const toggleRead = async (id) => {
    const conversation = conversations.find((item) => item.id === id);
    if (!conversation) return;
    const markUnread = conversation.unread <= 0;
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, unread: markUnread ? 1 : 0 } : c)));
    try {
      const response = await fetchBackendApi("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id, markUnread }),
      });
      if (!response.ok) throw new Error("Impossible de mettre à jour la conversation.");
    } catch {
      setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, unread: conversation.unread } : c)));
    }
  };
  const remove = async (id) => {
    const response = await fetchBackendApi(`/api/messages?conversationId=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Impossible de supprimer la conversation.");
    setConversations((cs) => cs.filter((c) => c.id !== id));
  };

  const toggleChatSetting = async (key, explicitValue) => {
    const previousValue = chatSettings[key];
    const nextValue = explicitValue !== undefined ? explicitValue : !previousValue;
    setChatSettings((s) => ({ ...s, [key]: nextValue }));
    const isOnlineStatus = key === "onlineStatus";
    if (isOnlineStatus) {
      window.dispatchEvent(new CustomEvent("lynora:settings-updated", { detail: { showOnlineStatus: nextValue } }));
    }
    try {
      const response = await fetchBackendApi(isOnlineStatus ? "/api/settings" : "/api/messages/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isOnlineStatus
          ? { notifications: { showOnlineStatus: nextValue } }
          : { key, value: nextValue }),
      });
      if (!response.ok) throw new Error("Impossible d'enregistrer le paramètre.");
    } catch {
      setChatSettings((s) => ({ ...s, [key]: previousValue }));
      if (isOnlineStatus) {
        window.dispatchEvent(new CustomEvent("lynora:settings-updated", { detail: { showOnlineStatus: previousValue } }));
      }
    }
  };

  const handleSettingsNavigate = (target) => {
    setSettingsOpen(false);
    if (target === "archived") { setTab("archived"); return; }
    onOpenChatSettings?.(target);
  };

  const filtered = conversations
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => (tab === "archived" ? c.archived : !c.archived))
    .filter((c) => (tab === "unread" ? c.unread > 0 : true))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const totalUnread = conversations.filter((c) => !c.archived && c.unread > 0).length;

  return (
    <Backdrop onClose={onClose} maxWidth={400} maxHeight={620} nonBlocking={nonBlocking} mobile={mobile}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 16, color: C.ink }}>Messages</span>
        <div style={{ display: "flex", alignItems: "center", gap: 2, position: "relative" }}>
          <IconBtn icon={MoreHorizontal} title="Paramètres de la discussion" active={settingsOpen} onClick={() => setSettingsOpen((o) => !o)} />
          <IconBtn icon={UsersRound} title="Nouveau groupe" onClick={() => onNewMessage("group")} />
          <IconBtn icon={Plus} title="Nouvelle conversation" onClick={() => onNewMessage("direct")} />
          <IconBtn icon={X} title="Fermer" onClick={onClose} />
          {settingsOpen && (
            <ChatSettingsPanel
              settings={chatSettings}
              onToggle={toggleChatSetting}
              onNavigate={handleSettingsNavigate}
              onClose={() => setSettingsOpen(false)}
              mobile={mobile}
            />
          )}
        </div>
      </div>

      {loading ? <SkeletonMessage count={6} /> : <>
      <div style={{ padding: "10px 14px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.navy50, borderRadius: 10, padding: "7px 10px" }}>
          <Search size={14} color={C.mutedLight} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une conversation"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, flex: 1, color: C.ink }}
          />
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
          {[
            { id: "all", label: "Toutes" },
            { id: "unread", label: `Non lues${totalUnread ? ` (${totalUnread})` : ""}` },
            { id: "archived", label: "Archivées" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{ padding: "6px 10px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700, color: tab === t.id ? C.navy900 : C.muted, background: tab === t.id ? C.navy100 : "transparent" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1, marginTop: 4, padding: "4px 6px 8px" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: C.mutedLight }}>
            <MessageSquare size={26} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 12.5 }}>Aucune conversation ici.</div>
          </div>
        ) : (
          filtered.map((c) => {
            const lastMsg = c.messages[c.messages.length - 1];
            const preview = lastMsg
              ? `${lastMsg.from === "me" ? "Vous : " : ""}${lastMsg.deletedForEveryone ? "Message supprimé" : (lastMsg.text || (lastMsg.attachments?.length ? "📎 Pièce jointe" : ""))}`
              : "Démarrez la conversation";

            const showActions = hoverId === c.id || menuId === c.id;

            return (
              <div
                key={c.id}
                onClick={() => onOpenChat && onOpenChat(c.id)}
                onMouseEnter={() => setHoverId(c.id)}
                onMouseLeave={() => setHoverId((cur) => (cur === c.id ? null : cur))}
                style={{
                  position: "relative", display: "flex", alignItems: "center", gap: 11,
                  padding: "10px 10px", borderRadius: 14, cursor: "pointer",
                  background: showActions ? C.navy50 : "transparent",
                  transition: "background 0.15s ease",
                }}
              >
                {c.isGroup ? <GroupAvatarStack members={c.members} size={34} onOpenProfile={onOpenProfile} /> : <Avatar initials={c.initials} imageUrl={c.image} size={44} online={c.online} onClick={(event) => { event.stopPropagation(); onOpenProfile?.(c.otherUserId); }} />}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {c.pinned && <Pin size={10} color={C.gold600} fill={C.gold600} style={{ flexShrink: 0 }} />}
                    <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: c.unread ? 700 : 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.name}
                    </span>
                    {c.muted && <BellOff size={11} color={C.mutedLight} style={{ flexShrink: 0 }} />}
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <span style={{ fontSize: 11.5, color: c.unread ? C.ink : C.mutedLight, fontWeight: c.unread ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                      {preview}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: 6, flexShrink: 0, minWidth: 24 }}>
                  {showActions ? (
                    <button
                      ref={(node) => {
                        if (node) actionButtons.current.set(c.id, node);
                        else actionButtons.current.delete(c.id);
                      }}
                      onClick={(e) => { e.stopPropagation(); setMenuId((cur) => (cur === c.id ? null : c.id)); }}
                      title="Options"
                      style={{ width: 26, height: 26, borderRadius: 8, border: "none", background: menuId === c.id ? C.navy100 : "transparent", color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.navy100)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = menuId === c.id ? C.navy100 : "transparent")}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  ) : (
                    <span style={{ fontSize: 10.5, fontWeight: c.unread ? 700 : 500, color: c.unread ? C.gold600 : C.mutedLight, whiteSpace: "nowrap" }}>
                      {lastMsg?.time || ""}
                    </span>
                  )}
                  {c.unread > 0 ? (
                    <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: C.gold600, color: C.navy900, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                      {c.unread}
                    </span>
                  ) : (
                    <div style={{ width: 18, height: 18 }} />
                  )}
                </div>

                {menuId === c.id && (
                  <ConversationMenu
                    conv={c}
                      anchorElement={actionButtons.current.get(c.id)}
                    onClose={() => setMenuId(null)}
                    onTogglePin={(e) => { e.stopPropagation(); togglePin(c.id); setMenuId(null); }}
                    onToggleMute={(e) => { e.stopPropagation(); toggleMute(c.id); setMenuId(null); }}
                    onToggleArchive={(e) => { e.stopPropagation(); toggleArchive(c.id); setMenuId(null); }}
                    onToggleRead={(e) => { e.stopPropagation(); toggleRead(c.id); setMenuId(null); }}
                    onDelete={async (e) => { e.stopPropagation(); try { await remove(c.id); } catch { /* La conversation reste visible si la suppression échoue. */ } setMenuId(null); }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
      </>}
    </Backdrop>
  );
}

/* ------------------------------------------------------------------ */
/*  MENU D'OPTIONS — CHAT (en-tête de conversation)                   */
/* ------------------------------------------------------------------ */
function ChatMenu({ conv, onClose, onToggleMute, onTogglePin, onBlock, onReport, onDelete }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <MenuContainer innerRef={ref} top={40} right={14} className="lynora-chat-header-menu">
      <div className="lynora-chat-header-menu-title">
        <span>Options du chat</span>
        <button type="button" onClick={onClose} aria-label="Fermer les options" title="Fermer" className="lynora-chat-header-menu-close"><X size={18} /></button>
      </div>
      <MenuRow icon={conv.pinned ? PinOff : Pin} label={conv.pinned ? "Détacher la conversation" : "Épingler la conversation"} onClick={onTogglePin} />
      <MenuRow icon={conv.muted ? Bell : BellOff} label={conv.muted ? "Réactiver les notifications" : "Désactiver les notifications"} onClick={onToggleMute} />
      <MenuDivider />
      <MenuRow icon={Ban} label={`Bloquer ${conv.name.split(" ")[0]}`} onClick={onBlock} danger />
      <MenuRow icon={Flag} label="Signaler la conversation" onClick={onReport} danger />
      <MenuRow icon={Trash2} label="Supprimer la conversation" onClick={onDelete} danger />
    </MenuContainer>
  );
}

/* Confirmation inline pour les actions destructrices du chat */
function InlineConfirm({ title, message, confirmLabel, onCancel, onConfirm }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(15,51,82,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 300, background: C.white, borderRadius: 14, padding: 18, boxShadow: "0 20px 50px rgba(15,51,82,0.35)" }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>{message}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onCancel} style={{ padding: "7px 14px", borderRadius: 9, border: `1.5px solid ${C.line}`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Annuler</button>
          <button onClick={onConfirm} style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: C.danger, color: C.white, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  APPEL — pastille réduite affichée pendant que le chat reste actif  */
/* ------------------------------------------------------------------ */
function MiniCallBar({ mode, status, elapsed, onMaximize, onEnd }) {
  const ModeIcon = mode === "video" ? Video : Phone;
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 14px 0", padding: "8px 10px 8px 14px", borderRadius: 999, background: navyGrad, color: C.white, boxShadow: "0 8px 20px rgba(15,51,82,0.3)" }}
    >
      <span className="lynora-call-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: status === "connected" ? C.success : C.gold400, flexShrink: 0 }} />
      <ModeIcon size={14} />
      <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>
        {mode === "video" ? "Appel vidéo" : "Appel vocal"} · {status === "connected" ? formatDuration(elapsed) : "Connexion…"}
      </span>
      <button onClick={onMaximize} title="Agrandir" style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.16)", color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Maximize2 size={13} />
      </button>
      <button onClick={onEnd} title="Raccrocher" style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: C.danger, color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PhoneOff size={13} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  APPEL — plein écran (voix ou vidéo), micro/caméra réels si permis  */
/* ------------------------------------------------------------------ */
function CallOverlay({ mode, conversation, status, elapsed, minimized, onMinimize, onEnd, callSession, onConnected, onRemoteEnd }) {
  const isVideo = mode === "video";
  const { stream, error } = useLocalMedia(true, mode);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [signalError, setSignalError] = useState("");
  const [remoteStream, setRemoteStream] = useState(null);
  const videoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerRef = useRef(null);
  const seenCandidatesRef = useRef(0);
  const callRootRef = useRef(null);

  useEffect(() => {
    if (!stream || !callSession?.id) return undefined;
    let disposed = false;
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peerRef.current = peer;
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") onConnected?.();
    };
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peer.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) fetchBackendApi("/api/calls", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callId: callSession.id, action: "candidate", value: event.candidate }) }).catch(() => {});
    };

    const signal = async () => {
      const response = await fetchBackendApi(`/api/calls?callId=${encodeURIComponent(callSession.id)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Signalisation indisponible");
      const data = await response.json();
      const call = data.call;
      if (!call || call.id !== callSession.id) return;
      if (call.status === "ended" || call.status === "rejected" || call.status === "missed") {
        onRemoteEnd?.(call.status === "rejected" ? "rejected" : call.status === "missed" ? "missed" : "ended");
        return;
      }
      const remoteDescription = call.isCaller ? call.answer : call.offer;
      if (remoteDescription && !peer.currentRemoteDescription) {
        await peer.setRemoteDescription(JSON.parse(remoteDescription));
        if (!call.isCaller) {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          await fetchBackendApi("/api/calls", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callId: call.id, action: "answer", value: answer }) });
        }
      }
      const candidates = JSON.parse(call[call.isCaller ? "calleeCandidates" : "callerCandidates"] || "[]");
      for (const candidate of candidates.slice(seenCandidatesRef.current)) await peer.addIceCandidate(candidate).catch(() => {});
      seenCandidatesRef.current = candidates.length;
    };
    const configurePeer = async () => {
      try {
        const configResponse = await fetchBackendApi("/api/calls?config=1", { cache: "no-store" });
        if (configResponse.ok) {
          const config = await configResponse.json();
          if (Array.isArray(config.iceServers) && config.iceServers.length) {
            peer.setConfiguration({ iceServers: config.iceServers });
          }
        }
      } catch {}
      if (disposed) return;
      if (callSession.isCaller) {
      peer.createOffer().then(async (offer) => {
        await peer.setLocalDescription(offer);
        await fetchBackendApi("/api/calls", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callId: callSession.id, action: "offer", value: offer }) });
      }).catch(() => setSignalError("Connexion de l'appel impossible."));
      }
      signal().catch(() => setSignalError("Connexion de l'appel impossible."));
    };
    configurePeer();
    const interval = setInterval(() => {
      if (document.hidden) return; // Skip polling when tab is inactive
      signal().catch(() => setSignalError("Connexion de l'appel impossible."));
    }, 2000); // Increased from 1000ms to 2s
    return () => { disposed = true; clearInterval(interval); peer.close(); peerRef.current = null; setRemoteStream(null); };
  }, [stream, callSession?.id, callSession?.isCaller, conversation.id, onConnected]);

  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream]);
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);
  useEffect(() => { if (remoteAudioRef.current) remoteAudioRef.current.muted = !speakerOn; }, [speakerOn]);
  useEffect(() => { stream?.getAudioTracks().forEach((t) => (t.enabled = !muted)); }, [muted, stream]);
  useEffect(() => { stream?.getVideoTracks().forEach((t) => (t.enabled = cameraOn)); }, [cameraOn, stream]);

  if (minimized) return null;

  const statusLabel = status === "connected" ? formatDuration(elapsed) : "Appel en cours…";
  const showSelfVideo = isVideo && cameraOn && stream?.getVideoTracks().length > 0;

  const ctrlBtn = (Icon, active, onClick, danger, label) => (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 52, height: 52, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        background: danger ? C.danger : active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.14)",
        color: danger ? C.white : active ? C.navy900 : C.white, backdropFilter: "blur(6px)", flexShrink: 0,
      }}
    >
      <Icon size={20} />
    </button>
  );

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await callRootRef.current?.requestFullscreen?.();
    } catch {
      // Le plein écran peut être refusé par le navigateur ou l'iFrame.
    }
  };

  return (
    <div ref={callRootRef} className="lynora-call-overlay" style={{ position: "absolute", inset: 0, zIndex: 90, background: callGrad, color: C.white, display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes lynoraPulseRing { 0% { box-shadow: 0 0 0 0 rgba(246,211,116,0.45);} 70% { box-shadow: 0 0 0 22px rgba(246,211,116,0);} 100% { box-shadow: 0 0 0 0 rgba(246,211,116,0);} }
        @keyframes lynoraFadeUp { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }
      `}</style>

      <div className="lynora-call-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
        <button onClick={onMinimize} title="Réduire" style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: "rgba(255,255,255,0.12)", color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Minimize2 size={15} />
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.02em", color: "rgba(255,255,255,0.8)" }}>
          {isVideo ? "APPEL VIDÉO" : "APPEL VOCAL"}
        </span>
        <button onClick={toggleFullscreen} title="Plein écran" style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: "rgba(255,255,255,0.12)", color: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Maximize2 size={15} />
        </button>
      </div>

      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 20, animation: "lynoraFadeUp 0.3s ease" }}>
        <div style={{ position: "relative", width: 108, height: 108, borderRadius: "50%", animation: status === "ringing" ? "lynoraPulseRing 1.8s infinite" : "none" }}>
          <Avatar initials={conversation.initials} imageUrl={conversation.image} size={108} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 18 }}>{conversation.name}</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{statusLabel}</div>
          {(error || signalError) && <div style={{ fontSize: 10.5, color: C.gold400, marginTop: 8, maxWidth: 240 }}>{error || signalError}</div>}
        </div>

        {isVideo && (
          <div style={{ position: "absolute", right: 18, bottom: 18, width: 96, height: 130, borderRadius: 14, overflow: "hidden", border: "2px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.08)" }}>
            {showSelfVideo ? (
              <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <VideoOff size={18} color="rgba(255,255,255,0.6)" />
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", textAlign: "center", padding: "0 6px" }}>Caméra désactivée</span>
              </div>
            )}
          </div>
        )}
        {isVideo && remoteStream && (
          <video ref={remoteVideoRef} autoPlay playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1, background: "#081B2C" }} />
        )}
        <audio ref={remoteAudioRef} autoPlay />
      </div>

      <div className="lynora-call-controls" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "22px 16px 30px" }}>
        {ctrlBtn(muted ? MicOff : Mic, muted, () => setMuted((m) => !m), false, muted ? "Réactiver le micro" : "Couper le micro")}
        {isVideo
          ? ctrlBtn(cameraOn ? Video : VideoOff, !cameraOn, () => setCameraOn((c) => !c), false, cameraOn ? "Couper la caméra" : "Réactiver la caméra")
          : ctrlBtn(speakerOn ? Volume2 : VolumeX, !speakerOn, () => setSpeakerOn((s) => !s), false, speakerOn ? "Couper le haut-parleur" : "Activer le haut-parleur")}
        {ctrlBtn(PhoneOff, false, onEnd, true, "Raccrocher")}
      </div>
    </div>
  );
}

function LiveKitTrack({ track }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !track) return undefined;
    const element = track.attach(ref.current);
    return () => track.detach(element);
  }, [track]);
  return track.kind === "audio"
    ? <audio ref={ref} autoPlay />
    : <video ref={ref} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
}

function LiveKitParticipantTile({ participant, mode }) {
  const videoTrack = participant.videoTrack;
  return (
    <div style={{ position: "relative", minHeight: mode === "video" ? 180 : 116, borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {mode === "video" && videoTrack ? <LiveKitTrack track={videoTrack} /> : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><Avatar initials={getInitials(participant.name)} imageUrl={participant.image} size={mode === "video" ? 76 : 58} /><span style={{ color: C.white, fontSize: 12, fontWeight: 700, maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{participant.name}</span></div>}
      {mode === "video" && videoTrack && <span style={{ position: "absolute", left: 10, bottom: 9, padding: "4px 8px", borderRadius: 999, background: "rgba(0,0,0,.55)", color: C.white, fontSize: 11, fontWeight: 700, maxWidth: "80%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{participant.name}</span>}
      {participant.isLocal && <span style={{ position: "absolute", right: 9, top: 9, padding: "3px 6px", borderRadius: 999, background: "rgba(246,211,116,.92)", color: C.navy900, fontSize: 9.5, fontWeight: 800 }}>Vous</span>}
    </div>
  );
}

function LiveKitCallOverlay({ mode, conversation, minimized, onMinimize, onEnd, callSession, onConnected }) {
  const roomRef = useRef(null);
  const [participants, setParticipants] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(mode === "video");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [participantToast, setParticipantToast] = useState("");

  useEffect(() => {
    if (!callSession?.id) return undefined;
    let cancelled = false;
    const room = new Room();
    roomRef.current = room;
    const refreshTracks = () => {
      const next = [];
      const nextParticipants = [{
        identity: room.localParticipant.identity,
        name: "Vous",
        image: null,
        isLocal: true,
        videoTrack: room.localParticipant.getTrackPublication("camera")?.track || null,
      }];
      room.remoteParticipants.forEach((participant) => participant.trackPublications.forEach((publication) => {
        if (publication.track) next.push({ sid: publication.trackSid, track: publication.track });
      }));
      room.remoteParticipants.forEach((participant) => {
        let metadata = {};
        try { metadata = participant.metadata ? JSON.parse(participant.metadata) : {}; } catch {}
        nextParticipants.push({
          identity: participant.identity,
          name: participant.name || participant.identity,
          image: metadata.image || null,
          isLocal: false,
          videoTrack: participant.getTrackPublication("camera")?.track || null,
        });
      });
      setParticipants(nextParticipants);
      setTracks(next);
    };
    const onParticipantDisconnected = (participant) => {
      setParticipantToast(`${participant.name || "Participant"} a quitté`);
      setTimeout(() => setParticipantToast(""), 3500);
      refreshTracks();
    };
    const onConnectedRoom = () => {
      setConnected(true);
      onConnected?.();
      fetchBackendApi("/api/calls", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callId: callSession.id, action: "connect" }) }).catch(() => {});
      refreshTracks();
    };
    const onLocalTrackPublished = (publication) => {
      if (publication.source === "camera" && publication.track) setLocalVideoTrack(publication.track);
    };
    const onTrackSubscribed = (track) => { refreshTracks(); if (track.kind === "audio") track.attach(); };
    const onTrackUnsubscribed = () => refreshTracks();
    const connect = async () => {
      try {
        const response = await fetchBackendApi("/api/calls/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callId: callSession.id }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Token LiveKit indisponible");
        await room.connect(data.url, data.token);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (mode === "video") {
          await room.localParticipant.setCameraEnabled(true);
          const publication = room.localParticipant.getTrackPublication("camera");
          if (publication?.track) setLocalVideoTrack(publication.track);
        }
        if (!cancelled) refreshTracks();
      } catch (connectError) {
        if (!cancelled) setError(connectError.message || "Connexion de l'appel impossible.");
      }
    };
    room.on(RoomEvent.Connected, onConnectedRoom);
    room.on(RoomEvent.LocalTrackPublished, onLocalTrackPublished);
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(RoomEvent.ParticipantConnected, refreshTracks);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    connect();
    return () => { cancelled = true; room.removeAllListeners(); room.disconnect(); roomRef.current = null; setParticipants([]); setTracks([]); setLocalVideoTrack(null); setParticipantToast(""); };
  }, [callSession?.id, mode, onConnected]);

  const toggleMute = async () => { const next = !muted; setMuted(next); await roomRef.current?.localParticipant.setMicrophoneEnabled(!next); };
  const toggleCamera = async () => { const next = !cameraOn; setCameraOn(next); await roomRef.current?.localParticipant.setCameraEnabled(next); };
  const controlStyle = (danger = false, active = false) => ({
    width: 54,
    height: 54,
    padding: 0,
    border: "none",
    borderRadius: "50%",
    background: danger ? C.danger : active ? C.white : "rgba(255,255,255,.14)",
    color: danger || !active ? C.white : C.navy900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    boxShadow: danger ? "0 8px 20px rgba(194,68,68,.35)" : "0 6px 16px rgba(0,0,0,.14)",
  });
  if (minimized) return null;
  return (
    <div className="lynora-call-overlay" style={{ position: "absolute", inset: 0, zIndex: 90, background: callGrad, color: C.white, display: "flex", flexDirection: "column" }}>
      <div className="lynora-call-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}><button onClick={onMinimize} title="Réduire" style={{ width: 34, height: 34, padding: 0, border: 0, borderRadius: 9, background: "rgba(255,255,255,.12)", color: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Minimize2 size={15} /></button><span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".04em" }}>{mode === "video" ? "APPEL VIDÉO" : "APPEL VOCAL"}</span><span style={{ width: 34 }} /></div>
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", gap: 12, padding: 16, minHeight: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${mode === "video" ? 180 : 130}px, 1fr))`, gap: 10, alignContent: "center", flex: 1, overflowY: "auto" }}>
          {participants.length > 0 ? participants.map((participant) => <LiveKitParticipantTile key={participant.identity} participant={participant} mode={mode} />) : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}><Avatar initials={conversation.initials} imageUrl={conversation.image} size={108} /><strong>{conversation.name}</strong><span style={{ fontSize: 12, opacity: .75 }}>{connected ? "Connecté" : "Connexion…"}</span>{error && <span style={{ color: C.gold400, fontSize: 11 }}>{error}</span>}</div>}
        </div>
        {tracks.filter(({ track }) => track.kind === "audio").map(({ sid, track }) => <LiveKitTrack key={sid} track={track} />)}
      </div>
        <div className="lynora-call-controls" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "22px 16px 30px" }}><button onClick={toggleMute} title={muted ? "Réactiver le micro" : "Couper le micro"} style={controlStyle(false, muted)}>{muted ? <MicOff size={20} /> : <Mic size={20} />}</button>{mode === "video" && <button onClick={toggleCamera} title={cameraOn ? "Couper la caméra" : "Réactiver la caméra"} style={controlStyle(false, !cameraOn)}>{cameraOn ? <Video size={20} /> : <VideoOff size={20} />}</button>}<button onClick={onEnd} title="Raccrocher" style={controlStyle(true)}><PhoneOff size={20} /></button></div>
      {participantToast && <div style={{ position: "absolute", left: "50%", bottom: 90, transform: "translateX(-50%)", padding: "8px 16px", borderRadius: 999, background: "rgba(0,0,0,.72)", color: C.white, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", zIndex: 50 }}>{participantToast}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PANNEAU D'INFORMATIONS DU CONTACT — glisse depuis la droite        */
/* ------------------------------------------------------------------ */
function InfoPanel({ conv, onClose, onChange, onStartCall, onSearch, onRequestConfirm, onOpenProfile, showOnlineStatus, onToggleOnlineStatus }) {
  const row = (icon, label, value, onClick, danger) => (
    <button
      onClick={onClick}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "11px 16px", background: "transparent", border: "none", cursor: onClick ? "pointer" : "default", textAlign: "left" }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.background = danger ? C.danger50 : C.navy50)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ width: 30, height: 30, borderRadius: 9, background: danger ? C.danger50 : C.navy50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {React.createElement(icon, { size: 14, color: danger ? C.danger : C.navy800 })}
      </span>
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: danger ? C.danger : C.ink }}>{label}</span>
      {value}
    </button>
  );

  return (
    <div className="lynora-chat-info-panel" style={{ position: "absolute", inset: 0, zIndex: 80, background: C.white, display: "flex", flexDirection: "column", animation: "lynoraSlideIn 0.2s ease" }}>
      <style>{`@keyframes lynoraSlideIn { from { transform: translateX(18px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      <div className="lynora-chat-info-header" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: `1px solid ${C.line}` }}>
        <IconBtn icon={ArrowLeft} title="Retour à la conversation" onClick={onClose} />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>Infos du contact</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "26px 16px 18px" }}>
          {conv.isGroup ? <GroupAvatarStack members={conv.members} size={52} onOpenProfile={onOpenProfile} /> : <Avatar initials={conv.initials} imageUrl={conv.image} size={76} online={conv.online} onClick={() => onOpenProfile?.(conv.otherUserId)} />}
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, marginTop: 6 }}>{conv.name}</div>
          <div style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>{conv.title}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: conv.online ? C.success : C.mutedLight, marginTop: 2 }}>{conv.online ? "En ligne" : "Hors ligne"}</div>
        </div>

        <div className="lynora-chat-info-actions" style={{ display: "flex", justifyContent: "center", gap: 10, padding: "0 16px 18px" }}>
          {[
            { icon: Phone, label: "Appeler", onClick: () => onStartCall("voice") },
            { icon: Video, label: "Vidéo", onClick: () => onStartCall("video") },
            { icon: Search, label: "Rechercher", onClick: onSearch },
          ].map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", borderRadius: 12, border: `1px solid ${C.line}`, background: C.navy50, cursor: "pointer" }}
            >
              <a.icon size={16} color={C.navy800} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: C.navy800 }}>{a.label}</span>
            </button>
          ))}
        </div>

        <div style={{ height: 8, background: C.navy50 }} />

        {row(BellOff, "Mettre en sourdine", <Switch checked={!!conv.muted} onChange={(v) => onChange({ muted: v })} />)}
        {row(Pin, "Épingler la conversation", <Switch checked={!!conv.pinned} onChange={(v) => onChange({ pinned: v })} />)}
        {row(showOnlineStatus ? EyeOff : Eye, showOnlineStatus ? "Masquer mon statut en ligne" : "Afficher mon statut en ligne", <Switch checked={showOnlineStatus} onChange={onToggleOnlineStatus} />)}

        <div style={{ height: 8, background: C.navy50 }} />

        <div style={{ padding: "12px 16px 4px", fontSize: 11, fontWeight: 700, color: C.mutedLight, textTransform: "uppercase", letterSpacing: "0.04em" }}>Médias partagés</div>
        <div style={{ padding: "6px 16px 18px", display: "flex", alignItems: "center", gap: 10, color: C.mutedLight }}>
          <ImageIcon size={16} />
          <span style={{ fontSize: 12 }}>Aucun média partagé pour le moment.</span>
        </div>

        <div style={{ height: 8, background: C.navy50 }} />

        <div style={{ padding: "12px 16px 4px", display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.mutedLight, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          <ShieldCheck size={12} /> Confidentialité
        </div>
        {row(Ban, `Bloquer ${conv.name.split(" ")[0]}`, null, () => onRequestConfirm("block"), true)}
        {row(Flag, "Signaler la conversation", null, () => onRequestConfirm("report"), true)}
        {row(Trash2, "Supprimer la conversation", null, () => onRequestConfirm("delete"), true)}
      </div>
    </div>
  );
}

/* Interrupteur utilisé dans le panneau d'informations */
function Switch({ checked, onChange }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      style={{ width: 36, height: 21, borderRadius: 999, border: "none", cursor: "pointer", background: checked ? goldGrad : C.line, position: "relative", flexShrink: 0 }}
    >
      <span style={{ position: "absolute", top: 2.5, left: checked ? 17 : 2.5, width: 16, height: 16, borderRadius: "50%", background: C.white, boxShadow: "0 1px 3px rgba(15,51,82,0.35)", transition: "left 0.15s ease" }} />
    </button>
  );
}

function TransferMessageModal({ message, onClose, onTransferred, mobile = false }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBackendApi("/api/connections", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("failed")))
      .then((data) => setUsers(Array.isArray(data.connections) ? data.connections : []))
      .catch(() => setError("Impossible de charger vos relations."))
      .finally(() => setLoading(false));
  }, []);

  const transfer = async () => {
    const selectedUsers = users.filter((user) => selectedUserIds.includes(user.id));
    if (!selectedUsers.length) return;
    setBusyId("multiple");
    setError("");
    try {
      const results = await Promise.all(selectedUsers.map(async (user) => {
        const response = await fetchBackendApi("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            otherUserId: user.id,
            text: message.text || (message.attachments?.length > 1 ? "Fichiers transférés" : "Fichier transféré"),
            attachments: message.attachments || [],
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Transfert impossible.");
        return data;
      }));
      if (!results.length) throw new Error("Transfert impossible.");
      onTransferred?.("Message transféré.");
      onClose();
    } catch (transferError) {
      setError(transferError.message || "Transfert impossible.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Backdrop onClose={onClose} maxWidth={400} maxHeight={620} mobile={mobile}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Forward size={18} color={C.navy800} /><span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 16, color: C.ink }}>Transférer le message</span></div>
        <IconBtn icon={X} title="Fermer" onClick={onClose} />
      </div>
      {loading ? <div style={{ padding: 30, textAlign: "center", color: C.muted }}>Chargement des relations…</div> : (
        <div style={{ padding: 12, overflowY: "auto" }}>
          {users.map((user) => (
            <button key={user.id} type="button" onClick={() => setSelectedUserIds((current) => current.includes(user.id) ? current.filter((id) => id !== user.id) : [...current, user.id])} disabled={busyId !== null} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", border: `1px solid ${selectedUserIds.includes(user.id) ? C.navy800 : "transparent"}`, borderRadius: 10, background: selectedUserIds.includes(user.id) ? C.navy50 : "transparent", cursor: busyId ? "default" : "pointer", textAlign: "left", opacity: busyId && busyId !== "multiple" ? 0.5 : 1 }}>
              <Avatar initials={user.initials || getInitials(user.name)} imageUrl={user.image} size={36} />
              <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: "block", color: C.ink, fontSize: 12.5 }}>{user.name || "Utilisateur"}</strong><small style={{ color: C.muted, fontSize: 11 }}>{user.title || "Membre LynoraLink"}</small></span>
              {busyId === "multiple" ? <span style={{ color: C.muted, fontSize: 11 }}>Envoi…</span> : selectedUserIds.includes(user.id) ? <Check size={16} color={C.navy800} /> : <Forward size={15} color={C.navy800} />}
            </button>
          ))}
          {!users.length && !error && <div style={{ padding: 30, textAlign: "center", color: C.muted }}>Aucune relation disponible.</div>}
          {error && <div style={{ padding: "10px 8px", color: C.danger, fontSize: 12 }}>{error}</div>}
          <button type="button" onClick={transfer} disabled={!selectedUserIds.length || busyId !== null} style={{ width: "100%", marginTop: 10, padding: "10px 14px", border: 0, borderRadius: 10, background: selectedUserIds.length && !busyId ? goldGrad : C.line, color: C.navy900, fontWeight: 800, fontSize: 13, cursor: selectedUserIds.length && !busyId ? "pointer" : "default" }}>{selectedUserIds.length ? `Transférer (${selectedUserIds.length})` : "Transférer"}</button>
        </div>
      )}
    </Backdrop>
  );
}

/* ------------------------------------------------------------------ */
/*  MODAL 2 — FIL DE CHAT, AVEC OPTIONS                                */
/*    <ChatModal isOpen conversation={conv} onClose onBack onSend />   */
/* ------------------------------------------------------------------ */
export function ChatModal({
  isOpen, conversation, onClose, onBack, onSend, onChange, onDeleted, onOpenProfile,
  onBlocked, onAddParticipants, onLeaveGroup,
  nonBlocking = false, loading = false, mobile = false,
}) {
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [msgMenuId, setMsgMenuId] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [mobileActionMessageId, setMobileActionMessageId] = useState(null);
  const [reactionPickerId, setReactionPickerId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [typingLocal, setTypingLocal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // "block" | "report" | "delete"
  const [activeCall, setActiveCall] = useState(null); // null | "voice" | "video"
  const [callSession, setCallSession] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callConnected, setCallConnected] = useState(false);
  const [callToast, setCallToast] = useState(null);
  const [actionToast, setActionToast] = useState(null);
  const [callMinimized, setCallMinimized] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [viewerAttachment, setViewerAttachment] = useState(null);
  const [transferMessage, setTransferMessage] = useState(null);
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const dismissedCallIdsRef = useRef(new Set());
  const { status: callStatus, elapsed: callElapsed } = useCallTimer(!!activeCall, callConnected);
  const { data: session } = useSession();
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const markCallConnected = useCallback(() => setCallConnected(true), []);
  useCallTone(Boolean(incomingCall || (activeCall && callStatus === "ringing")), Boolean(incomingCall));

  useEffect(() => {
    if (!session?.user?.id) return undefined;
    const loadOnlineStatus = () => fetchBackendApi("/api/settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.notifications?.showOnlineStatus !== undefined) setShowOnlineStatus(Boolean(data.notifications.showOnlineStatus));
      })
      .catch(() => {});
    loadOnlineStatus();
    const handleSettingsUpdate = (event) => {
      if (typeof event.detail?.showOnlineStatus === "boolean") {
        setShowOnlineStatus(event.detail.showOnlineStatus);
      } else {
        loadOnlineStatus();
      }
    };
    window.addEventListener("lynora:settings-updated", handleSettingsUpdate);
    return () => window.removeEventListener("lynora:settings-updated", handleSettingsUpdate);
  }, [session?.user?.id]);

  const toggleOnlineStatus = async () => {
    const nextValue = !showOnlineStatus;
    setShowOnlineStatus(nextValue);
    try {
      const response = await fetchBackendApi("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: { showOnlineStatus: nextValue } }),
      });
      if (!response.ok) throw new Error("settings update failed");
      window.dispatchEvent(new CustomEvent("lynora:settings-updated", { detail: { showOnlineStatus: nextValue } }));
    } catch {
      setShowOnlineStatus(!nextValue);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [conversation?.messages?.length, conversation?.id]);

  useEffect(() => {
    if (!isOpen || !conversation?.id || !draft.trim()) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (conversation?.id) {
        fetchBackendApi("/api/messages/typing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: conversation.id, typing: false }),
        }).catch(() => {});
      }
      return undefined;
    }

    fetchBackendApi("/api/messages/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: conversation.id, typing: true }),
    }).catch(() => {});
    typingTimerRef.current = setTimeout(() => {
      fetchBackendApi("/api/messages/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id, typing: false }),
      }).catch(() => {});
    }, 5000);

    return () => clearTimeout(typingTimerRef.current);
  }, [draft, conversation?.id, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const conv = conversation;
  const patch = (fields) => onChange && onChange(conv.id, fields);
  const updateConversationPreference = async (key, value) => {
    patch({ [key]: value });
    try {
      const response = await fetchBackendApi("/api/messages/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conv.id, key, value }),
      });
      if (!response.ok) throw new Error("Impossible d'enregistrer la préférence.");
    } catch {
      patch({ [key]: !value });
    }
  };

  useEffect(() => {
    if (!isOpen || !conv?.id || activeCall || incomingCall) return undefined;
    let cancelled = false;
    const checkIncomingCall = async () => {
      try {
        const response = await fetchBackendApi(`/api/calls?conversationId=${encodeURIComponent(conv.id)}`, { cache: "no-store" });
        if (cancelled || !response.ok) return;
        const data = await response.json();
        if (!cancelled && data.call?.status === "ringing" && !data.call.isCaller && !dismissedCallIdsRef.current.has(data.call.id)) {
          setIncomingCall((current) => current || data.call);
        }
      } catch {}
    };
    checkIncomingCall();
    const interval = setInterval(() => {
      if (document.hidden) return; // Skip polling when tab is inactive
      checkIncomingCall();
    }, 3000); // Increased from 1500ms to 3s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, conv?.id, activeCall, incomingCall]);

  const handleFileSelection = async (event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length === 0) return;
    const prepared = selected.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      size: file.size,
      mime: file.type,
      type: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file",
      url: URL.createObjectURL(file),
      status: "uploading",
      progress: 0,
      _file: file,
    }));

    setAttachments((current) => [...current, ...prepared]);
    
    // Upload each file to Cloudinary
    prepared.forEach((item) => uploadFileToCloudinary(item));
    
    event.target.value = "";
  };

  const uploadFileToCloudinary = async (item) => {
    try {
      const result = await uploadToCloudinary(item._file, {
        onProgress: (progress) => {
          setAttachments((prev) => prev.map((a) => (a.id === item.id ? { ...a, progress } : a)));
        },
      });
      
      // Update attachment with Cloudinary URL
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === item.id
            ? { ...a, url: result.url, status: "done", progress: 100, _file: undefined }
            : a
        )
      );
    } catch (error) {
      console.error("Upload Cloudinary échoué:", error);
      // Mark as failed but keep the file
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === item.id
            ? { ...a, status: "error", error: error.message, _file: undefined }
            : a
        )
      );
    }
  };

  const removeAttachment = (id) => {
    setAttachments((current) => {
      const target = current.find((a) => a.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return current.filter((attachment) => attachment.id !== id);
    });
  };

  useEffect(() => {
    return () => {
      // cleanup object URLs on unmount
      attachments.forEach((a) => a.url && URL.revokeObjectURL(a.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    const text = draft.trim();
    const hasContent = text.length > 0 || attachments.length > 0;
    if (!hasContent) return;

    onSend?.(conv.id, text || (attachments.length > 1 ? "Fichiers envoyés" : "Fichier envoyé"), attachments.map(({ id, ...rest }) => rest), replyingTo);
    setDraft("");
    setAttachments([]);
    setReplyingTo(null);
    // Simule la personne en train d'écrire, pour la démo du composant.
    if (conv.online) {
      setTypingLocal(true);
      setTimeout(() => setTypingLocal(false), 1700);
    }
  };

  const menuRowStyle = (color) => ({ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", background: "transparent", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color, textAlign: "left" });

  const toggleReaction = async (messageId, emoji) => {
    const previousMessages = conv.messages;
    const current = previousMessages.find((message) => message.id === messageId);
    const alreadyMine = (current?.reactions || []).some((reaction) => reaction.from === "me" && reaction.emoji === emoji);
    patch({
      messages: previousMessages.map((msg) => {
        if (msg.id !== messageId) return msg;
        const others = (msg.reactions || []).filter((reaction) => reaction.from !== "me");
        return { ...msg, reactions: alreadyMine ? others : [...others, { emoji, from: "me" }] };
      }),
    });
    setReactionPickerId(null);
    try {
      const response = await fetchBackendApi(`/api/messages/${encodeURIComponent(messageId)}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: emoji }),
      });
      if (!response.ok) throw new Error("Réaction non enregistrée");
    } catch {
      patch({ messages: previousMessages });
    }
  };

  const deleteForMe = async (messageId) => {
    const previousMessages = conv.messages;
    patch({ messages: previousMessages.filter((x) => x.id !== messageId) });
    setMsgMenuId(null);
    try {
      const response = await fetchBackendApi(`/api/messages/${encodeURIComponent(messageId)}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "me" }) });
      if (!response.ok) throw new Error("Suppression impossible");
      window.dispatchEvent(new CustomEvent("lynoralink:messages-updated"));
    } catch {
      patch({ messages: previousMessages });
    }
  };

  const deleteForEveryone = async (messageId) => {
    const previousMessages = conv.messages;
    patch({ messages: previousMessages.map((x) => (x.id === messageId ? { ...x, deletedForEveryone: true, reactions: [] } : x)) });
    setMsgMenuId(null);
    try {
      const response = await fetchBackendApi(`/api/messages/${encodeURIComponent(messageId)}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "everyone" }) });
      if (!response.ok) throw new Error("Suppression impossible");
      window.dispatchEvent(new CustomEvent("lynoralink:messages-updated"));
    } catch {
      patch({ messages: previousMessages });
    }
  };

  const startCall = async (mode) => {
    try {
      const response = await fetchBackendApi("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conv.id, type: mode }),
      });
      const data = await response.json();
      if (!response.ok || !data.callId) throw new Error("Impossible de créer l'appel");
      setActiveCall(mode);
      setCallConnected(false);
      setCallMinimized(false);
      setInfoOpen(false);
      setCallSession({ id: data.callId, isCaller: true });
    } catch {
      setConfirmAction("callUnavailable");
    }
  };
  const answerIncomingCall = () => {
    if (!incomingCall) return;
    setCallSession(incomingCall);
    setIncomingCall(null);
    setCallConnected(false);
    setActiveCall(incomingCall.type);
  };
  const rejectIncomingCall = async () => {
    const call = incomingCall;
    setIncomingCall(null);
    if (!call?.id) return;
    dismissedCallIdsRef.current.add(call.id);
    try {
      await fetchBackendApi("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: call.id, action: conv.isGroup ? "leave" : "reject" }),
      });
    } catch {
      // L'appel est déjà refusé localement si le réseau est indisponible.
    }
    setCallToast(conv.isGroup ? "Vous avez refusé l’appel" : "Appel refusé");
    setTimeout(() => setCallToast(null), 2800);
    window.dispatchEvent(new CustomEvent("lynoralink:call-ended", { detail: { callId: call.id, reason: "rejected" } }));
    onClose?.();
  };
  const endCall = async (reason = "ended", remote = false) => {
    const mode = activeCall;
    const currentCall = callSession;
    setActiveCall(null);
    setCallConnected(false);
    setCallSession(null);
    const groupCall = Boolean(conv.isGroup);
    setCallToast(reason === "rejected" ? "Appel refusé" : reason === "missed" ? "Appel manqué" : groupCall ? "Vous avez quitté l’appel" : "Appel terminé");
    setTimeout(() => setCallToast(null), 2800);
    window.dispatchEvent(new CustomEvent("lynoralink:call-ended", { detail: { callId: currentCall?.id, reason } }));
    onClose?.();
    setCallMinimized(false);
    if (remote || !mode || !currentCall?.id) return;
    try {
      await fetchBackendApi("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: currentCall.id, action: groupCall ? "leave" : "end" }),
      });
    } catch {
      // La fermeture locale ne doit pas dépendre du réseau.
    }
  };
  useEffect(() => {
    if (!activeCall || !callSession?.id || callConnected) return undefined;
    const timeout = setTimeout(() => endCall("missed"), 30000);
    return () => clearTimeout(timeout);
  }, [activeCall, callSession?.id, callConnected]);
  useEffect(() => {
    if (!activeCall || !callSession?.id) return undefined;
    let cancelled = false;
    const checkCallStatus = async () => {
      try {
        const response = await fetchBackendApi(`/api/calls?callId=${encodeURIComponent(callSession.id)}`, { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const status = data.call?.status;
        if (status === "ended" || status === "rejected" || status === "missed") {
          await endCall(status === "rejected" ? "rejected" : status === "missed" ? "missed" : "ended", true);
        }
      } catch {}
    };
    checkCallStatus();
    const interval = setInterval(checkCallStatus, 3000); // Increased from 700ms to 3s
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeCall, callSession?.id]);

  const openSearch = () => { setInfoOpen(false); setSearchOpen(true); };
  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); };
  const requestConfirmFromInfo = (action) => { setInfoOpen(false); setConfirmAction(action); };

  const showActionToast = (message) => {
    setActionToast(message);
    window.setTimeout(() => setActionToast(null), 3200);
  };

  if (!isOpen || !conversation) return null;

  const visibleMessages = searchOpen && searchQuery.trim()
    ? conv.messages.filter((m) => String(m.text || "").toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : conv.messages;
  const messagesWithDateLabels = visibleMessages.map((message, index) => ({
    message,
    dateLabel: index === 0 || getMessageDateKey(message) !== getMessageDateKey(visibleMessages[index - 1])
      ? formatMessageDateLabel(message)
      : null,
  }));

  const confirmMap = {
    block: { title: `Bloquer ${conv.name} ?`, message: "Cette personne ne pourra plus vous envoyer de messages ni voir votre profil.", label: "Bloquer" },
    report: { title: "Signaler cette conversation ?", message: "Notre équipe examinera les messages échangés avec cette personne.", label: "Signaler" },
    delete: { title: "Supprimer la conversation ?", message: "Cette action supprime l'historique des messages pour vous uniquement.", label: "Supprimer" },
    callUnavailable: { title: "Appel indisponible", message: "La session d'appel n'a pas pu être créée. Vérifiez la connexion et la migration de la base de données.", label: "Fermer" },
  };

  return (
    <Backdrop onClose={onClose} maxWidth={440} maxHeight={640} nonBlocking={nonBlocking} mobile={mobile}>
      <div className="lynora-message-shell" style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", minWidth: 0, overflowX: "hidden" }}>
        {loading ? <ChatSkeleton /> : <>
        {/* En-tête */}
        <div className="lynora-message-chat-header" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: `1px solid ${C.line}`, minWidth: 0, minHeight: 61, flexShrink: 0, overflow: "visible", background: C.white }}>
          {onBack && <IconBtn icon={ArrowLeft} title="Retour" onClick={onBack} />}
          {conv.isGroup ? <GroupAvatarStack members={conv.members} size={30} onOpenProfile={() => setMembersOpen(true)} /> : <Avatar initials={conv.initials} imageUrl={conv.image} size={36} online={conv.online} onClick={() => { if (onOpenProfile) onOpenProfile(conv.otherUserId); else setInfoOpen(true); }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{conv.name}</div>
            <div style={{ fontSize: 11, color: conv.online ? C.success : C.mutedLight, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{conv.online ? "En ligne" : conv.title}</div>
          </div>
          <IconBtn icon={Phone} title="Appeler" onClick={() => startCall("voice")} />
          <IconBtn icon={Video} title="Appel vidéo" onClick={() => startCall("video")} />
          {conv.isGroup && <IconBtn icon={UsersRound} title="Membres du groupe" active={membersOpen} onClick={() => setMembersOpen(true)} />}
          <IconBtn icon={Info} title="Infos" active={infoOpen} onClick={() => setInfoOpen((o) => !o)} />
          <IconBtn icon={MoreHorizontal} title="Plus d'options" active={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
          <IconBtn icon={X} title="Fermer" onClick={onClose} />

          {menuOpen && (
            <ChatMenu
              conv={conv}
              onClose={() => setMenuOpen(false)}
              onTogglePin={() => { updateConversationPreference("pinned", !conv.pinned); setMenuOpen(false); }}
              onToggleMute={() => { updateConversationPreference("muted", !conv.muted); setMenuOpen(false); }}
              onBlock={() => { setConfirmAction("block"); setMenuOpen(false); }}
              onReport={() => { setConfirmAction("report"); setMenuOpen(false); }}
              onDelete={() => { setConfirmAction("delete"); setMenuOpen(false); }}
            />
          )}
        </div>

        {activeCall && callMinimized && (
          <MiniCallBar mode={activeCall} status={callStatus} elapsed={callElapsed} onMaximize={() => setCallMinimized(false)} onEnd={endCall} />
        )}

        {searchOpen && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 14px 0", padding: "7px 10px", borderRadius: 10, background: C.navy50 }}>
            <Search size={14} color={C.mutedLight} />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans la conversation"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: C.ink }}
            />
            <span style={{ fontSize: 10.5, color: C.mutedLight, whiteSpace: "nowrap" }}>{searchQuery.trim() ? `${visibleMessages.length} résultat${visibleMessages.length > 1 ? "s" : ""}` : ""}</span>
            <button onClick={closeSearch} style={{ border: "none", background: "transparent", color: C.mutedLight, cursor: "pointer", display: "flex" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Fil de messages */}
        <div className="lynora-message-list" style={{ flex: "1 1 auto", minWidth: 0, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: mobile ? "44px 16px 16px" : 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {messagesWithDateLabels.map(({ message: m, dateLabel }) => {
            const isMe = m.from === "me";
            const isUnread = !isMe && !m.read;
            const reactionCounts = (m.reactions || []).reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {});
            const myReaction = (m.reactions || []).find((r) => r.from === "me")?.emoji;

            if (m.type === "call") {
              const CallIcon = m.callType === "video" ? Video : Phone;
              const callLabel = m.callStatus === "rejected"
                ? "Appel refusé"
                : m.callStatus === "missed"
                  ? "Appel manqué"
                  : "Appel terminé";
              return (
                <React.Fragment key={m.id}>
                  {dateLabel && <DateSeparator label={dateLabel} />}
                  <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: m.callStatus === "missed" ? C.danger50 : C.navy50, color: m.callStatus === "missed" ? C.danger : C.muted, fontSize: 11.5, fontWeight: 700 }}>
                      <CallIcon size={14} />
                      <span>{callLabel} · {m.time}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={m.id}>
                {dateLabel && <DateSeparator label={dateLabel} />}
                <div
                  className="lynora-message-row"
                  style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 6, width: "100%" }}
                  onClick={() => mobile && setMobileActionMessageId((current) => current === m.id ? null : m.id)}
                  onMouseEnter={() => setHoveredMsgId(m.id)}
                  onMouseLeave={() => {
                    setHoveredMsgId((cur) => (cur === m.id ? null : cur));
                    if (msgMenuId === m.id) setMsgMenuId(null);
                  }}
                >
                {!isMe && <Avatar initials={conv.initials} imageUrl={conv.image} size={24} online={conv.online} onClick={() => setInfoOpen(true)} />}

                <div style={{ position: "relative", maxWidth: "74%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                  {/* Barre d'actions au survol : réagir / répondre / plus d'options */}
                  {(hoveredMsgId === m.id || mobileActionMessageId === m.id) && !m.deletedForEveryone && (
                    <div onClick={(event) => event.stopPropagation()} className={`lynora-message-actions ${isMe ? "lynora-message-actions-sent" : "lynora-message-actions-received"}`} style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", ...(isMe ? { right: "calc(100% + 6px)" } : { left: "calc(100% + 6px)" }), display: "flex", alignItems: "center", gap: 1, background: C.white, borderRadius: 999, border: `1px solid ${C.line}`, boxShadow: "0 4px 12px rgba(15,51,82,0.18)", padding: 2, zIndex: 60 }}>
                      <ToolbarBtn icon={SmilePlus} title="Réagir" onClick={() => setReactionPickerId((cur) => (cur === m.id ? null : m.id))} />
                      <ToolbarBtn icon={CornerUpLeft} title="Répondre" onClick={() => setReplyingTo(m)} />
                      <ToolbarBtn icon={MoreHorizontal} title="Plus d'options" onClick={() => setMsgMenuId((cur) => (cur === m.id ? null : m.id))} />
                    </div>
                  )}

                  {/* Sélecteur rapide de réactions */}
                  {reactionPickerId === m.id && (
                    <ReactionPickerContainer
                      reactions={REACTION_LIST}
                      selectedKey={myReaction}
                      onSelect={(key) => toggleReaction(m.id, key)}
                      onRequestClose={() => setReactionPickerId(null)}
                      align={isMe ? "left" : "right"}
                    />
                  )}

                  <div
                    style={{
                      padding: "10px 12px", borderRadius: isMe ? "16px 16px 6px 16px" : "16px 16px 16px 6px",
                      background: m.deletedForEveryone ? C.navy50 : (isMe ? navyGrad : C.white),
                      border: m.deletedForEveryone ? `1px dashed ${C.line}` : (isMe ? "none" : `1px solid ${C.line}`),
                      color: m.deletedForEveryone ? C.mutedLight : (isMe ? C.white : C.ink), fontSize: 13, lineHeight: 1.5,
                      fontWeight: isUnread ? 700 : 400,
                      opacity: (!isMe && m.read) ? 0.8 : 1,
                      boxShadow: "0 8px 20px rgba(15,51,82,0.10)",
                      maxWidth: "100%",
                    }}
                  >
                    {m.replyTo && <ParentMessagePreview replyTo={{ ...m.replyTo, author: m.replyTo.from === "me" ? "Vous" : conv.name }} isMine={isMe} />}

                    {m.attachments?.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: m.text ? 8 : 0 }}>
                        {m.attachments.map((attachment, index) => (
                          <AttachmentPreview key={`${attachment.name}-${index}`} attachment={attachment} onOpen={setViewerAttachment} />
                        ))}
                      </div>
                    )}

                    {m.deletedForEveryone ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontStyle: "italic" }}>
                        <Ban size={12} /> Message supprimé
                      </div>
                    ) : (
                      m.text ? <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div> : null
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                      <div style={{ fontSize: 9.5, color: m.deletedForEveryone ? C.mutedLight : (isMe ? "rgba(255,255,255,0.7)" : C.mutedLight), textAlign: "right" }}>{m.time}</div>
                      {isMe && !m.deletedForEveryone && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: m.read ? C.gold400 : "rgba(255,255,255,0.65)" }}>
                          {m.read ? <CheckCheck size={12} /> : <Check size={12} />}
                        </span>
                      )}
                    </div>
                  </div>

                  {Object.keys(reactionCounts).length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                      {Object.entries(reactionCounts).map(([emoji, count]) => {
                        const r = REACTION_MAP[emoji];
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(m.id, emoji)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.white, border: `1px solid ${myReaction === emoji ? C.gold600 : C.line}`, borderRadius: 999, padding: "2px 6px", fontSize: 11, cursor: "pointer", boxShadow: "0 1px 3px rgba(15,51,82,0.12)" }}
                          >
                            {r ? (
                              <img src={r.src} alt={r.label} style={{ width: 14, height: 14, objectFit: "contain", borderRadius: 4 }} />
                            ) : (
                              <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>
                            )}
                            {count > 1 && <span style={{ fontSize: 9, color: C.mutedLight, fontWeight: 700 }}>{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {msgMenuId === m.id && (
                    <div style={{ position: "absolute", top: "100%", marginTop: 4, [isMe ? "right" : "left"]: 0, width: 204, background: C.white, borderRadius: 10, border: `1px solid ${C.line}`, boxShadow: "0 10px 26px rgba(15,51,82,0.22)", zIndex: 60, overflow: "hidden" }}>
                      {!m.deletedForEveryone && (
                        <>
                          <button onClick={() => { navigator.clipboard?.writeText(m.text); setMsgMenuId(null); }} style={menuRowStyle(C.ink)}>
                            <Copy size={13} /> Copier le texte
                          </button>
                          <button onClick={() => { setTransferMessage(m); setMsgMenuId(null); }} style={menuRowStyle(C.ink)}>
                            <Forward size={13} /> Transférer
                          </button>
                          <div style={{ height: 1, background: C.line }} />
                        </>
                      )}
                      <button onClick={() => deleteForMe(m.id)} style={menuRowStyle(C.danger)}>
                        <Trash2 size={13} /> Supprimer pour moi
                      </button>
                      {isMe && !m.deletedForEveryone && (
                        <button onClick={() => deleteForEveryone(m.id)} style={menuRowStyle(C.danger)}>
                          <Ban size={13} /> Supprimer pour tout le monde
                        </button>
                      )}
                    </div>
                  )}
                </div>
                </div>
              </React.Fragment>
            );
          })}

          {(typingLocal || conv.typing) && <TypingIndicator initials={conv.initials} imageUrl={conv.image} online={conv.online} />}
          <div ref={bottomRef} />
        </div>

        {/* Zone de saisie */}
        <div className="lynora-message-composer" style={{ borderTop: `1px solid ${C.line}`, position: "relative", zIndex: 4, flexShrink: 0, background: C.white }}>
          {replyingTo && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 12px 0", padding: "7px 10px", borderRadius: 10, border: `1px solid ${C.line}`, background: "transparent" }}>
              <CornerUpLeft size={13} color={C.navy700} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <ParentMessagePreview replyTo={{ ...replyingTo, author: replyingTo.from === "me" ? "Vous" : conv.name }} compact />
              </div>
              <button type="button" onClick={() => setReplyingTo(null)} style={{ border: "none", background: "transparent", color: C.mutedLight, cursor: "pointer", display: "flex", flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>
          )}
          {attachments.length > 0 && (
            <div style={{ display: "flex", gap: 8, padding: "8px 12px 10px", overflowX: "auto" }}>
              {attachments.map((attachment) => (
                <div key={attachment.id} style={{ flex: "0 0 auto" }}>
                  <SmallAttachmentTile attachment={attachment} onRemove={removeAttachment} />
                </div>
              ))}
            </div>
          )}

          <div className="lynora-message-composer-row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 12px" }}>
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={handleFileSelection} />
            <button type="button" onClick={() => fileInputRef.current?.click()} style={{ width: 36, height: 36, borderRadius: 11, border: "none", background: C.navy50, color: C.navy800, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Ajouter un fichier ou une image">
              <Paperclip size={15} />
            </button>
            <div ref={emojiPickerRef} style={{ position: "relative" }}>
              <button type="button" onClick={() => setShowEmojiPicker((value) => !value)} style={{ width: 36, height: 36, borderRadius: 11, border: "none", background: C.navy50, color: C.navy800, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Émoji">
                <FontAwesomeIcon icon={faSmile} style={{ fontSize: 16 }} />
              </button>
              {showEmojiPicker && (
                <div className="lynora-emoji-popover" style={{ position: "absolute", bottom: 44, left: 0, zIndex: 80 }}>
                  <Emojipicker
                    className="lynora-chat-emoji-picker"
                    emojis={["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥", "👏", "💡", "😎", "🤝"]}
                    onSelect={(emoji) => {
                      setDraft((current) => `${current}${emoji}`);
                      setShowEmojiPicker(false);
                    }}
                    size={34}
                  />
                </div>
              )}
            </div>
            <input
              className="lynora-message-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Écrire un message..."
              style={{ flex: 1, minWidth: 0, width: 0, border: `1px solid ${C.line}`, borderRadius: 999, padding: "10px 14px", fontSize: 13, outline: "none", color: C.ink, background: "#F8FBFF" }}
            />
            <button
              className="lynora-message-send"
              onClick={submit}
              disabled={!draft.trim() && attachments.length === 0}
              style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: draft.trim() || attachments.length > 0 ? goldGrad : C.line, color: draft.trim() || attachments.length > 0 ? C.navy900 : C.mutedLight, display: "flex", alignItems: "center", justifyContent: "center", cursor: draft.trim() || attachments.length > 0 ? "pointer" : "default", flexShrink: 0, boxShadow: "0 8px 18px rgba(15,51,82,0.14)" }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>

        {confirmAction && (
          <InlineConfirm
            title={confirmMap[confirmAction].title}
            message={confirmMap[confirmAction].message}
            confirmLabel={confirmMap[confirmAction].label}
            onCancel={() => setConfirmAction(null)}
            onConfirm={async () => {
              if (confirmAction === "delete") {
                onDeleted ? onDeleted(conv.id) : onClose();
              } else if (confirmAction === "block") {
                try {
                  const response = await fetchBackendApi("/api/messages/block", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId: conv.id, targetUserId: conv.otherUserId }),
                  });
                  if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || "block failed");
                  }
                  onBlocked?.(conv.id, `${conv.name} a été bloqué pendant 7 jours.`);
                } catch {
                  showActionToast("Le blocage n'a pas pu être enregistré. Vérifiez votre connexion puis réessayez.");
                }
              } else {
                try {
                  const response = await fetchBackendApi("/api/admin/reports", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "conversation", targetId: conv.id, targetLabel: conv.name, reason: "Signalement depuis une conversation" }),
                  });
                  if (!response.ok) throw new Error("report failed");
                  showActionToast("Votre signalement a été enregistré et sera examiné par notre équipe.");
                } catch {
                  showActionToast("Impossible d'enregistrer le signalement. Réessayez plus tard.");
                }
              }
              setConfirmAction(null);
            }}
          />
        )}

        {actionToast && (
          <div role="status" style={{ position: "absolute", left: "50%", bottom: 70, zIndex: 115, transform: "translateX(-50%)", maxWidth: "calc(100% - 32px)", padding: "10px 16px", borderRadius: 10, background: C.navy900, color: C.white, fontSize: 12, fontWeight: 600, lineHeight: 1.4, textAlign: "center", boxShadow: "0 10px 26px rgba(15,51,82,0.28)" }}>
            {actionToast}
          </div>
        )}

        {infoOpen && (
          <InfoPanel
            conv={conv}
            onClose={() => setInfoOpen(false)}
            onChange={patch}
            onStartCall={startCall}
            onSearch={openSearch}
            onRequestConfirm={requestConfirmFromInfo}
            onOpenProfile={onOpenProfile}
            showOnlineStatus={showOnlineStatus}
            onToggleOnlineStatus={toggleOnlineStatus}
          />
        )}

        {membersOpen && conv.isGroup && (
          <GroupMembersModal
            conv={conv}
            onClose={() => setMembersOpen(false)}
            onAddParticipants={onAddParticipants ? (participantIds) => onAddParticipants(conv.id, participantIds) : undefined}
            onLeaveGroup={onLeaveGroup ? () => onLeaveGroup(conv.id) : undefined}
            onLeft={() => { setMembersOpen(false); onDeleted ? onDeleted(conv.id) : onClose(); }}
            onOpenProfile={onOpenProfile}
          />
        )}

        {incomingCall && (
          <div style={{ position: "absolute", inset: 0, zIndex: 85, background: "rgba(15,51,82,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ width: "100%", maxWidth: 300, background: C.white, borderRadius: 18, padding: 22, textAlign: "center", boxShadow: "0 20px 60px rgba(15,51,82,0.35)" }}>
              <div style={{ width: 62, height: 62, margin: "0 auto 12px", borderRadius: "50%", background: navyGrad, color: C.white, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Avatar initials={conv.initials} imageUrl={conv.image} size={62} />
              </div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: C.ink }}>{conv.name}</div>
              <div style={{ marginTop: 5, fontSize: 12.5, color: C.muted }}>{incomingCall.type === "video" ? "Appel vidéo entrant" : "Appel vocal entrant"}</div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={rejectIncomingCall} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 999, border: "none", background: C.danger, color: C.white, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  <PhoneOff size={14} /> Refuser
                </button>
                <button onClick={answerIncomingCall} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 999, border: "none", background: C.success, color: C.white, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  {incomingCall.type === "video" ? <Video size={14} /> : <Phone size={14} />} Répondre
                </button>
              </div>
            </div>

          </div>
        )}

        {viewerAttachment && <AttachmentViewer attachment={viewerAttachment} onClose={() => setViewerAttachment(null)} />}
        {transferMessage && <TransferMessageModal message={transferMessage} onClose={() => setTransferMessage(null)} mobile={mobile} />}

        {activeCall && (
          <LiveKitCallOverlay
            mode={activeCall}
            conversation={conv}
            status={callStatus}
            elapsed={callElapsed}
            minimized={callMinimized}
            onMinimize={() => setCallMinimized(true)}
            onEnd={endCall}
            callSession={callSession}
            onConnected={markCallConnected}
          />
        )}
        {callToast && (
          <div role="status" style={{ position: "absolute", left: "50%", bottom: 78, zIndex: 110, transform: "translateX(-50%)", padding: "10px 16px", borderRadius: 999, background: C.navy900, color: C.white, fontSize: 12.5, fontWeight: 700, boxShadow: "0 10px 26px rgba(15,51,82,0.28)", whiteSpace: "nowrap" }}>
            {callToast}
          </div>
        )}
        </>}
      </div>
    </Backdrop>
  );
}

/* ------------------------------------------------------------------ */
/*  PANNEAU — MEMBRES DU GROUPE (liste, ajout de participant, quitter) */
/*    Affiché depuis l'en-tête du ChatModal au clic sur l'avatar       */
/*    de groupe, ou via le bouton dédié.                               */
/* ------------------------------------------------------------------ */
function GroupMembersModal({ conv, onClose, onAddParticipants, onLeaveGroup, onLeft, onOpenProfile }) {
  const [view, setView] = useState("list"); // "list" | "add"
  const [candidates, setCandidates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [query, setQuery] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);

  const memberIds = useMemo(() => new Set((conv.members || []).map((m) => m.id)), [conv.members]);

  useEffect(() => {
    if (view !== "add") return undefined;
    let cancelled = false;
    setLoadingCandidates(true);
    setError("");
    fetchBackendApi("/api/users", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Chargement impossible"))))
      .then((data) => {
        if (cancelled) return;
        const users = Array.isArray(data.users) ? data.users : [];
        setCandidates(users.filter((user) => !memberIds.has(user.id)));
      })
      .catch(() => { if (!cancelled) setError("Impossible de charger les utilisateurs."); })
      .finally(() => { if (!cancelled) setLoadingCandidates(false); });
    return () => { cancelled = true; };
  }, [view, memberIds]);

  const goToAdd = () => { setView("add"); setSelectedIds([]); setQuery(""); setError(""); };
  const backToList = () => { setView("list"); setSelectedIds([]); setQuery(""); setError(""); };
  const toggleCandidate = (id) => setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const filteredCandidates = candidates.filter((user) =>
    `${user.name || ""} ${user.title || ""}`.toLowerCase().includes(query.toLowerCase())
  );

  const submitAdd = async () => {
    if (selectedIds.length === 0 || !onAddParticipants) return;
    setSubmitting(true);
    setError("");
    try {
      await onAddParticipants(selectedIds);
      backToList();
    } catch (addError) {
      setError(addError.message || "Impossible d'ajouter le ou les participants.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmLeaveGroup = async () => {
    if (!onLeaveGroup) return;
    setSubmitting(true);
    setError("");
    try {
      await onLeaveGroup();
      onLeft ? onLeft() : onClose();
    } catch (leaveError) {
      setSubmitting(false);
      setConfirmLeave(false);
      setError(leaveError.message || "Impossible de quitter le groupe.");
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 80, background: C.white, display: "flex", flexDirection: "column", animation: "lynoraSlideIn 0.2s ease" }}>
      <style>{`@keyframes lynoraSlideIn { from { transform: translateX(18px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: `1px solid ${C.line}` }}>
        <IconBtn icon={ArrowLeft} title={view === "add" ? "Retour" : "Retour à la conversation"} onClick={view === "add" ? backToList : onClose} />
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: C.ink }}>
          {view === "add" ? "Ajouter des participants" : `Membres du groupe (${(conv.members || []).length})`}
        </span>
        {view === "list" && onAddParticipants && <IconBtn icon={UserPlus} title="Ajouter un participant" onClick={goToAdd} />}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
        {view === "list" ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {(conv.members || []).map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => onOpenProfile?.(member.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", border: "none", borderRadius: 10, background: "transparent", cursor: onOpenProfile ? "pointer" : "default", textAlign: "left" }}
                  onMouseEnter={(e) => onOpenProfile && (e.currentTarget.style.background = C.navy50)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Avatar initials={member.initials || getInitials(member.name)} imageUrl={member.image} size={38} online={member.online} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: "block", color: C.ink, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{member.name || "Utilisateur"}</strong>
                    <small style={{ color: C.muted, fontSize: 11 }}>{member.title || "Membre LynoraLink"}</small>
                  </span>
                </button>
              ))}
              {(conv.members || []).length === 0 && (
                <div style={{ padding: "24px 8px", textAlign: "center", color: C.mutedLight, fontSize: 12.5 }}>Aucun membre à afficher.</div>
              )}
            </div>
            {error && <div style={{ marginTop: 12, color: C.danger, fontSize: 12 }}>{error}</div>}
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.navy50, borderRadius: 10 }}>
              <Search size={14} color={C.mutedLight} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un participant" style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: C.ink, fontSize: 12.5 }} />
            </div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              {loadingCandidates ? (
                <div style={{ padding: "24px 8px", textAlign: "center", color: C.mutedLight, fontSize: 12.5 }}>Chargement…</div>
              ) : filteredCandidates.length === 0 ? (
                <div style={{ padding: "24px 8px", textAlign: "center", color: C.mutedLight, fontSize: 12.5 }}>Aucun utilisateur à ajouter.</div>
              ) : (
                filteredCandidates.map((user) => {
                  const selected = selectedIds.includes(user.id);
                  return (
                    <button key={user.id} type="button" onClick={() => toggleCandidate(user.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", border: "none", borderRadius: 10, background: selected ? C.navy50 : "transparent", cursor: "pointer", textAlign: "left" }}>
                      <Avatar initials={getInitials(user.name)} imageUrl={user.image} size={36} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: "block", color: C.ink, fontSize: 12.5 }}>{user.name || "Utilisateur"}</strong>
                        <small style={{ color: C.muted, fontSize: 11 }}>{user.title || "Membre LynoraLink"}</small>
                      </span>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${selected ? C.navy800 : C.line}`, background: selected ? C.navy800 : C.white, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{selected ? "✓" : ""}</span>
                    </button>
                  );
                })
              )}
            </div>
            {error && <div style={{ marginTop: 12, color: C.danger, fontSize: 12 }}>{error}</div>}
            <button type="button" onClick={submitAdd} disabled={submitting || selectedIds.length === 0} style={{ width: "100%", marginTop: 16, padding: "10px 14px", border: "none", borderRadius: 10, background: submitting || selectedIds.length === 0 ? C.line : goldGrad, color: C.navy900, fontWeight: 800, fontSize: 13, cursor: submitting || selectedIds.length === 0 ? "default" : "pointer" }}>
              {submitting ? "Ajout…" : `Ajouter${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
            </button>
          </>
        )}
      </div>

      {view === "list" && onLeaveGroup && (
        <div style={{ padding: "10px 14px 14px", borderTop: `1px solid ${C.line}` }}>
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", border: `1.5px solid ${C.danger}`, borderRadius: 10, background: "transparent", color: C.danger, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            <LogOut size={15} /> Quitter le groupe
          </button>
        </div>
      )}

      {confirmLeave && (
        <InlineConfirm
          title="Quitter ce groupe ?"
          message="Vous ne recevrez plus les messages de cette conversation de groupe. Les autres membres pourront continuer à discuter sans vous."
          confirmLabel={submitting ? "Sortie…" : "Quitter"}
          onCancel={() => setConfirmLeave(false)}
          onConfirm={confirmLeaveGroup}
        />
      )}
    </div>
  );
}

function NewConversationModal({ isOpen, onClose, onCreate, initialMode = "direct", nonBlocking = false, mobile = false }) {
  const [mode, setMode] = useState(initialMode); // "direct" | "group"
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;
    setMode(initialMode);
    setSelectedId(null);
    setSelectedIds([]);
    setGroupName("");
    setQuery("");
    setError("");
    const endpoint = initialMode === "group" ? "/api/users" : "/api/connections";
    fetch(endpoint, { credentials: "include", cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Chargement impossible")))
      .then((data) => setUsers(Array.isArray(initialMode === "group" ? data.users : data.connections) ? (initialMode === "group" ? data.users : data.connections) : []))
      .catch(() => setError("Impossible de charger les utilisateurs."));
    return undefined;
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const filteredUsers = users.filter((user) =>
    `${user.name || ""} ${user.title || ""}`.toLowerCase().includes(query.toLowerCase())
  );
  const toggleUser = (id) => setSelectedId((current) => current === id ? null : id);
  const toggleGroupUser = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    const endpoint = nextMode === "group" ? "/api/users" : "/api/connections";
    fetch(endpoint, { credentials: "include", cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Chargement impossible")))
      .then((data) => {
        const nextUsers = nextMode === "group" ? data.users : data.connections;
        setUsers(Array.isArray(nextUsers) ? nextUsers : []);
      })
      .catch(() => setError("Impossible de charger les utilisateurs."));
  };

  const submit = async () => {
    if (mode === "direct") {
      if (!selectedId) {
        setError("Sélectionnez un participant.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        await onCreate({ otherUserId: selectedId });
        onClose("created");
      } catch (createError) {
        setError(createError.message || "Impossible d'ouvrir la conversation.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (selectedIds.length < 2) {
      setError("Sélectionnez au moins 2 participants pour créer un groupe.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onCreate({ participantIds: selectedIds, groupName: groupName.trim(), isGroup: true });
      onClose("created");
    } catch (createError) {
      setError(createError.message || "Impossible de créer le groupe.");
    } finally {
      setLoading(false);
    }
  };

  const isGroup = mode === "group";

  return (
    <Backdrop onClose={onClose} maxWidth={400} maxHeight={620} nonBlocking={nonBlocking} mobile={mobile}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isGroup ? <UsersRound size={18} color={C.navy800} /> : <MessageSquare size={18} color={C.navy800} />}
          <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 16, color: C.ink }}>{isGroup ? "Nouveau groupe" : "Nouvelle conversation"}</span>
        </div>
        <IconBtn icon={X} title="Fermer" onClick={onClose} />
      </div>

      <div style={{ display: "flex", gap: 4, padding: "10px 16px 0" }}>
        <button
          type="button"
          onClick={() => switchMode("direct")}
          style={{
            flex: 1, padding: "8px 10px", borderRadius: 9, border: "none", cursor: "pointer",
            background: !isGroup ? C.navy800 : C.navy50, color: !isGroup ? C.white : C.ink,
            fontSize: 12, fontWeight: 700, transition: "background 0.15s ease",
          }}
        >
          Message direct
        </button>
        <button
          type="button"
          onClick={() => switchMode("group")}
          style={{
            flex: 1, padding: "8px 10px", borderRadius: 9, border: "none", cursor: "pointer",
            background: isGroup ? C.navy800 : C.navy50, color: isGroup ? C.white : C.ink,
            fontSize: 12, fontWeight: 700, transition: "background 0.15s ease",
          }}
        >
          Groupe
        </button>
      </div>

      <div style={{ padding: 16, overflowY: "auto" }}>
        {isGroup && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.navy50, borderRadius: 10, marginBottom: 10 }}>
            <UsersRound size={14} color={C.mutedLight} />
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Nom du groupe (facultatif)"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: C.ink, fontSize: 12.5 }}
            />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.navy50, borderRadius: 10 }}>
          <Search size={14} color={C.mutedLight} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un participant" style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: C.ink, fontSize: 12.5 }} />
        </div>

        {isGroup && selectedIds.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {selectedIds.map((id) => {
              const user = users.find((u) => u.id === id);
              if (!user) return null;
              return (
                <span key={id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px 4px 4px", borderRadius: 999, background: C.navy50, fontSize: 11, fontWeight: 700, color: C.ink }}>
                  <Avatar initials={getInitials(user.name)} imageUrl={user.image} size={20} />
                  {(user.name || "Utilisateur").split(" ")[0]}
                  <button type="button" onClick={() => toggleGroupUser(id)} aria-label={`Retirer ${user.name}`} style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", color: C.muted }}><X size={12} /></button>
                </span>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          {filteredUsers.map((user) => {
            const selected = isGroup ? selectedIds.includes(user.id) : selectedId === user.id;
            return <button key={user.id} type="button" onClick={() => (isGroup ? toggleGroupUser(user.id) : toggleUser(user.id))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", border: "none", borderRadius: 10, background: selected ? C.navy50 : "transparent", cursor: "pointer", textAlign: "left" }}>
              <Avatar initials={(user.name || "U").split(" ").slice(0, 2).map((word) => word[0]).join("").toUpperCase()} imageUrl={user.image} size={36} />
              <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: "block", color: C.ink, fontSize: 12.5 }}>{user.name || "Utilisateur"}</strong><small style={{ color: C.muted, fontSize: 11 }}>{user.title || "Membre LynoraLink"}</small></span>
              <span style={{ width: 20, height: 20, borderRadius: isGroup ? 6 : "50%", border: `1.5px solid ${selected ? C.navy800 : C.line}`, background: selected ? C.navy800 : C.white, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{selected ? "✓" : ""}</span>
            </button>;
          })}
        </div>
        {error && <div style={{ marginTop: 12, color: C.danger, fontSize: 12 }}>{error}</div>}
        <button type="button" onClick={submit} disabled={loading} style={{ width: "100%", marginTop: 16, padding: "10px 14px", border: "none", borderRadius: 10, background: loading ? C.line : goldGrad, color: C.navy900, fontWeight: 800, fontSize: 13, cursor: loading ? "default" : "pointer" }}>
          {loading ? (isGroup ? "Création…" : "Ouverture…") : (isGroup ? `Créer le groupe${selectedIds.length ? ` (${selectedIds.length})` : ""}` : "Ouvrir la conversation")}
        </button>
      </div>
    </Backdrop>
  );
}

/* ------------------------------------------------------------------ */
/*  WIDGET COMBINÉ — bulle flottante qui enchaîne les deux modales     */
/*    <MessagingWidget />                                              */
/* ------------------------------------------------------------------ */
export default function MessagingWidget({ conversations: controlled, onChange, onOpenChat, onOpenProfile, onSend, onNewConversation, autoOpen = false, directConversation = false, showFab = true, onClose, activeId: controlledActiveId = null, nonBlocking = false, loading = false, mobile = false }) {
  const { data: session } = useSession();
  const [internal, setInternal] = useState([]);
  const [listOpen, setListOpen] = useState(autoOpen && !directConversation);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newConversationMode, setNewConversationMode] = useState("direct");
  const [activeId, setActiveId] = useState(controlledActiveId);
  const [widgetToast, setWidgetToast] = useState(null);
  const [autoOpenNewMessages, setAutoOpenNewMessages] = useState(false);
  const knownIncomingMessageIdsRef = useRef(null);

  useEffect(() => {
    if (!session?.user?.id) return undefined;
    const heartbeat = () => fetchBackendApi("/api/presence", { method: "POST" }).catch(() => {});
    heartbeat();
    const intervalId = window.setInterval(heartbeat, 30000);
    return () => window.clearInterval(intervalId);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return undefined;
    let active = true;
    fetchBackendApi("/api/messages/settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && data?.settings?.autoOpenNewMessages !== undefined) {
          setAutoOpenNewMessages(Boolean(data.settings.autoOpenNewMessages));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [session?.user?.id]);

  const conversations = controlled?.length ? controlled : internal;
  useEffect(() => {
    const incomingMessages = conversations.flatMap((conversation) => (
      (conversation.messages || [])
        .filter((message) => message.from === "them")
        .map((message) => ({ conversationId: conversation.id, messageId: String(message.id) }))
    ));
    const incomingIds = new Set(incomingMessages.map((message) => message.messageId));
    const previousIds = knownIncomingMessageIdsRef.current;
    knownIncomingMessageIdsRef.current = incomingIds;
    if (!previousIds || !autoOpenNewMessages) return;

    const newMessage = incomingMessages.find((message) => !previousIds.has(message.messageId));
    if (!newMessage) return;
    setActiveId(newMessage.conversationId);
    onOpenChat?.(newMessage.conversationId);
    setListOpen(false);
  }, [conversations, autoOpenNewMessages, onOpenChat]);

  useEffect(() => {
    if (!conversations.length) return undefined;
    let cancelled = false;
    const checkCalls = async () => {
      for (const conversation of conversations) {
        try {
          const response = await fetchBackendApi(`/api/calls?conversationId=${encodeURIComponent(conversation.id)}`, { cache: "no-store" });
          const data = await response.json();
          if (!cancelled && data.call && !data.call.isCaller) {
            setActiveId(conversation.id);
            setListOpen(false);
            return;
          }
        } catch {}
      }
    };
    checkCalls();
    const interval = setInterval(checkCalls, 1500);
    return () => { cancelled = true; clearInterval(interval); };
  }, [conversations, activeId]);

  useEffect(() => {
    if (autoOpen) setListOpen(true);
    if (directConversation) setListOpen(false);
  }, [autoOpen, directConversation]);

  useEffect(() => {
    if (controlledActiveId !== undefined && controlledActiveId !== activeId) {
      setActiveId(controlledActiveId);
    }
  }, [controlledActiveId, activeId]);

  const setConversations = (updater) => {
    const next = typeof updater === "function" ? updater(conversations) : updater;
    if (onChange) onChange(next);
    else setInternal(next);
  };

  const active = conversations.find((c) => c.id === activeId) || null;
  const totalUnread = useMemo(() => conversations.filter((c) => !c.archived && c.unread > 0).length, [conversations]);

  const openChat = (id) => {
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    onOpenChat?.(id);
    setActiveId(id);
    setListOpen(false);
  };

  const sendMessage = (id, text, attachments = []) => {
    onSend?.(id, text, attachments);
  };

  const patchConversation = (id, fields) => {
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, ...fields } : c)));
  };

  const deleteConversation = async (id) => {
    const response = await fetchBackendApi(`/api/messages?conversationId=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Impossible de supprimer la conversation.");
    setConversations((cs) => cs.filter((c) => c.id !== id));
    setActiveId(null);
  };

  const createConversation = async ({ otherUserId, participantIds, groupName, isGroup }) => {
    const payload = isGroup
      ? { participantIds, groupName: groupName || undefined, isGroup: true, createOnly: true }
      : { otherUserId, createOnly: true };
    const response = await fetchBackendApi("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.conversationId) {
      throw new Error(data.error || (isGroup ? "Impossible de créer le groupe." : "Impossible d'ouvrir la conversation."));
    }
    const conversationsResponse = await fetchBackendApi("/api/messages", { cache: "no-store" });
    const conversationsData = await conversationsResponse.json().catch(() => ({}));
    const nextConversations = Array.isArray(conversationsData.conversations) ? conversationsData.conversations : [];
    setConversations(nextConversations);
    setActiveId(data.conversationId);
    onOpenChat?.(data.conversationId);
    setListOpen(false);
  };

  const addParticipants = async (conversationId, participantIds) => {
    const response = await fetchBackendApi(`/api/messages/${conversationId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantIds }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Impossible d'ajouter le ou les participants.");
    patchConversation(conversationId, {
      members: data.members || [],
      ...(data.members ? { memberCount: data.members.length } : {}),
    });
    return data.members;
  };

  const leaveGroup = async (conversationId) => {
    const response = await fetchBackendApi(`/api/messages/${conversationId}/participants`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Impossible de quitter le groupe.");
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: C.white }}>
      {showFab && (
        <button
          onClick={() => setListOpen(true)}
          title="Messages"
          style={{ position: "fixed", bottom: 24, right: 24, width: 54, height: 54, borderRadius: "50%", border: "none", background: navyGrad, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 12px 28px rgba(15,51,82,0.4)", zIndex: 100 }}
        >
          <MessageSquare size={22} />
          {totalUnread > 0 && (
            <span style={{ position: "absolute", top: -2, right: -2, minWidth: 20, height: 20, padding: "0 4px", borderRadius: 999, background: C.danger, color: C.white, fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {totalUnread}
            </span>
          )}
        </button>
      )}

      <ConversationListModal
        isOpen={listOpen}
        onClose={() => {
          setListOpen(false);
          onClose?.();
        }}
        conversations={conversations}
        onChange={setConversations}
        onOpenChat={openChat}
        onOpenProfile={onOpenProfile}
        onNewMessage={(mode) => { setActiveId(null); onNewConversation?.(mode); setListOpen(false); setNewConversationMode(mode === "group" ? "group" : "direct"); setNewConversationOpen(true); }}
        nonBlocking={nonBlocking}
        loading={loading}
        mobile={mobile}
      />

      <ChatModal
        isOpen={!!active && !listOpen}
        conversation={active}
        onClose={() => {
          setActiveId(null);
          setListOpen(false);
          onClose?.();
        }}
        onBack={() => { setActiveId(null); setListOpen(true); }}
        onSend={sendMessage}
        onChange={patchConversation}
        onDeleted={deleteConversation}
        onBlocked={(id, message) => {
          setActiveId(null);
          setListOpen(true);
          setWidgetToast(message || "Utilisateur bloqué.");
          window.setTimeout(() => setWidgetToast(null), 3200);
        }}
        onOpenProfile={onOpenProfile}
        onAddParticipants={addParticipants}
        onLeaveGroup={leaveGroup}
        nonBlocking={nonBlocking}
        loading={loading}
        mobile={mobile}
      />
      {widgetToast && <div role="status" style={{ position: "fixed", left: "50%", bottom: 28, zIndex: 1300, transform: "translateX(-50%)", maxWidth: "calc(100% - 32px)", padding: "10px 16px", borderRadius: 10, background: C.navy900, color: C.white, fontSize: 12, fontWeight: 600, textAlign: "center", boxShadow: "0 10px 26px rgba(15,51,82,0.28)" }}>{widgetToast}</div>}
      <NewConversationModal
        isOpen={newConversationOpen}
        onClose={(reason) => {
          setNewConversationOpen(false);
          if (reason !== "created") setListOpen(true);
        }}
        onCreate={createConversation}
        initialMode={newConversationMode}
        nonBlocking={nonBlocking}
        mobile={mobile}
      />
    </div>
  );
}



