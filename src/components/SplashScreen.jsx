"use client";

import React, { useEffect, useRef, useState } from "react";
/* ------------------------------------------------------------------ */
/*  TOKENS — identiques au reste de l'application                    */
/* ------------------------------------------------------------------ */
const C = {
  navy900: "#152A4D",
  navy800: "#152A4D",
  gold600: "#D9A441",
  white: "#FFFFFF",
};

/* ------------------------------------------------------------------ */
/*  SplashScreen — écran de démarrage affiché au lancement de l'app   */
/* ------------------------------------------------------------------ */
/**
 * @param {() => void} onFinish   Appelé une fois le splash terminé (afficher l'app ou l'écran de connexion à ce moment)
 * @param {number} [duration=2600]  Durée totale en ms avant l'appel à onFinish
 * @param {string} [tagline]     Texte affiché sous le logo
 * @param {boolean} [isReady=true]  Autorise la fin une fois l'authentification prête
 */
export default function SplashScreen({
  onFinish,
  duration = 2600,
  tagline = "Le réseau professionnel nouvelle génération",
  isReady = true,
}) {
  const [fadingOut, setFadingOut] = useState(false);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    if (!isReady) return undefined;

    const remaining = Math.max(0, duration - (Date.now() - startedAtRef.current));
    const finishDelay = Math.max(remaining, 400);
    const toFade = setTimeout(() => setFadingOut(true), finishDelay - 400);
    const toFinish = setTimeout(() => onFinish?.(), finishDelay);
    return () => {
      clearTimeout(toFade);
      clearTimeout(toFinish);
    };
  }, [duration, isReady, onFinish]);

  return (
    <div
      role="status"
      aria-label="Chargement de l'application"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: C.navy900,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif",
        opacity: fadingOut ? 0 : 1,
        transition: "opacity .4s ease",
      }}
    >
      <style suppressHydrationWarning>{`

        @keyframes lyn-sp-logo-in {
          0%   { opacity: 0; transform: scale(.6) translateY(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes lyn-sp-dot {
          0%, 60%, 100% { opacity: .28; transform: scale(.72); }
          30%           { opacity: 1; transform: scale(1); }
        }
        @keyframes lyn-sp-dots-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .lyn-sp-logo { animation: lyn-sp-logo-in .65s cubic-bezier(0.22,1,0.36,1) both; }
        .lyn-sp-dots { animation: lyn-sp-dots-in .2s ease .65s both; }
        .lyn-sp-dot { animation: lyn-sp-dot 1.2s ease-in-out infinite; }
        .lyn-sp-dot:nth-child(2) { animation-delay: .12s; }
        .lyn-sp-dot:nth-child(3) { animation-delay: .24s; }
        .lyn-sp-dot:nth-child(4) { animation-delay: .36s; }
        .lyn-sp-dot:nth-child(5) { animation-delay: .48s; }
        .lyn-sp-dot:nth-child(6) { animation-delay: .60s; }
        @media (prefers-reduced-motion: reduce) {
          .lyn-sp-logo, .lyn-sp-dots, .lyn-sp-dot { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      <div style={{ position: "relative", width: 170, height: 170, marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          className="lyn-sp-logo"
          style={{
            position: "relative",
            width: 122,
            height: 122,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img src="/logo_lynora.svg" alt="LynoraLink" width="118" height="118" style={{ display: "block" }} />
        </div>
      </div>

      {/* Indicateur de chargement en points, comme Facebook */}
      <div className="lyn-sp-dots" aria-label="Chargement" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 16 }}>
        {[0, 1, 2, 3, 4, 5].map((dot) => (
          <span
            key={dot}
            className="lyn-sp-dot"
            aria-hidden="true"
            style={{ width: 8, height: 8, borderRadius: "50%", background: dot === 1 ? C.gold600 : C.white }}
          />
        ))}
      </div>
    </div>
  );
}
