"use client";

import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  X, Globe, ChevronDown, MessageSquare, Pencil, Bold, Italic, Heading1, Heading2,
  Quote, List, ListOrdered, Link2, Code2, Minus, Highlighter, AlignLeft,
  AlignCenter, AlignRight, AlignJustify, Image as ImageIcon, Eye, EyeOff, Clock, Video,
  UploadCloud, GripVertical, AlertCircle, Loader2, Trash2, PlayCircle,
  ImagePlus, RotateCcw, Users, Lock, Hash, Smile, Plus, Camera, Sparkles, FileText, UserPlus, Send,
  Underline, Strikethrough, Undo2, Redo2, Palette, PaintBucket, RemoveFormatting,
} from "lucide-react";
import ArticleViewerPreview from "./ArticleViewerPreview";
import EnterpriseBadge from "./EnterpriseBadge";
import PremiumBadge from "./PremiumBadge";
import { fetchBackendApi } from "@/lib/backend-api";
import Emojipicker from "./Emojipicker";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faNewspaper, faPhotoFilm, faVideo, faWandSparkles, faFaceSmile, faUserPlus } from "@fortawesome/free-solid-svg-icons";

/* ------------------------------------------------------------------ */
/*  TOKENS — identiques à la palette LynoraLink (badge navy + L doré) */
/* ------------------------------------------------------------------ */
const C = {
  navy900: "var(--navy900)",
  navy800: "var(--navy800)",
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
  emerald: "#2E9E5B",
};

const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;

/* ------------------------------------------------------------------ */
/*  CONFIGURATION UPLOAD                                              */
/* ------------------------------------------------------------------ */
const MAX_FILES = 10;
const MAX_IMAGE_MB = 15;
const MAX_VIDEO_MB = 300;
const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm";

const CREATE_POST_MODAL_CSS = `
  @keyframes cpm-spin { to { transform: rotate(360deg); } }
  @keyframes cpm-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes cpm-pop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
  @keyframes cpm-overlay-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cpm-panel-in { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

  .cpm-overlay { animation: cpm-overlay-in 180ms ease both; }
  .cpm-panel { animation: cpm-panel-in 240ms cubic-bezier(0.22,1,0.36,1) both; }
  .cpm-spinner { animation: cpm-spin 800ms linear infinite; }
  .cpm-tile { animation: cpm-pop 220ms cubic-bezier(0.22,1,0.36,1) both; }
  .cpm-fade { animation: cpm-fade-in 200ms ease both; }

  .cpm-scroll::-webkit-scrollbar { width: 6px; }
  .cpm-scroll::-webkit-scrollbar-track { background: transparent; }
  .cpm-scroll::-webkit-scrollbar-thumb { background: ${C.navy100}; border-radius: 999px; }

  .cpm-dropzone { transition: border-color 180ms ease, background 180ms ease, transform 180ms ease; }
  .cpm-dropzone:hover { border-color: ${C.gold600}; background: rgba(217,165,54,0.06); }
  .cpm-dropzone.cpm-active { border-color: ${C.gold600}; background: rgba(217,165,54,0.1); transform: scale(1.01); }

  .cpm-tile-remove { opacity: 0; transition: opacity 150ms ease, transform 150ms ease; }
  .cpm-tile:hover .cpm-tile-remove { opacity: 1; }
  .cpm-tile-drag { opacity: 0; transition: opacity 150ms ease; cursor: grab; }
  .cpm-tile:hover .cpm-tile-drag { opacity: 1; }
  .cpm-tile-cover-badge { animation: cpm-fade-in 200ms ease both; }

  .cpm-add-tile { transition: border-color 160ms ease, background 160ms ease, transform 160ms ease; cursor: pointer; }
  .cpm-add-tile:hover { border-color: ${C.gold600}; background: rgba(217,165,54,0.08); transform: translateY(-2px); }

  .cpm-avatar { border-radius: 50% !important; }

  .cpm-icon-btn { transition: background 150ms ease, color 150ms ease; }
  .cpm-icon-btn:hover { background: ${C.navy50}; }

  .cpm-chip { transition: background 150ms ease, color 150ms ease, transform 150ms ease; }
  .cpm-chip:hover { transform: translateY(-1px); }

  .cpm-publish { transition: filter 160ms ease, transform 160ms ease, box-shadow 160ms ease; }
  .cpm-publish:not(:disabled):hover { filter: brightness(1.06); transform: translateY(-1px); box-shadow: 0 12px 26px rgba(15,51,82,0.32); }
  .cpm-publish:not(:disabled):active { transform: translateY(0) scale(0.98); }

  .cpm-mode-tab { transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 160ms ease; }
  .cpm-mode-tab:hover:not(.cpm-mode-tab-active) { color: ${C.navy800} !important; background: rgba(15,51,82,0.05) !important; }

  .cpm-media-opt { transition: background 160ms ease, transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease; }
  .cpm-media-opt:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(15,51,82,0.1); }
  .cpm-media-opt-icon { transition: transform 160ms ease; }
  .cpm-media-opt:hover .cpm-media-opt-icon { transform: scale(1.08); }

  .cpm-close-btn { transition: background 150ms ease, transform 150ms ease, color 150ms ease; }
  .cpm-close-btn:hover { background: ${C.danger50} !important; color: ${C.danger} !important; transform: rotate(90deg); }

  .cpm-textarea-wrap { transition: box-shadow 180ms ease; }

  /* ---- Éditeur d'article riche (WYSIWYG) ---- */
  .cpm-rte {
    width: 100%; min-height: 260px; max-height: 52vh; overflow-y: auto; border: 1.5px solid ${C.line}; border-radius: 14px;
    outline: none; font-size: 15.5px; color: ${C.ink}; font-family: 'Inter', sans-serif; line-height: 1.75;
    padding: 18px 20px; background: ${C.navy50}; box-shadow: inset 0 1px 0 rgba(15,51,82,0.02);
    transition: border-color 180ms ease, box-shadow 180ms ease; cursor: text;
  }
  .cpm-rte:focus { border-color: ${C.navy700}; box-shadow: 0 0 0 3px ${C.navy100}; }
  .cpm-rte:empty:before { content: attr(data-placeholder); color: ${C.mutedLight}; pointer-events: none; }
  .cpm-rte h1 { font-size: 27px; font-weight: 800; margin: 6px 0 12px; font-family: 'Sora', sans-serif; color: ${C.ink}; line-height: 1.25; }
  .cpm-rte h2 { font-size: 21px; font-weight: 800; margin: 16px 0 8px; font-family: 'Sora', sans-serif; color: ${C.ink}; line-height: 1.3; }
  .cpm-rte h3 { font-size: 17.5px; font-weight: 700; margin: 14px 0 6px; font-family: 'Sora', sans-serif; color: ${C.ink}; }
  .cpm-rte p { margin: 0 0 12px; }
  .cpm-rte p:last-child { margin-bottom: 0; }
  .cpm-rte blockquote { margin: 10px 0; padding: 8px 16px; border-left: 3px solid ${C.gold600}; color: ${C.muted}; font-style: italic; background: rgba(217,165,54,0.08); border-radius: 0 10px 10px 0; }
  .cpm-rte ul, .cpm-rte ol { margin: 4px 0 14px; padding-left: 22px; }
  .cpm-rte li { margin: 4px 0; }
  .cpm-rte a { color: ${C.navy700}; text-decoration: underline; }
  .cpm-rte img { max-width: 100%; border-radius: 12px; display: block; margin: 14px 0; }
  .cpm-rte pre { background: ${C.navy900}; color: #E9EEF4; padding: 12px 14px; border-radius: 10px; overflow-x: auto; margin: 10px 0; font-size: 13px; }
  .cpm-rte pre code { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
  .cpm-rte mark { background: rgba(246,211,116,0.55); border-radius: 3px; padding: 0 2px; }
  .cpm-rte hr { border: none; border-top: 1.5px solid ${C.line}; margin: 20px 0; }
  .cpm-rte div[align="center"] { text-align: center; }
  .cpm-rte div[align="right"] { text-align: right; }
  .cpm-rte div[align="justify"] { text-align: justify; }

  .cpm-rte-btn { transition: background 140ms ease, color 140ms ease, transform 140ms ease; }
  .cpm-rte-btn:hover { background: rgba(15,51,82,0.08) !important; }
  .cpm-rte-btn:active { transform: scale(0.94); }
  .cpm-rte-swatch { transition: transform 140ms ease, box-shadow 140ms ease; cursor: pointer; }
  .cpm-rte-swatch:hover { transform: translateY(-1px); }
  .cpm-rte-select { transition: border-color 140ms ease; cursor: pointer; }
  .cpm-rte-select:hover { border-color: ${C.gold600}; }

  @media (max-width: 900px) {
    .cpm-overlay {
      width: 100vw !important;
      max-width: none !important;
      margin-left: calc(50% - 50vw) !important;
      padding: 0 !important;
      padding-top: env(safe-area-inset-top) !important;
      align-items: stretch !important;
      justify-content: stretch !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      -webkit-overflow-scrolling: touch;
      background: rgba(15,51,82,0.6) !important;
    }
    .cpm-panel {
      width: 100vw !important;
      max-width: none !important;
      min-width: 100vw !important;
      margin: 0 !important;
      height: calc(100dvh - env(safe-area-inset-top)) !important;
      min-height: calc(100dvh - env(safe-area-inset-top)) !important;
      max-height: none !important;
      border-radius: 0 !important;
      border: none !important;
      border-left: 0 !important;
      border-right: 0 !important;
      box-shadow: none !important;
      overflow: visible !important;
      padding-bottom: env(safe-area-inset-bottom);
      margin-top: env(safe-area-inset-top) !important;
      background: var(--app-surface) !important;
    }
    .cpm-panel *:not([style*="border-radius"]) {
      border-radius: 0 !important;
    }
    /* Exceptions explicites pour les classes spéciales */
    .cpm-panel .cpm-media-opt {
      border-radius: 50% !important;
    }
    .cpm-panel .cpm-chip {
      border-radius: 999px !important;
    }
    .cpm-panel .cpm-tile {
      border-radius: 14px !important;
    }
    .cpm-panel .cpm-tile-drag {
      border-radius: 8px !important;
    }
    .cpm-panel .cpm-rte-btn {
      border-radius: 8px !important;
    }
    .cpm-panel button[style*="999"] {
      border-radius: 999px !important;
    }
    .cpm-panel [class*="badge"] {
      border-radius: 999px !important;
    }
    .cpm-header {
      position: sticky !important;
      top: 0 !important;
      z-index: 20 !important;
      background: var(--app-surface) !important;
    }
    .cpm-scroll {
      flex: 0 0 auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      padding-bottom: 20px;
      background: var(--app-surface) !important;
    }
    .cpm-panel input,
    .cpm-panel textarea,
    .cpm-panel select { font-size: 16px !important; }
    .cpm-scroll { overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
    .cpm-header {
      padding: 8px 12px 6px !important;
      grid-template-columns: 44px 1fr 44px !important;
    }
    .cpm-mode-tab {
      white-space: nowrap;
      flex: 1 1 0;
      min-width: 0 !important;
      justify-content: center;
      padding: 7px 4px !important;
      gap: 3px !important;
      font-size: 11px !important;
    }
    .cpm-article-toolbar {
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      gap: 3px !important;
      padding: 6px !important;
      max-height: 40vh;
      overflow-y: auto;
    }
    .cpm-article-toolbar > button.cpm-rte-btn,
    .cpm-article-toolbar label.cpm-rte-swatch {
      width: 30px !important;
      height: 30px !important;
      flex: 0 0 auto !important;
    }
    .cpm-article-toolbar > select.cpm-rte-select {
      flex: 1 1 100% !important;
      order: -1;
      margin-bottom: 4px;
    }
    .cpm-article-toolbar > .cpm-chip {
      margin-left: auto;
      font-size: 11px !important;
    }
    .cpm-media-options {
      align-items: flex-start !important;
      justify-content: center !important;
      flex-wrap: wrap !important;
      overflow: visible !important;
      padding-bottom: 0 !important;
    }
    .cpm-media-options > span:first-child {
      width: 100%;
      white-space: normal !important;
    }
    .cpm-media-option-actions {
      width: 100%;
      min-width: 0;
      flex-wrap: wrap !important;
      justify-content: center !important;
      gap: 4px !important;
    }
    .cpm-media-option-actions > span {
      max-width: 100%;
    }
    .cpm-footer {
      padding: 12px 14px calc(32px + env(safe-area-inset-bottom)) !important;
    }
    .cpm-footer-row {
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 12px !important;
    }
    .cpm-footer-tools {
      width: 100% !important;
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: center !important;
      gap: 12px !important;
    }
    .cpm-footer-tools > div { min-width: 0; width: 100%; }
    .cpm-footer-tools > div > .cpm-fade {
      left: 50% !important;
      transform: translateX(-50%);
      width: min(320px, calc(100vw - 24px)) !important;
      max-width: calc(100vw - 24px) !important;
    }
    .cpm-footer-publish {
      width: 100% !important;
      min-width: 0 !important;
      justify-content: center !important;
    }
    .cpm-header .cpm-close-btn {
      width: 44px !important;
      height: 44px !important;
      background: ${C.navy50} !important;
      color: ${C.muted} !important;
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  UTILITAIRES                                                        */
/* ------------------------------------------------------------------ */
function uid() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatBytes(bytes) {
  if (!bytes) return "0 Ko";
  const units = ["o", "Ko", "Mo", "Go"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i += 1;
  }
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function fileKind(file) {
  return file.type.startsWith("video") ? "video" : "image";
}

function validateFile(file) {
  const kind = fileKind(file);
  const isAccepted = ACCEPTED_TYPES.split(",").includes(file.type);
  if (!isAccepted) return `Format non pris en charge : ${file.name}`;
  const maxMb = kind === "video" ? MAX_VIDEO_MB : MAX_IMAGE_MB;
  if (file.size > maxMb * 1024 * 1024) {
    return `${file.name} dépasse ${maxMb} Mo (${formatBytes(file.size)})`;
  }
  return null;
}

/**
 * Upload d'un fichier avec suivi de progression (XHR pour bénéficier de
 * l'évènement `progress`, indisponible avec `fetch`).
 * Contrat conservé : POST /api/upload → { url, fallback? }
 */
function uploadFileWithProgress(file, { onProgress, signalRef } = {}) {
  return new Promise((resolve, reject) => {
    const kind = fileKind(file);
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
    if (signalRef) signalRef.current = xhr;

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

/* ------------------------------------------------------------------ */
/*  AVATAR (copie locale — composant autonome)                        */
/* ------------------------------------------------------------------ */
function Avatar({ initials, size = 44, imgUrl = null, ring = false }) {
  return (
    <div
      className="cpm-avatar"
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        aspectRatio: "1 / 1",
        boxSizing: "border-box",
        borderRadius: "50%",
        background: imgUrl ? C.navy100 : navyGrad,
        color: C.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.36,
        fontFamily: "'Sora', sans-serif",
        flexShrink: 0,
        overflow: "hidden",
        border: ring ? `3px solid ${C.white}` : "none",
        boxShadow: ring ? `0 0 0 4px ${C.gold600}` : "none",
        letterSpacing: "-0.02em",
      }}
    >
      {imgUrl ? (
        <img src={imgUrl} alt={initials} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" }} />
      ) : initials}
    </div>
  );
}

function ToolbarBtn({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="cpm-icon-btn"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", color: C.ink, cursor: "pointer" }}
    >
      <Icon size={16} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  ÉDITEUR D'ARTICLE RICHE (WYSIWYG) — conversion Markdown <-> HTML   */
/*  Le contenu reste stocké/publié au même format texte "markdown+html*/
/*  léger" qu'avant (compatible avec ArticleViewerPreview et le back), */
/*  mais l'édition se fait désormais dans une vraie zone enrichie,     */
/*  comme dans un traitement de texte (Word, Notion…).                 */
/* ------------------------------------------------------------------ */
function escapeHtml(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function markdownToHtml(value = "") {
  if (!value) return "";
  const src = value.replace(/\r\n/g, "\n");

  const codeBlocks = [];
  const protectedSrc = src.replace(/```([\s\S]*?)```/g, (m, code) => {
    codeBlocks.push(code);
    return `\u0000CODEBLOCK${codeBlocks.length - 1}\u0000`;
  });

  const inlineFmt = (s) => s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/==([^=]+)==/g, "<mark>$1</mark>")
    .replace(/!\[(.*?)\]\((https?:\/\/[^\s)]+)\)(?:\{width=(25%|50%|75%|100%) align=(left|center|right)\})?/g, (_, alt, src, width = "100%", align = "left") => `<img src="${src}" alt="${alt}" data-align="${align}" style="width:${width};max-width:100%;display:block;margin:14px ${align === "right" ? "0 0 auto" : align === "center" ? "0 auto" : "0"};border-radius:12px;" />`)
    .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');

  const lines = protectedSrc.split("\n");
  const htmlParts = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    const codeMatch = line.trim().match(/^\u0000CODEBLOCK(\d+)\u0000$/);
    if (codeMatch) {
      htmlParts.push(`<pre><code>${escapeHtml((codeBlocks[Number(codeMatch[1])] || "").trim())}</code></pre>`);
      i++; continue;
    }
    if (/^### /.test(line)) { htmlParts.push(`<h3>${inlineFmt(line.slice(4))}</h3>`); i++; continue; }
    if (/^## /.test(line)) { htmlParts.push(`<h2>${inlineFmt(line.slice(3))}</h2>`); i++; continue; }
    if (/^# /.test(line)) { htmlParts.push(`<h1>${inlineFmt(line.slice(2))}</h1>`); i++; continue; }
    if (/^> /.test(line)) { htmlParts.push(`<blockquote>${inlineFmt(line.slice(2))}</blockquote>`); i++; continue; }
    if (/^---\s*$/.test(line)) { htmlParts.push("<hr/>"); i++; continue; }
    if (/^<div align="(left|center|right|justify)">/.test(line.trim())) { htmlParts.push(line.trim()); i++; continue; }

    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(`<li>${inlineFmt(lines[i].slice(2))}</li>`); i++; }
      htmlParts.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(`<li>${inlineFmt(lines[i].replace(/^\d+\. /, ""))}</li>`); i++; }
      htmlParts.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const para = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^(#{1,3} |> |[-*] |\d+\. |---\s*$)/.test(lines[i]) &&
      !/^\u0000CODEBLOCK/.test(lines[i].trim()) &&
      !/^<div align="/.test(lines[i].trim())
    ) {
      para.push(inlineFmt(lines[i]));
      i++;
    }
    if (para.length) htmlParts.push(`<p>${para.join("<br/>")}</p>`);
  }

  return htmlParts.join("");
}

function rteElementToInline(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const tag = node.tagName.toLowerCase();
  const inner = () => Array.from(node.childNodes).map(rteElementToInline).join("");
  switch (tag) {
    case "strong": case "b": return `**${inner()}**`;
    case "em": case "i": return `*${inner()}*`;
    case "u": { const c = inner(); return c.trim() ? `<u>${c}</u>` : c; }
    case "s": case "strike": case "del": { const c = inner(); return c.trim() ? `~~${c}~~` : c; }
    case "mark": {
      const bg = node.style && node.style.backgroundColor;
      const c = inner();
      return bg ? `<mark style="background-color:${bg}">${c}</mark>` : `==${c}==`;
    }
    case "font": {
      const color = node.getAttribute("color") || (node.style && node.style.color);
      const c = inner();
      return color ? `<span style="color:${color}">${c}</span>` : c;
    }
    case "span": {
      const color = node.style && node.style.color;
      const bg = node.style && node.style.backgroundColor;
      const c = inner();
      if (bg) return `<mark style="background-color:${bg}">${c}</mark>`;
      if (color) return `<span style="color:${color}">${c}</span>`;
      return c;
    }
    case "a": {
      const href = node.getAttribute("href") || "";
      const c = inner() || href;
      return `[${c}](${href})`;
    }
    case "img": {
      const src = node.getAttribute("src") || "";
      const alt = node.getAttribute("alt") || "";
      const width = node.style?.width || "100%";
      const align = node.dataset?.align || (node.style?.marginLeft === "auto" ? "right" : "left");
      return `![${alt}](${src}){width=${width} align=${align}}`;
    }
    case "br": return "\n";
    case "code": return `\`${inner()}\``;
    case "div": {
      const align = node.getAttribute("align") || (node.style && node.style.textAlign);
      const c = inner();
      return align ? `<div align="${align}">${c}</div>` : c;
    }
    default:
      return inner();
  }
}

