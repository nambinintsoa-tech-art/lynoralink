"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  TOKENS — alignés sur la palette LynoraLink                        */
/* ------------------------------------------------------------------ */
const C = {
  navy800: "#1B5386",
  navy900: "#0F3352",
  navy100: "#DCE7F1",
  base: "#EEF3F8",
  baseHi: "#F7FAFD",
  line: "#E3EAF1",
  muted: "#8CA0B3",
  danger: "#C24444",
  white: "#FFFFFF",
};

/* ------------------------------------------------------------------ */
/*  Feuille de styles injectée une seule fois (peu importe le nombre  */
/*  d'instances de skeletons montées à l'écran).                      */
/* ------------------------------------------------------------------ */
const STYLE_ID = "lynora-skeleton-keyframes";
const STYLE_CSS = `
@keyframes lyn-shimmer { 0% { background-position: 160% 0; } 100% { background-position: -60% 0; } }
@keyframes lyn-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
@keyframes lyn-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes lyn-spin { to { transform: rotate(360deg); } }
.lyn-shimmer {
  background: ${C.base};
  animation: lyn-pulse 1.8s ease-in-out infinite;
}
.lyn-pulse { background: ${C.base}; animation: lyn-pulse 1.6s ease-in-out infinite; }
.lyn-static { background: ${C.base}; }
.lynora-skeleton-block { box-sizing: border-box; max-width: 100%; }
.lyn-media-fade { animation: lyn-fade-in .45s ease both; }
.lyn-spin { animation: lyn-spin .9s linear infinite; }
@media (max-width: 1024px) {
  .lynora-skeleton-feed-shell { min-height: 100dvh !important; overflow-x: hidden; }
  .lynora-skeleton-feed-grid { grid-template-columns: minmax(0, 1fr) !important; gap: 12px !important; padding: calc(max(96px, var(--lynora-header-offset, 96px)) + 12px) 12px 12px !important; }
  .lynora-skeleton-feed-grid > aside { display: none !important; }
  .lynora-skeleton-fixed-sidebar { display: none !important; }
  .lynora-skeleton-feed-grid > main { width: 100%; max-width: 680px; margin: 0 auto; }
  .lynora-skeleton-feed-grid { padding: 12px !important; gap: 12px !important; }
  .lynora-feed-skeleton-wrapper { width: 100%; max-width: 680px; margin: 0 auto; }
  .lynora-feed-skeleton-card,
  .lynora-feed-skeleton-card > *,
  .lynora-feed-skeleton-card .lynora-skeleton-media,
  .lynora-feed-skeleton-card .lynora-skeleton-cover,
  .lynora-feed-skeleton-card .lynora-skeleton-avatar {
    border-radius: 14px !important;
  }
  .lynora-feed-skeleton-card {
    border: 1px solid ${C.line} !important;
    box-shadow: none !important;
  }
  .lynora-skeleton-stat-row { flex-wrap: wrap !important; gap: 12px !important; }
  .lynora-skeleton-stat-row > div { min-width: calc(50% - 6px); }
  .lynora-skeleton-stat-row > div[style*="width: 1px"] { display: none; }
  .lynora-profile-skeleton > div:first-child { border-radius: 0 !important; }
  .lynora-profile-skeleton .lynora-profile-banner { height: 140px !important; }
  .lynora-profile-skeleton .lynora-profile-body { padding: 0 16px 18px !important; margin-top: -38px !important; }
  .lynora-profile-skeleton .lynora-profile-identity { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
  .lynora-profile-skeleton .lynora-profile-avatar { width: 88px !important; height: 88px !important; }
  .lynora-profile-skeleton .lynora-profile-stats { flex-wrap: wrap !important; gap: 12px !important; }
  .lynora-profile-skeleton .lynora-profile-stats > div { flex: 1 1 calc(50% - 6px); min-width: 0; }
  .lynora-profile-loading-main { padding: 0 0 24px !important; }
  .lynora-profile-skeleton { gap: 16px !important; }
  .lynora-profile-skeleton > div:first-child { width: 100% !important; border-radius: 0 !important; }
  .lynora-profile-skeleton .lynora-profile-banner { height: 140px !important; }
  .lynora-profile-skeleton .lynora-profile-body { padding: 0 16px !important; }
  .lynora-profile-skeleton .lynora-profile-avatar { width: 100px !important; height: 100px !important; top: -40px !important; left: 16px !important; }
  .lynora-profile-skeleton .lynora-profile-identity { min-height: 0 !important; padding-top: 64px !important; padding-bottom: 18px !important; align-items: stretch !important; gap: 18px !important; }
  .lynora-profile-skeleton .lynora-profile-identity > div:first-child { width: 100% !important; }
  .lynora-profile-skeleton .lynora-profile-actions { width: 100% !important; display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .lynora-profile-skeleton .lynora-profile-tabs { gap: 12px !important; padding: 14px 0 !important; overflow: hidden !important; }
  .lynora-profile-skeleton .lynora-profile-main-grid { display: block !important; margin-top: 0 !important; }
  .lynora-profile-skeleton .lynora-profile-sidebar { display: none !important; }
  .lynora-profile-skeleton .lynora-profile-main-grid > div { width: 100% !important; }
  .lynora-company-skeleton { gap: 16px !important; }
  .lynora-company-skeleton > div:first-child { border-radius: 0 !important; }
  .lynora-company-skeleton .lynora-company-hero { height: 145px !important; }
  .lynora-company-skeleton .lynora-company-identity { flex-direction: column !important; gap: 14px !important; padding-inline: 12px !important; }
  .lynora-company-skeleton .lynora-company-avatar { width: 100px !important; height: 100px !important; }
  .lynora-company-skeleton .lynora-company-identity > div:first-child { width: 100%; align-items: flex-end !important; gap: 12px !important; }
  .lynora-company-skeleton .lynora-company-identity > div:first-child > div:last-child { flex: 1; min-width: 0; }
  .lynora-company-skeleton .lynora-company-actions { width: 100%; padding-top: 0 !important; }
  .lynora-company-skeleton .lynora-company-actions > div { flex: 1; }
  .lynora-company-skeleton .lynora-company-meta { padding-top: 14px !important; }
  .lynora-company-skeleton .lynora-company-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; }
  .lynora-company-skeleton .lynora-company-tabs { gap: 16px !important; overflow-x: auto !important; }
  .lynora-company-skeleton .lynora-company-content { display: block !important; }
  .lynora-company-skeleton .lynora-company-sidebar { display: none !important; }
  .lynora-group-detail-skeleton { width: 100% !important; max-width: none !important; padding: 8px 12px 24px !important; gap: 12px !important; }
  .lynora-group-detail-skeleton .lynora-skeleton-detail-toolbar { padding: 0 4px !important; }
  .lynora-group-detail-skeleton .lynora-skeleton-detail-header { border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }
  .lynora-group-detail-skeleton .lynora-skeleton-detail-header-body { padding-left: 16px !important; padding-right: 16px !important; }
  .lynora-group-detail-skeleton .lynora-skeleton-detail-header-toprow { flex-wrap: wrap !important; margin-top: -24px !important; }
  .lynora-group-detail-skeleton .lynora-skeleton-detail-columns { grid-template-columns: minmax(0, 1fr) !important; gap: 12px !important; }
  .lynora-group-detail-skeleton .lynora-skeleton-detail-sidebar { order: 1; }
  .lynora-group-detail-skeleton .lynora-skeleton-detail-feed { order: 2; }
  .lynora-group-detail-skeleton .lynora-skeleton-stat-row { overflow: hidden !important; }
  .lynora-group-detail-skeleton .lynora-skeleton-stat-row > div { min-width: 0 !important; padding: 10px 8px !important; border-left: 0 !important; }
  .lynora-skeleton-detail-toolbar { padding: 0 14px !important; }
  .lynora-skeleton-detail-tabs { overflow-x: auto !important; padding-inline: 14px !important; }
  .lynora-groups-grid-skeleton {
    width: 100% !important;
    min-height: 100dvh !important;
    overflow-x: hidden;
  }
  .lynora-skeleton-groups-shell {
    display: flex !important;
    width: 100% !important;
    min-height: 100dvh !important;
    align-items: stretch !important;
  }
  .lynora-skeleton-groups-sidebar { display: none !important; }
  .lynora-skeleton-groups-content {
    width: 100% !important;
    max-width: none !important;
    padding: 12px 12px 48px !important;
    box-sizing: border-box !important;
  }
  .lynora-skeleton-groups-feed {
    width: 100% !important;
    max-width: 700px !important;
  }
  .lynora-skeleton-menu { display: block !important; width: 100%; margin-bottom: 12px; }
  .lynora-skeleton-menu > * { width: 100% !important; height: 48px !important; border-radius: 0 !important; }
  .lynora-skeleton-group-cards { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 12px !important; }
}
@media (max-width: 560px) {
  .lynora-skeleton-feed-grid { padding: 8px 12px 12px !important; }
  .lynora-feed-skeleton-wrapper { width: 100%; max-width: none; margin: 0; }
  .lynora-feed-skeleton-card,
  .lynora-feed-skeleton-card > *,
  .lynora-feed-skeleton-card .lynora-skeleton-media,
  .lynora-feed-skeleton-card .lynora-skeleton-cover,
  .lynora-feed-skeleton-card .lynora-skeleton-avatar {
    border-radius: 12px !important;
  }
  .lynora-group-detail-skeleton { padding: 8px 10px 20px !important; }
  .lynora-group-detail-skeleton .lynora-skeleton-detail-toolbar { flex-direction: column !important; align-items: stretch !important; }
  .lynora-group-detail-skeleton .lynora-skeleton-detail-toolbar > div { width: 100% !important; }
  .lynora-group-detail-skeleton .lynora-skeleton-detail-header-body { padding: 0 16px 18px !important; }
  .lynora-group-detail-skeleton .lynora-skeleton-detail-header-toprow { gap: 12px !important; }
  .lynora-group-detail-skeleton .lynora-skeleton-detail-tabs { gap: 12px !important; padding-inline: 0 !important; }
  .lynora-group-detail-skeleton .lynora-skeleton-detail-tabs > div { min-width: 70px !important; }
  .lynora-group-detail-skeleton .lynora-skeleton-detail-sidebar,
  .lynora-group-detail-skeleton .lynora-skeleton-detail-feed { width: 100% !important; }
  .lynora-skeleton-groups-content { padding: 8px 12px 40px !important; }
  .lynora-skeleton-group-cards { grid-template-columns: minmax(0, 1fr) !important; gap: 10px !important; }
  .lynora-skeleton-group-cards > div { border-radius: 12px !important; }
  .lynora-skeleton-menu { width: 100% !important; }
  .lynora-skeleton-menu > * { width: 100% !important; height: 44px !important; border-radius: 10px !important; }
}
@media (max-width: 700px) {
  .lynora-settings-skeleton-layout,
  .lynora-dashboard-skeleton-content,
  .lynora-admin-skeleton { grid-template-columns: minmax(0, 1fr) !important; }
  .lynora-dashboard-skeleton-kpis,
  .lynora-admin-skeleton-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .lynora-settings-skeleton,
  .lynora-dashboard-skeleton,
  .lynora-admin-skeleton { padding-inline: 12px; }
  .lynora-reel-skeleton { min-height: min(620px, calc(100dvh - var(--lynora-header-offset, 0px))) !important; max-height: calc(100dvh - var(--lynora-header-offset, 0px)); }
  .lynora-reel-skeleton > div:first-child { min-height: 0 !important; height: 100% !important; }
}
@media (prefers-reduced-motion: reduce) {
  .lyn-shimmer, .lyn-pulse { animation: none; background: ${C.base}; }
  .lyn-media-fade { animation: none; }
}
`;

function useSkeletonStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const tag = document.createElement("style");
    tag.id = STYLE_ID;
    tag.textContent = STYLE_CSS;
    document.head.appendChild(tag);
  }, []);
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/* ------------------------------------------------------------------ */
/*  PRIMITIVE DE BASE — rectangle / cercle animé                      */
/* ------------------------------------------------------------------ */
/**
 * Skeleton — bloc de base réutilisable.
 * @param {string|number} width
 * @param {string|number} height
 * @param {number} radius
 * @param {"shimmer"|"pulse"|"static"} variant
 */
export function Skeleton({ width = "100%", height = 12, radius = 8, variant = "shimmer", style = {}, className = "" }) {
  useSkeletonStyles();
  const reduced = useReducedMotion();
  const cls = reduced ? "lyn-static" : variant === "pulse" ? "lyn-pulse" : "lyn-shimmer";
  return (
    <div
      aria-hidden="true"
      className={`${cls} lynora-skeleton-block ${className}`}
      style={{
        width,
        height,
        borderRadius: radius,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
        ...style,
      }}
    />
  );
}

export function SkeletonAvatar({ size = 40, radius, style = {} }) {
  return <Skeleton width={size} height={size} radius={radius ?? size} style={style} />;
}

/**
 * SkeletonText — plusieurs lignes de texte, la dernière plus courte
 * pour un rendu naturel (évite l'effet "bloc plein").
 */
