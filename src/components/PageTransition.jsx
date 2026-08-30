"use client";

import React, { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  PageTransition — transition fluide entre vues (feed / profile /   */
/*  network / etc.) et entre panneaux (messages / notifications).     */
/*                                                                     */
/*  Sans dépendance externe (pas de framer-motion) : uniquement du    */
/*  CSS + un peu de state React. S'adapte à la palette LynoraLink et  */
/*  respecte prefers-reduced-motion.                                  */
/* ------------------------------------------------------------------ */

const GOLD = "linear-gradient(90deg, #F6D374 0%, #D9A536 100%)";

const VARIANTS = {
  // Changement de vue principale (feed -> profil -> réseau, etc.)
  "fade-slide": {
    enterFrom: "translateY(10px) scale(0.99)",
    exitTo: "translateY(-8px) scale(0.99)",
  },
  // Ouverture de panneaux latéraux (messages, notifications)
  "slide-right": {
    enterFrom: "translateX(24px)",
    exitTo: "translateX(24px)",
  },
  // Modales plein écran (composer, article reader, viewer)
  "scale-fade": {
    enterFrom: "translateY(16px) scale(0.97)",
    exitTo: "translateY(6px) scale(0.98)",
  },
};

let idCounter = 0;

export default function PageTransition({
  activeKey,
  children,
  variant = "fade-slide",
  duration = 380,
  className,
  style,
  disableTransform = false,
}) {
  const cfg = VARIANTS[variant] || VARIANTS["fade-slide"];
  const enterFrom = disableTransform ? "none" : cfg.enterFrom;
  const exitTo = disableTransform ? "none" : cfg.exitTo;
  const uid = useRef(`pt-${++idCounter}`).current;

  const prevRef = useRef({ key: activeKey, node: children });
  const [current, setCurrent] = useState({ key: activeKey, node: children });
  const [outgoing, setOutgoing] = useState(null);
  const timeoutRef = useRef();
  const reducedMotion = useRef(
    typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ).current;

  useEffect(() => {
    if (activeKey === prevRef.current.key) {
      // Même vue : on met à jour le contenu sans relancer l'animation.
      prevRef.current.node = children;
      setCurrent((c) => ({ ...c, node: children }));
      return;
    }

    if (reducedMotion) {
      prevRef.current = { key: activeKey, node: children };
      setCurrent({ key: activeKey, node: children });
      return;
    }

    setOutgoing(prevRef.current);
    setCurrent({ key: activeKey, node: children });
    prevRef.current = { key: activeKey, node: children };

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOutgoing(null), duration);
    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      <style>{`
        @keyframes ${uid}-in {
          from { opacity: 0; transform: ${enterFrom}; filter: blur(2px); }
          to   { opacity: 1; transform: ${disableTransform ? "none" : "translateY(0) translateX(0) scale(1)"}; filter: blur(0); }
        }
        @keyframes ${uid}-out {
          from { opacity: 1; transform: translateY(0) translateX(0) scale(1); filter: blur(0); }
          to   { opacity: 0; transform: ${exitTo}; filter: blur(2px); }
        }
        @keyframes ${uid}-thread {
          0%   { transform: scaleX(0); opacity: 1; }
          60%  { transform: scaleX(1); opacity: 1; }
          100% { transform: scaleX(1); opacity: 0; }
        }
        .${uid}-enter {
          animation: ${uid}-in ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .${uid}-exit {
          position: absolute;
          inset: 0;
          animation: ${uid}-out ${Math.round(duration * 0.7)}ms cubic-bezier(0.4, 0, 1, 1) both;
          pointer-events: none;
        }
        .${uid}-thread {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: ${GOLD};
          transform-origin: left center;
          animation: ${uid}-thread ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) both;
          border-radius: 2px;
        }
      `}</style>

      {outgoing && (
        <div key={outgoing.key} className={`${uid}-exit`}>
          {outgoing.node}
        </div>
      )}

      <div key={current.key} className={reducedMotion ? "" : `${uid}-enter`}>
        {outgoing && !reducedMotion && <div className={`${uid}-thread`} />}
        {current.node}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EXEMPLE D'INTÉGRATION dans LynoraLinkFeed.jsx                     */
/* ------------------------------------------------------------------ */
//
// import PageTransition from "./PageTransition";
//
// Remplacer les blocs `{view === "x" && (...)}` juxtaposés par un seul
// wrapper garant de la transition, en lui donnant le contenu courant :
//
//   const renderView = () => {
//     if (view === "feed") return (/* ... markup feed ... */);
//     if (view === "profile") return <ProfileLynoraLink />;
//     if (view === "settings") return <SettingsLynora />;
//     if (view === "network") return (/* ... markup réseau ... */);
//     // ...
//     return null;
//   };
//
//   <PageTransition activeKey={view} variant="fade-slide">
//     {renderView()}
//   </PageTransition>
//
// Pour les panneaux latéraux (messages / notifications), utiliser le
// variant "slide-right" en clé sur le type de panneau ouvert :
//
//   <PageTransition
//     activeKey={messagesModalOpen ? "messages" : notificationsModalOpen ? "notifications" : "none"}
//     variant="slide-right"
//     duration={320}
//   >
//     {messagesModalOpen && <MessagesPage ... />}
//     {notificationsModalOpen && <NotificationPage ... />}
//   </PageTransition>
//
// Pour les modales plein écran (CreatePostModal, ArticleReader,
// PostViewerPreview), variant="scale-fade" avec activeKey = l'id ouvert.