function rteBlockToMarkdown(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent;
    return t.trim() ? `${t}\n\n` : "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const tag = node.tagName.toLowerCase();
  switch (tag) {
    case "h1": return `# ${rteElementToInline(node)}\n\n`;
    case "h2": return `## ${rteElementToInline(node)}\n\n`;
    case "h3": return `### ${rteElementToInline(node)}\n\n`;
    case "blockquote": return `> ${rteElementToInline(node)}\n\n`;
    case "pre": return `\n\`\`\`\n${node.textContent}\n\`\`\`\n\n`;
    case "ul": {
      const items = Array.from(node.children).map((li) => `- ${rteElementToInline(li)}`).join("\n");
      return items ? `${items}\n\n` : "";
    }
    case "ol": {
      const items = Array.from(node.children).map((li, idx) => `${idx + 1}. ${rteElementToInline(li)}`).join("\n");
      return items ? `${items}\n\n` : "";
    }
    case "hr": return "---\n\n";
    case "img": return `${rteElementToInline(node)}\n\n`;
    case "p": case "div": {
      const align = node.getAttribute("align") || (node.style && node.style.textAlign);
      const content = rteElementToInline(node);
      if (!content.trim()) return "";
      if (align && align !== "left") return `<div align="${align}">${content}</div>\n\n`;
      return `${content}\n\n`;
    }
    default: {
      const content = rteElementToInline(node);
      return content.trim() ? `${content}\n\n` : "";
    }
  }
}