export function SkeletonText({ lines = 3, lastLineWidth = "60%", lineHeight = 11, gap = 8, style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === lines - 1 ? lastLineWidth : "100%"}
          radius={5}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PLACEHOLDERS MÉDIA — état "pas encore chargé"                     */
/* ------------------------------------------------------------------ */
export function SkeletonImage({ ratio = "16/9", radius = 12, style = {} }) {
  useSkeletonStyles();
  const reduced = useReducedMotion();
  return (
    <div
      className={reduced ? "lyn-static" : "lyn-shimmer"}
      style={{
        width: "100%",
        aspectRatio: ratio,
        borderRadius: radius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    />
  );
}

export function SkeletonVideo({ ratio = "16/9", radius = 12, style = {} }) {
  useSkeletonStyles();
  const reduced = useReducedMotion();
  return (
    <div
      className={reduced ? "lyn-static" : "lyn-shimmer"}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: ratio,
        borderRadius: radius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  CHARGEURS MÉDIA RÉELS — squelette tant que l'image/vidéo n'est    */
/*  pas prête, fondu enchaîné à l'arrivée, état d'erreur avec retry.  */
/* ------------------------------------------------------------------ */
/**
 * ImageWithSkeleton — <img> robuste :
 * - affiche un SkeletonImage tant que le fichier n'est pas chargé
 * - fondu en fondu à l'arrivée (pas de "pop")
 * - état d'erreur avec bouton réessayer
 */
export function ImageWithSkeleton({ src, alt = "", ratio = "16/9", radius = 12, style = {}, imgStyle = {}, lazy = true, onLoad, onError }) {
  useSkeletonStyles();
  const [status, setStatus] = useState("loading"); // loading | loaded | error
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setStatus("loading");
  }, [src]);

  const handleLoad = useCallback((e) => { setStatus("loaded"); onLoad?.(e); }, [onLoad]);
  const handleError = useCallback((e) => { setStatus("error"); onError?.(e); }, [onError]);
  const retry = () => { setAttempt((a) => a + 1); setStatus("loading"); };

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: ratio, borderRadius: radius, overflow: "hidden", background: C.base, ...style }}>
      {status !== "loaded" && status !== "error" && (
        <div style={{ position: "absolute", inset: 0 }}>
          <SkeletonImage ratio={ratio} radius={0} style={{ height: "100%" }} />
        </div>
      )}

      {status === "error" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: C.muted, background: C.base }}>
          <AlertTriangle size={24} strokeWidth={1.5} color={C.danger} />
          <span style={{ fontSize: 12 }}>Image indisponible</span>
          <button
            onClick={retry}
            style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${C.line}`, background: C.white, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: C.navy800, cursor: "pointer" }}
          >
            <RotateCcw size={12} /> Réessayer
          </button>
        </div>
      )}

      {status !== "error" && (
        <img
          key={attempt}
          src={src}
          alt={alt}
          loading={lazy ? "lazy" : "eager"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={status === "loaded" ? "lyn-media-fade" : ""}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: status === "loaded" ? 1 : 0,
            transition: "opacity .3s ease",
            ...imgStyle,
          }}
        />
      )}
    </div>
  );
}

/**
 * VideoWithSkeleton — <video> robuste :
 * - squelette tant que les métadonnées ne sont pas prêtes
 * - poster optionnel affiché dès que disponible
 * - état d'erreur avec retry
 */
export function VideoWithSkeleton({ src, poster, ratio = "16/9", radius = 12, style = {}, controls = true, onReady, onError }) {
  useSkeletonStyles();
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [attempt, setAttempt] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => { setStatus("loading"); }, [src]);

  const handleLoadedData = useCallback((e) => { setStatus("ready"); onReady?.(e); }, [onReady]);
  const handleError = useCallback((e) => { setStatus("error"); onError?.(e); }, [onError]);
  const retry = () => { setAttempt((a) => a + 1); setStatus("loading"); videoRef.current?.load?.(); };

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: ratio, borderRadius: radius, overflow: "hidden", background: "#0B1E2E", ...style }}>
      {status === "loading" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
          <SkeletonVideo ratio={ratio} radius={0} style={{ height: "100%" }} />
        </div>
      )}

      {status === "error" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: C.muted, background: C.base }}>
          <AlertTriangle size={24} strokeWidth={1.5} color={C.danger} />
          <span style={{ fontSize: 12 }}>Vidéo indisponible</span>
          <button
            onClick={retry}
            style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${C.line}`, background: C.white, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: C.navy800, cursor: "pointer" }}
          >
            <RotateCcw size={12} /> Réessayer
          </button>
        </div>
      )}

      {status !== "error" && (
        <video
          key={attempt}
          ref={videoRef}
          src={src}
          poster={poster}
          controls={controls}
          preload="metadata"
          onLoadedData={handleLoadedData}
          onError={handleError}
          className={status === "ready" ? "lyn-media-fade" : ""}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: status === "ready" ? 1 : 0, transition: "opacity .3s ease" }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  COMPOSANTS COMPOSÉS — répliques des skeletons du feed             */
/* ------------------------------------------------------------------ */
function Frame({ children, style = {}, className = "" }) {
  return (
    <div className={className} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, ...style }}>
      {children}
    </div>
  );
}

function FeedSkeletonFrame({ children, style = {}, className = "" }) {
  return (
    <div className={`lynora-feed-skeleton-card ${className}`.trim()} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, ...style }}>
      {children}
    </div>
  );
}

