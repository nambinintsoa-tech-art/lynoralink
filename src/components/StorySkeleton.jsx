"use client";

/* ================================================================== */
/*  STORY SKELETON — Squelettes pour le chargement des stories         */
/*  ------------------------------------------------------------------ */
/*  Affiche des cartes squelette qui mimiquent la structure des stories */
/*  - Inclut : skeletons d'images, vidéos, texte, avatar et boutons     */
/*  - Shimmer discret, accessible (aria-busy/live), largeurs stables   */
/* ================================================================== */

import React, { useEffect } from "react";

const C = {
  navy900: "#0F3352",
  navy800: "#1B5386",
  navy700: "#2C6BA0",
  navy600: "#3A7FBE",
  navy100: "#DCE7F1",
  navy50: "#EFF4F9",
  gold400: "#F6D374",
  gold600: "#D9A536",
  white: "#FFFFFF",
  line: "#E3EAF1",
};

const SKELETON_BACKGROUND = C.navy50;

/* ---- Skeleton base component ---- */
function Skeleton({ width = "100%", height = 16, radius = 4, className = "", style = {} }) {
  return (
    <div
      className={`lyn-story-pulse ${className}`}
      style={{
        width,
        height,
        borderRadius: radius,
        background: SKELETON_BACKGROUND,
        animation: "lyn-story-pulse 1.8s ease-in-out infinite",
        boxShadow: `inset 0 0 0 1px ${C.line}`,
        ...style,
      }}
    />
  );
}

/* ---- SkeletonAvatar component ---- */
function SkeletonAvatar({ size = 32, radius, className = "", style = {} }) {
  return (
    <div
      className={`lyn-story-pulse ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? size,
        background: SKELETON_BACKGROUND,
        animation: "lyn-story-pulse 1.8s ease-in-out infinite",
        boxShadow: `inset 0 0 0 1px ${C.line}`,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

function useSkeletonStylesEffect() {
  // Injecte les keyframes du shimmer (une seule fois par document)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "lynora-story-skeleton-keyframes";
    if (document.getElementById(id)) return;
    const tag = document.createElement("style");
    tag.id = id;
    tag.innerHTML = `
      @keyframes lyn-story-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .58; } }
      @media (prefers-reduced-motion: reduce) {
        .lyn-story-pulse { animation: none; background: ${C.navy50}; }
      }
    `;
    document.head.appendChild(tag);
  }, []);
}

export function SkeletonStoryImage({ width = 104, height = 140, radius = 18, className = "", style = {} }) {
  useSkeletonStylesEffect();
  return (
    <Skeleton
      width={width}
      height={height}
      radius={radius}
      className={className}
      style={{ overflow: "hidden", ...style }}
    />
  );
}

export function SkeletonStoryVideo({ width = 104, height = 140, radius = 18, className = "", style = {} }) {
  useSkeletonStylesEffect();
  return (
    <Skeleton
      width={width}
      height={height}
      radius={radius}
      className={className}
      style={{ overflow: "hidden", ...style }}
    />
  );
}

export function SkeletonStoryText({ width = 104, height = 140, radius = 18, className = "", style = {} }) {
  useSkeletonStylesEffect();
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        gap: 6,
        padding: 10,
        background: SKELETON_BACKGROUND,
        boxShadow: `inset 0 0 0 1px ${C.line}`,
        flexShrink: 0,
        ...style,
      }}
    >
      <Skeleton width="90%" height={9} radius={4} />
      <Skeleton width="60%" height={9} radius={4} />
    </div>
  );
}

export function SkeletonStoryAvatar({ size = 32, radius, className = "", style = {} }) {
  useSkeletonStylesEffect();
  return <SkeletonAvatar size={size} radius={radius ?? size} className={className} style={style} />;
}

export function SkeletonStoryAddButton({ size = 22, className = "", style = {} }) {
  useSkeletonStylesEffect();
  return (
    <Skeleton
      width={size}
      height={size}
      radius={999}
      className={className}
      style={{ border: `2px solid ${C.white}`, ...style }}
    />
  );
}

/* ---- SkeletonStoryRail - Rail de stories avec skeletons ---- */

export function SkeletonStoryRail({
  count = 6,
  spacing = 16,
  cardWidth = 128,
  cardHeight = 200,
  showAddButton = true,
  background = C.white,
  className = "",
  loadingLabel = "Chargement des stories…",
}) {
  useSkeletonStylesEffect();

  const cardTypes = ["image", "video", "text"];

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={loadingLabel}
      className={className}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        padding: 24,
        background,
        borderRadius: 20,
        border: `1px solid ${C.line}`,
        boxShadow: "0 4px 12px rgba(6,15,24,0.08)",
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
        minHeight: cardHeight + 48,
      }}
    >
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {loadingLabel}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: spacing, flexWrap: "nowrap" }} aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => {
          const type = cardTypes[i % cardTypes.length];

          if (type === "image") {
            return <SkeletonStoryImage key={i} width={cardWidth} height={cardHeight} radius={18} />;
          }
          if (type === "video") {
            return <SkeletonStoryVideo key={i} width={cardWidth} height={cardHeight} radius={18} />;
          }
          return <SkeletonStoryText key={i} width={cardWidth} height={cardHeight} radius={18} />;
        })}

        {showAddButton && (
          <SkeletonStoryAddButton size={22} style={{ marginLeft: 8 }} />
        )}
      </div>

      {/* Dégradés de bord pour suggérer le défilement horizontal */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 28,
          background: `linear-gradient(90deg, ${background}, rgba(255,255,255,0))`,
          pointerEvents: "none",
          borderTopLeftRadius: 20,
          borderBottomLeftRadius: 20,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: 28,
          background: `linear-gradient(270deg, ${background}, rgba(255,255,255,0))`,
          pointerEvents: "none",
          borderTopRightRadius: 20,
          borderBottomRightRadius: 20,
        }}
      />
    </div>
  );
}