function htmlToMarkdown(root) {
  if (!root) return "";
  return Array.from(root.childNodes)
    .map(rteBlockToMarkdown)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function rtePlainWordCount(markdownText = "") {
  const stripped = markdownText
    .replace(/<[^>]+>/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[.*?\]\([^)]*\)/g, " ")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~`=]/g, " ")
    .replace(/^-\s|\n-\s/g, " ")
    .trim();
  return stripped ? stripped.split(/\s+/).filter(Boolean).length : 0;
}

function RteBtn({ icon: Icon, label, onClick, active = false }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      className="cpm-rte-btn"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8,
        border: "none", background: active ? "rgba(15,51,82,0.12)" : "transparent", color: active ? C.navy800 : C.ink, cursor: "pointer",
      }}
    >
      <Icon size={16} />
    </button>
  );
}

function RteSep() {
  return <div style={{ width: 1, alignSelf: "stretch", background: C.line, margin: "4px 4px" }} />;
}

function RteColorInput({ icon: Icon, label, onPick, defaultColor = "#0F3352" }) {
  const inputRef = useRef(null);
  return (
    <label
      title={label}
      className="cpm-rte-swatch"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, position: "relative" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <Icon size={16} color={C.ink} />
      <input
        ref={inputRef}
        type="color"
        defaultValue={defaultColor}
        onChange={(e) => onPick(e.target.value)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
      />
    </label>
  );
}

const RichArticleEditor = React.forwardRef(function RichArticleEditor(
  { value, onChange, placeholder, onFormatsChange, onImageSelectionChange },
  ref
) {
  const elRef = useRef(null);
  const hydratedRef = useRef(false);
  const savedRangeRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) { /* noop */ }
  }, []);

  useEffect(() => {
    if (!elRef.current || hydratedRef.current) return;
    elRef.current.innerHTML = markdownToHtml(value || "");
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitChange = useCallback(() => {
    if (!elRef.current) return;
    onChange?.(htmlToMarkdown(elRef.current));
  }, [onChange]);

  const safeState = (cmd) => {
    try { return document.queryCommandState(cmd); } catch (e) { return false; }
  };

  const updateFormats = useCallback(() => {
    if (!elRef.current || typeof document === "undefined") return;
    const sel = window.getSelection && window.getSelection();
    if (!sel || !sel.anchorNode || !elRef.current.contains(sel.anchorNode)) return;
    if (sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    let blockType = "p";
    try {
      const val = document.queryCommandValue("formatBlock");
      if (val) blockType = String(val).toLowerCase();
    } catch (e) { /* noop */ }
    onFormatsChange?.({
      bold: safeState("bold"),
      italic: safeState("italic"),
      underline: safeState("underline"),
      strike: safeState("strikeThrough"),
      ul: safeState("insertUnorderedList"),
      ol: safeState("insertOrderedList"),
      blockType,
    });
  }, [onFormatsChange]);

  useEffect(() => {
    document.addEventListener("selectionchange", updateFormats);
    return () => document.removeEventListener("selectionchange", updateFormats);
  }, [updateFormats]);

  const exec = (cmd, val = null) => {
    elRef.current?.focus();
    try { document.execCommand(cmd, false, val); } catch (e) { /* noop */ }
    emitChange();
    updateFormats();
  };

  useImperativeHandle(ref, () => ({
    focus: () => elRef.current?.focus(),
    exec,
    formatBlock: (tag) => exec("formatBlock", tag),
    undo: () => exec("undo"),
    redo: () => exec("redo"),
    clearFormat: () => exec("removeFormat"),
    setColor: (color) => exec("foreColor", color),
    insertText: (str) => {
      elRef.current?.focus();
      try { document.execCommand("insertText", false, str); } catch (e) { /* noop */ }
      emitChange();
    },
    insertLink: (url, fallbackLabel) => {
      elRef.current?.focus();
      const sel = window.getSelection && window.getSelection();
      const label = sel && sel.toString() ? sel.toString() : (fallbackLabel || url);
      try { document.execCommand("insertHTML", false, `<a href="${url}" target="_blank" rel="noreferrer noopener">${escapeHtml(label)}</a>`); } catch (e) { /* noop */ }
      emitChange();
    },
    insertImageDataUrl: (dataUrl) => {
      if (savedRangeRef.current) {
        const selection = window.getSelection?.();
        selection?.removeAllRanges();
        selection?.addRange(savedRangeRef.current);
      }
      elRef.current?.focus();
      try { document.execCommand("insertHTML", false, `<img src="${dataUrl}" alt="" style="max-width:100%;display:block;margin:14px 0;border-radius:12px;" /><p><br/></p>`); } catch (e) { /* noop */ }
      emitChange();
    },
    clearSelectedImage: () => {
      if (!selectedImage) return;
      selectedImage.remove();
      setSelectedImage(null);
      emitChange();
    },
    updateSelectedImage: ({ width, align, alt } = {}) => {
      if (!selectedImage) return;
      if (width) selectedImage.style.width = width;
      if (align) {
        selectedImage.style.marginLeft = align === "left" ? "0" : "auto";
        selectedImage.style.marginRight = align === "right" ? "0" : "auto";
        selectedImage.dataset.align = align;
      }
      if (typeof alt === "string") selectedImage.alt = alt;
      onImageSelectionChange?.({ width: selectedImage.style.width || "100%", align: selectedImage.dataset.align || "left", alt: selectedImage.alt || "" });
      emitChange();
    },
    insertDivider: () => {
      elRef.current?.focus();
      try { document.execCommand("insertHTML", false, "<hr/><p><br/></p>"); } catch (e) { /* noop */ }
      emitChange();
    },
    insertCodeBlock: () => {
      elRef.current?.focus();
      const sel = window.getSelection && window.getSelection();
      const text = sel && sel.toString() ? sel.toString() : "code";
      try { document.execCommand("insertHTML", false, `<pre><code>${escapeHtml(text)}</code></pre><p><br/></p>`); } catch (e) { /* noop */ }
      emitChange();
    },
    insertHighlight: (color = "#F6D374") => {
      elRef.current?.focus();
      const sel = window.getSelection && window.getSelection();
      const text = sel && sel.toString() ? sel.toString() : "texte surligné";
      try { document.execCommand("insertHTML", false, `<mark style="background-color:${color}">${escapeHtml(text)}</mark>`); } catch (e) { /* noop */ }
      emitChange();
    },
    setAlign: (align) => {
      elRef.current?.focus();
      const sel = window.getSelection && window.getSelection();
      const text = sel && sel.toString() ? sel.toString() : "";
      if (!text) return;
      try { document.execCommand("insertHTML", false, `<div align="${align}">${escapeHtml(text)}</div>`); } catch (e) { /* noop */ }
      emitChange();
    },
    getMarkdown: () => (elRef.current ? htmlToMarkdown(elRef.current) : ""),
  }), [selectedImage, onImageSelectionChange, emitChange]);

  return (
    <div
      ref={elRef}
      className="cpm-rte"
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onInput={emitChange}
      onClick={(event) => {
        const image = event.target.closest?.("img");
        const nextImage = image && elRef.current?.contains(image) ? image : null;
        setSelectedImage(nextImage);
        onImageSelectionChange?.(nextImage ? { width: nextImage.style.width || "100%", align: nextImage.dataset.align || "left", alt: nextImage.alt || "" } : null);
      }}
      onKeyUp={updateFormats}
      onMouseUp={updateFormats}
      onBlur={emitChange}
    />
  );
});

/* ------------------------------------------------------------------ */
/*  SÉLECTEUR DE VISIBILITÉ                                            */
/* ------------------------------------------------------------------ */
const VISIBILITY_OPTIONS = [
  { id: "Public", label: "Public", desc: "Tout le monde sur LynoraLink", icon: Globe },
  { id: "Abonnés", label: "Abonnés", desc: "Les abonnés de votre page", icon: Users },
  { id: "Relations", label: "Relations uniquement", desc: "Vos relations directes", icon: Users },
  { id: "Privé", label: "Privé", desc: "Visible par vous seul", icon: Lock },
];

function VisibilityPicker({ value, onChange, variant = "chip", locked = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = VISIBILITY_OPTIONS.find((o) => o.id === value) || VISIBILITY_OPTIONS[0];

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  /* --- Variante "inline" utilisée dans la section utilisateur --- */
  if (variant === "inline") {
    return (
      <div ref={ref} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => !locked && setOpen((v) => !v)}
          disabled={locked}
          className="cpm-chip"
          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: C.ink, background: C.navy50, border: `1px solid ${C.navy100}`, cursor: locked ? "default" : "pointer", padding: "3px 8px 3px 7px", marginTop: 3, borderRadius: 6 }}
        >
          <current.icon size={12} /> {current.label}
          {!locked && <ChevronDown size={11} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }} />}
        </button>
        {open && !locked && (
          <div className="cpm-fade" style={{ position: "absolute", top: 30, left: 0, background: C.white, border: `1px solid ${C.line}`, borderRadius: "12px", boxShadow: "0 12px 32px rgba(15,51,82,0.18)", zIndex: 20, minWidth: 230, overflow: "hidden" }}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <div
                key={opt.id}
                onClick={() => { onChange?.(opt.id); setOpen(false); }}
                style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", cursor: "pointer", background: opt.id === value ? C.navy50 : "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)}
                onMouseLeave={(e) => (e.currentTarget.style.background = opt.id === value ? C.navy50 : "transparent")}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: C.white, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <opt.icon size={13} color={C.navy800} />
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: C.mutedLight }}>{opt.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* --- Variante "pill" utilisée dans le footer --- */
  if (variant === "pill") {
    return (
      <div ref={ref} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="cpm-chip"
          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: C.navy800, background: C.navy50, border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 14px", cursor: "pointer" }}
        >
          <current.icon size={14} /> {current.label}
          <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }} />
        </button>
        {open && (
          <div className="cpm-fade" style={{ position: "absolute", bottom: 42, left: 0, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, boxShadow: "0 12px 32px rgba(15,51,82,0.18)", zIndex: 20, minWidth: 230, overflow: "hidden" }}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <div
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", cursor: "pointer", background: opt.id === value ? C.navy50 : "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)}
                onMouseLeave={(e) => (e.currentTarget.style.background = opt.id === value ? C.navy50 : "transparent")}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: C.white, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <opt.icon size={13} color={C.navy800} />
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: C.mutedLight }}>{opt.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* --- Variante "chip" par défaut (ancien comportement) --- */
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cpm-chip"
        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: C.muted, background: C.navy50, border: "none", borderRadius: 7, padding: "3px 9px 3px 7px", cursor: "pointer", marginTop: 3 }}
      >
        <current.icon size={11} /> {current.label} <ChevronDown size={11} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }} />
      </button>
      {open && (
        <div className="cpm-fade" style={{ position: "absolute", top: 30, left: 0, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, boxShadow: "0 12px 32px rgba(15,51,82,0.18)", zIndex: 20, minWidth: 230, overflow: "hidden" }}>
          {VISIBILITY_OPTIONS.map((opt) => (
            <div
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", cursor: "pointer", background: opt.id === value ? C.navy50 : "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)}
              onMouseLeave={(e) => (e.currentTarget.style.background = opt.id === value ? C.navy50 : "transparent")}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, background: C.white, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <opt.icon size={13} color={C.navy800} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: C.mutedLight }}>{opt.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HUMEUR — sélecteur "Comment vous sentez-vous ?"                    */
/* ------------------------------------------------------------------ */
const MOOD_OPTIONS = [
  { emoji: "😊", label: "Heureux(se)" },
  { emoji: "🥳", label: "En fête" },
  { emoji: "😍", label: "Amoureux(se)" },
  { emoji: "🤩", label: "Enthousiaste" },
  { emoji: "😌", label: "Serein(e)" },
  { emoji: "💪", label: "Motivé(e)" },
  { emoji: "🙏", label: "Reconnaissant(e)" },
  { emoji: "🤔", label: "Pensif(ve)" },
  { emoji: "😴", label: "Fatigué(e)" },
  { emoji: "😔", label: "Triste" },
  { emoji: "😎", label: "Cool" },
  { emoji: "🚀", label: "Productif(ve)" },
];

function MoodPicker({ value, onChange, placement = "bottom" }) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({ top: 0, left: 0, width: 320 });
  const ref = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12);
    const top = placement === "top" ? Math.max(12, rect.top - 12 - 240) : Math.min(window.innerHeight - 12 - 220, rect.bottom + 12);
    setPopoverStyle({ top, left, width });
  }, [open, placement, value]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {value ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="cpm-media-opt"
          title={`Humeur : se sent ${value.label}`}
          aria-label={`Humeur : se sent ${value.label}`}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", border: "none", background: C.gold600, cursor: "pointer", color: C.navy900, flexShrink: 0, boxShadow: "0 4px 12px rgba(15,51,82,0.16)", position: "relative" }}
        >
          <span style={{ fontSize: 17, lineHeight: 1 }}>{value.emoji}</span>
          <span
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            aria-label="Retirer l'humeur"
            style={{ position: "absolute", top: -4, right: -4, display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: 999, background: C.navy900, color: C.white, cursor: "pointer" }}
          >
            <X size={9} />
          </span>
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="cpm-media-opt"
          title="Humeur"
          aria-label="Ajouter une humeur"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", border: "none", background: C.gold600, cursor: "pointer", color: C.navy900, flexShrink: 0, boxShadow: "0 4px 12px rgba(15,51,82,0.16)" }}
        >
          <FontAwesomeIcon icon={faFaceSmile} style={{ fontSize: 17 }} />
        </button>
      )}

      {open && (
        <div className="cpm-fade" style={{ position: "fixed", top: popoverStyle.top, left: popoverStyle.left, width: popoverStyle.width, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, boxShadow: "0 14px 34px rgba(15,51,82,0.2)", zIndex: 9999, padding: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.mutedLight, textTransform: "uppercase", letterSpacing: 0.4, padding: "2px 4px 8px" }}>Comment vous sentez-vous ?</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 4 }}>
            {MOOD_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "8px 9px", borderRadius: 9, border: "none",
                  background: value?.label === opt.label ? C.navy50 : "transparent", cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.navy50)}
                onMouseLeave={(e) => (e.currentTarget.style.background = value?.label === opt.label ? C.navy50 : "transparent")}
              >
                <span style={{ fontSize: 15 }}>{opt.emoji}</span>
                <span style={{ fontSize: 12, color: C.ink, fontWeight: 600, whiteSpace: "nowrap" }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IdentifierPicker({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [popoverStyle, setPopoverStyle] = useState({ top: 0, left: 0, width: 290 });
  const ref = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open || users.length > 0) return;
    let active = true;
    setLoading(true);
    setError("");
    fetchBackendApi("/api/users")
      .then((response) => {
        if (!response.ok) throw new Error("Impossible de charger les membres");
        return response.json();
      })
      .then((data) => {
        if (active) setUsers(Array.isArray(data.users) ? data.users : []);
      })
      .catch(() => {
        if (active) setError("Les membres ne sont pas disponibles pour le moment.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [open, users.length]);

  useEffect(() => {
    const onDocClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(290, window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12);
    const top = Math.max(12, rect.top - 12 - 220);
    setPopoverStyle({ top, left, width });
  }, [open, value.length]);

  const toggleUser = (user) => {
    const selected = value.some((item) => item.id === user.id);
    onChange(selected ? value.filter((item) => item.id !== user.id) : [...value, user]);
  };

  const filteredUsers = users.filter((user) =>
    (user.name || "").toLowerCase().includes(query.trim().toLowerCase()) ||
    (user.title || "").toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="cpm-media-opt"
        title={value.length ? `${value.length} personne${value.length > 1 ? "s" : ""} identifiée${value.length > 1 ? "s" : ""}` : "Identifier des personnes"}
        aria-label={value.length ? `${value.length} personne${value.length > 1 ? "s" : ""} identifiée${value.length > 1 ? "s" : ""}` : "Identifier des personnes"}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", border: "none", background: value.length ? C.navy800 : C.navy700, cursor: "pointer", color: C.white, flexShrink: 0, boxShadow: "0 4px 12px rgba(15,51,82,0.16)", position: "relative" }}
      >
        <FontAwesomeIcon icon={faUserPlus} style={{ fontSize: 17 }} />
        {value.length > 0 && <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, padding: "0 3px", borderRadius: 999, background: C.gold600, color: C.navy900, fontSize: 9, fontWeight: 800, lineHeight: "16px" }}>{value.length}</span>}
      </button>

      {open && (
        <div className="cpm-fade" style={{ position: "fixed", top: popoverStyle.top, left: popoverStyle.left, width: popoverStyle.width, background: C.white, border: `1px solid ${C.line}`, borderRadius: 14, boxShadow: "0 14px 34px rgba(15,51,82,0.2)", zIndex: 9999, padding: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.ink, margin: "2px 4px 8px" }}>Identifier des membres</div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un membre..."
            autoFocus
            style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 10px", outline: "none", fontSize: 12.5, color: C.ink, marginBottom: 8 }}
          />
          <div style={{ maxHeight: 190, overflowY: "auto" }}>
            {loading && <div style={{ padding: "12px 8px", color: C.muted, fontSize: 12 }}>Chargement des membres...</div>}
            {error && <div style={{ padding: "8px", color: C.danger, fontSize: 12 }}>{error}</div>}
            {!loading && !error && filteredUsers.length === 0 && <div style={{ padding: "12px 8px", color: C.muted, fontSize: 12 }}>Aucun membre trouvé.</div>}
            {!loading && !error && filteredUsers.map((user) => {
              const selected = value.some((item) => item.id === user.id);
              const initials = (user.name || "U").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 6px", border: "none", borderRadius: 9, background: selected ? C.navy50 : "transparent", cursor: "pointer", textAlign: "left" }}
                >
                  <Avatar initials={initials} size={30} imgUrl={user.image || null} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.ink, fontSize: 12.5, fontWeight: 700 }}>{user.name || "Utilisateur"}</span>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.mutedLight, fontSize: 11 }}>{user.title || "Membre LynoraLink"}</span>
                  </span>
                  {selected && <span style={{ color: C.success, fontSize: 12, fontWeight: 800 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EMOJI — sélecteur rapide inséré dans le texte au curseur           */
/* ------------------------------------------------------------------ */
function EmojiPicker({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Insérer un emoji"
        className="cpm-icon-btn"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, border: `1px solid ${C.line}`, background: open ? C.navy50 : "transparent", cursor: "pointer" }}
      >
        <Smile size={15} color={C.gold600} />
      </button>

      {open && (
        <div className="cpm-fade emoji-picker-popover" style={{ position: "absolute", bottom: 42, right: 0, zIndex: 20 }}>
          <Emojipicker
            onSelect={(emoji) => { onSelect(emoji); setOpen(false); }}
            size={32}
            columns={7}
            theme="light"
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAGS — mots-clés attachés à la publication                        */
/* ------------------------------------------------------------------ */
const MAX_TAGS = 8;

function normalizeTag(raw) {
  return raw.trim().replace(/^#+/, "").replace(/\s+/g, "-").slice(0, 28);
}

function TagInput({ tags, onChange, compact = false }) {
  const [draft, setDraft] = useState("");

  const addTag = (raw) => {
    const clean = normalizeTag(raw);
    if (!clean) return;
    if (tags.length >= MAX_TAGS) return;
    if (tags.some((t) => t.toLowerCase() === clean.toLowerCase())) { setDraft(""); return; }
    onChange([...tags, clean]);
    setDraft("");
  };

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  if (compact) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        {tags.map((tag) => (
          <span
            key={tag}
            className="cpm-chip"
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 6px 4px 10px", borderRadius: 999, background: C.navy50, color: C.navy800, fontSize: 12, fontWeight: 600 }}
          >
            <Hash size={10} />{tag}
            <span
              role="button"
              tabIndex={-1}
              onClick={() => removeTag(tag)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: 999, background: "rgba(15,51,82,0.08)", cursor: "pointer" }}
            >
              <X size={10} />
            </span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.mutedLight, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
        <Hash size={11} /> Tags {tags.length > 0 && <span style={{ fontWeight: 600, color: C.mutedLight, textTransform: "none", letterSpacing: 0 }}>({tags.length}/{MAX_TAGS})</span>}
      </div>
      <div
        style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "8px 10px",
          borderRadius: 12, border: `1px solid ${C.line}`, background: C.navy50,
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="cpm-chip"
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 6px 4px 10px", borderRadius: 999, background: C.navy50, color: C.navy800, fontSize: 12, fontWeight: 600 }}
          >
            <Hash size={10} />{tag}
            <span
              role="button"
              tabIndex={-1}
              onClick={() => removeTag(tag)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: 999, background: "rgba(15,51,82,0.08)", cursor: "pointer" }}
            >
              <X size={10} />
            </span>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => draft && addTag(draft)}
          placeholder={tags.length === 0 ? "Ajoutez un tag et appuyez sur Entrée…" : "Ajouter…"}
          disabled={tags.length >= MAX_TAGS}
          style={{ flex: 1, minWidth: 120, border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: C.ink, padding: "4px 2px" }}
        />
        {draft && (
          <button
            type="button"
            onClick={() => addTag(draft)}
            style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 8px", borderRadius: 8, border: "none", background: C.navy800, color: C.white, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            <Plus size={11} /> Ajouter
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TUILE MÉDIA — miniature, progression, réordonnancement             */
/* ------------------------------------------------------------------ */
function ProgressRing({ progress = 0, size = 34 }) {
  const deg = Math.max(0, Math.min(100, progress)) * 3.6;
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: `conic-gradient(${C.gold400} ${deg}deg, rgba(255,255,255,0.28) ${deg}deg)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{ width: size - 8, height: size - 8, borderRadius: "50%", background: "rgba(15,36,51,0.85)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color: C.white }}>
        {progress}%
      </div>
    </div>
  );
}

