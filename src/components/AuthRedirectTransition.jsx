"use client";

import React, { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  TOKENS — palette LynoraLink                                       */
/* ------------------------------------------------------------------ */
const C = {
  navy900: "#0F3352",
  navy800: "#1B5386",
  navy700: "#2C6BA0",
  gold400: "#F6D374",
  gold600: "#D9A536",
  white: "#FFFFFF",
  ink: "#132433",
};
const navyGrad = `linear-gradient(160deg, ${C.navy700} 0%, ${C.navy900} 100%)`;
const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;

const STYLE_ID = "lynora-auth-transition-keyframes";
const STYLE_CSS = `
@keyframes lyn-auth-badge-in {
  0% { opacity: 0; transform: scale(0.55); }
  60% { opacity: 1; transform: scale(1.06); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes lyn-auth-ring {
  0% { transform: scale(0.9); opacity: 0.55; }
  100% { transform: scale(1.9); opacity: 0; }
}
@keyframes lyn-auth-check {
  from { stroke-dashoffset: 24; }
  to { stroke-dashoffset: 0; }
}
@keyframes lyn-auth-text-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes lyn-auth-bar {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes lyn-auth-exit {
  from { opacity: 1; transform: scale(1); filter: blur(0); }
  to { opacity: 0; transform: scale(1.04); filter: blur(6px); }
}
.lyn-auth-badge { animation: lyn-auth-badge-in .6s cubic-bezier(0.22,1,0.36,1) both; }
.lyn-auth-ring-el { animation: lyn-auth-ring 1.8s cubic-bezier(0.22,1,0.36,1) infinite; }
.lyn-auth-check-path { animation: lyn-auth-check .45s .55s ease forwards; }
.lyn-auth-headline { animation: lyn-auth-text-in .45s .35s cubic-bezier(0.22,1,0.36,1) both; }
.lyn-auth-subline { animation: lyn-auth-text-in .45s .48s cubic-bezier(0.22,1,0.36,1) both; }
.lyn-auth-bar-fill { animation: lyn-auth-bar linear both; transform-origin: left center; }
.lyn-auth-exit { animation: lyn-auth-exit .5s cubic-bezier(0.4,0,1,1) both; }
.lyn-auth-navigation-progress {
  animation: lyn-auth-navigation-progress linear both;
  transform-origin: left center;
}
@keyframes lyn-auth-navigation-progress {
  0% { transform: scaleX(0); opacity: 0.8; }
  85% { transform: scaleX(0.86); opacity: 1; }
  100% { transform: scaleX(1); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .lyn-auth-badge, .lyn-auth-ring-el, .lyn-auth-check-path, .lyn-auth-headline, .lyn-auth-subline, .lyn-auth-bar-fill, .lyn-auth-exit, .lyn-auth-navigation-progress {
    animation: none !important;
  }
}
`;

function useInjectStyles() {
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

const COPY = {
  login: {
    headline: (name) => (name ? `Content de vous revoir, ${name}` : "Content de vous revoir"),
    subline: "Connexion réussie — direction votre fil d'actualité.",
  },
  register: {
    headline: (name) => (name ? `Bienvenue, ${name}` : "Bienvenue sur LynoraLink"),
    subline: "Votre compte est prêt — installons votre espace.",
  },
};

const NAVIGATION_COPY = {
  login: {
    headline: () => "Ouverture de la connexion",
    subline: "Préparation de votre espace personnel.",
  },
  register: {
    headline: () => "Création de votre compte",
    subline: "Préparation de votre inscription.",
  },
};

/**
 * AuthRedirectTransition
 * Overlay plein écran affiché juste après une connexion/inscription réussie,
 * avant la redirection vers l'accueil. Remplace le "cut" brutal par une
 * séquence courte : badge qui apparaît -> coche de confirmation -> message
 * -> barre de progression -> fondu de sortie -> onComplete() (à utiliser
 * pour déclencher router.push/replace côté appelant).
 *
 * @param {"login"|"register"} mode
 * @param {string} [userName]      Prénom affiché dans le message, optionnel
 * @param {number} [duration=1600] Durée totale avant onComplete (ms)
 * @param {() => void} onComplete  Appelé une fois la sortie terminée
 * @param {React.ReactNode} [logo] Logo personnalisé (sinon badge "L" par défaut)
 */
export default function AuthRedirectTransition({
  mode = "login",
  userName = "",
  duration = 1600,
  onComplete,
  logo,
  navigation = false,
}) {
  useInjectStyles();
  const reduced = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const exitTimer = useRef();
  const completeTimer = useRef();

  const copy = (navigation ? NAVIGATION_COPY : COPY)[mode] || COPY.login;
  const exitDelay = reduced ? 0 : Math.max(duration - 480, 300);
  const exitDuration = reduced ? 0 : 500;

  /* ---------- correction : garder l'overlay visible pendant toute la séquence ---------- */
  const [displayed, setDisplayed] = useState(false);
  useEffect(() => {
    /* on force l'affichage immédiatement au montage */
    setDisplayed(true);
    /* puis on programme la sortie */
    exitTimer.current = setTimeout(() => setExiting(true), exitDelay);
    completeTimer.current = setTimeout(() => onComplete?.(), exitDelay + exitDuration);
    return () => {
      clearTimeout(exitTimer.current);
      clearTimeout(completeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (navigation) {
    return (
      <div
        role="progressbar"
        aria-label="Chargement de la page"
        aria-valuemin="0"
        aria-valuemax="100"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          height: 4,
          background: "rgba(217, 165, 54, 0.14)",
          pointerEvents: "none",
        }}
      >
        <div
          className="lyn-auth-navigation-progress"
          style={{
            height: "100%",
            width: "100%",
            background: goldGrad,
            boxShadow: "0 0 14px rgba(246,211,116,0.8)",
            animationDuration: `${duration + 20}ms`,
          }}
        />
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: navyGrad,
        opacity: exiting ? 0 : 1,
        transition: exiting
          ? "opacity .5s cubic-bezier(0.4,0,1,1)"
          : "opacity .35s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <div className={exiting && !reduced ? "lyn-auth-exit" : ""} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Badge + anneaux d'onde + coche */}
      <div style={{ position: "relative", width: 88, height: 88, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!reduced && (
          <>
            <span className="lyn-auth-ring-el" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.gold400}` }} />
            <span className="lyn-auth-ring-el" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.gold400}`, animationDelay: ".6s" }} />
          </>
        )}
        <div
          className={reduced ? "" : "lyn-auth-badge"}
          style={{
            position: "relative",
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: goldGrad,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 12px 30px rgba(217,165,54,0.35)",
          }}
        >
          {logo ? (
            logo
          ) : (
            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 30, color: C.navy900 }}>L</span>
          )}

          {/* Coche de confirmation */}
          <svg
            width="26" height="26" viewBox="0 0 24 24" fill="none"
            style={{ position: "absolute", right: -4, bottom: -4, background: C.white, borderRadius: "50%", padding: 3, boxShadow: "0 4px 10px rgba(15,51,82,0.25)" }}
          >
            <path
              d="M5 12.5l4.2 4.2L19 7"
              stroke={C.navy800}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="24"
              strokeDashoffset={reduced ? 0 : 24}
              className={reduced ? "" : "lyn-auth-check-path"}
            />
          </svg>
        </div>
      </div>

      {/* Messages */}
      <div style={{ textAlign: "center", padding: "0 24px" }}>
        <div className={reduced ? "" : "lyn-auth-headline"} style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 20, color: C.white, marginBottom: 6 }}>
          {copy.headline(userName)}
        </div>
        <div className={reduced ? "" : "lyn-auth-subline"} style={{ fontSize: 13.5, color: "rgba(255,255,255,0.72)" }}>
          {copy.subline}
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{ width: 160, height: 3, borderRadius: 4, background: "rgba(255,255,255,0.16)", overflow: "hidden", marginTop: 4 }}>
        <div
          className={reduced ? "" : "lyn-auth-bar-fill"}
          style={{
            height: "100%",
            width: "100%",
            background: goldGrad,
            borderRadius: 4,
            animationDuration: `${exitDelay}ms`,
            transform: reduced ? "scaleX(1)" : undefined,
          }}
        />
      </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EXEMPLE D'INTÉGRATION — page de login (Next.js / next-auth)       */
/* ------------------------------------------------------------------ */
//
// "use client";
// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { signIn } from "next-auth/react";
// import AuthRedirectTransition from "./AuthRedirectTransition";
//
// export default function LoginPage() {
//   const router = useRouter();
//   const [redirecting, setRedirecting] = useState(false);
//   const [userName, setUserName] = useState("");
//
//   const handleSubmit = async (values) => {
//     const res = await signIn("credentials", { ...values, redirect: false });
//     if (res?.ok) {
//       setUserName(values.firstName || "");
//       setRedirecting(true); // déclenche l'overlay, PAS de router.push ici
//     } else {
//       // afficher l'erreur normalement
//     }
//   };
//
//   return (
//     <>
//       {/* ... formulaire de login existant ... */}
//
//       {redirecting && (
//         <AuthRedirectTransition
//           mode="login"
//           userName={userName}
//           duration={1600}
//           onComplete={() => router.replace("/feed")}
//         />
//       )}
//     </>
//   );
// }
//
// Même principe pour register.jsx avec mode="register", en déclenchant
// l'overlay juste après la création de compte réussie plutôt qu'un
// router.push immédiat — la redirection réelle a lieu dans onComplete,
// une fois l'animation de sortie terminée (pas de coupure brutale).
