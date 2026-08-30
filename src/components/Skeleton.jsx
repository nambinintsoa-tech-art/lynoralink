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
.lyn-media-fade { animation: lyn-fade-in .45s ease both; }
.lyn-spin { animation: lyn-spin .9s linear infinite; }
@media (max-width: 900px) {
  .lynora-skeleton-feed-shell { min-height: 100dvh !important; overflow-x: hidden; }
  .lynora-skeleton-feed-grid { grid-template-columns: minmax(0, 1fr) !important; gap: 12px !important; padding: calc(max(96px, var(--lynora-header-offset, 96px)) + 8px) 12px 12px !important; }
  .lynora-skeleton-feed-grid > aside { display: none !important; }
  .lynora-skeleton-fixed-sidebar { display: none !important; }
  .lynora-skeleton-feed-grid > main { width: 100%; }
  .lynora-skeleton-feed-grid { padding: 12px !important; gap: 12px !important; }
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
  .lynora-group-detail-skeleton { padding: 0 0 24px !important; gap: 16px !important; }
  .lynora-group-detail-skeleton > div:first-child { border-radius: 0 !important; }
  .lynora-group-detail-skeleton > div:first-child > .lyn-shimmer { height: 150px !important; }
  .lynora-group-detail-skeleton > div:last-child { display: block !important; }
  .lynora-group-detail-skeleton > div:last-child > div { width: 100% !important; margin-bottom: 16px; }
  .lynora-group-detail-skeleton .lynora-skeleton-stat-row > div { border-left: 0 !important; }
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
      className={`${cls} ${className}`}
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

export function SkeletonPostCard({ media = "none" }) {
  // media: "none" | "image" | "video"
  return (
    <Frame style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <SkeletonAvatar size={44} radius={999} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton width="35%" height={13} radius={6} />
          <Skeleton width="22%" height={10} radius={6} />
        </div>
      </div>
      <SkeletonText lines={3} lastLineWidth="45%" style={{ marginBottom: media !== "none" ? 14 : 4 }} />
      {media === "image" && <SkeletonImage ratio="16/9" />}
      {media === "video" && <SkeletonVideo ratio="16/9" />}
      <div style={{ display: "flex", gap: 18, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
        <Skeleton width={54} height={22} radius={8} />
        <Skeleton width={54} height={22} radius={8} />
        <Skeleton width={54} height={22} radius={8} />
      </div>
    </Frame>
  );
}

function SponsoredSkeletonCard() {
  return (
    <Frame style={{ overflow: "hidden" }}>
      <div style={{ padding: "12px 16px 4px" }}>
        <Skeleton width="34%" height={11} style={{ marginBottom: 10 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SkeletonAvatar size={38} />
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
      <SkeletonImage ratio="16/9" />
      <div style={{ display: "flex", justifyContent: "center", gap: 18, padding: "11px 16px 13px", borderTop: `1px solid ${C.line}` }}>
        <Skeleton width={64} height={14} radius={5} />
        <Skeleton width={58} height={14} radius={5} />
        <Skeleton width={68} height={14} radius={5} />
      </div>
    </Frame>
  );
}

function PageSuggestionsSkeleton() {
  return (
    <Frame style={{ padding: "18px 16px" }}>
      <Skeleton width="42%" height={16} style={{ marginBottom: 16 }} />
      <div className="feed-suggestions-rail" style={{ display: "flex", gap: 12, overflow: "hidden", paddingBottom: 8 }}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} style={{ display: "flex", flex: "0 0 132px", flexDirection: "column", alignItems: "center", gap: 10, padding: 12, border: `1px solid ${C.line}`, borderRadius: 12 }}>
            <SkeletonAvatar size={50} />
            <Skeleton width="82%" height={12} />
            <Skeleton width="66%" height={10} />
            <Skeleton width="100%" height={28} radius={8} />
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function FeedSkeleton({ count = 5 }) {
  const patterns = ["image", "none", "video"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
    <Frame style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <SkeletonAvatar size={42} />
        <Skeleton width="100%" height={38} radius={22} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
        <Skeleton width="100%" height={30} radius={10} />
        <Skeleton width="100%" height={30} radius={10} />
        <Skeleton width="100%" height={30} radius={10} />
      </div>
    </Frame>
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
export function MainFeedSkeleton() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "300px minmax(0,1fr) 320px", gap: 32, alignItems: "start", paddingTop: 28 }} className="lynora-grid lynora-feed-container lynora-skeleton-feed-grid">
      {/* Placeholder gauche */}
      <div className="lynora-sidebar-placeholder" />

      {/* Colonne centrale */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <ComposerSkeleton />
        <FeedSkeleton count={3} />
      </div>

      {/* Placeholder droite */}
      <div className="lynora-sidebar-placeholder" />

      {/* Sidebars sticky en squelette */}
      <div style={{ position: "fixed", top: "calc(var(--lynora-header-offset) + 28px)", left: "calc((100vw - min(1200px, 100vw)) / 2)", width: 300, zIndex: 10 }} className="lynora-sticky-sidebar lynora-fixed-sidebar">
        <LeftSidebarSkeleton />
      </div>

      <div style={{ position: "fixed", top: "calc(var(--lynora-header-offset) + 28px)", right: "calc((100vw - min(1200px, 100vw)) / 2)", width: 320, zIndex: 10 }} className="lynora-sticky-sidebar lynora-fixed-sidebar">
        <RightSidebarSkeleton />
      </div>
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

export function MessagesSkeleton() {
  return (
    <Frame style={{ padding: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ padding: "6px 0 10px" }}>
          <Skeleton width="40%" height={16} />
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
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

export function CreateGroupModalSkeleton() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,51,82,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ background: C.white, borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton width="60%" height={20} radius={8} />
            <Skeleton width="90%" height={12} radius={6} />
          </div>
          <Skeleton width={32} height={32} radius={8} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton width="30%" height={12} radius={5} style={{ marginBottom: 6 }} />
          <Skeleton width="100%" height={38} radius={8} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton width="25%" height={12} radius={5} style={{ marginBottom: 6 }} />
          <Skeleton width="100%" height={80} radius={8} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton width="40%" height={12} radius={5} style={{ marginBottom: 6 }} />
            <Skeleton width="100%" height={38} radius={8} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton width="50%" height={12} radius={5} style={{ marginBottom: 6 }} />
            <Skeleton width="100%" height={38} radius={8} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton width="35%" height={12} radius={5} style={{ marginBottom: 6 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={78} radius={16} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
          <Skeleton width={90} height={38} radius={12} />
          <Skeleton width={120} height={38} radius={12} />
        </div>
      </div>
    </div>
  );
}

export function GroupWorkspaceSkeleton() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 20px 60px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Skeleton width={90} height={90} radius={16} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width="60%" height={22} radius={8} />
          <Skeleton width="90%" height={12} radius={6} />
          <Skeleton width="70%" height={11} radius={5} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, borderBottom: `1px solid ${C.line}`, overflowX: "auto" }}>
        {["Tableau de bord", "Publications", "Membres", "Analytique", "Calendrier", "Documents", "Médias", "Notifications", "Paramètres"].map((tab, i) => (
          <Skeleton key={tab} width={i === 0 ? 110 : 100} height={36} radius={8} style={{ marginBottom: -1 }} />
        ))}
      </div>
      <Frame style={{ padding: 20, minHeight: 300 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton width="40%" height={18} radius={6} style={{ marginBottom: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton width="60%" height={14} radius={5} />
                <Skeleton width="100%" height={32} radius={8} />
              </div>
            ))}
          </div>
        </div>
      </Frame>
      <Frame style={{ padding: 20 }}>
        <Skeleton width="35%" height={16} radius={6} style={{ marginBottom: 12 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: i > 0 ? "12px 0" : "0", borderTop: i > 0 ? `1px solid ${C.line}` : "none" }}>
              <Skeleton width={40} height={40} radius={10} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                <Skeleton width="70%" height={13} radius={5} />
                <Skeleton width="50%" height={11} radius={5} />
              </div>
            </div>
          ))}
        </div>
      </Frame>
    </div>
  );
}

export function GroupDetailSkeleton() {
  return (
    <div className="lynora-group-detail-skeleton" style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 24px 60px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ borderRadius: 20, border: `1px solid ${C.line}`, overflow: "hidden", background: C.white }}>
        <Skeleton width="100%" height={190} radius={0} />
        <div style={{ padding: "0 28px 26px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: -34, marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {[1, 2, 3, 4].map((item) => <SkeletonAvatar key={item} size={48} radius={24} style={{ border: `4px solid ${C.white}`, marginLeft: item === 1 ? 0 : -14 }} />)}
            </div>
            <Skeleton width={220} height={26} radius={14} />
          </div>
          <div style={{ paddingLeft: 16, borderLeft: `3px solid ${C.base}` }}>
            <Skeleton width={150} height={10} radius={5} style={{ marginBottom: 10 }} />
            <Skeleton width="48%" height={30} radius={8} style={{ marginBottom: 10 }} />
            <Skeleton width="78%" height={13} radius={6} style={{ marginBottom: 7 }} />
            <Skeleton width="38%" height={12} radius={6} />
          </div>
          <div className="lynora-skeleton-stat-row" style={{ display: "flex", marginTop: 22, borderRadius: 14, border: `1px solid ${C.line}`, overflow: "hidden", background: C.baseHi }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={{ flex: "1 1 0", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderLeft: item === 1 ? "none" : `1px solid ${C.line}` }}>
                <Skeleton width={34} height={34} radius={10} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}><Skeleton width="55%" height={17} radius={5} /><Skeleton width="75%" height={10} radius={5} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(0, 2fr)", gap: 24 }}>
        <Skeleton width="100%" height={220} radius={16} />
        <Skeleton width="100%" height={360} radius={16} />
      </div>
    </div>
  );
}

export function GroupsGridSkeleton({ count = 6 }) {
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 24px 60px" }}>
      {/* Bandeau hero */}
      <div style={{ borderRadius: 24, padding: "34px 32px", marginBottom: 32, background: `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton width={140} height={20} radius={20} />
            <Skeleton width={260} height={34} radius={8} />
            <Skeleton width={380} height={14} radius={6} />
          </div>
          <Skeleton width={160} height={44} radius={12} />
        </div>
      </div>

      {/* Grille de cartes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: 22 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ borderRadius: 18, border: `1px solid ${C.line}`, overflow: "hidden", background: C.white }}>
            {/* Couverture */}
            <Skeleton width="100%" height={108} radius={0} />
            <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton width="80%" height={16} radius={6} />
              <Skeleton width="100%" height={12} radius={5} />
              <Skeleton width="55%" height={12} radius={5} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <SkeletonAvatar size={22} radius={11} />
                  <SkeletonAvatar size={22} radius={11} />
                  <SkeletonAvatar size={22} radius={11} />
                </div>
                <Skeleton width={96} height={32} radius={8} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DropdownMenuSkeleton() {
  return (
    <div style={{ width: 240, background: C.white, borderRadius: 14, boxShadow: "0 16px 40px rgba(15,51,82,0.3)", border: `1px solid ${C.line}`, overflow: "hidden", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: `1px solid ${C.line}` }}>
        <Skeleton width={40} height={40} radius={999} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
          <Skeleton width="80%" height={13} radius={5} />
          <Skeleton width="60%" height={11} radius={5} />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8 }}>
          <Skeleton width={18} height={18} radius={5} />
          <Skeleton width="70%" height={13} radius={5} />
        </div>
      ))}
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
//   CreateGroupModalSkeleton, GroupWorkspaceSkeleton, DropdownMenuSkeleton,
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