function MediaTile({
  item, index, isCover, isSingle, onRemove, onRetry,
  onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDropTarget,
}) {
  const isVideo = item.type === "video";
  return (
    <div
      className="cpm-tile"
      draggable={item.status === "done"}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      style={{
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        border: `1.5px solid ${isDropTarget ? C.gold600 : C.line}`,
        background: C.navy50,
        aspectRatio: isSingle ? undefined : "1 / 1",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: isDragging ? 0.35 : 1,
        transform: isDropTarget ? "scale(1.02)" : "scale(1)",
        transition: "transform 150ms ease, border-color 150ms ease, opacity 150ms ease",
      }}
    >
      {isVideo ? (
        <video src={item.previewUrl} muted style={{ width: isSingle ? "auto" : "100%", maxWidth: "100%", height: isSingle ? "auto" : "100%", maxHeight: isSingle ? 520 : "100%", objectFit: "contain", display: "block", background: "#000" }} />
      ) : (
        <img src={item.previewUrl} alt={item.name} style={{ width: isSingle ? "auto" : "100%", maxWidth: "100%", height: isSingle ? "auto" : "100%", maxHeight: isSingle ? 520 : "100%", objectFit: "contain", display: "block" }} />
      )}

      {/* Voile dégradé bas pour lisibilité des badges */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 100%)", pointerEvents: "none" }} />

      {isVideo && item.status === "done" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PlayCircle size={isSingle ? 46 : 28} color="rgba(255,255,255,0.92)" strokeWidth={1.5} />
        </div>
      )}

      {/* Poignée de réordonnancement */}
      {item.status === "done" && (
        <div className="cpm-tile-drag" style={{ position: "absolute", top: 8, left: 8, width: 26, height: 26, borderRadius: 8, background: "rgba(15,36,51,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <GripVertical size={13} color={C.white} />
        </div>
      )}

      {/* Badge "couverture" */}
      {isCover && item.status === "done" && (
        <div className="cpm-tile-cover-badge" style={{ position: "absolute", top: 8, left: item.status === "done" ? 40 : 8, padding: "3px 8px", borderRadius: 999, background: goldGrad, fontSize: 9.5, fontWeight: 800, color: C.navy900, letterSpacing: 0.2 }}>
          COUVERTURE
        </div>
      )}

      {/* Bouton de suppression */}
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="cpm-tile-remove"
        style={{ position: "absolute", top: 8, right: 8, zIndex: 2, background: "rgba(15,36,51,0.6)", border: "none", borderRadius: 999, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <X size={14} color={C.white} />
      </button>

      {/* État d'envoi */}
      {item.status === "uploading" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(15,36,51,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ProgressRing progress={item.progress} size={isSingle ? 46 : 36} />
        </div>
      )}

      {/* État d'erreur */}
      {item.status === "error" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(194,68,68,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 8, textAlign: "center" }}>
          <AlertCircle size={20} color={C.white} />
          <span style={{ fontSize: 10.5, color: C.white, fontWeight: 600, lineHeight: 1.3 }}>{item.error || "Échec de l'envoi"}</span>
          <button
            type="button"
            onClick={() => onRetry(item.id)}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 999, padding: "4px 10px", color: C.white, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}
          >
            <RotateCcw size={11} /> Réessayer
          </button>
        </div>
      )}

      {/* Nom de fichier discret sur la tuile héro */}
      {isSingle && item.status === "done" && (
        <div style={{ position: "absolute", bottom: 8, left: 10, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.9)", maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.name}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MODALE DE CRÉATION DE PUBLICATION — restructurée                   */
/* ------------------------------------------------------------------ */
const MODE_TABS = [
  { id: "post", label: "Publication", icon: MessageSquare },
  { id: "article", label: "Article", icon: Pencil },
  { id: "reel", label: "Reel", icon: Video },
  { id: "visuelfocus", label: "VisuelFocus", icon: Sparkles },
];

const MEDIA_BAR_OPTIONS = [
  { id: "photo", label: "Photo", icon: faPhotoFilm, accept: "image/*", color: "#2E9E5B" },
  { id: "video", label: "Vidéo", icon: faVideo, accept: "video/*", color: "#C24444" },
  { id: "reel", label: "Reel", icon: faVideo, action: "reel", color: "#C24444" },
  { id: "article", label: "Article", icon: faNewspaper, action: "article", color: "#1B5386" },
  { id: "visualfocus", label: "VisualFocus", icon: faWandSparkles, action: "visuelfocus", color: "#D9A536" },
];

export default function CreatePostModal({
  initialMode = "post",
  initialText = "",
  initialArticleTitle = "",
  initialArticleExcerpt = "",
  initialMedia = [],
  initialVisibility = "Public",
  initialMood = null,
  initialIdentifiedUsers = [],
  initialTags = [],
  isEditing = false,
  onClose,
  onPublish,
  onOpenVisualFocus,
  currentUser = { name: "Utilisateur", title: "Membre LynoraLink", avatar: "U", avatarUrl: null },
  modalStyle,
  group = null,
}) {
  const [mode, setMode] = useState(initialMode === "article" ? "article" : initialMode === "reel" ? "reel" : initialMode === "visuelfocus" ? "visuelfocus" : "post");
  const [text, setText] = useState(initialText);
  const [articleTitle, setArticleTitle] = useState(initialArticleTitle);
  const [articleExcerpt, setArticleExcerpt] = useState(initialArticleExcerpt);
  const [reelSound, setReelSound] = useState("");
  const [media, setMedia] = useState(() => (Array.isArray(initialMedia) ? initialMedia : []).map((item, index) => ({
    ...item,
    id: item.id || `initial-media-${index}`,
    previewUrl: item.previewUrl || item.url,
    status: item.status || "done",
  })));
  const [visibility, setVisibility] = useState(initialVisibility);
  const [mood, setMood] = useState(initialMood);
  const [identifiedUsers, setIdentifiedUsers] = useState(initialIdentifiedUsers);
  const [tags, setTags] = useState(initialTags);
  const [commentsLocked, setCommentsLocked] = useState(false);
  const [commentatorsLimit, setCommentatorsLimit] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const groupVisibility = group?.privacy === "private" ? "Privé" : group ? "Public" : visibility;

  const dragIndexRef = useRef(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const reelVideoInputRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInsertRef = useRef(null);
  const dragCounterRef = useRef(0);
  const xhrRegistry = useRef({});
  const richEditorRef = useRef(null);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false, strike: false, ul: false, ol: false, blockType: "p" });
  const [selectedArticleImage, setSelectedArticleImage] = useState(null);

  const isArticle = mode === "article";
  const isReel = mode === "reel";
  const isVisuelfocus = mode === "visuelfocus";
  const words = isArticle ? rtePlainWordCount(text) : (text.trim() ? text.trim().split(/\s+/).length : 0);
  const estMinutes = Math.max(1, Math.round(words / 200));
  const isUploading = media.some((m) => m.status === "uploading");

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const styleTag = document.createElement("style");
    styleTag.setAttribute("data-create-post-modal", "true");
    styleTag.textContent = CREATE_POST_MODAL_CSS;
    document.head.appendChild(styleTag);
    return () => styleTag.remove();
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => () => {
    media.forEach((m) => m.previewUrl && URL.revokeObjectURL(m.previewUrl));
  }, []);

  /* ---------------------------- Ingestion des fichiers ---------------------------- */
  const startUpload = useCallback((item, file) => {
    const signalRef = { current: null };
    xhrRegistry.current[item.id] = signalRef;

    uploadFileWithProgress(file, {
      onProgress: (progress) => {
        setMedia((prev) => prev.map((m) => (m.id === item.id ? { ...m, progress } : m)));
      },
      signalRef,
    })
      .then((data) => {
        setMedia((prev) => prev.map((m) => (m.id === item.id ? { ...m, url: data.url, fallback: data.fallback, status: "done", progress: 100 } : m)));
      })
      .catch((err) => {
        if (err.message === "__aborted__") return;
        setMedia((prev) => prev.map((m) => (m.id === item.id ? { ...m, status: "error", error: err.message } : m)));
      })
      .finally(() => {
        delete xhrRegistry.current[item.id];
      });
  }, []);

  const ingestFiles = useCallback((fileList) => {
    const incomingFiles = Array.from(fileList || []);
    if (!incomingFiles.length) return;

    setGlobalError("");

    const roomLeft = MAX_FILES - media.length;
    if (roomLeft <= 0) {
      setGlobalError(`Vous pouvez ajouter jusqu'à ${MAX_FILES} médias par publication.`);
      return;
    }

    const toProcess = incomingFiles.slice(0, roomLeft);
    if (incomingFiles.length > roomLeft) {
      setGlobalError(`Seuls ${roomLeft} média${roomLeft > 1 ? "s" : ""} supplémentaire${roomLeft > 1 ? "s" : ""} ${roomLeft > 1 ? "ont" : "a"} été ajouté${roomLeft > 1 ? "s" : ""} (limite : ${MAX_FILES}).`);
    }

    const validationErrors = [];
    const validFiles = [];
    toProcess.forEach((file) => {
      const err = validateFile(file);
      if (err) validationErrors.push(err);
      else validFiles.push(file);
    });

    if (validationErrors.length) {
      setGlobalError((prev) => [prev, ...validationErrors].filter(Boolean).join(" · "));
    }
    if (!validFiles.length) return;

    const newItems = validFiles.map((file) => ({
      id: uid(),
      type: fileKind(file),
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      progress: 0,
      status: "uploading",
      error: null,
      _file: file,
    }));

    setMedia((prev) => [...prev, ...newItems]);
    newItems.forEach((item) => startUpload(item, item._file));
  }, [media.length, startUpload]);

  /**
   * Ingestion dédiée au Reel : un seul fichier, exclusivement vidéo.
   * Toute vidéo déjà présente est annulée (upload en cours interrompu) et remplacée.
   */
  const ingestReelVideo = useCallback((fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    setGlobalError("");

    const file = incoming[0];
    if (fileKind(file) !== "video") {
      setGlobalError("Un reel doit être une vidéo (MP4, MOV ou WEBM).");
      return;
    }
    const err = validateFile(file);
    if (err) {
      setGlobalError(err);
      return;
    }

    setMedia((prev) => {
      prev.forEach((item) => {
        const signalRef = xhrRegistry.current[item.id];
        if (signalRef?.current) signalRef.current.abort();
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });

    const newItem = {
      id: uid(),
      type: "video",
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      progress: 0,
      status: "uploading",
      error: null,
      _file: file,
    };
    setMedia([newItem]);
    startUpload(newItem, file);
  }, [startUpload]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const openImagePicker = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const openReelVideoPicker = useCallback(() => {
    reelVideoInputRef.current?.click();
  }, []);

  const handleReelVideoInputChange = (e) => {
    ingestReelVideo(e.target.files);
    e.target.value = "";
  };

  const handleFileInputChange = (e) => {
    ingestFiles(e.target.files);
    e.target.value = "";
  };

  const removeMedia = (id) => {
    const signalRef = xhrRegistry.current[id];
    if (signalRef?.current) signalRef.current.abort();
    setMedia((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((m) => m.id !== id);
    });
  };

  const retryMedia = (id) => {
    setMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (!item?._file) return prev;
      startUpload({ ...item, progress: 0 }, item._file);
      return prev.map((m) => (m.id === id ? { ...m, status: "uploading", progress: 0, error: null } : m));
    });
  };

  /* ---------------------------- Glisser-déposer global ---------------------------- */
  const onBodyDragEnter = (e) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer?.types?.includes("Files")) setDragActive(true);
  };
  const onBodyDragOver = (e) => e.preventDefault();
  const onBodyDragLeave = (e) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDragActive(false);
    }
  };
  const onBodyDrop = (e) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragActive(false);
    if (e.dataTransfer?.files?.length) {
      if (isReel) ingestReelVideo(e.dataTransfer.files);
      else ingestFiles(e.dataTransfer.files);
    }
  };

  const onPaste = (e) => {
    const files = Array.from(e.clipboardData?.files || []);
    if (files.length) {
      if (isReel) ingestReelVideo(files);
      else ingestFiles(files);
    }
  };

  /* ---------------------------- Réordonnancement des tuiles ---------------------------- */
  const handleTileDragStart = (e, index) => {
    dragIndexRef.current = index;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleTileDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndexRef.current === null || dragIndexRef.current === index) return;
    setDropTargetIndex(index);
  };
  const handleTileDrop = (e, index) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === index) {
      setDraggingIndex(null);
      setDropTargetIndex(null);
      return;
    }
    setMedia((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndexRef.current = null;
    setDraggingIndex(null);
    setDropTargetIndex(null);
  };
  const handleTileDragEnd = () => {
    dragIndexRef.current = null;
    setDraggingIndex(null);
    setDropTargetIndex(null);
  };

  /* ---------------------------- Édition enrichie (article, mode texte simple) ---------------------------- */
  const applyToTextarea = (mutator) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const result = mutator(text, start, end);
    setText(result.text);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = result.selStart;
      ta.selectionEnd = result.selEnd;
    });
  };

  const insertLink = () => {
    const url = window.prompt("URL du lien", "https://");
    if (!url) return;
    richEditorRef.current?.insertLink(url);
  };

  const insertImageFromComputer = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const validationError = validateFile(file);
    if (validationError) {
      setGlobalError(validationError);
      return;
    }
    setGlobalError("");
    try {
      const uploaded = await uploadFileWithProgress(file);
      richEditorRef.current?.insertImageDataUrl(uploaded.url);
    } catch (error) {
      setGlobalError(error.message || "Impossible d'ajouter l'image à l'article.");
    }
  };

  const updateArticleImage = (changes) => {
    richEditorRef.current?.updateSelectedImage(changes);
    setSelectedArticleImage((current) => current ? { ...current, ...changes } : current);
  };

  const insertEmoji = (emoji) => {
    if (isArticle) {
      richEditorRef.current?.insertText(emoji);
      return;
    }
    applyToTextarea((t, start, end) => {
      const newText = t.slice(0, start) + emoji + t.slice(end);
      const pos = start + emoji.length;
      return { text: newText, selStart: pos, selEnd: pos };
    });
  };

  const canPublish = useMemo(() => {
    if (isUploading) return false;
    if (isArticle) return articleTitle.trim().length > 0 && text.trim().length > 20;
    if (isReel) {
      const videoCount = media.filter((item) => item.type === "video" && item.status === "done").length;
      return videoCount > 0 && (text.trim().length > 0 || reelSound.trim().length > 0);
    }
    return text.trim().length > 0 || media.length > 0;
  }, [isArticle, isReel, articleTitle, text, media, isUploading, reelSound]);

  const publishDisabledReason = useMemo(() => {
    if (submitting) return "Publication en cours…";
    if (isUploading) return "Attendez la fin de l'envoi des médias.";
    if (isArticle) {
      if (!articleTitle.trim()) return "Ajoutez un titre pour publier l'article.";
      if (text.trim().length <= 20) return "Rédigez au moins 20 caractères dans le corps de l'article.";
      return "";
    }
    if (isReel) {
      const videoCount = media.filter((item) => item.type === "video" && item.status === "done").length;
      if (videoCount === 0) return "Ajoutez une vidéo pour publier votre reel.";
      if (!text.trim() && !reelSound.trim()) return "Ajoutez une légende ou un son pour votre reel.";
      return "";
    }
    if (!text.trim() && media.length === 0) return "Ajoutez un message ou un média pour publier.";
    return "";
  }, [isArticle, isReel, articleTitle, text, media, isUploading, submitting, reelSound]);

  const handlePublish = async () => {
    if (!canPublish || submitting) return;
    setSubmitting(true);
    try {
      await onPublish?.({
        mode,
        text,
        articleTitle,
        articleExcerpt,
        visibility: groupVisibility,
        mood,
        identifiedUsers,
        tags,
        commentsLocked,
        commentatorsLimit,
        reelSound,
        media: media
          .filter((m) => m.status === "done")
          .map((m) => ({ id: m.id, type: m.type, url: m.url, fallback: m.fallback, name: m.name })),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMediaBarClick = (option) => {
    if (option.action === "article") {
      setMode("article");
      return;
    }
    if (option.action === "reel") {
      setMode("reel");
      return;
    }
    if (option.action === "visuelfocus") {
      onOpenVisualFocus?.();
      return;
    }
    if (option.accept === "image/*") {
      imageInputRef.current?.click();
    } else if (option.accept === "video/*") {
      videoInputRef.current?.click();
    }
  };

  const doneCount = media.filter((m) => m.status === "done").length;
  const uploadingCount = media.filter((m) => m.status === "uploading").length;

  return (
    <div
      className="cpm-overlay"
      style={{ position: "fixed", inset: 0, background: "rgba(15,51,82,0.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 16 }}
      onClick={onClose}
    >
      <div
        className="cpm-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: isArticle ? 720 : 552, maxHeight: "90vh", background: C.white, borderRadius: 12,
          display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(15,51,82,0.42), 0 2px 0 rgba(255,255,255,0.6) inset",
          position: "relative", fontFamily: "'Inter', sans-serif", border: `1px solid rgba(15,51,82,0.06)`,
        }}
      >
        {/* ================================================================== */}
        {/* EN-TÊTE : Onglets centrés + bouton fermer                        */}
        {/* ================================================================== */}
        {group && (
          <div style={{ margin: "16px 20px 0" }}>
            <div
              className="cpm-group-banner"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: "11px 14px",
                borderRadius: 16,
                background: `linear-gradient(0deg, ${C.navy50}, ${C.navy50}), ${C.white}`,
                border: `1px solid ${C.navy100}`,
              }}
            >
              {/* Miniature de couverture du groupe */}
              <div
                aria-label={`Couverture de ${group.name}`}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  overflow: "hidden",
                  position: "relative",
                  flexShrink: 0,
                  background: group.coverGradient || navyGrad,
                  backgroundImage: group.coverUrl ? `linear-gradient(180deg, rgba(15,51,82,0.1), rgba(15,51,82,0.38)), url(${group.coverUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  boxShadow: "0 4px 10px rgba(15,51,82,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!group.coverUrl && (
                  <span style={{ fontSize: 19, lineHeight: 1 }}>{group.emoji || "👥"}</span>
                )}
              </div>

              {/* Nom du groupe + repère "vous publiez dans" */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 700, color: C.gold600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
                  <Users size={11} /> Vous publiez dans
                </div>
                <div
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    fontSize: 16,
                    fontWeight: 800,
                    color: C.ink,
                    lineHeight: 1.25,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {group.name}
                </div>
              </div>

              {/* Badge de confidentialité du groupe */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  flexShrink: 0,
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: C.white,
                  border: `1px solid ${C.line}`,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: C.navy700,
                  boxShadow: "0 1px 2px rgba(15,51,82,0.04)",
                }}
              >
                {group.privacy === "private" ? <Lock size={12} /> : <Globe size={12} />}
                {group.privacy === "private" ? "Privé" : "Public"}
              </div>
            </div>
          </div>
        )}
        {/* ================================================================== */}
        {/* EN-TÊTE FAÇON FACEBOOK : titre centré + ✕ en haut à droite,   */}
        {/* puis onglets pleine largeur avec soulignement de l'onglet actif.   */}
        {/* ================================================================== */}
        <div
          className="cpm-header"
          style={{
            display: "grid",
            gridTemplateColumns: "36px 1fr 36px",
            alignItems: "center",
            padding: "12px 16px 8px",
            borderBottom: `1px solid ${C.line}`,
            background: C.white,
          }}
        >
          <span aria-hidden="true" />
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <span
              className="cpm-title"
              style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: "-0.01em" }}
            >
              {isEditing ? "Modifier la publication" : "Créer une publication"}
            </span>
            {group && (
              <div style={{ fontSize: 11.5, fontWeight: 600, color: C.gold600, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                → {group.name}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="cpm-close-btn"
            style={{ background: C.navy50, border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.muted, flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Onglets pleine largeur — soulignement de l'onglet actif façon Facebook */}
        <div
          className="cpm-mode-tabs"
          style={{ display: "flex", alignItems: "stretch", borderBottom: `1px solid ${C.line}`, background: C.white }}
        >
          {MODE_TABS.filter(({ id }) => !isEditing || id === mode).map(({ id, label, icon: Icon }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`cpm-mode-tab${active ? " cpm-mode-tab-active" : ""}`}
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "11px 4px 9px",
                  border: "none",
                  borderBottom: active ? `2.5px solid ${C.gold600}` : "2.5px solid transparent",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13, fontWeight: active ? 800 : 600,
                  color: active ? C.ink : C.muted,
                  marginBottom: -1,
                }}
              >
                <Icon size={15} color={active ? C.gold600 : undefined} />
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
              </button>
            );
          })}
        </div>
        {/* ================================================================== */}
        {/* CORPS (scrollable + zone de dépôt globale)                        */}
        {/* ================================================================== */}
        <div
          className="cpm-scroll"
          style={{ flex: 1, overflowY: "auto", position: "relative" }}
          onDragEnter={onBodyDragEnter}
          onDragOver={onBodyDragOver}
          onDragLeave={onBodyDragLeave}
          onDrop={onBodyDrop}
        >
          {dragActive && (
            <div
              className="cpm-fade"
              style={{
                position: "absolute", inset: 10, borderRadius: 16, border: `2px dashed ${C.gold600}`,
                background: "rgba(217,165,54,0.08)", zIndex: 5, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 8, pointerEvents: "none",
              }}
            >
              <UploadCloud size={30} color={C.gold600} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: C.navy800 }}>Déposez vos photos et vidéos ici</span>
            </div>
          )}

          {/* ---------------------------------------------------------- */}
          {/* SECTION UTILISATEUR                                          */}
          {/* ---------------------------------------------------------- */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px 4px" }}>
            <Avatar initials={currentUser.avatar} size={40} imgUrl={currentUser.avatarUrl} />
            <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontFamily: "'Sora', sans-serif", lineHeight: 1.25 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.name}</span>
                {currentUser.isPlatformAdmin ? (
                  <span style={{ display: "inline-flex", borderRadius: 999 }}>
                    <EnterpriseBadge size={13} label="Administrateur officiel LynoraLink" />
                  </span>
                ) : currentUser.isPremium && (
                  <span style={{ display: "inline-flex", borderRadius: 999 }}>
                    <PremiumBadge size={13} />
                  </span>
                )}
              </div>
              {currentUser.title && (
                <div style={{ fontSize: 12, color: C.mutedLight, fontWeight: 500, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentUser.title}
                </div>
              )}
              <div style={{ marginTop: 3 }}>
                <VisibilityPicker value={groupVisibility} onChange={setVisibility} locked={Boolean(group)} variant="inline" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setCommentsLocked((current) => !current)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    border: `1px solid ${C.line}`,
                    background: commentsLocked ? C.navy800 : C.navy50,
                    color: commentsLocked ? C.white : C.ink,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <Lock size={13} />
                  {commentsLocked ? "Commentaires verrouillés" : "Verrouiller les commentaires"}
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted, fontWeight: 600 }}>
                  <label htmlFor="create-post-commentators-limit" style={{ whiteSpace: "nowrap" }}>Limite commentateurs</label>
                  <input
                    id="create-post-commentators-limit"
                    type="number"
                    min={0}
                    step={1}
                    value={commentatorsLimit}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setCommentatorsLimit(Number.isFinite(value) && value >= 0 ? value : 0);
                    }}
                    style={{ width: 70, padding: "6px 8px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.white, color: C.ink, fontSize: 12, fontFamily: "inherit", outline: "none" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* CHAMPS ARTICLE (titre + chapô)                               */}
          {/* ---------------------------------------------------------- */}
          {isArticle && (
            <div style={{ padding: "0 16px 16px" }}>
              <input
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
                placeholder="Titre de l'article"
                style={{ width: "100%", border: "none", outline: "none", fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 24, color: C.ink, marginBottom: 10, letterSpacing: "-0.01em" }}
              />
              <div style={{ height: 1, background: `linear-gradient(90deg, ${C.line}, transparent)`, marginBottom: 10 }} />
              <input
                value={articleExcerpt}
                onChange={(e) => setArticleExcerpt(e.target.value)}
                placeholder="Chapô / résumé en une phrase (optionnel)"
                style={{ width: "100%", border: "none", outline: "none", fontSize: 14, color: C.muted, marginBottom: 6, fontStyle: "italic" }}
              />
              <button type="button" onClick={openImagePicker} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 8, background: C.navy50, color: C.navy800, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                <ImagePlus size={14} /> {media.some((item) => item.type === "image" && item.status === "done") ? "Modifier l'image de couverture" : "Ajouter une image de couverture"}
              </button>
              {media.some((item) => item.type === "image" && item.status === "done") && (
                <span style={{ marginLeft: 8, fontSize: 11.5, color: C.mutedLight }}>La première image sera utilisée comme bannière.</span>
              )}
              {publishDisabledReason && (
                <div style={{ marginTop: 8, color: C.danger, fontSize: 13, lineHeight: 1.5 }}>
                  {publishDisabledReason}
                </div>
              )}
            </div>
          )}

          {isReel && (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: C.muted }}>Légende</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Ajoutez une légende à votre reel…"
                    rows={3}
                    style={{ width: "100%", resize: "vertical", minHeight: 90, padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.line}`, background: C.navy50, color: C.ink, fontSize: 14, fontFamily: "'Inter', sans-serif" }}
                  />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: C.muted }}>Son / musique</label>
                  <input
                    value={reelSound}
                    onChange={(e) => setReelSound(e.target.value)}
                    placeholder="Ex. Son original — Atelier Nova"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.navy50, color: C.ink, fontSize: 14 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------- */}
          {/* RUBAN D'OUTILS — ÉDITEUR D'ARTICLE (type traitement de texte) */}
          {/* ---------------------------------------------------------- */}
          {isArticle && (
            <div style={{ padding: "0 16px 12px" }}>
              <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <div
                  className="cpm-article-toolbar"
                  style={{ display: "flex", alignItems: "center", gap: 3, padding: "7px 7px", background: `linear-gradient(180deg, ${C.white} 0%, ${C.navy50} 100%)`, borderRadius: 12, border: `1px solid ${C.line}`, flexWrap: "wrap", boxShadow: "0 10px 20px rgba(15,51,82,0.04)" }}
                >
                  {/* Annuler / Rétablir */}
                  <RteBtn icon={Undo2} label="Annuler" onClick={() => richEditorRef.current?.undo()} />
                  <RteBtn icon={Redo2} label="Rétablir" onClick={() => richEditorRef.current?.redo()} />

                  <RteSep />

                  {/* Style de bloc (paragraphe / titres / citation) */}
                  <select
                    value={["h1", "h2", "h3", "blockquote"].includes(activeFormats.blockType) ? activeFormats.blockType : "p"}
                    onChange={(e) => richEditorRef.current?.formatBlock(e.target.value)}
                    className="cpm-rte-select"
                    title="Style de paragraphe"
                    style={{ height: 32, borderRadius: 8, border: `1px solid ${C.line}`, background: C.white, color: C.ink, fontSize: 12.5, fontWeight: 600, padding: "0 6px" }}
                  >
                    <option value="p">Paragraphe</option>
                    <option value="h1">Titre principal</option>
                    <option value="h2">Titre de section</option>
                    <option value="h3">Sous-titre</option>
                    <option value="blockquote">Citation</option>
                  </select>

                  <RteSep />

                  {/* Mise en forme du texte */}
                  <RteBtn icon={Bold} label="Gras" active={activeFormats.bold} onClick={() => richEditorRef.current?.exec("bold")} />
                  <RteBtn icon={Italic} label="Italique" active={activeFormats.italic} onClick={() => richEditorRef.current?.exec("italic")} />
                  <RteBtn icon={Underline} label="Souligné" active={activeFormats.underline} onClick={() => richEditorRef.current?.exec("underline")} />
                  <RteBtn icon={Strikethrough} label="Barré" active={activeFormats.strike} onClick={() => richEditorRef.current?.exec("strikeThrough")} />

                  {/* Couleur du texte */}
                  <RteColorInput label="Couleur du texte" icon={Palette} onPick={(color) => richEditorRef.current?.setColor(color)} defaultColor={C.navy800} />
                  {/* Surlignage */}
                  <RteColorInput label="Surligner" icon={PaintBucket} onPick={(color) => richEditorRef.current?.insertHighlight(color)} defaultColor={C.gold400} />

                  <RteSep />

                  {/* Alignement */}
                  <RteBtn icon={AlignLeft} label="Aligner à gauche" onClick={() => richEditorRef.current?.setAlign("left")} />
                  <RteBtn icon={AlignCenter} label="Centrer" onClick={() => richEditorRef.current?.setAlign("center")} />
                  <RteBtn icon={AlignRight} label="Aligner à droite" onClick={() => richEditorRef.current?.setAlign("right")} />
                  <RteBtn icon={AlignJustify} label="Justifier" onClick={() => richEditorRef.current?.setAlign("justify")} />

                  <RteSep />

                  {/* Listes */}
                  <RteBtn icon={List} label="Liste à puces" active={activeFormats.ul} onClick={() => richEditorRef.current?.exec("insertUnorderedList")} />
                  <RteBtn icon={ListOrdered} label="Liste numérotée" active={activeFormats.ol} onClick={() => richEditorRef.current?.exec("insertOrderedList")} />

                  <RteSep />

                  {/* Insertions */}
                  <RteBtn icon={Link2} label="Insérer un lien" onClick={insertLink} />
                  <RteBtn icon={ImagePlus} label="Insérer une image" onClick={() => fileInsertRef.current?.click()} />
                  <RteBtn icon={Code2} label="Bloc de code" onClick={() => richEditorRef.current?.insertCodeBlock()} />
                  <RteBtn icon={Minus} label="Séparateur" onClick={() => richEditorRef.current?.insertDivider()} />

                  <RteSep />

                  <RteBtn icon={RemoveFormatting} label="Effacer la mise en forme" onClick={() => richEditorRef.current?.clearFormat()} />

                  <div style={{ flex: 1, minWidth: 10 }} />

                  <button
                    type="button"
                    onClick={() => setShowPreview((p) => !p)}
                    className="cpm-chip"
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "none", background: showPreview ? C.navy800 : "rgba(15,51,82,0.05)", color: showPreview ? C.white : C.muted, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
                  >
                    {showPreview ? <><EyeOff size={13} /> Édition</> : <><Eye size={13} /> Aperçu</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------- */}
          {/* ZONE DE TEXTE / APERÇU                                      */}
          {/* ---------------------------------------------------------- */}
          <div style={{ padding: "0 16px 16px" }}>
            {isArticle && showPreview ? (
              <ArticleViewerPreview
                article={{
                  id: "preview-article",
                  headline: articleTitle,
                  excerpt: articleExcerpt,
                  body: text,
                  author: currentUser.name,
                  initials: currentUser.avatar,
                  avatarUrl: currentUser.avatarUrl || null,
                  title: currentUser.title,
                  time: new Date().toISOString(),
                  readingTime: estMinutes,
                  coverUrl: media.find((m) => m.type === "image" && m.status === "done")?.url || null,
                  presentation: { theme: "navy-gold", font: "editorial", density: "airy", coverUrl: media.find((m) => m.type === "image" && m.status === "done")?.url || null },
                  likes: 0, liked: false, bookmarked: false, shares: 0, comments: [], tags: [], isArticle: true,
                }}
                currentUser={{ name: currentUser.name, initials: currentUser.avatar, avatarUrl: currentUser.avatarUrl || null }}
                onClose={() => setShowPreview(false)}
              />
            ) : isArticle ? (
              <div style={{ position: "relative" }}>
                <RichArticleEditor
                  ref={richEditorRef}
                  value={text}
                  onChange={setText}
                  onFormatsChange={setActiveFormats}
                  onImageSelectionChange={setSelectedArticleImage}
                  placeholder={group
                    ? `Rédigez votre article pour les membres de ${group.name}.`
                    : "Rédigez votre article. Utilisez le ruban ci-dessus pour la mise en forme — comme dans un traitement de texte."}
                />
                  {selectedArticleImage && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8, padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 10, background: C.navy50 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>Image sélectionnée</span>
                      <select value={selectedArticleImage.width} onChange={(e) => updateArticleImage({ width: e.target.value })} aria-label="Largeur de l'image" style={{ height: 30, border: `1px solid ${C.line}`, borderRadius: 7, background: C.white, color: C.ink, fontSize: 12 }}>
                        <option value="25%">Petite</option>
                        <option value="50%">Moyenne</option>
                        <option value="75%">Grande</option>
                        <option value="100%">Pleine largeur</option>
                      </select>
                      <select value={selectedArticleImage.align} onChange={(e) => updateArticleImage({ align: e.target.value })} aria-label="Alignement de l'image" style={{ height: 30, border: `1px solid ${C.line}`, borderRadius: 7, background: C.white, color: C.ink, fontSize: 12 }}>
                        <option value="left">Gauche</option>
                        <option value="center">Centre</option>
                        <option value="right">Droite</option>
                      </select>
                      <input value={selectedArticleImage.alt} onChange={(e) => updateArticleImage({ alt: e.target.value })} aria-label="Texte alternatif de l'image" placeholder="Texte alternatif" style={{ flex: "1 1 150px", minWidth: 120, height: 30, border: `1px solid ${C.line}`, borderRadius: 7, padding: "0 8px", color: C.ink, fontSize: 12 }} />
                      <button type="button" onClick={() => { richEditorRef.current?.clearSelectedImage(); setSelectedArticleImage(null); }} title="Supprimer l'image" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", borderRadius: 7, background: "rgba(194,68,68,.1)", color: C.danger, cursor: "pointer" }}><Trash2 size={15} /></button>
                    </div>
                  )}
                <div style={{ position: "absolute", bottom: 12, right: 14 }}>
                  <EmojiPicker onSelect={insertEmoji} />
                </div>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <textarea
                  ref={textareaRef}
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onPaste={onPaste}
                  placeholder={isReel
                    ? "Décrivez votre reel…"
                    : isVisuelfocus
                      ? group
                        ? `Décrivez le VisuelFocus à partager avec ${group.name}…`
                        : "Décrivez votre VisuelFocus…"
                      : group
                        ? "Quoi de neuf ?"
                        : "Quoi de neuf ?"
                  }
                  rows={isReel ? 3 : 3}
                  style={{
                    width: "100%",
                    minHeight: media.length > 0 || isReel ? 60 : 110,
                    border: "none",
                    borderRadius: 0,
                    outline: "none",
                    resize: "none",
                    fontSize: media.length > 0 ? 17 : 22,
                    fontWeight: media.length > 0 ? 400 : 500,
                    color: C.ink,
                    fontFamily: "'Inter', sans-serif",
                    lineHeight: 1.4,
                    padding: "4px 0 8px",
                    background: "transparent",
                    boxShadow: "none",
                    transition: "font-size 120ms ease",
                  }}
                />
                <div style={{ position: "absolute", bottom: 8, right: 6 }}>
                  <EmojiPicker onSelect={insertEmoji} />
                </div>
              </div>
            )}
            {isArticle && (
              <input
                ref={fileInsertRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={insertImageFromComputer}
              />
            )}
          </div>

          {isArticle && (
            <div style={{ fontSize: 11.5, color: C.mutedLight, padding: "10px 16px", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 8, background: C.white, boxSizing: "border-box", width: "100%" }}>
              <Clock size={11} /> {estMinutes} min de lecture estimée · {words} mots
              {text.trim().length > 0 && text.trim().length <= 40 && (
                <span style={{ color: C.danger }}>Développez un peu plus votre article (min. 40 caractères)</span>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------- */}
          {/* ZONE MÉDIAS — dédiée au Reel (aperçu vertical 9:16) ou      */}
          {/* grille/dropzone générique pour les autres modes             */}
          {/* ---------------------------------------------------------- */}
          <div style={{ padding: "12px 16px 16px" }}>
            {isReel ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                {media.length === 0 ? (
                  <div
                    className="cpm-dropzone"
                    onClick={openReelVideoPicker}
                    style={{
                      width: "100%", maxWidth: 240, aspectRatio: "9 / 16", borderRadius: 22,
                      border: `1.5px dashed ${C.navy100}`, background: navyGrad,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: 10, cursor: "pointer", textAlign: "center", padding: 22, position: "relative",
                    }}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Video size={22} color={C.gold400} />
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.white }}>Ajoutez votre vidéo</div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.72)" }}>Format vertical 9:16 recommandé</div>
                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)" }}>MP4, MOV, WEBM · jusqu'à {MAX_VIDEO_MB} Mo</div>
                  </div>
                ) : (
                  <div
                    style={{
                      position: "relative", width: "100%", maxWidth: 240, aspectRatio: "9 / 16",
                      borderRadius: 22, overflow: "hidden", background: "#000",
                      boxShadow: "0 10px 30px rgba(15,51,82,0.25)",
                    }}
                  >
                    <video
                      src={media[0].previewUrl}
                      muted
                      loop
                      autoPlay
                      playsInline
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.6) 100%)", pointerEvents: "none" }} />

                    {media[0].status === "done" && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <PlayCircle size={44} color="rgba(255,255,255,0.85)" strokeWidth={1.5} />
                      </div>
                    )}

                    {media[0].status === "uploading" && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(15,36,51,0.45)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <ProgressRing progress={media[0].progress} size={46} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.white }}>Envoi en cours…</span>
                      </div>
                    )}

                    {media[0].status === "error" && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(194,68,68,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, textAlign: "center" }}>
                        <AlertCircle size={20} color={C.white} />
                        <span style={{ fontSize: 11, color: C.white, fontWeight: 600, lineHeight: 1.3 }}>{media[0].error || "Échec de l'envoi"}</span>
                        <button
                          type="button"
                          onClick={() => retryMedia(media[0].id)}
                          style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 999, padding: "4px 10px", color: C.white, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          <RotateCcw size={12} /> Réessayer
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => removeMedia(media[0].id)}
                      title="Supprimer la vidéo"
                      style={{ position: "absolute", top: 10, right: 10, background: "rgba(15,36,51,0.6)", border: "none", borderRadius: 999, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    >
                      <X size={15} color={C.white} />
                    </button>

                    <button
                      type="button"
                      onClick={openReelVideoPicker}
                      style={{ position: "absolute", bottom: 10, left: 10, right: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 10px", borderRadius: 999, border: "none", background: "rgba(15,36,51,0.55)", color: C.white, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                    >
                      <RotateCcw size={12} /> Remplacer la vidéo
                    </button>
                  </div>
                )}

                {media[0]?.name && media[0]?.status === "done" && (
                  <div style={{ fontSize: 11, color: C.mutedLight, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {media[0].name}
                  </div>
                )}
              </div>
            ) : media.length === 0 ? (
              !isArticle && !isVisuelfocus && (
                <div
                  className="cpm-dropzone"
                  onClick={openFilePicker}
                  style={{
                    width: "100%", padding: "30px 16px", borderRadius: 16, border: `1.5px dashed ${C.navy100}`,
                    background: `linear-gradient(180deg, ${C.white} 0%, ${C.navy50} 100%)`, display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: 9, cursor: "pointer", textAlign: "center",
                  }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: C.white, boxShadow: "0 6px 16px rgba(15,51,82,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <UploadCloud size={21} color={C.gold600} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Glissez vos photos et vidéos ici</div>
                  <div style={{ fontSize: 12, color: C.muted }}>ou cliquez pour parcourir vos fichiers</div>
                  <div style={{ fontSize: 11, color: C.mutedLight, marginTop: 2 }}>
                    {`JPG, PNG, WEBP, GIF, MP4, MOV · ${MAX_IMAGE_MB} Mo max / image · ${MAX_VIDEO_MB} Mo max / vidéo · ${MAX_FILES} médias max`}
                  </div>
                </div>
              )
            ) : (
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: media.length === 1 ? "1fr" : "repeat(auto-fill, minmax(120px, 1fr))",
                    gap: 10,
                  }}
                >
                  {media.map((item, index) => (
                    <MediaTile
                      key={item.id}
                      item={item}
                      index={index}
                      isCover={index === 0}
                      isSingle={media.length === 1}
                      onRemove={removeMedia}
                      onRetry={retryMedia}
                      onDragStart={handleTileDragStart}
                      onDragOver={handleTileDragOver}
                      onDrop={handleTileDrop}
                      onDragEnd={handleTileDragEnd}
                      isDragging={draggingIndex === index}
                      isDropTarget={dropTargetIndex === index}
                    />
                  ))}

                  {media.length < MAX_FILES && (
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="cpm-add-tile"
                      style={{
                        aspectRatio: media.length === 1 ? undefined : "1 / 1",
                        minHeight: media.length === 1 ? 56 : undefined,
                        borderRadius: 14, border: `1.5px dashed ${C.line}`, background: C.white,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        gap: 4, color: C.muted,
                      }}
                    >
                      <ImagePlus size={18} color={C.gold600} />
                      <span style={{ fontSize: 11, fontWeight: 600 }}>Ajouter</span>
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, flexWrap: "wrap", gap: 6 }}>
                  <div style={{ fontSize: 11.5, color: C.mutedLight, display: "flex", alignItems: "center", gap: 5 }}>
                    <GripVertical size={12} /> Glissez pour réordonner — le premier média sera mis en avant
                  </div>
                  {uploadingCount > 0 && (
                    <div style={{ fontSize: 11.5, color: C.navy700, display: "flex", alignItems: "center", gap: 5, fontWeight: 600 }}>
                      <Loader2 size={12} className="cpm-spinner" /> Envoi en cours… {doneCount}/{media.length}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fichiers cachés */}
            <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} multiple onChange={handleFileInputChange} style={{ display: "none" }} />
            <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={(e) => { ingestFiles(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
            <input ref={videoInputRef} type="file" accept="video/*" multiple onChange={(e) => { ingestFiles(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
            <input ref={reelVideoInputRef} type="file" accept="video/*" onChange={handleReelVideoInputChange} style={{ display: "none" }} />
          </div>

          {/* ---------------------------------------------------------- */}
          {/* "AJOUTER À VOTRE PUBLICATION" — boîte façon Facebook :      */}
          {/* fond clair navy50, boutons ronds 36px à pastille colorée.  */}
          {/* ---------------------------------------------------------- */}
          {!isArticle && !isReel && (
            <div style={{ padding: "0 16px 16px" }}>
              <div
                className="cpm-media-options"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  padding: "8px 14px 8px 16px", borderRadius: 12, background: C.navy50,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap" }}>
                  Ajouter à votre publication
                </span>
                <div className="cpm-media-option-actions" style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "nowrap" }}>
                  {MEDIA_BAR_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleMediaBarClick(option)}
                      title={option.label}
                      className="cpm-media-opt"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 36, height: 36, borderRadius: "50%", border: "none",
                        background: option.color, cursor: "pointer", color: C.white, flexShrink: 0,
                        boxShadow: "0 4px 12px rgba(15,51,82,0.16)",
                      }}
                    >
                      <FontAwesomeIcon icon={option.icon} style={{ fontSize: 17 }} />
                    </button>
                  ))}
                  <span style={{ width: 1, height: 22, background: C.line, margin: "0 4px" }} />
                  <span title="Humeur" style={{ display: "flex" }}>
                    <MoodPicker value={mood} onChange={setMood} placement="top" />
                  </span>
                  <span title="Identifier des personnes" style={{ display: "flex" }}>
                    <IdentifierPicker value={identifiedUsers} onChange={setIdentifiedUsers} />
                  </span>
                </div>
              </div>
            </div>
          )}

          {globalError && (
            <div className="cpm-fade" style={{ margin: "0 16px 16px", display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 10, background: C.danger50, color: C.danger, fontSize: 12 }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{globalError}</span>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* PIED DE MODALE                                                    */}
        {/* ================================================================== */}
        <div className="cpm-footer" style={{ padding: "12px 16px", borderTop: `1px solid ${C.line}`, position: "relative", zIndex: 2, background: C.white }}>
          <div className="cpm-footer-row" style={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
            {/* --- Bouton Publier : pill navy à droite (desktop), pleine largeur (mobile) --- */}
            <button
              type="button"
              disabled={!canPublish || submitting}
              title={!canPublish ? publishDisabledReason || "Remplissez les champs requis pour publier." : "Publier"}
              onClick={handlePublish}
              className="cpm-publish cpm-footer-publish"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "auto", minWidth: 170,
                padding: "10px 24px", borderRadius: 999, border: "none",
                background: canPublish && !submitting ? navyGrad : C.line, color: canPublish && !submitting ? C.white : C.mutedLight,
                fontWeight: 700, fontSize: 14.5, fontFamily: "'Sora', sans-serif", cursor: canPublish && !submitting ? "pointer" : "not-allowed",
              }}
            >
              {submitting && <Loader2 size={15} className="cpm-spinner" />}
              {submitting ? (isEditing ? "Enregistrement…" : "Publication…") : (isEditing ? "Enregistrer" : "Publier")}
            </button>
          </div>

          {!canPublish && publishDisabledReason && (
            <div style={{ marginTop: 10, color: C.muted, fontSize: 12.5, lineHeight: 1.4, textAlign: "center" }}>
              {publishDisabledReason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