export function SkeletonPostCard({ media = "none" }) {
  // media: "none" | "image" | "video"
  return (
    <FeedSkeletonFrame style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <SkeletonAvatar size={44} radius={999} className="lynora-skeleton-avatar" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton width="35%" height={13} radius={6} />
          <Skeleton width="22%" height={10} radius={6} />
        </div>
      </div>
      <SkeletonText lines={3} lastLineWidth="45%" style={{ marginBottom: media !== "none" ? 14 : 4 }} />
      {media === "image" && <SkeletonImage ratio="16/9" className="lynora-skeleton-media" style={{ borderRadius: 0 }} />}
      {media === "video" && <SkeletonVideo ratio="16/9" style={{ borderRadius: 0 }} />}
      <div style={{ display: "flex", gap: 18, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
        <Skeleton width={54} height={22} radius={8} />
        <Skeleton width={54} height={22} radius={8} />
        <Skeleton width={54} height={22} radius={8} />
      </div>
    </FeedSkeletonFrame>
  );
}

function SponsoredSkeletonCard() {
  return (
    <FeedSkeletonFrame style={{ overflow: "hidden" }}>
      <div style={{ padding: "12px 16px 4px" }}>
        <Skeleton width="34%" height={11} style={{ marginBottom: 10 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SkeletonAvatar size={38} className="lynora-skeleton-avatar" />
          <div style={{ flex: 1 }}>
            <Skeleton width="48%" height={12} style={{ marginBottom: 6 }} />
            <Skeleton width="30%" height={9} />
          </div>
        </div>
      </div>
      <div style={{ padding: "8px 16px 12px" }}>
        <Skeleton width="72%" height={17} style={{ marginBottom: 8 }} />
        <SkeletonText lines={2} lastLineWidth="82%" lineHeight={10} />
      </div>
      <SkeletonImage ratio="16/9" style={{ borderRadius: 0 }} className="lynora-skeleton-media" />
      <div style={{ display: "flex", justifyContent: "center", gap: 18, padding: "11px 16px 13px", borderTop: `1px solid ${C.line}` }}>
        <Skeleton width={64} height={14} radius={5} />
        <Skeleton width={58} height={14} radius={5} />
        <Skeleton width={68} height={14} radius={5} />
      </div>
    </FeedSkeletonFrame>
  );
}

function PageSuggestionsSkeleton() {
  return (
    <FeedSkeletonFrame style={{ padding: "18px 16px" }}>
      <Skeleton width="42%" height={16} style={{ marginBottom: 16 }} />
      <div className="feed-suggestions-rail" style={{ display: "flex", gap: 12, overflow: "hidden", paddingBottom: 8 }}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} style={{ display: "flex", flex: "0 0 132px", flexDirection: "column", alignItems: "center", gap: 10, padding: 12, border: `1px solid ${C.line}`, borderRadius: 12 }}>
            <SkeletonAvatar size={50} className="lynora-skeleton-avatar" />
            <Skeleton width="82%" height={12} />
            <Skeleton width="66%" height={10} />
            <Skeleton width="100%" height={28} radius={8} />
          </div>
        ))}
      </div>
    </FeedSkeletonFrame>
  );
}

export function FeedSkeleton({ count = 5 }) {
  const patterns = ["image", "none", "video"];
  return (
    <div className="lynora-feed-skeleton-wrapper" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>
          <SkeletonPostCard media={patterns[i % patterns.length]} />
          {i === 0 && <SponsoredSkeletonCard />}
          {i === 3 && <PageSuggestionsSkeleton />}
        </React.Fragment>
      ))}
    </div>
  );
}

export function ComposerSkeleton() {
  return (
    <FeedSkeletonFrame style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <SkeletonAvatar size={42} className="lynora-skeleton-avatar" />
        <Skeleton width="100%" height={38} radius={22} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
        <Skeleton width="100%" height={30} radius={10} />
        <Skeleton width="100%" height={30} radius={10} />
        <Skeleton width="100%" height={30} radius={10} />
      </div>
    </FeedSkeletonFrame>
  );
}

export function LeftSidebarSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Frame>
        <Skeleton className="lynora-sidebar-cover" width="100%" height={72} radius="16px 16px 0 0" />
        <div style={{ padding: "0 16px 16px", marginTop: -26, display: "flex", flexDirection: "column", gap: 12 }}>
          <SkeletonAvatar className="lynora-sidebar-avatar" size={64} radius={999} />
          <Skeleton width="70%" height={16} />
          <Skeleton width="50%" height={12} />
          <div style={{ height: 1, background: C.line, margin: "8px 0" }} />
          <SkeletonText lines={3} lastLineWidth="80%" lineHeight={12} />
        </div>
      </Frame>

      <Frame style={{ padding: 16 }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderTop: index > 0 ? `1px solid ${C.line}` : "none" }}>
            <SkeletonAvatar size={40} radius={10} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton width="60%" height={12} />
              <Skeleton width="40%" height={10} />
            </div>
          </div>
        ))}
      </Frame>

      <Frame style={{ padding: 16 }}>
        <Skeleton width="80%" height={14} style={{ marginBottom: 12 }} />
        <SkeletonText lines={2} lastLineWidth="90%" lineHeight={10} />
      </Frame>
    </div>
  );
}

export function RightSidebarSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Frame style={{ padding: 16 }}>
        <Skeleton width="60%" height={16} style={{ marginBottom: 12 }} />
        <SkeletonText lines={2} lastLineWidth="80%" lineHeight={10} />
      </Frame>
      <Frame style={{ padding: 16 }}>
        <Skeleton width="50%" height={16} style={{ marginBottom: 12 }} />
        <SkeletonText lines={3} lastLineWidth="70%" lineHeight={10} />
      </Frame>
      <Frame style={{ padding: 16 }}>
        <Skeleton width="65%" height={16} style={{ marginBottom: 12 }} />
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <SkeletonAvatar size={38} radius={10} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton width="70%" height={11} />
              <Skeleton width="50%" height={10} />
            </div>
          </div>
        ))}
      </Frame>
      <Frame style={{ padding: 16 }}>
        <Skeleton width="58%" height={16} style={{ marginBottom: 12 }} />
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} style={{ padding: "10px 0", borderTop: index > 0 ? `1px solid ${C.line}` : "none" }}>
            <Skeleton width="34%" height={9} style={{ marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 9 }}>
              <Skeleton width={62} height={62} radius={8} />
              <div style={{ flex: 1 }}>
                <Skeleton width="92%" height={11} style={{ marginBottom: 7 }} />
                <Skeleton width="70%" height={10} style={{ marginBottom: 10 }} />
                <Skeleton width="78%" height={9} />
              </div>
            </div>
          </div>
        ))}
      </Frame>
    </div>
  );
}
export function NetworkSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Skeleton width={46} height={46} radius={15} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton width="60%" height={22} radius={8} />
          <Skeleton width="90%" height={12} radius={6} />
        </div>
      </div>

      {/* Statistiques */}
      <Frame style={{ display: "flex", padding: "18px 22px" }} className="lynora-skeleton-stat-row">
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton width="50%" height={18} radius={6} />
          <Skeleton width="70%" height={11} radius={5} />
        </div>
        <div style={{ width: 1, background: C.line, margin: "2px 20px" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton width="60%" height={18} radius={6} />
          <Skeleton width="80%" height={11} radius={5} />
        </div>
        <div style={{ width: 1, background: C.line, margin: "2px 20px" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton width="55%" height={18} radius={6} />
          <Skeleton width="75%" height={11} radius={5} />
        </div>
      </Frame>

      {/* Recherche */}
      <Skeleton width="100%" height={44} radius={999} />

      {/* Onglets */}
      <div style={{ display: "flex", background: C.navy50, borderRadius: 14, padding: 4, gap: 4 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} width={`${100/3}%`} height={36} radius={11} />
        ))}
      </div>

      {/* Liste des items */}
      <Frame style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: 12, padding: index > 0 ? "12px 0" : "0", borderTop: index > 0 ? `1px solid ${C.line}` : "none" }}>
            <SkeletonAvatar size={44} radius={14} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <Skeleton width="70%" height={13} radius={5} />
              <Skeleton width="50%" height={11} radius={5} />
              <Skeleton width="40%" height={10} radius={5} />
            </div>
            <Skeleton width={78} height={32} radius={999} />
          </div>
        ))}
      </Frame>
    </div>
  );
}

