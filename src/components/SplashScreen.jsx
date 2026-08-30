"use client";

import React, { useEffect, useState } from "react";
import LogoBadge from "./LogoBadge";

/* ------------------------------------------------------------------ */
/*  TOKENS — identiques au reste de l'application                    */
/* ------------------------------------------------------------------ */
const C = {
  navy900: "#0F3352",
  navy800: "#1B5386",
  navy100: "#DCE7F1",
  navy50: "#EFF4F9",
  muted: "#5C7488",
  gold400: "#F6D374",
  gold600: "#D9A536",
  white: "#FFFFFF",
};
const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;

/* ------------------------------------------------------------------ */
/*  SplashScreen — écran de démarrage affiché au lancement de l'app   */
/* ------------------------------------------------------------------ */
/**
 * @param {() => void} onFinish   Appelé une fois le splash terminé (afficher l'app ou l'écran de connexion à ce moment)
 * @param {number} [duration=2600]  Durée totale en ms avant l'appel à onFinish
 * @param {string} [tagline]     Texte affiché sous le logo
 */
export default function SplashScreen({
  onFinish,
  duration = 2600,
  tagline = "Le réseau professionnel nouvelle génération",
}) {
  const [progressStarted, setProgressStarted] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Démarre l'animation de la barre au frame suivant (pour permettre la transition CSS)
    const raf = requestAnimationFrame(() => setProgressStarted(true));
    const toFade = setTimeout(() => setFadingOut(true), duration - 400);
    const toFinish = setTimeout(() => onFinish?.(), duration);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(toFade);
      clearTimeout(toFinish);
    };
  }, [duration, onFinish]);

  return (
    <div
      role="status"
      aria-label="Chargement de l'application"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: C.white,
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
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');

        @keyframes lyn-sp-drift-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(18px, -14px) scale(1.08); }
        }
        @keyframes lyn-sp-drift-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-16px, 12px) scale(1.06); }
        }
        @keyframes lyn-sp-ring {
          0%   { transform: scale(0.85); opacity: 0; }
          40%  { opacity: .5; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes lyn-sp-logo-in {
          0%   { opacity: 0; transform: scale(.5) translateY(6px); }
          65%  { opacity: 1; transform: scale(1.05) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes lyn-sp-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lyn-sp-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(220%); }
        }
        .lyn-sp-field-a { animation: lyn-sp-drift-a 9s ease-in-out infinite; }
        .lyn-sp-field-b { animation: lyn-sp-drift-b 11s ease-in-out infinite; }
        .lyn-sp-ring-1 { animation: lyn-sp-ring 2.8s cubic-bezier(0.22,1,0.36,1) infinite; }
        .lyn-sp-ring-2 { animation: lyn-sp-ring 2.8s cubic-bezier(0.22,1,0.36,1) infinite 1.4s; }
        .lyn-sp-logo { animation: lyn-sp-logo-in .75s cubic-bezier(0.22,1,0.36,1) both; }
        .lyn-sp-name { animation: lyn-sp-fade-up .55s ease .3s both; }
        .lyn-sp-tagline { animation: lyn-sp-fade-up .55s ease .45s both; }
        .lyn-sp-bar { animation: lyn-sp-fade-up .55s ease .58s both; }
        .lyn-sp-shimmer { animation: lyn-sp-shimmer 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .lyn-sp-field-a, .lyn-sp-field-b, .lyn-sp-ring-1, .lyn-sp-ring-2, .lyn-sp-shimmer { animation: none !important; }
          .lyn-sp-logo, .lyn-sp-name, .lyn-sp-tagline, .lyn-sp-bar { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* Champs de couleur décoratifs, très doux sur fond blanc */}
      <div className="lyn-sp-field-a" style={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold400} 0%, rgba(246,211,116,0) 70%)`, opacity: 0.16, filter: "blur(60px)", top: "-14%", right: "-10%" }} />
      <div className="lyn-sp-field-b" style={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", background: `radial-gradient(circle, ${C.navy800} 0%, rgba(27,83,134,0) 70%)`, opacity: 0.08, filter: "blur(60px)", bottom: "-14%", left: "-10%" }} />

      {/* Logo, anneaux pulsés et halo doré */}
      <div style={{ position: "relative", width: 168, height: 168, marginBottom: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="lyn-sp-ring-1" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.gold600}` }} />
        <span className="lyn-sp-ring-2" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.gold600}` }} />
        <div style={{ position: "absolute", inset: 14, borderRadius: "50%", background: `radial-gradient(circle, rgba(246,211,116,0.35) 0%, rgba(246,211,116,0) 72%)` }} />
        <div
          className="lyn-sp-logo"
          style={{
            position: "relative",
            width: 116,
            height: 116,
            borderRadius: 28,
            background: C.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 18px 40px -14px rgba(15,51,82,0.28), 0 2px 8px rgba(15,51,82,0.08)",
          }}
        >
          <LogoBadge size={104} />
        </div>
      </div>

      {/* Nom de l'app */}
      <div className="lyn-sp-name" style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 30, letterSpacing: "-0.01em", marginBottom: 10 }}>
        <span style={{ color: C.navy900 }}>Lynora</span>
        <span style={{ color: C.gold600 }}>Link</span>
      </div>

      {/* Accroche */}
      {tagline && (
        <div className="lyn-sp-tagline" style={{ fontSize: 14, fontWeight: 500, color: C.muted, marginBottom: 40, textAlign: "center", maxWidth: 300 }}>
          {tagline}
        </div>
      )}

      {/* Barre de progression */}
      <div className="lyn-sp-bar" style={{ position: "relative", width: 180, height: 4, borderRadius: 4, background: C.navy100, overflow: "hidden" }}>
        <div
          style={{
            position: "relative",
            height: "100%",
            width: progressStarted ? "100%" : "0%",
            background: goldGrad,
            borderRadius: 4,
            overflow: "hidden",
            transition: `width ${Math.max(duration - 400, 200)}ms linear`,
          }}
        >
          <span
            className="lyn-sp-shimmer"
            style={{
              position: "absolute",
              inset: 0,
              width: "40%",
              background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0) 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
