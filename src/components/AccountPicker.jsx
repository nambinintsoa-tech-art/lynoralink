import React, { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Trash2 } from "lucide-react";

/**
 * AccountPicker — LynoraLink
 * Carte unique, resserrée, centrée dans un décor de page (maillage de points
 * reliés + halos de couleur), cohérente du mobile au desktop sans variante
 * "à trous" (pas de blocs entiers masqués en media query).
 *
 * Reçoit des comptes métier via `accounts`, `onSelect`, `onRemoveAccount`, `onAddAccount`, `onContinue`, `onSignOut`.
 * accounts: { id, name, handle, online?, photoUrl?, verified? }[]
 */

const BRAND = {
  navy: "#1B5386",
  navyDeep: "#123A5E",
  navyDarker: "#0E2E4A",
  gold: "#D9A536",
  goldLight: "#F6D374",
  ink: "#14202B",
  slate: "#5C7690",
  slateLight: "#8CA1B6",
  mist: "#EEF3F8",
  hairline: "#E3E9F1",
  emerald: "#2E9C7C",
};

const goldGradient = `linear-gradient(135deg, ${BRAND.goldLight} 0%, ${BRAND.gold} 100%)`;

const ACCOUNT_PICKER_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');

  /* ------------------------------- Scène ------------------------------- */

  .ll-scene {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    position: relative;
    min-height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(120% 90% at 15% -10%, rgba(217,165,54,0.10) 0%, rgba(217,165,54,0) 55%),
      radial-gradient(110% 90% at 100% 110%, rgba(46,156,124,0.10) 0%, rgba(46,156,124,0) 55%),
      linear-gradient(160deg, #F5F8FC 0%, #EAF0F6 55%, #E1E9F1 100%);
    padding: 40px 20px;
    box-sizing: border-box;
    overflow: hidden;
  }

  /* Fine trame de points — texture discrète de "carte réseau" */
  .ll-scene::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(27,83,134,0.14) 1px, transparent 1px);
    background-size: 26px 26px;
    -webkit-mask-image: radial-gradient(75% 65% at 50% 38%, #000 0%, transparent 75%);
    mask-image: radial-gradient(75% 65% at 50% 38%, #000 0%, transparent 75%);
    pointer-events: none;
  }

  /* ------------------------- Décor "nœuds reliés" ------------------------ */
  /* Clin d'œil discret au "Link" de LynoraLink : quelques points connectés,   */
  /* posés hors de la carte, jamais dans son cadre.                           */

  .ll-bg-deco {
    position: absolute;
    pointer-events: none;
    opacity: 0.55;
    z-index: 0;
  }

  .ll-bg-deco.ll-deco-tl {
    top: -60px;
    left: -60px;
    width: 340px;
    height: 340px;
    animation: ll-drift-a 16s ease-in-out infinite;
  }

  .ll-bg-deco.ll-deco-br {
    bottom: -70px;
    right: -70px;
    width: 300px;
    height: 300px;
    animation: ll-drift-b 18s ease-in-out infinite;
  }

  .ll-bg-deco.ll-deco-tr {
    top: -40px;
    right: -60px;
    width: 220px;
    height: 220px;
    opacity: 0.4;
    animation: ll-drift-b 20s ease-in-out infinite;
    animation-delay: -6s;
  }

  .ll-bg-deco.ll-deco-bl {
    bottom: -50px;
    left: -55px;
    width: 200px;
    height: 200px;
    opacity: 0.4;
    animation: ll-drift-a 17s ease-in-out infinite;
    animation-delay: -3s;
  }

  @keyframes ll-drift-a {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(10px, 14px); }
  }

  @keyframes ll-drift-b {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(-12px, -10px); }
  }

  /* Micro-points flottants — dispersés en marge de la carte, jamais dessus */
  .ll-micro-dot {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    animation: ll-micro-float 6s ease-in-out infinite;
  }

  @keyframes ll-micro-float {
    0%, 100% { transform: translateY(0); opacity: 0.9; }
    50% { transform: translateY(-12px); opacity: 0.5; }
  }

  .ll-bg-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(50px);
    pointer-events: none;
    z-index: 0;
  }

  .ll-bg-glow.ll-glow-gold {
    top: 6%;
    left: 6%;
    width: 220px;
    height: 220px;
    background: radial-gradient(circle, rgba(246,211,116,0.35) 0%, rgba(246,211,116,0) 70%);
  }

  .ll-bg-glow.ll-glow-emerald {
    bottom: 8%;
    right: 8%;
    width: 260px;
    height: 260px;
    background: radial-gradient(circle, rgba(46,156,124,0.25) 0%, rgba(46,156,124,0) 70%);
  }

  .ll-bg-glow.ll-glow-navy {
    top: 60%;
    right: 20%;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(27,83,134,0.14) 0%, rgba(27,83,134,0) 70%);
  }

  /* ------------------------------ Contenu ------------------------------- */

  .ll-content {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .ll-brand-lockup {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    opacity: 0;
    animation: ll-fade-down 500ms cubic-bezier(0.22,1,0.36,1) forwards;
  }

  @keyframes ll-fade-down {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .ll-logo-mark {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 20px -10px rgba(14,46,74,0.5);
    flex-shrink: 0;
  }

  .ll-logo-mark svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  /* Filigrane — le logo, très agrandi et estompé, posé derrière tout le
     reste. Purement décoratif, jamais assez marqué pour concurrencer la
     carte ou le lockup. */
  .ll-watermark {
    position: absolute;
    top: 46%;
    left: 50%;
    width: 640px;
    height: 640px;
    transform: translate(-50%, -50%) rotate(-9deg);
    opacity: 0.035;
    z-index: 0;
    pointer-events: none;
  }

  .ll-watermark svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .ll-brand-word {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 700;
    font-size: 28px;
    letter-spacing: -0.02em;
    color: ${BRAND.navyDarker};
    line-height: 1;
  }

  .ll-brand-word .ll-link {
    color: ${BRAND.gold};
  }

  /* -------------------------------- Carte -------------------------------- */

  .ll-card {
    width: 100%;
    background: #FFFFFF;
    border-radius: 32px;
    border: 1px solid ${BRAND.hairline};
    box-shadow: 0 30px 60px -24px rgba(14,46,74,0.28), 0 2px 6px rgba(14,46,74,0.06);
    overflow: hidden;
    position: relative;
    opacity: 0;
    animation: ll-scale-in 520ms cubic-bezier(0.22,1,0.36,1) forwards;
    animation-delay: 80ms;
  }

  .ll-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, transparent, ${BRAND.gold}, transparent);
    z-index: 3;
  }

  @keyframes ll-scale-in {
    from { opacity: 0; transform: translateY(14px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .ll-header {
    padding: 30px 26px 18px;
    border-bottom: 1px solid ${BRAND.hairline};
    text-align: center;
  }

  .ll-title {
    margin: 0;
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 700;
    font-size: 23px;
    color: ${BRAND.navy};
    letter-spacing: -0.01em;
  }

  .ll-subtitle {
    margin: 8px 0 0;
    font-size: 13.5px;
    color: ${BRAND.slate};
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
  }

  .ll-list {
    padding: 18px 18px 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 296px;
    overflow-y: auto;
  }

  .ll-list::-webkit-scrollbar {
    width: 4px;
  }

  .ll-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .ll-list::-webkit-scrollbar-thumb {
    background: rgba(217,165,54,0.3);
    border-radius: 2px;
  }

  .ll-row-btn {
    display: block;
    width: 100%;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    text-align: left;
    opacity: 0;
    animation: ll-row-in 380ms cubic-bezier(0.22,1,0.36,1) forwards;
  }

  @keyframes ll-row-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .ll-row-inner {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 12px 14px;
    border-radius: 16px;
    border: 1.5px solid transparent;
    background: transparent;
    transition: all 180ms cubic-bezier(0.22,1,0.36,1);
  }

  .ll-row-btn:hover .ll-row-inner {
    background: ${BRAND.mist};
    border-color: rgba(217,165,54,0.25);
  }

  .ll-row-btn:focus-visible .ll-row-inner {
    outline: none;
    border-color: ${BRAND.navy};
  }

  .ll-remove-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1px solid transparent;
    border-radius: 10px;
    background: transparent;
    color: ${BRAND.slateLight};
    cursor: pointer;
    padding: 0;
    transition: all 150ms ease;
  }

  .ll-remove-btn:hover {
    border-color: rgba(209,67,67,0.2);
    background: rgba(209,67,67,0.08);
    color: #D14343;
  }

  .ll-remove-btn:focus-visible {
    outline: 2px solid ${BRAND.navy};
    outline-offset: 2px;
  }

  .ll-row-inner.ll-selected {
    border-color: ${BRAND.gold};
    background: linear-gradient(135deg, rgba(217,165,54,0.12), rgba(46,156,124,0.06));
    box-shadow: 0 4px 14px rgba(217,165,54,0.14);
  }

  .ll-online-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${BRAND.emerald};
    flex-shrink: 0;
    position: absolute;
    bottom: 0;
    right: 0;
    border: 3px solid white;
    box-shadow: 0 0 0 2px ${BRAND.navy};
    animation: ll-pulse-dot 2s ease-in-out infinite;
  }

  @keyframes ll-pulse-dot {
    0%, 100% { box-shadow: 0 0 0 2px ${BRAND.navy}; }
    50% { box-shadow: 0 0 0 6px rgba(46,156,124,0.3); }
  }

  .ll-add-btn {
    display: flex;
    align-items: center;
    gap: 13px;
    width: 100%;
    padding: 12px 14px;
    margin-top: 4px;
    border-radius: 16px;
    border: 1.5px dashed rgba(92,118,144,0.35);
    background: none;
    cursor: pointer;
    transition: all 180ms cubic-bezier(0.22,1,0.36,1);
    text-align: left;
  }

  .ll-add-btn:hover {
    border-color: ${BRAND.gold};
    background: rgba(217,165,54,0.05);
  }

  .ll-add-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: 1.5px dashed rgba(92,118,144,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 180ms ease;
    background: ${BRAND.mist};
  }

  .ll-add-btn:hover .ll-add-icon {
    border-color: ${BRAND.gold};
    background: rgba(217,165,54,0.1);
    transform: rotate(90deg);
  }

  .ll-footer {
    padding: 20px 24px 24px;
    border-top: 1px solid ${BRAND.hairline};
  }

  .ll-cta {
    width: 100%;
    padding: 15px 0;
    border-radius: 16px;
    border: none;
    background: ${goldGradient};
    color: ${BRAND.navyDarker};
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.3px;
    transition: all 180ms cubic-bezier(0.22,1,0.36,1);
    box-shadow: 0 12px 22px -8px rgba(217,165,54,0.45);
    position: relative;
    overflow: hidden;
  }

  .ll-cta::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
    transition: left 400ms ease;
  }

  .ll-cta:hover::before {
    left: 100%;
  }

  .ll-cta:hover:not(:disabled) {
    filter: brightness(1.06);
    transform: translateY(-2px);
    box-shadow: 0 16px 28px -8px rgba(217,165,54,0.55);
  }

  .ll-cta:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
  }

  .ll-cta:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ll-meta-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 14px 0 0;
    font-size: 11.5px;
    color: ${BRAND.slateLight};
    font-weight: 500;
  }

  .ll-signout-row {
    margin: 12px 0 0;
    text-align: center;
  }

  .ll-signout-btn {
    background: none;
    border: none;
    padding: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${BRAND.gold};
    cursor: pointer;
    transition: color 150ms ease;
  }

  .ll-signout-btn:hover {
    color: ${BRAND.navy};
  }

  .ll-page-caption {
    margin-top: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
    color: ${BRAND.slateLight};
    font-weight: 500;
    opacity: 0;
    animation: ll-fade-down 500ms cubic-bezier(0.22,1,0.36,1) forwards;
    animation-delay: 260ms;
  }

  /* -------------------------------- Mobile -------------------------------- */

  @media (max-width: 480px) {
    .ll-scene {
      position: fixed;
      inset: 0;
      width: 100%;
      min-height: 0;
      height: auto;
      display: block;
      background: #FFFFFF;
      z-index: 10;
      overflow-x: hidden;
      overflow-y: hidden;
      padding: 0;
    }

    .ll-brand-lockup {
      display: flex;
      position: absolute;
      top: max(16px, env(safe-area-inset-top));
      left: 18px;
      z-index: 4;
      margin: 0;
    }

    .ll-card {
      width: 100%;
      height: 100%;
      min-height: 0;
      background: #FFFFFF;
      border-radius: 0;
      border-left: 0;
      border-right: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .ll-header {
      padding: max(88px, calc(64px + env(safe-area-inset-top))) 18px 16px;
    }

    .ll-title {
      font-size: 20px;
    }

    .ll-subtitle {
      font-size: 12.5px;
    }

    .ll-content {
      width: 100%;
      max-width: none;
      height: 100%;
      min-height: 0;
    }

    .ll-list {
      padding: 14px 14px 6px;
      max-height: none;
      min-height: 0;
      flex: 1 1 auto;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    .ll-row-inner,
    .ll-add-btn { min-height: 56px; }

    .ll-footer {
      flex: 0 0 auto;
      background: #FFFFFF;
      padding: 16px 18px max(20px, env(safe-area-inset-bottom));
    }

    .ll-bg-deco.ll-deco-tl {
      width: 220px;
      height: 220px;
      top: -40px;
      left: -50px;
    }

    .ll-bg-deco.ll-deco-br {
      width: 190px;
      height: 190px;
      bottom: -40px;
      right: -50px;
    }

    .ll-bg-deco.ll-deco-tr,
    .ll-bg-deco.ll-deco-bl {
      display: none;
    }

    .ll-watermark {
      width: 420px;
      height: 420px;
    }

    .ll-micro-dot {
      display: none;
    }

    .ll-password-overlay {
      padding: 0 !important;
      align-items: stretch !important;
    }

    .ll-password-modal {
      width: 100% !important;
      max-width: none !important;
      min-height: 100dvh !important;
      border-radius: 0 !important;
      padding: 24px 18px calc(24px + env(safe-area-inset-bottom)) !important;
      display: flex;
      align-items: center;
    }

    .ll-password-modal input {
      font-size: 16px !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ll-card, .ll-row-btn, .ll-brand-lockup, .ll-page-caption, .ll-bg-deco, .ll-online-dot, .ll-cta {
      animation: none !important;
      transition: none !important;
    }
    .ll-card, .ll-brand-lockup, .ll-page-caption {
      opacity: 1;
      transform: none;
    }
  }
`;

/* Points épars en marge de page — coordonnées choisies pour rester en dehors
   de la colonne centrale (~30%-70%) où vit la carte. */
const MICRO_DOTS = [
  { top: "12%", left: "10%", size: 6, color: "rgba(217,165,54,0.6)", delay: "0s", duration: "6s" },
  { top: "22%", left: "84%", size: 5, color: "rgba(46,156,124,0.55)", delay: "-2s", duration: "7s" },
  { top: "68%", left: "8%", size: 4, color: "rgba(27,83,134,0.45)", delay: "-4s", duration: "5.5s" },
  { top: "78%", left: "88%", size: 6, color: "rgba(217,165,54,0.5)", delay: "-1s", duration: "6.5s" },
  { top: "40%", left: "5%", size: 3, color: "rgba(46,156,124,0.4)", delay: "-3s", duration: "8s" },
  { top: "85%", left: "22%", size: 4, color: "rgba(27,83,134,0.4)", delay: "-5s", duration: "7s" },
  { top: "10%", left: "60%", size: 3, color: "rgba(217,165,54,0.45)", delay: "-2.5s", duration: "6s" },
];

const AVATAR_TINTS = [
  { from: "#5B8FBD", to: "#1B5386" },
  { from: "#9C7EC2", to: "#5A3E82" },
  { from: "#4FAE97", to: "#1F6E5C" },
  { from: "#D68F5C", to: "#9A5527" },
];

function initialsOf(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/* ---------------------------- Icônes sur-mesure ---------------------------- */

function IconPlus({ size = 18, color = BRAND.slate }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck({ size = 12, color = BRAND.navyDarker }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUserGlyph({ size = 22, color = "rgba(255,255,255,0.85)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.6" stroke={color} strokeWidth="1.8" />
      <path d="M4.5 20c1.6-3.6 4.6-5.4 7.5-5.4s5.9 1.8 7.5 5.4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconShieldCheck({ size = 14, color = BRAND.slate }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 3v5.5c0 4.6-3 8.2-7 9.5-4-1.3-7-4.9-7-9.5V6l7-3z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBadgeCheck({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5l2.4 1.4 2.7-.3 1.1 2.5 2.5 1.1-.3 2.7 1.4 2.4-1.4 2.4.3 2.7-2.5 1.1-1.1 2.5-2.7-.3L12 21.5l-2.4-1.4-2.7.3-1.1-2.5-2.5-1.1.3-2.7L2.2 12l1.4-2.4-.3-2.7 2.5-1.1L6.9 3.3l2.7.3L12 2.5z"
        fill={BRAND.gold}
      />
      <path d="M8.7 12.2l2.1 2.1 4.3-4.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Logo officiel LynoraLink — badge navy, monogramme "Ln" (L doré / n blanc).
   `gradId` doit être unique à chaque rendu du composant sur la page (deux
   utilisations ici : le petit lockup et le filigrane), sinon les navigateurs
   ne réutilisent que le premier <linearGradient> déclaré avec cet id. */
function LogoMark({ size = 34, gradId }) {
  return (
    <img
      src="/logo_lynora.svg"
      alt=""
      width={size}
      height={size}
      draggable={false}
      style={{
        display: "block",
        width: size,
        height: size,
        objectFit: "contain",
        borderRadius: 12,
      }}
    />
  );
}

/* --------------------------- Décor de page (hors carte) --------------------------- */
/* Points reliés très discrets, écho au "Link" du nom de marque. Purement       */
/* ornemental (aria-hidden), jamais superposé au contenu de la carte.           */

const NODE_TINTS = {
  tl: "rgba(217,165,54,0.55)",
  br: "rgba(46,156,124,0.5)",
  tr: "rgba(27,83,134,0.4)",
  bl: "rgba(217,165,54,0.4)",
};

function NodeLinkDecor({ variant = "tl" }) {
  const stroke = "rgba(27,83,134,0.35)";
  const nodeFill = NODE_TINTS[variant] ?? NODE_TINTS.tl;
  return (
    <svg viewBox="0 0 300 300" width="100%" height="100%" aria-hidden="true">
      <g fill="none" stroke={stroke} strokeWidth="1.2">
        <line x1="40" y1="60" x2="120" y2="110" />
        <line x1="120" y1="110" x2="90" y2="190" />
        <line x1="120" y1="110" x2="210" y2="90" />
        <line x1="210" y1="90" x2="250" y2="170" />
        <line x1="90" y1="190" x2="170" y2="230" />
      </g>
      {[
        [40, 60, 3.5],
        [120, 110, 4.5],
        [90, 190, 3],
        [210, 90, 3.5],
        [250, 170, 3],
        [170, 230, 3],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={i === 1 ? nodeFill : "rgba(27,83,134,0.3)"} />
      ))}
    </svg>
  );
}

/* ------------------------------- Avatar ------------------------------- */

function Avatar({ name, photoUrl, tintIndex = 0, size = 44, selected = false, verified = false }) {
  const tint = AVATAR_TINTS[tintIndex % AVATAR_TINTS.length];
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: photoUrl ? BRAND.mist : `linear-gradient(135deg, ${tint.from}, ${tint.to})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          color: "#fff",
          fontFamily: "'Fraunces', Georgia, serif",
          fontWeight: 600,
          fontSize: size * 0.36,
          letterSpacing: "-0.02em",
          boxShadow: selected
            ? `0 0 0 2px #fff, 0 0 0 4px ${BRAND.gold}`
            : `0 0 0 2px #fff, 0 0 0 3px ${BRAND.hairline}`,
          transition: "box-shadow 200ms ease",
        }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : name ? (
          initialsOf(name)
        ) : (
          <IconUserGlyph size={size * 0.46} />
        )}
      </div>

      {verified && (
        <div style={{ position: "absolute", top: -3, right: -3 }}>
          <IconBadgeCheck size={size * 0.3} />
        </div>
      )}

      {selected && (
        <div
          className="ll-password-overlay"
          style={{
            position: "absolute",
            bottom: -3,
            right: -3,
            width: size * 0.38,
            height: size * 0.38,
            borderRadius: size * 0.12,
            background: goldGradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 5px rgba(20,32,43,0.35)",
            border: "2px solid #fff",
          }}
        >
          <IconCheck size={size * 0.18} />
        </div>
      )}
    </div>
  );
}