export function NotificationsSkeleton() {
  return (
    <Frame style={{ padding: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ padding: "6px 0 10px" }}>
          <Skeleton width="55%" height={16} radius={10} />
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: index > 0 ? `1px solid ${C.line}` : "none" }}>
            <SkeletonAvatar size={38} radius={12} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton width="90%" height={10} />
              <Skeleton width="70%" height={10} />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="lynora-profile-skeleton" style={{ width: "100%", minHeight: 0, display: "flex", flexDirection: "column", gap: 24 }}>
      <Frame style={{ padding: 0, overflow: "hidden" }}>
        <div className="lynora-profile-banner" style={{ height: 180, background: `linear-gradient(135deg, ${C.navy100}, ${C.baseHi})`, position: "relative" }} />
        <div className="lynora-profile-body" style={{ padding: "0 32px 0", position: "relative" }}>
          <Skeleton className="lynora-profile-avatar" width={152} height={152} radius={76} style={{ position: "absolute", top: -68, left: 32, border: `4px solid ${C.white}`, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }} />
          <div className="lynora-profile-identity" style={{ minHeight: 208, paddingTop: 80, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 9 }}>
              <Skeleton width="38%" height={28} radius={7} />
              <Skeleton width="55%" height={18} radius={5} />
              <Skeleton width="30%" height={14} radius={5} />
              <Skeleton width="24%" height={14} radius={5} />
            </div>
            <div className="lynora-profile-actions" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Skeleton width={132} height={40} radius={20} />
              <Skeleton width={104} height={40} radius={20} />
            </div>
          </div>
          <div className="lynora-profile-tabs" style={{ display: "flex", gap: 20, paddingTop: 18, borderTop: `1px solid ${C.line}` }}>
            {[90, 82, 92, 78, 70].map((width, index) => <Skeleton key={index} width={width} height={16} radius={5} />)}
          </div>
        </div>
      </Frame>
      <div className="lynora-profile-main-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: 24, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <Frame style={{ padding: 16 }}>
            <Skeleton width="32%" height={18} radius={6} style={{ marginBottom: 16 }} />
            <SkeletonText lines={4} lastLineWidth="72%" lineHeight={13} />
          </Frame>
          <Frame style={{ padding: 16 }}>
            <Skeleton width="42%" height={18} radius={6} style={{ marginBottom: 16 }} />
            <SkeletonText lines={5} lastLineWidth="58%" lineHeight={13} />
          </Frame>
        </div>
        <aside className="lynora-profile-sidebar" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {["32%", "44%", "38%"].map((width, index) => <Frame key={index} style={{ padding: 16 }}><Skeleton width={width} height={18} radius={6} style={{ marginBottom: 16 }} /><SkeletonText lines={index === 1 ? 4 : 3} lastLineWidth="68%" lineHeight={12} /></Frame>)}
        </aside>
      </div>
    </div>
  );
}

export function MessagesSkeleton({ rows = 4 }) {
  return (
    <Frame style={{ padding: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ padding: "6px 0 10px" }}>
          <Skeleton width="40%" height={16} />
        </div>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: index > 0 ? `1px solid ${C.line}` : "none" }}>
            <SkeletonAvatar size={40} radius={12} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton width="70%" height={11} />
              <Skeleton width="50%" height={10} />
            </div>
          </div>
        ))}
        <div style={{ marginTop: 8, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
          <Skeleton width="100%" height={40} radius={12} />
        </div>
      </div>
    </Frame>
  );
}

export function CompanySkeleton() {
  return (
    <div className="lynora-company-skeleton" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Frame style={{ padding: 0, overflow: "hidden" }}>
        <Skeleton className="lynora-company-hero" width="100%" height={200} radius="16px 16px 0 0" />
        <div style={{ padding: "0 4px 0", marginTop: -40, position: "relative" }}>
          <div className="lynora-company-identity" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: "0 12px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16, minWidth: 0 }}>
              <Skeleton className="lynora-company-avatar" width={152} height={152} radius={999} style={{ border: `4px solid ${C.white}`, flexShrink: 0 }} />
              <div style={{ paddingBottom: 10, minWidth: 0 }}>
                <Skeleton width={220} height={24} radius={6} style={{ marginBottom: 8 }} />
                <Skeleton width={280} height={13} radius={5} />
              </div>
            </div>
            <div className="lynora-company-actions" style={{ display: "flex", gap: 8, paddingTop: 52 }}>
              <Skeleton width={92} height={38} radius={20} />
              <Skeleton width={92} height={38} radius={20} />
            </div>
          </div>
          <div className="lynora-company-meta" style={{ display: "flex", flexWrap: "wrap", gap: 14, padding: "18px 12px 0" }}>
            <Skeleton width={120} height={13} radius={5} /><Skeleton width={96} height={13} radius={5} /><Skeleton width={130} height={13} radius={5} />
          </div>
          <div className="lynora-company-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, padding: "18px 12px 0" }}>
            {[1, 2, 3, 4].map((item) => <Skeleton key={item} height={58} radius={10} />)}
          </div>
          <div className="lynora-company-tabs" style={{ display: "flex", gap: 24, padding: "18px 12px 0", borderBottom: `1px solid ${C.line}`, overflow: "hidden" }}>
            {[72, 92, 68, 58].map((width, index) => <Skeleton key={index} width={width} height={16} radius={5} />)}
          </div>
        </div>
      </Frame>
      <div className="lynora-company-content" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 24, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2].map((item) => <Frame key={item} style={{ padding: 16 }}><div style={{ display: "flex", gap: 10, marginBottom: 14 }}><SkeletonAvatar size={40} radius={999} /><div style={{ flex: 1 }}><Skeleton width="38%" height={13} radius={5} style={{ marginBottom: 7 }} /><Skeleton width="24%" height={10} radius={5} /></div></div><SkeletonText lines={3} lastLineWidth="62%" lineHeight={12} /><Skeleton width="100%" height={220} radius={10} style={{ marginTop: 14 }} /></Frame>)}
        </div>
        <aside className="lynora-company-sidebar" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map((item) => <Frame key={item} style={{ padding: 16 }}><Skeleton width={`${35 + item * 8}%`} height={16} radius={6} style={{ marginBottom: 14 }} /><SkeletonText lines={item === 2 ? 4 : 3} lastLineWidth="68%" lineHeight={11} /></Frame>)}
        </aside>
      </div>
    </div>
  );
}

