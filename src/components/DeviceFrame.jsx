"use client";

/**
 * DeviceFrame.jsx — LynoraLink
 * ─────────────────────────────────────────────────────────────────────────
 * Pourquoi ce composant existe
 * ─────────────────────────────
 * Rétrécir la fenêtre du navigateur sur desktop NE simule PAS un vrai
 * téléphone, pour une raison technique précise et pas juste "visuelle" :
 *
 *   - Les unités `vh`, `dvh`, `vw` (utilisées partout dans PostCard.jsx et
 *     PostViewerPreview.jsx : safe-area, hauteur de la modale, hauteur des
 *     médias…) sont calculées par rapport au VIEWPORT RÉEL de la fenêtre du
 *     navigateur. Si vous réduisez juste la largeur de la fenêtre sans
 *     changer sa hauteur, `100dvh` continue de valoir la hauteur (grande)
 *     de votre écran desktop, pas 844px comme sur un iPhone.
 *   - Il n'y a pas de vrai `hover` sur un téléphone (voir les correctifs
 *     apportés aux reaction pickers), et un simple rétrécissement de
 *     fenêtre desktop garde la souris active → les bugs tactiles restent
 *     invisibles.
 *   - Le clavier virtuel, les barres d'adresse qui rétrécissent au scroll,
 *     l'encoche (`env(safe-area-inset-*)`) n'existent pas non plus.
 *
 * Ce composant charge votre page dans un <iframe>, qui crée une VRAIE
 * fenêtre de navigation isolée avec ses propres dimensions (390×844 par
 * défaut = iPhone 14/15). À l'intérieur, `100dvh` vaut vraiment 844px,
 * les media queries à 900px/420px se déclenchent normalement, etc.
 *
 * ⚠️ Ce composant ne remplace pas un vrai test sur téléphone physique
 * (absence de vrai tactile, de vrai clavier virtuel, de vraies performances
 * réseau). C'est un aperçu fiable en développement — voir le README pour
 * tester sur un téléphone réel via le réseau local.
 *
 * Usage
 * ─────
 *   <DeviceFrame src="http://localhost:3000/feed?preview=post-viewer">
 *   <DeviceFrame src="/mon-composant-preview" device="iphone15" />
 *   <DeviceFrame src="..." device="pixel8" orientation="landscape" />
 */

import React, { useState } from "react";

const DEVICES = {
  desktop: { label: "Navigateur desktop", width: 1440, height: 900, radius: 10, notch: "none", browser: true },
  iphone15: { label: "iPhone 15", width: 393, height: 852, radius: 46, notch: "dynamic-island" },
  iphone15ProMax: { label: "iPhone 15 Pro Max", width: 430, height: 932, radius: 48, notch: "dynamic-island" },
  iphone12Mini: { label: "iPhone 12 mini", width: 360, height: 780, radius: 40, notch: "dynamic-island" },
  iphoneSE: { label: "iPhone SE", width: 375, height: 667, radius: 34, notch: "none" },
  pixel8: { label: "Pixel 8", width: 412, height: 915, radius: 36, notch: "punch-hole" },
  pixel9: { label: "Pixel 9", width: 412, height: 915, radius: 36, notch: "punch-hole" },
  galaxyS23: { label: "Galaxy S23", width: 360, height: 780, radius: 36, notch: "punch-hole" },
  galaxyA54: { label: "Galaxy A54", width: 412, height: 915, radius: 32, notch: "punch-hole" },
  xiaomi14: { label: "Xiaomi 14", width: 400, height: 860, radius: 34, notch: "punch-hole" },
};

export default function DeviceFrame({
  src,
  device = "iphone15",
  orientation = "portrait",
  label,
  scale = 1,
}) {
  const [loaded, setLoaded] = useState(false);
  const spec = DEVICES[device] || DEVICES.iphone15;
  const isBrowser = spec.browser === true;
  const w = isBrowser ? spec.width : (orientation === "landscape" ? spec.height : spec.width);
  const h = isBrowser ? spec.height : (orientation === "landscape" ? spec.width : spec.height);

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10, fontFamily: "-apple-system, 'Segoe UI', sans-serif" }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#5C7488", letterSpacing: ".02em" }}>
        {label || spec.label} · {w}×{h}
      </div>

      <div
        style={{
          position: "relative",
          width: w * scale,
          height: h * scale,
          flexShrink: 0,
        }}
      >
        {/* Coque */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: spec.radius * scale,
            background: isBrowser ? "#d7e0e8" : "#111318",
            boxShadow: "0 30px 60px -12px rgba(15,51,82,0.35), 0 0 0 1px rgba(15,51,82,0.06)",
            padding: isBrowser ? 8 * scale : 10 * scale,
          }}
        >
          {/* Écran = vraie fenêtre de navigation isolée */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: (isBrowser ? 5 : spec.radius - 8) * scale,
              overflow: "hidden",
              background: isBrowser ? "#fff" : "#000",
            }}
          >
            {!loaded && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 12,
                  zIndex: 2,
                }}
              >
                Chargement…
              </div>
            )}
            <iframe
              title={label || spec.label}
              src={src}
              onLoad={(event) => {
                setLoaded(true);
                event.currentTarget.contentDocument?.documentElement.setAttribute("data-device-preview", "true");
              }}
              style={{
                width: w,
                height: h,
                border: "none",
                display: "block",
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />

            {isBrowser && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 8 * scale,
                  background: "#d7e0e8",
                  zIndex: 3,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Encoche / île dynamique (purement visuelle) */}
            {spec.notch === "dynamic-island" && (
              <div
                style={{
                  position: "absolute",
                  top: 11 * scale,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 100 * scale,
                  height: 26 * scale,
                  borderRadius: 20 * scale,
                  background: "#000",
                  zIndex: 3,
                  pointerEvents: "none",
                }}
              />
            )}
            {spec.notch === "punch-hole" && (
              <div
                style={{
                  position: "absolute",
                  top: 12 * scale,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 10 * scale,
                  height: 10 * scale,
                  borderRadius: "50%",
                  background: "#000",
                  zIndex: 3,
                  pointerEvents: "none",
                }}
              />
            )}

            {!isBrowser && (
              <div
                style={{
                  position: "absolute",
                  bottom: 7 * scale,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 120 * scale,
                  height: 4 * scale,
                  borderRadius: 3 * scale,
                  background: "rgba(255,255,255,0.55)",
                  zIndex: 3,
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        </div>

        {/* Bouton latéral (purement décoratif) */}
        {!isBrowser && <div
          style={{
            position: "absolute",
            right: -2 * scale,
            top: 90 * scale,
            width: 3 * scale,
            height: 70 * scale,
            borderRadius: 2,
            background: "#1a1d24",
          }}
        />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MULTI-DEVICE ROW — pour comparer plusieurs appareils côte à côte  */
/* ------------------------------------------------------------------ */
export function DeviceFrameRow({ src, devices = ["iphoneSE", "iphone15", "pixel8"], scale = 0.85 }) {
  return (
    <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start", padding: 20 }}>
      {devices.map((d) => (
        <DeviceFrame key={d} src={src} device={d} scale={scale} />
      ))}
    </div>
  );
}
