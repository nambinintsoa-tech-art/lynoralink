import React from "react";

/* ------------------------------------------------------------------ */
/*  TOKENS — identiques à Message.jsx pour rester cohérent            */
/* ------------------------------------------------------------------ */
const C = {
  navy100: "#DCE7F1",
  navy50: "#EFF4F9",
  line: "#E3EAF1",
  white: "#FFFFFF",
};

/**
 * Bloc de base qui affiche l'effet "shimmer" (reflet qui balaie la zone).
 * Sert de brique pour construire n'importe quelle forme de squelette.
 */
function Bone({ width = "100%", height = 12, radius = 6, style = {} }) {
  return (
    <div
      className="lynora-skeleton-bone"
      style={{
        width,
        height,
        borderRadius: radius,
        background: C.navy50,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/**
 * Une ligne de conversation en cours de chargement — même gabarit que la
 * carte réelle (avatar rond + nom + aperçu + colonne heure/badge) pour que
 * le passage squelette → contenu ne "saute" pas visuellement.
 */
function SkeletonRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 10px", borderRadius: 14 }}>
      <Bone width={44} height={44} radius="50%" />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <Bone width="46%" height={11} radius={5} />
        <Bone width="78%" height={10} radius={5} style={{ background: C.line }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
        <Bone width={26} height={8} radius={4} />
        <Bone width={18} height={18} radius="50%" style={{ background: C.line }} />
      </div>
    </div>
  );
}

/**
 * Squelette de la liste des conversations — à afficher pendant le chargement
 * initial (avant que les conversations n'arrivent du serveur).
 *
 * Usage :
 *   {loading ? <SkeletonMessage count={6} /> : <ConversationListModal ... />}
 */
export default function SkeletonMessage({ count = 6 }) {
  return (
    <div style={{ padding: "4px 6px 8px" }} aria-busy="true" aria-label="Chargement des conversations">
      <style>{`
        @keyframes lynoraShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .lynora-skeleton-bone::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.75) 50%,
            rgba(255,255,255,0) 100%
          );
          animation: lynoraShimmer 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .lynora-skeleton-bone::after { animation: none; }
        }
      `}</style>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function ChatSkeleton({ count = 6 }) {
  return (
    <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 12 }} aria-busy="true" aria-label="Chargement de la conversation">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: "flex", justifyContent: i % 2 ? "flex-end" : "flex-start" }}>
          <Bone width={i % 2 ? "58%" : "66%"} height={i % 3 === 0 ? 42 : 28} radius={14} />
        </div>
      ))}
    </div>
  );
}

/* Export nommé pour réutiliser une seule ligne ailleurs (ex: pagination "charger plus") */
export { SkeletonRow };