export function SubscriptionSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Frame style={{ padding: 16 }}>
        <Skeleton width="35%" height={16} style={{ marginBottom: 10 }} />
        <SkeletonText lines={3} lastLineWidth="80%" lineHeight={10} />
      </Frame>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {Array.from({ length: 2 }).map((_, index) => (
          <Frame key={index} style={{ padding: 16 }}>
            <Skeleton width="60%" height={14} style={{ marginBottom: 12 }} />
            <Skeleton width="100%" height={10} />
            <Skeleton width="90%" height={10} style={{ marginTop: 8 }} />
            <Skeleton width="70%" height={10} style={{ marginTop: 8 }} />
            <Skeleton width="100%" height={38} radius={10} style={{ marginTop: 16 }} />
          </Frame>
        ))}
      </div>
    </div>
  );
}

export function StorySkeleton({ count = 5 }) {
  return (
    <div style={{ display: "flex", gap: 12, overflow: "hidden", padding: 4 }}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} style={{ flex: "0 0 120px", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <SkeletonAvatar size={72} radius={999} />
          <Skeleton width="78%" height={11} radius={5} />
        </div>
      ))}
    </div>
  );
}

export function MessageSkeleton({ rows = 5 }) {
  return <MessagesSkeleton rows={rows} />;
}

export function GroupSkeleton({ detail = false }) {
  return detail ? <GroupDetailSkeleton /> : <GroupsGridSkeleton />;
}

export function CompanyPageSkeleton() {
  return <CompanySkeleton />;
}

export function CompanyPagesGridSkeleton({ count = 6 }) {
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Skeleton width="28%" height={12} radius={5} />
        <Skeleton width="42%" height={26} radius={7} />
      </div>
      <div style={{ display: "flex", gap: 8, overflow: "hidden" }}>
        {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} width={92} height={36} radius={999} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {Array.from({ length: count }).map((_, index) => (
          <Frame key={index} style={{ padding: 0, overflow: "hidden" }}>
            <Skeleton width="100%" height={92} radius="16px 16px 0 0" />
            <div style={{ padding: "0 14px 14px", marginTop: -24 }}>
              <SkeletonAvatar size={54} radius={999} style={{ border: `4px solid ${C.white}`, marginBottom: 12 }} />
              <Skeleton width="76%" height={15} radius={5} />
              <Skeleton width="48%" height={10} radius={4} style={{ marginTop: 8 }} />
              <SkeletonText lines={2} lastLineWidth="74%" lineHeight={10} style={{ marginTop: 14 }} />
              <Skeleton width="100%" height={34} radius={8} style={{ marginTop: 14 }} />
            </div>
          </Frame>
        ))}
      </div>
    </div>
  );
}

export function CompanyPagePostsSkeleton({ count = 2 }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{Array.from({ length: count }).map((_, index) => <SkeletonPostCard key={index} media="image" />)}</div>;
}

export function ReelSkeleton() {
  return (
    <Frame className="lynora-reel-skeleton" style={{ maxWidth: 520, minHeight: 620, margin: "0 auto", overflow: "hidden", position: "relative", background: C.navy900 }}>
      <SkeletonVideo ratio="9/16" radius={0} style={{ height: "100%", minHeight: 620, background: "#102A40" }} />
      <div style={{ position: "absolute", left: 18, right: 64, bottom: 20, display: "flex", flexDirection: "column", gap: 9 }}>
        <Skeleton width="42%" height={14} radius={5} style={{ background: "rgba(255,255,255,.25)" }} />
        <Skeleton width="88%" height={11} radius={5} style={{ background: "rgba(255,255,255,.2)" }} />
        <Skeleton width="68%" height={11} radius={5} style={{ background: "rgba(255,255,255,.2)" }} />
      </div>
      <div style={{ position: "absolute", right: 16, bottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} width={38} height={38} radius={999} style={{ background: "rgba(255,255,255,.24)" }} />)}
      </div>
    </Frame>
  );
}

export function ReelCommentsSkeleton({ count = 4 }) {
  return <CommentSkeleton count={count} />;
}