/* --------------------------- Composant principal --------------------------- */

export default function AccountPicker({
  accounts = [],
  onSelect,
  onRemoveAccount,
  canRemoveAccount = () => true,
  onAddAccount,
  onRegister,
  onContinue,
  onSignOut,
  currentUserEmail = "",
}) {
  const [selectedId, setSelectedId] = useState(accounts[0]?.id ?? null);
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const [rememberMeEnabled, setRememberMeEnabled] = useState(true);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingAccountId, setPendingAccountId] = useState(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const cardRef = useRef(null);
  const resolvedAccounts = Array.isArray(accounts) ? accounts : [];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("lynoralink:rememberMe");
    if (saved === "true") {
      setRememberMeEnabled(true);
    } else if (saved === "false") {
      setRememberMeEnabled(false);
    } else {
      setRememberMeEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (!resolvedAccounts.length) {
      setSelectedId(null);
      return;
    }

    if (!resolvedAccounts.some((account) => account.id === selectedId)) {
      setSelectedId(resolvedAccounts[0]?.id ?? null);
    }
  }, [resolvedAccounts, selectedId]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const styleTag = document.createElement("style");
    styleTag.setAttribute("data-account-picker", "true");
    styleTag.textContent = ACCOUNT_PICKER_CSS;
    document.head.appendChild(styleTag);

    setStylesLoaded(true);

    return () => {
      styleTag.remove();
    };
  }, []);

  const finalizeSelection = (id, shouldContinue = false) => {
    setSelectedId(id);
    onSelect?.(id);
    if (shouldContinue) {
      onContinue?.(id);
    }
  };

  const handleSelect = (id, shouldContinue = false) => {
    if (shouldContinue && !rememberMeEnabled && currentUserEmail) {
      setPendingAccountId(id);
      setPassword("");
      setPasswordError("");
      setPasswordModalOpen(true);
      return;
    }

    finalizeSelection(id, shouldContinue);
  };

  const handleContinue = () => {
    if (!selectedId) return;
    onContinue?.(selectedId);
  };

  const handlePasswordConfirm = async () => {
    if (!currentUserEmail || !password.trim()) {
      setPasswordError("Entrez votre mot de passe pour continuer.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError("");
    const res = await signIn("credentials", {
      email: currentUserEmail,
      password,
      redirect: false,
    });
    setPasswordLoading(false);

    if (res?.ok) {
      setPasswordModalOpen(false);
      setPassword("");
      finalizeSelection(pendingAccountId, true);
      return;
    }

    setPasswordError("Mot de passe incorrect.");
  };

  // Ne rien afficher tant que les styles ne sont pas injectés (évite le FOUC)
  if (!stylesLoaded) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(160deg, #F5F8FC 0%, #EAF0F6 55%, #E1E9F1 100%)",
        }}
      />
    );
  }

  return (
    <div className="ll-scene">
      {/* Décor de page — toujours hors de la carte */}
      <div className="ll-watermark" aria-hidden="true">
        <LogoMark size={640} gradId="llWatermarkGrad" />
      </div>

      <div className="ll-bg-glow ll-glow-gold" aria-hidden="true" />
      <div className="ll-bg-glow ll-glow-emerald" aria-hidden="true" />
      <div className="ll-bg-glow ll-glow-navy" aria-hidden="true" />

      <div className="ll-bg-deco ll-deco-tl" aria-hidden="true">
        <NodeLinkDecor variant="tl" />
      </div>
      <div className="ll-bg-deco ll-deco-br" aria-hidden="true">
        <NodeLinkDecor variant="br" />
      </div>
      <div className="ll-bg-deco ll-deco-tr" aria-hidden="true">
        <NodeLinkDecor variant="tr" />
      </div>
      <div className="ll-bg-deco ll-deco-bl" aria-hidden="true">
        <NodeLinkDecor variant="bl" />
      </div>

      {MICRO_DOTS.map((dot, i) => (
        <span
          key={i}
          className="ll-micro-dot"
          aria-hidden="true"
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            background: dot.color,
            animationDelay: dot.delay,
            animationDuration: dot.duration,
          }}
        />
      ))}

      {passwordModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(9, 24, 39, 0.72)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 1200,
          }}
        >
          <div className="ll-password-modal" style={{ width: "100%", maxWidth: 400, borderRadius: 28, background: "#FFFFFF", boxShadow: "0 24px 60px rgba(9,24,39,0.25)", border: `1px solid ${BRAND.hairline}`, padding: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: BRAND.ink, fontFamily: "'Fraunces', Georgia, serif" }}>Vérification de sécurité</h2>
                <p style={{ margin: "6px 0 0", fontSize: 13.5, color: BRAND.slate, lineHeight: 1.5 }}>
                  Entrez votre mot de passe pour continuer sans mémorisation de session.
                </p>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, fontWeight: 600, color: BRAND.ink }}>
                Mot de passe
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handlePasswordConfirm();
                      }
                    }}
                    placeholder="Votre mot de passe"
                    style={{ width: "100%", border: `1px solid ${BRAND.hairline}`, borderRadius: 12, padding: "12px 44px 12px 14px", fontSize: 14, outline: "none", color: BRAND.ink, boxSizing: "border-box" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", borderRadius: 8, background: "transparent", color: BRAND.slate, cursor: "pointer", padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                  </button>
                </div>
              </label>

              <button
                type="button"
                onClick={() => window.location.assign(`/reset-password?email=${encodeURIComponent(currentUserEmail)}`)}
                style={{ alignSelf: "flex-end", border: "none", background: "transparent", padding: 0, fontSize: 12.5, fontWeight: 600, color: BRAND.navy, cursor: "pointer" }}
              >
                Mot de passe oublié ?
              </button>

              {passwordError ? <p style={{ margin: 0, fontSize: 12.5, color: "#D14343" }}>{passwordError}</p> : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => { setPasswordModalOpen(false); setPassword(""); setPasswordError(""); }} style={{ border: `1px solid ${BRAND.hairline}`, borderRadius: 999, background: "#F8FAFC", color: BRAND.slate, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
                  Annuler
                </button>
                <button type="button" onClick={handlePasswordConfirm} disabled={passwordLoading} style={{ border: "none", borderRadius: 999, background: goldGradient, color: BRAND.ink, padding: "10px 14px", fontWeight: 700, cursor: passwordLoading ? "wait" : "pointer", opacity: passwordLoading ? 0.8 : 1 }}>
                  {passwordLoading ? "Vérification..." : "Continuer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="ll-content">
        {/* Lockup de marque — au-dessus de la carte, dans le décor de page */}
        <div className="ll-brand-lockup">
          <div className="ll-logo-mark">
            <LogoMark size={34} gradId="llLockupGrad" />
          </div>
          <span className="ll-brand-word">
            Lynora<span className="ll-link">Link</span>
          </span>
        </div>

        <div ref={cardRef} className="ll-card">
          <div className="ll-header">
            <h1 className="ll-title">Choisir un compte</h1>
            <p className="ll-subtitle">
              <IconShieldCheck size={13} color={BRAND.slateLight} />
              Accédez à votre espace en toute simplicité
            </p>
          </div>

          <div className="ll-list">
            {!resolvedAccounts.length ? (
              <div
                style={{
                  padding: "20px 16px",
                  borderRadius: 12,
                  background: BRAND.mist,
                  color: BRAND.slate,
                  fontSize: 14,
                  lineHeight: 1.5,
                  textAlign: "center",
                }}
              >
                Aucun compte n'est disponible pour le moment. Connectez-vous pour continuer.
              </div>
            ) : (
              resolvedAccounts.map((account, i) => {
                const selected = account.id === selectedId;
                return (
                  <div
                    key={account.id}
                    className="ll-row-btn"
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    style={{ animationDelay: `${100 + i * 60}ms` }}
                    onClick={() => handleSelect(account.id, true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelect(account.id, true);
                      }
                    }}
                  >
                    <div className={`ll-row-inner ${selected ? "ll-selected" : ""}`}>
                      <Avatar
                        name={account.name}
                        photoUrl={account.photoUrl}
                        tintIndex={i}
                        selected={selected}
                        verified={account.verified}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontSize: 14.5,
                              fontWeight: 600,
                              color: BRAND.ink,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {account.name}
                          </span>
                          {account.online && <span className="ll-online-dot" title="En ligne" />}
                        </div>
                        <span style={{ fontSize: 12.5, color: BRAND.slate }}>{account.handle}</span>
                      </div>
                      {onRemoveAccount && canRemoveAccount(account) && (
                        <button
                          type="button"
                          className="ll-remove-btn"
                          aria-label={`Supprimer ${account.name} de cet appareil`}
                          title="Supprimer de cet appareil"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRemoveAccount(account);
                          }}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {onAddAccount && (
              <button className="ll-add-btn" onClick={onAddAccount}>
                <div className="ll-add-icon">
                  <IconPlus size={16} color={BRAND.slate} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: BRAND.slate }}>
                  Ajouter un autre compte
                </span>
              </button>
            )}
            {onRegister && (
              <button className="ll-add-btn" onClick={onRegister}>
                <span style={{ fontSize: 14, fontWeight: 600, color: BRAND.navy }}>Créer un compte</span>
              </button>
            )}
          </div>

          <div className="ll-footer">
            <button className="ll-cta" onClick={handleContinue} disabled={!selectedId}>
              Continuer
            </button>

            <div className="ll-meta-row">
              <IconShieldCheck size={11} color={BRAND.slateLight} />
              Vos comptes restent privés sur cet appareil
            </div>

            <div className="ll-signout-row">
              <span style={{ fontSize: 12.5, color: BRAND.slate }}>Ce n'est pas vous ? </span>
              <button className="ll-signout-btn" onClick={onSignOut}>
                Se déconnecter
              </button>
            </div>
          </div>
        </div>

        <p className="ll-page-caption">
          <IconShieldCheck size={12} color={BRAND.slateLight} />
          Connexion chiffrée de bout en bout
        </p>
      </div>
    </div>
  );
}
