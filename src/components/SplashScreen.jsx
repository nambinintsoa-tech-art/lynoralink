"use client";

import React, { useEffect, useRef, useState } from "react";
import LogoBadge from "./LogoBadge";

/* ------------------------------------------------------------------ */
/*  TOKENS — identiques au reste de l'application                    */
/* ------------------------------------------------------------------ */
const C = {
  navy900: "#0F3352",
  navy800: "#1B5386",
  navy50: "#EFF4F9",
  muted: "#5C7488",
  gold400: "#F6D374",
  gold600: "#D9A536",
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
        @keyframes lyn-sp-letter-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lyn-sp-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lyn-sp-dot {
          0%, 60%, 100% { opacity: .28; transform: scale(.72); }
          30%           { opacity: 1; transform: scale(1); }
        }
        .lyn-sp-field-a { animation: lyn-sp-drift-a 9s ease-in-out infinite; }
        .lyn-sp-field-b { animation: lyn-sp-drift-b 11s ease-in-out infinite; }
        .lyn-sp-ring-1 { animation: lyn-sp-ring 2.8s cubic-bezier(0.22,1,0.36,1) infinite; }
        .lyn-sp-ring-2 { animation: lyn-sp-ring 2.8s cubic-bezier(0.22,1,0.36,1) infinite 1.4s; }
        .lyn-sp-logo { animation: lyn-sp-logo-in .75s cubic-bezier(0.22,1,0.36,1) both; }
        .lyn-sp-name { display: inline-flex; }
        .lyn-sp-letter { display: inline-block; opacity: 0; animation: lyn-sp-letter-in .42s cubic-bezier(0.22,1,0.36,1) both; }
        .lyn-sp-tagline { animation: lyn-sp-fade-up .55s ease .45s both; }
        .lyn-sp-bar { animation: lyn-sp-fade-up .55s ease .58s both; }
        .lyn-sp-dot { animation: lyn-sp-dot 1.2s ease-in-out infinite; }
        .lyn-sp-dot:nth-child(2) { animation-delay: .12s; }
        .lyn-sp-dot:nth-child(3) { animation-delay: .24s; }
        .lyn-sp-dot:nth-child(4) { animation-delay: .36s; }
        .lyn-sp-dot:nth-child(5) { animation-delay: .48s; }
        .lyn-sp-dot:nth-child(6) { animation-delay: .60s; }
        @media (prefers-reduced-motion: reduce) {
          .lyn-sp-field-a, .lyn-sp-field-b, .lyn-sp-ring-1, .lyn-sp-ring-2, .lyn-sp-dot { animation: none !important; }
          .lyn-sp-logo, .lyn-sp-name, .lyn-sp-tagline, .lyn-sp-bar { animation: none !important; opacity: 1 !important; transform: none !important; }
          .lyn-sp-letter { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* Champs de couleur décoratifs, très doux sur fond blanc */}
      <div className="lyn-sp-field-a" style={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold400} 0%, rgba(246,211,116,0) 70%)`, opacity: 0.16, filter: "blur(60px)", top: "-14%", right: "-10%" }} />
      <div className="lyn-sp-field-b" style={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", background: `radial-gradient(circle, ${C.navy800} 0%, rgba(27,83,134,0) 70%)`, opacity: 0.08, filter: "blur(60px)", bottom: "-14%", left: "-10%" }} />

      {/* Logo, anneaux pulsés et halo doré */}
      <div style={{ position: "relative", width: 200, height: 200, marginBottom: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="lyn-sp-ring-1" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.gold600}` }} />
        <span className="lyn-sp-ring-2" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.gold600}` }} />
        <div style={{ position: "absolute", inset: 14, borderRadius: "50%", background: `radial-gradient(circle, rgba(246,211,116,0.35) 0%, rgba(246,211,116,0) 72%)` }} />
        <div
          className="lyn-sp-logo"
          style={{
            position: "relative",
            width: 152,
            height: 152,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LogoBadge size={144} />
        </div>
      </div>

      {/* Nom de l'app */}
      <div className="lyn-sp-name" style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 30, letterSpacing: "-0.01em", marginBottom: 10 }}>
        {[..."Lynora"].map((letter, index) => (
          <span key={`lynora-${index}`} className="lyn-sp-letter" style={{ color: C.navy900, animationDelay: `${300 + index * 55}ms` }}>
            {letter}
          </span>
        ))}
        {[..."Link"].map((letter, index) => (
          <span key={`link-${index}`} className="lyn-sp-letter" style={{ color: C.gold600, animationDelay: `${630 + index * 55}ms` }}>
            {letter}
          </span>
        ))}
      </div>

      {/* Accroche */}
      {tagline && (
        <div className="lyn-sp-tagline" style={{ fontSize: 14, fontWeight: 500, color: C.muted, marginBottom: 40, textAlign: "center", maxWidth: 300 }}>
          {tagline}
        </div>
      )}

      {/* Indicateur de chargement en points, comme Facebook */}
      <div className="lyn-sp-bar" aria-label="Chargement" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, height: 16 }}>
        {[0, 1, 2, 3, 4, 5].map((dot) => (
          <span
            key={dot}
            className="lyn-sp-dot"
            aria-hidden="true"
            style={{ width: 7, height: 7, borderRadius: "50%", background: dot === 1 ? C.gold600 : C.navy800 }}
          />
        ))}
      </div>
    </div>
  );
}