export function SettingsSkeleton() {
  return (
    <div className="lynora-settings-skeleton" style={{ maxWidth: 920, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <Frame style={{ padding: 20 }}>
        <Skeleton width="30%" height={24} radius={7} style={{ marginBottom: 8 }} />
        <Skeleton width="58%" height={12} radius={5} />
      </Frame>
      <div className="lynora-settings-skeleton-layout" style={{ display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)", gap: 16 }}>
        <Frame style={{ padding: 12 }}>
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} width="100%" height={38} radius={9} style={{ marginBottom: index === 5 ? 0 : 8 }} />)}
        </Frame>
        <Frame style={{ padding: 20 }}>
          <Skeleton width="42%" height={18} radius={6} style={{ marginBottom: 18 }} />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: index === 4 ? 0 : 16 }}>
              <Skeleton width={`${28 + (index % 3) * 12}%`} height={11} radius={5} />
              <Skeleton width="100%" height={40} radius={9} />
            </div>
          ))}
        </Frame>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="lynora-dashboard-skeleton" style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="lynora-dashboard-skeleton-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, index) => <Frame key={index} style={{ padding: 16 }}><Skeleton width="52%" height={11} radius={5} /><Skeleton width="64%" height={26} radius={7} style={{ marginTop: 12 }} /><Skeleton width="42%" height={10} radius={5} style={{ marginTop: 8 }} /></Frame>)}
      </div>
      <div className="lynora-dashboard-skeleton-content" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, .6fr)", gap: 16 }}>
        <Frame style={{ padding: 18, minHeight: 300 }}><Skeleton width="32%" height={18} radius={6} style={{ marginBottom: 22 }} /><Skeleton width="100%" height={210} radius={10} /></Frame>
        <Frame style={{ padding: 18 }}><Skeleton width="48%" height={18} radius={6} style={{ marginBottom: 20 }} /><SkeletonText lines={7} lastLineWidth="64%" lineHeight={12} /></Frame>
      </div>
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="lynora-admin-skeleton" style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "240px minmax(0, 1fr)", gap: 18 }}>
      <Frame style={{ padding: 12 }}>
        <Skeleton width="70%" height={22} radius={7} style={{ margin: "4px 0 20px" }} />
        {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} width="100%" height={38} radius={9} style={{ marginBottom: 8 }} />)}
      </Frame>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="lynora-admin-skeleton-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>{Array.from({ length: 4 }).map((_, index) => <Frame key={index} style={{ padding: 16 }}><Skeleton width="56%" height={11} /><Skeleton width="62%" height={24} radius={7} style={{ marginTop: 12 }} /></Frame>)}</div>
        <Frame style={{ padding: 18, minHeight: 360 }}><Skeleton width="34%" height={20} radius={6} style={{ marginBottom: 20 }} /><Skeleton width="100%" height={270} radius={10} /></Frame>
      </div>
    </div>
  );
}

export function CommentarySkeleton({ count = 3, withMedia = false }) {
  return <CommentSkeleton count={count} withMedia={withMedia} />;
}

export function PageSkeleton({ page = "feed", ...props }) {
  const normalizedPage = String(page).toLowerCase();
  if (normalizedPage === "story" || normalizedPage === "stories") return <StorySkeleton {...props} />;
  if (normalizedPage === "message" || normalizedPage === "messages") return <MessageSkeleton {...props} />;
  if (normalizedPage === "groupe" || normalizedPage === "group" || normalizedPage === "groups") return <GroupSkeleton {...props} />;
  if (normalizedPage === "réseau" || normalizedPage === "reseau" || normalizedPage === "network") return <NetworkSkeleton {...props} />;
  if (normalizedPage === "company" || normalizedPage === "companypage") return <CompanyPageSkeleton {...props} />;
  if (normalizedPage === "profile") return <ProfileSkeleton {...props} />;
  if (normalizedPage === "settings") return <SettingsSkeleton {...props} />;
  if (normalizedPage === "admin") return <AdminSkeleton {...props} />;
  if (normalizedPage === "dashboard") return <DashboardSkeleton {...props} />;
  if (normalizedPage === "comment" || normalizedPage === "commentaire" || normalizedPage === "comments") return <CommentarySkeleton {...props} />;
  if (normalizedPage === "notification" || normalizedPage === "notifications") return <NotificationsSkeleton {...props} />;
  if (normalizedPage === "abonnement" || normalizedPage === "subscription") return <SubscriptionSkeleton {...props} />;
  return <FeedSkeleton {...props} />;
}

