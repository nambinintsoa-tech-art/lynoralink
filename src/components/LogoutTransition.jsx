"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import LogoBadge from "./LogoBadge";

/* ------------------------------------------------------------------ */
/*  TOKENS — identiques au reste de l'application                    */
/* ------------------------------------------------------------------ */
const C = {
  navy900: "#0F3352",
  navy800: "#1B5386",
  gold400: "#F6D374",
  gold600: "#D9A536",
  white: "#FFFFFF",
};
const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;

const LT_STYLE_ID = "lynora-logout-transition-keyframes";
const LT_STYLE_CSS = `
@keyframes lyn-lt-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes lyn-lt-spin { to { transform: rotate(360deg); } }
@keyframes lyn-lt-pop { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes lyn-lt-text-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.lyn-lt-root { animation: lyn-lt-fade-in .35s ease both; }
.lyn-lt-ring { animation: lyn-lt-spin 1s linear infinite; }
.lyn-lt-check { animation: lyn-lt-pop .45s cubic-bezier(0.34,1.56,0.64,1) both; }
.lyn-lt-text { animation: lyn-lt-text-in .35s ease both; }
@media (prefers-reduced-motion: reduce) {
  .lyn-lt-ring { animation: none; }
  .lyn-lt-check, .lyn-lt-text, .lyn-lt-root { animation: none !important; }
}
`;

/* injection synchrone : les keyframes doivent exister avant le premier rendu */
if (typeof document !== "undefined" && !document.getElementById(LT_STYLE_ID)) {
  const tag = document.createElement("style");
  tag.id = LT_STYLE_ID;
  tag.textContent = LT_STYLE_CSS;
  document.head.appendChild(tag);
}

/* ------------------------------------------------------------------ */
/*  LogoutTransition — écran plein écran affiché pendant la déconnexion */
/* ------------------------------------------------------------------ */
/**
 * @param {string} [userName]     Prénom de l'utilisateur qui se déconnecte
 * @param {() => void} onComplete Appelé une fois la transition terminée (à utiliser pour rediriger vers /login)
 * @param {number} [duration=2200] Durée totale de la transition en ms
 */
export default function LogoutTransition({ userName, onComplete, duration = 2200 }) {
  const [phase, setPhase] = useState("leaving"); // "leaving" -> "done"
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const toDone = setTimeout(() => setPhase("done"), duration * 0.55);
    const toFade = setTimeout(() => setFadingOut(true), duration - 400);
    const toComplete = setTimeout(() => onComplete?.(), duration);
    return () => {
      clearTimeout(toDone);
      clearTimeout(toFade);
      clearTimeout(toComplete);
    };
  }, [duration, onComplete]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: navyGrad,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif",
        opacity: fadingOut ? 0 : 1,
        transition: "opacity .4s ease",
      }}
    >

      <div className="lyn-lt-root" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Badge + anneau / coche */}
        <div style={{ position: "relative", width: 104, height: 104, marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {phase === "leaving" && (
            <div
              className="lyn-lt-ring"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.16)",
                borderTopColor: C.gold400,
              }}
            />
          )}
          {phase === "done" && (
            <div
              className="lyn-lt-check"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "rgba(246,211,116,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={46} color={C.gold400} strokeWidth={1.8} />
            </div>
          )}
          <div style={{ opacity: phase === "done" ? 0 : 1, transition: "opacity .25s ease" }}>
            <LogoBadge size={48} />
          </div>
        </div>

        {/* Texte */}
        <div key={phase} className="lyn-lt-text" style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 20, color: C.white, marginBottom: 6 }}>
            {phase === "leaving" ? "Déconnexion en cours…" : `À bientôt${userName ? `, ${userName}` : ""} !`}
          </div>
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.68)" }}>
            {phase === "leaving" ? "Merci d'avoir utilisé LynoraLink." : "Vous êtes maintenant déconnecté·e en toute sécurité."}
          </div>
        </div>
      </div>
    </div>
  );
}
