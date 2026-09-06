"use client";

import { useEffect, useState } from "react";

const COPY = {
  login: { title: "Ouverture de la connexion", detail: "Préparation de votre espace personnel." },
  register: { title: "Création de votre compte", detail: "Préparation de votre inscription." },
};

export default function AuthNavigationTransition({ mode = "login", duration = 700, onComplete }) {
  const [progress, setProgress] = useState(0);
  const copy = COPY[mode] || COPY.login;

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.min(100, Math.round((elapsed / duration) * 100)));
    }, 16);
    const completion = window.setTimeout(() => {
      setProgress(100);
      onComplete?.();
    }, duration);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(completion);
    };
  }, [duration, onComplete]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${copy.title}, ${progress}%`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5000,
        height: 4,
        overflow: "hidden",
        background: "rgba(217, 165, 54, 0.18)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          background: "linear-gradient(90deg, #F6D374, #D9A536)",
          boxShadow: "0 0 12px rgba(217, 165, 54, 0.85)",
          transition: "width 80ms linear",
        }}
      />
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {copy.title}. {copy.detail} {progress}%
      </span>
    </div>
  );
}