export function CommentSkeleton({ count = 3, withMedia = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} style={{ display: "flex", gap: 9 }}>
          {/* Avatar */}
          <SkeletonAvatar size={30} radius={10} style={{ flexShrink: 0 }} />
          
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Bulle du commentaire avec header */}
            <div
              style={{
                background: C.base,
                border: `1px solid ${C.line}`,
                borderRadius: 14,
                padding: "8px 13px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {/* Auteur + menu */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <Skeleton width="45%" height={12} radius={5} />
                <Skeleton width={24} height={24} radius={6} style={{ flexShrink: 0 }} />
              </div>

              {/* Texte du commentaire */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Skeleton width="100%" height={11} radius={5} />
                <Skeleton width="92%" height={11} radius={5} />
                <Skeleton width="65%" height={11} radius={5} />
              </div>
            </div>

            {/* Média (optionnel) */}
            {withMedia && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                }}
              >
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} height={100} radius={6} />
                ))}
              </div>
            )}

            {/* Actions en bas */}
            <div style={{ display: "flex", gap: 12, marginLeft: 6, alignItems: "center", fontSize: 11.5 }}>
              <Skeleton width={50} height={10} radius={5} />
              <Skeleton width={60} height={10} radius={5} />
              <Skeleton width={70} height={10} radius={5} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GroupDetailSkeleton() {
  return (
    <div className="lynora-group-detail-skeleton" style={{ maxWidth: 1180, margin: "0 auto", padding: "8px 20px 60px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="lynora-skeleton-detail-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Skeleton width={82} height={36} radius={10} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Skeleton width={90} height={36} radius={10} />
          <Skeleton width={84} height={36} radius={10} />
          <Skeleton width={38} height={36} radius={10} />
        </div>
      </div>

      <div className="lynora-skeleton-detail-header" style={{ borderRadius: 8, border: `1px solid ${C.line}`, overflow: "hidden", background: C.white, boxShadow: "0 18px 45px rgba(15,51,82,0.09)" }}>
        <Skeleton width="100%" height={190} radius={0} />
        <div className="lynora-skeleton-detail-header-body" style={{ padding: "0 24px 24px" }}>
          <div className="lynora-skeleton-detail-header-toprow" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: -28, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3].map((item) => <SkeletonAvatar key={item} size={48} radius={24} style={{ border: `4px solid ${C.white}`, marginLeft: item === 1 ? 0 : -14 }} />)}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {[1, 2].map((item) => <Skeleton key={item} width={72} height={22} radius={8} />)}
            </div>
          </div>

          <Skeleton width={190} height={26} radius={7} style={{ marginBottom: 8 }} />
          <Skeleton width="82%" height={13} radius={5} style={{ marginBottom: 7 }} />
          <Skeleton width="56%" height={12} radius={5} style={{ marginBottom: 18 }} />

          <div className="lynora-skeleton-stat-row" style={{ display: "flex", borderRadius: 8, border: `1px solid ${C.line}`, overflow: "hidden", background: C.baseHi }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={{ flex: "1 1 0", padding: "11px 12px", borderLeft: item === 1 ? "none" : `1px solid ${C.line}` }}>
                <Skeleton width={28} height={28} radius={8} style={{ marginBottom: 6 }} />
                <Skeleton width="55%" height={15} radius={5} />
                <Skeleton width="75%" height={9} radius={4} style={{ marginTop: 5 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lynora-skeleton-detail-tabs" style={{ display: "flex", gap: 18, borderBottom: `1px solid ${C.line}`, padding: "0 4px", overflowX: "auto" }}>
        {[1, 2, 3, 4].map((item) => <Skeleton key={item} width={72} height={34} radius={6} />)}
      </div>

      <div className="lynora-skeleton-detail-columns" style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(0, 2fr)", gap: 16 }}>
        <div className="lynora-skeleton-detail-sidebar" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: 18, border: `1px solid ${C.line}`, borderRadius: 8, background: C.white }}>
            <Skeleton width="30%" height={11} radius={5} style={{ marginBottom: 14 }} />
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: item === 4 ? 0 : 12 }}>
                <Skeleton width={14} height={14} radius={4} />
                <Skeleton width={item % 2 === 0 ? "62%" : "52%"} height={12} radius={5} />
              </div>
            ))}
          </div>

          <div style={{ padding: 18, border: `1px solid ${C.line}`, borderRadius: 8, background: C.white }}>
            <Skeleton width="36%" height={11} radius={5} style={{ marginBottom: 12 }} />
            {[1, 2, 3].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: item === 3 ? 0 : 12 }}>
                <SkeletonAvatar size={30} radius={15} />
                <Skeleton width={item === 1 ? "58%" : item === 2 ? "62%" : "45%"} height={12} radius={5} />
              </div>
            ))}
          </div>
        </div>

        <div className="lynora-skeleton-detail-feed" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2].map((item) => (
            <div key={item} style={{ padding: 16, border: `1px solid ${C.line}`, borderRadius: 8, background: C.white }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <SkeletonAvatar size={38} radius={19} />
                <div style={{ flex: 1 }}>
                  <Skeleton width="42%" height={12} radius={5} />
                  <Skeleton width="28%" height={9} radius={4} style={{ marginTop: 6 }} />
                </div>
              </div>
              <Skeleton width="100%" height={12} radius={5} />
              <Skeleton width="84%" height={12} radius={5} style={{ marginTop: 7 }} />
              <Skeleton width="62%" height={12} radius={5} style={{ marginTop: 7 }} />
              <Skeleton width="100%" height={170} radius={10} style={{ marginTop: 16 }} />
              <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
                <Skeleton width={76} height={24} radius={8} />
                <Skeleton width={76} height={24} radius={8} />
                <Skeleton width={88} height={24} radius={8} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GroupsGridSkeleton({ count = 6 }) {
  return (
    <div className="lynora-groups-grid-skeleton" style={{ width: "100%", minHeight: "100dvh", background: C.navy50 }}>
      <div className="lynora-skeleton-groups-shell" style={{ display: "flex", width: "100%", minHeight: "100dvh" }}>
        <aside className="lynora-skeleton-groups-sidebar" style={{ width: 360, flexShrink: 0, padding: "18px 12px", background: C.white, borderRight: `1px solid ${C.line}`, boxSizing: "border-box" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Skeleton width={110} height={25} radius={7} />
            <Skeleton width={32} height={32} radius={16} />
          </div>
          <Skeleton width="100%" height={40} radius={20} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            {[1, 2, 3].map((item) => <Skeleton key={item} width="100%" height={40} radius={10} />)}
          </div>
          <Skeleton width="100%" height={40} radius={8} style={{ marginTop: 12 }} />
          <Skeleton width={150} height={14} radius={5} style={{ margin: "22px 4px 10px" }} />
          {[1, 2, 3, 4].map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <SkeletonAvatar size={40} radius={8} />
              <Skeleton width="65%" height={12} radius={5} />
            </div>
          ))}
        </aside>

        <main className="lynora-skeleton-groups-content" style={{ flex: 1, minWidth: 0, width: "100%", padding: "20px 28px 64px", boxSizing: "border-box" }}>
          <div className="lynora-skeleton-groups-feed" style={{ width: "100%", maxWidth: 700, margin: 0 }}>
            <div className="lynora-skeleton-menu"><Skeleton width={150} height={42} radius={8} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: 16, border: `1px solid ${C.line}`, borderRadius: 8, background: C.white }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <SkeletonAvatar size={42} radius={21} />
                  <Skeleton width="100%" height={42} radius={22} />
                </div>
                <Skeleton width="100%" height={1} radius={0} style={{ margin: "14px 0 10px" }} />
                <Skeleton width="75%" height={12} radius={5} />
              </div>

              <Skeleton width="38%" height={14} radius={5} />

              <div className="lynora-skeleton-group-cards" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                {Array.from({ length: count }).map((_, i) => (
                  <div key={i} style={{ borderRadius: 8, border: `1px solid ${C.line}`, overflow: "hidden", background: C.white }}>
                    <Skeleton width="100%" height={100} radius={0} />
                    <div style={{ padding: "12px 14px 14px" }}>
                      <Skeleton width="78%" height={15} radius={5} />
                      <Skeleton width="100%" height={11} radius={4} style={{ marginTop: 9 }} />
                      <Skeleton width="58%" height={11} radius={4} style={{ marginTop: 6 }} />
                      <Skeleton width="35%" height={10} radius={4} style={{ marginTop: 14 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Skeleton;

/* ------------------------------------------------------------------ */
/*  EXEMPLES D'UTILISATION                                             */
/* ------------------------------------------------------------------ */
//
// import Skeleton, {
//   SkeletonText, SkeletonAvatar, SkeletonImage, SkeletonVideo,
//   ImageWithSkeleton, VideoWithSkeleton,
//   FeedSkeleton, SkeletonPostCard,
//   LeftSidebarSkeleton, RightSidebarSkeleton, ComposerSkeleton,
//   NetworkSkeleton, NotificationsSkeleton, MessagesSkeleton,
//   CompanySkeleton, ProfileSkeleton, SubscriptionSkeleton,
//   StorySkeleton, SettingsSkeleton, AdminSkeleton, DashboardSkeleton,
//   CommentarySkeleton, PageSkeleton,
// } from "./Skeleton";
//
// // Squelette générique
// <Skeleton width="60%" height={14} radius={6} />
//
// // Chargement réel d'une image de post (avec fondu + gestion d'erreur)
// <ImageWithSkeleton src={post.media[0].url} alt={post.media[0].label} ratio="16/9" />
//
// // Chargement réel d'une vidéo
// <VideoWithSkeleton src={post.media[0].url} poster={post.media[0].poster} />
//
// // Remplace directement <FeedSkeleton count={3} /> déjà utilisé dans LynoraLinkFeed.jsx
