import React, { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, X } from "lucide-react";

/**
 * AccountPicker — LynoraLink
 * Structure et mécanique visuelle façon Facebook (sélecteur de comptes) :
 * logo centré au-dessus d'une carte blanche, liste de comptes séparés par des
 * filets fins, suppression par "✕", bouton d'action pleine largeur, liens en
 * pied de carte, modale "Se connecter en tant que …" pour la vérification du
 * mot de passe. Palette et identité chromatique 100 % LynoraLink (navy + or).
 * Mobile : rendu plein écran (100dvh, safe-areas, footer ancré en bas).
 *
 * Reçoit des comptes métier via `accounts`, `onSelect`, `onRemoveAccount`,
 * `onAddAccount`, `onRegister`, `onContinue`, `onSignOut`.
 * accounts: { id, name, handle, email?, online?, photoUrl?, verified? }[]
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
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');

  /* ------------------------------- Scène ------------------------------- */
  /* Page neutre et discrète, comme l'écran de connexion Facebook, teintée */
  /* aux bleus très clairs de LynoraLink.                                 */

  .ll-scene {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    position: relative;
    min-height: 100dvh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #F5F8FC 0%, #EEF3F8 60%, #E7EEF5 100%);
    padding: 48px 16px;
    box-sizing: border-box;
  }

  .ll-sheet {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  /* Logo centré au-dessus de la carte — calque façon Facebook */
  .ll-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 16px;
    opacity: 0;
    animation: ll-fade-down 450ms cubic-bezier(0.22,1,0.36,1) forwards;
  }

  .ll-logo-mark {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ll-logo-mark img,
  .ll-logo-mark svg {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .ll-brand-word {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 700;
    font-size: 26px;
    letter-spacing: -0.02em;
    color: #0E2E4A;
    line-height: 1;
  }

  .ll-brand-word .ll-link {
    color: #D9A536;
  }

  /* ------------------------------- Carte ------------------------------- */
  /* Carte blanche unique, ombre douce plate comme les dialogues Facebook. */

  .ll-card {
    width: 100%;
    background: #FFFFFF;
    border-radius: 12px;
    border: 1px solid #E3E9F1;
    box-shadow: 0 2px 4px rgba(14,46,74,0.08), 0 12px 32px rgba(14,46,74,0.14);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    opacity: 0;
    animation: ll-fade-up 500ms cubic-bezier(0.22,1,0.36,1) forwards;
    animation-delay: 70ms;
  }

  .ll-card-header {
    padding: 22px 18px 10px;
    text-align: center;
  }

  .ll-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #14202B;
    letter-spacing: -0.01em;
  }

  .ll-subtitle {
    margin: 6px 0 0;
    font-size: 13px;
    color: #5C7690;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  /* --------------------------- Liste de comptes --------------------------- */
  /* Rangées hautes, filets fins entre comptes, survol gris-bleu très léger, */
  /* suppression par "✕" à droite — exactement la grammaire Facebook.        */

  .ll-rows {
    padding: 6px 8px 10px;
    display: flex;
    flex-direction: column;
    max-height: min(52vh, 348px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .ll-rows::-webkit-scrollbar { width: 4px; }
  .ll-rows::-webkit-scrollbar-track { background: transparent; }
  .ll-rows::-webkit-scrollbar-thumb { background: rgba(27,83,134,0.18); border-radius: 2px; }

  .ll-row-btn {
    display: block;
    width: 100%;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    opacity: 0;
    animation: ll-fade-up 360ms cubic-bezier(0.22,1,0.36,1) forwards;
  }

  .ll-row-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 12px;
    border-radius: 10px;
    background: transparent;
    transition: background 150ms ease;
  }

  .ll-row-btn:hover .ll-row-inner,
  .ll-row-btn:focus-visible .ll-row-inner {
    background: #EEF3F8;
  }

  .ll-row-btn:focus-visible {
    outline: none;
  }

  .ll-row-btn:focus-visible .ll-row-inner {
    outline: 2px solid #1B5386;
    outline-offset: -2px;
  }

  .ll-row-inner.ll-selected {
    background: rgba(217,165,54,0.10);
  }

  .ll-row-btn:hover .ll-row-inner.ll-selected {
    background: rgba(217,165,54,0.15);
  }

  .ll-divider {
    height: 1px;
    background: #E3E9F1;
    margin: 3px 14px;
    flex: none;
  }

  .ll-remove-btn {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #8CA1B6;
    cursor: pointer;
    padding: 0;
    font-family: inherit;
    transition: all 150ms ease;
  }

  .ll-remove-btn:hover {
    background: rgba(209,67,67,0.10);
    color: #D14343;
  }

  .ll-remove-btn:focus-visible {
    outline: 2px solid #1B5386;
    outline-offset: 2px;
  }

  .ll-online-dot {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #2E9C7C;
    border: 2px solid #FFFFFF;
    animation: ll-pulse-dot 2.4s ease-in-out infinite;
  }

  @keyframes ll-pulse-dot {
    0%, 100% { box-shadow: 0 0 0 0 rgba(46,156,124,0.45); }
    50% { box-shadow: 0 0 0 5px rgba(46,156,124,0); }
  }

  /* Rangée "Ajouter un autre compte" — pastille dorée en guise d'avatar */
  .ll-add-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 11px 12px;
    border: none;
    border-radius: 10px;
    background: transparent;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: background 150ms ease;
  }

  .ll-add-row:hover,
  .ll-add-row:focus-visible {
    background: #EEF3F8;
    outline: none;
  }

  .ll-add-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    flex-shrink: 0;
    background: linear-gradient(135deg, #F6D374 0%, #D9A536 100%);
    color: #0E2E4A;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 3px #E3E9F1;
  }

  /* ------------------------------ Pied de carte ------------------------------ */
  /* Bouton d'action pleine largeur + rangée de liens, comme Facebook. */

  .ll-card-footer {
    padding: 14px 18px 18px;
    border-top: 1px solid #E3E9F1;
    background: #FFFFFF;
    flex: none;
  }

  .ll-cta {
    width: 100%;
    padding: 13px 0;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #F6D374 0%, #D9A536 100%);
    color: #0E2E4A;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.2px;
    cursor: pointer;
    transition: filter 150ms ease, transform 150ms ease, box-shadow 150ms ease;
    box-shadow: 0 10px 20px -10px rgba(217,165,54,0.55);
  }

  .ll-cta:hover:not(:disabled) {
    filter: brightness(1.05);
    transform: translateY(-1px);
    box-shadow: 0 14px 24px -10px rgba(217,165,54,0.6);
  }

  .ll-cta:active:not(:disabled) {
    transform: translateY(0) scale(0.99);
  }

  .ll-cta:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }

  .ll-links {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 14px;
    font-size: 13px;
    font-weight: 600;
    flex-wrap: wrap;
  }

  .ll-link-btn {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: #1B5386;
    cursor: pointer;
    transition: color 150ms ease;
  }

  .ll-link-btn:hover {
    color: #123A5E;
    text-decoration: underline;
  }

  .ll-link-btn:focus-visible {
    outline: 2px solid #1B5386;
    outline-offset: 2px;
    border-radius: 4px;
  }

  .ll-link-muted {
    color: #5C7690;
  }

  .ll-links-dot {
    color: #8CA1B6;
    user-select: none;
  }

  .ll-meta {
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 500;
    color: #8CA1B6;
  }

  /* Légende sous la carte, comme le "© Meta" de Facebook */
  .ll-caption {
    margin-top: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: #5C7690;
    opacity: 0;
    animation: ll-fade-down 450ms cubic-bezier(0.22,1,0.36,1) forwards;
    animation-delay: 240ms;
  }

  @keyframes ll-fade-down {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes ll-fade-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  /* ---------------------- Modale "mot de passe" ---------------------- */
  /* Même mécanique que Facebook : "Se connecter en tant que …" — avatar,   */
  /* identité du compte, champ mot de passe, bouton primaire pleine largeur,*/
  /* "Mot de passe oublié ?" + "Annuler" en liens discrets.                 */

  .ll-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(9, 24, 39, 0.60);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    z-index: 1200;
    animation: ll-overlay-in 180ms ease forwards;
  }

  @keyframes ll-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .ll-modal {
    width: 100%;
    max-width: 396px;
    background: #FFFFFF;
    border-radius: 12px;
    border: 1px solid #E3E9F1;
    box-shadow: 0 24px 60px rgba(9,24,39,0.28);
    padding: 26px 22px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    animation: ll-modal-in 220ms cubic-bezier(0.22,1,0.36,1) forwards;
  }

  @keyframes ll-modal-in {
    from { opacity: 0; transform: translateY(10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .ll-modal h2 {
    margin: 12px 0 0;
    font-size: 19px;
    font-weight: 700;
    color: #14202B;
  }

  .ll-modal-identity {
    margin: 4px 0 0;
    font-size: 13px;
    color: #5C7690;
  }

  .ll-modal-form {
    width: 100%;
    margin-top: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
    text-align: left;
  }

  .ll-modal-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #14202B;
    text-align: left;
  }

  .ll-input-wrap { position: relative; }

  .ll-modal-input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #E3E9F1;
    border-radius: 10px;
    background: #F8FAFD;
    padding: 12px 46px 12px 14px;
    font-family: inherit;
    font-size: 16px;
    color: #14202B;
    outline: none;
    transition: border-color 150ms ease, background 150ms ease;
  }

  .ll-modal-input:focus {
    border-color: #1B5386;
    background: #FFFFFF;
  }

  .ll-eye {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #5C7690;
    cursor: pointer;
    padding: 0;
  }

  .ll-eye:hover { color: #123A5E; background: #EEF3F8; }

  .ll-modal-error {
    margin: 0;
    font-size: 12.5px;
    color: #D14343;
    text-align: center;
  }

  .ll-modal-links {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
  }

  .ll-modal-primary {
    width: 100%;
    padding: 12px 0;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #F6D374 0%, #D9A536 100%);
    color: #0E2E4A;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 10px 20px -10px rgba(217,165,54,0.55);
    transition: filter 150ms ease, opacity 150ms ease;
  }

  .ll-modal-primary:hover:not(:disabled) { filter: brightness(1.05); }

  .ll-modal-primary:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }

  /* ------------------------------ Mobile ------------------------------ */
  /* Plein écran smartphone : pas de carte flottante ni de décor de page —   */
  /* la carte devient l'écran, footer ancré en bas, safe-areas respectées.   */

  @media (max-width: 480px) {
    .ll-scene {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100dvh;
      min-height: 0;
      display: block;
      padding: 0;
      background: #FFFFFF;
      z-index: 10;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .ll-sheet {
      max-width: none;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
    }

    .ll-brand {
      padding-top: max(22px, calc(14px + env(safe-area-inset-top)));
      margin-bottom: 12px;
    }

    .ll-card {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      min-height: 0;
      border-radius: 0;
      border: none;
      box-shadow: none;
    }

    .ll-card-header {
      padding: 18px 16px 8px;
    }

    .ll-title { font-size: 19px; }
    .ll-subtitle { font-size: 12.5px; }

    .ll-rows {
      flex: 1 1 auto;
      max-height: none;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 6px 6px 10px;
    }

    .ll-row-inner,
    .ll-add-row {
      min-height: 58px;
      padding: 11px 10px;
    }

    .ll-row-btn:hover .ll-row-inner,
    .ll-row-btn:focus-visible .ll-row-inner,
    .ll-add-row:hover,
    .ll-add-row:focus-visible {
      background: #EEF3F8;
    }

    .ll-card-footer {
      flex: 0 0 auto;
      padding: 14px 16px calc(16px + env(safe-area-inset-bottom));
    }

    .ll-cta { padding: 13px 0; border-radius: 10px; }

    .ll-caption {
      margin-top: 14px;
      padding-bottom: max(10px, env(safe-area-inset-bottom));
    }

    .ll-modal-overlay {
      padding: 0;
      align-items: stretch;
    }

    .ll-modal {
      max-width: none;
      min-height: 100dvh;
      border-radius: 0;
      border: none;
      box-shadow: none;
      justify-content: center;
      padding: 24px 18px calc(24px + env(safe-area-inset-bottom));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ll-card, .ll-row-btn, .ll-brand, .ll-caption, .ll-online-dot,
    .ll-modal-overlay, .ll-modal, .ll-cta {
      animation: none !important;
      transition: none !important;
    }
    .ll-card, .ll-row-btn, .ll-brand, .ll-caption {
      opacity: 1;
      transform: none;
    }
  }
`;

/* ---------------------------- Icônes sur-mesure ---------------------------- */

function IconPlus({ size = 18, color = "#0E2E4A" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck({ size = 12, color = "#0E2E4A" }) {
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

function IconShieldCheck({ size = 14, color = "#8CA1B6" }) {
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
        fill="#D9A536"
      />
      <path d="M8.7 12.2l2.1 2.1 4.3-4.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Logo officiel LynoraLink — badge navy, monogramme "Ln" (L doré / n blanc). */
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
      }}
    />
  );
}

/* ------------------------------- Avatar ------------------------------- */

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

function Avatar({ name, photoUrl, tintIndex = 0, size = 44, selected = false, verified = false }) {
  const tint = AVATAR_TINTS[tintIndex % AVATAR_TINTS.length];
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: photoUrl ? "#EEF3F8" : `linear-gradient(135deg, ${tint.from}, ${tint.to})`,
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
            ? "0 0 0 2px #FFFFFF, 0 0 0 4px #D9A536"
            : "0 0 0 2px #FFFFFF, 0 0 0 3px #E3E9F1",
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
        <div style={{ position: "absolute", top: -2, right: -2 }}>
          <IconBadgeCheck size={size * 0.3} />
        </div>
      )}

      {selected && (
        <div
          style={{
            position: "absolute",
            bottom: -3,
            right: -3,
            width: size * 0.38,
            height: size * 0.38,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #F6D374 0%, #D9A536 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 5px rgba(20,32,43,0.35)",
            border: "2px solid #FFFFFF",
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
  const [rememberMeEnabled, setRememberMeEnabled] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingAccountId, setPendingAccountId] = useState(null);
  const [pendingAccountEmail, setPendingAccountEmail] = useState("");
  const [pendingAccountName, setPendingAccountName] = useState("");
  const [pendingAccountPhotoUrl, setPendingAccountPhotoUrl] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const cardRef = useRef(null);
  const resolvedAccounts = Array.isArray(accounts) ? accounts : [];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("lynoralink:rememberMe");
    setRememberMeEnabled(saved === "true");
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

    if (shouldContinue || rememberMeEnabled) {
      onContinue?.(id);

      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/feed")) {
        window.location.assign("/feed");
      }
    }
  };

  const getAccount = (id) => resolvedAccounts.find((item) => item.id === id);

  const getAccountEmail = (id) => {
    const account = getAccount(id);
    if (account?.email) return account.email;
    if (account?.id === resolvedAccounts[0]?.id) return currentUserEmail;
    return "";
  };

  const handleSelect = (id, shouldContinue = false) => {
    const accountEmail = getAccountEmail(id);
    if (shouldContinue && !rememberMeEnabled && accountEmail) {
      setPendingAccountId(id);
      setPendingAccountEmail(accountEmail);
      setPendingAccountName(getAccount(id)?.name ?? "");
      setPendingAccountPhotoUrl(getAccount(id)?.photoUrl ?? "");
      setPassword("");
      setPasswordError("");
      setPasswordModalOpen(true);
      return;
    }

    finalizeSelection(id, shouldContinue);
  };

  const handleContinue = () => {
    if (!selectedId) return;
    const accountEmail = getAccountEmail(selectedId);
    if (!rememberMeEnabled && accountEmail) {
      handleSelect(selectedId, true);
      return;
    }
    onContinue?.(selectedId);
  };

  const handlePasswordConfirm = async () => {
    const accountEmail = pendingAccountEmail || currentUserEmail;
    if (!accountEmail || !password.trim()) {
      setPasswordError("Entrez votre mot de passe pour continuer.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError("");
    const res = await signIn("credentials", {
      email: accountEmail,
      password,
      redirect: false,
    });
    setPasswordLoading(false);

    if (res?.ok) {
      setPasswordModalOpen(false);
      setPassword("");
      finalizeSelection(pendingAccountId, true);
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/feed")) {
        window.location.assign("/feed");
      }
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
          background: "linear-gradient(180deg, #F5F8FC 0%, #EEF3F8 60%, #E7EEF5 100%)",
        }}
      />
    );
  }

  return (
    <div className="ll-scene">
      <div className="ll-sheet">
        {/* Logo centré au-dessus de la carte — calque Facebook */}
        <div className="ll-brand">
          <div className="ll-logo-mark">
            <LogoMark size={34} gradId="llLockupGrad" />
          </div>
          <span className="ll-brand-word">
            Lynora<span className="ll-link">Link</span>
          </span>
        </div>

        <div ref={cardRef} className="ll-card">
          <div className="ll-card-header">
            <h1 className="ll-title">Choisir un compte</h1>
            <p className="ll-subtitle">
              <IconShieldCheck size={13} color="#8CA1B6" />
              Gérez vos accès en toute simplicité
            </p>
          </div>

          <div className="ll-rows">
            {!resolvedAccounts.length ? (
              <div
                style={{
                  padding: "18px 16px",
                  borderRadius: 10,
                  background: "#EEF3F8",
                  color: "#5C7690",
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  textAlign: "center",
                }}
              >
                Aucun compte n'est disponible pour le moment. Connectez-vous pour continuer.
              </div>
            ) : (
              resolvedAccounts.map((account, i) => {
                const selected = account.id === selectedId;
                const canRemove = onRemoveAccount && canRemoveAccount(account);
                return (
                  <React.Fragment key={account.id}>
                    <div
                      className="ll-row-btn"
                      role="button"
                      tabIndex={0}
                      aria-pressed={selected}
                      style={{ animationDelay: `${90 + i * 50}ms` }}
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
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span
                              style={{
                                fontSize: 15,
                                fontWeight: 600,
                                color: "#14202B",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {account.name}
                            </span>
                            {account.verified && <IconBadgeCheck size={13} />}
                          </div>
                          <span
                            style={{
                              display: "block",
                              fontSize: 12.5,
                              color: "#5C7690",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {account.handle}
                          </span>
                        </div>
                        {canRemove && (
                          <button
                            type="button"
                            className="ll-remove-btn"
                            aria-label={`Retirer ${account.name} de cette liste`}
                            title="Retirer de cette liste"
                            onClick={(event) => {
                              event.stopPropagation();
                              onRemoveAccount(account);
                            }}
                          >
                            <X size={17} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                    {i < resolvedAccounts.length - 1 && <div className="ll-divider" aria-hidden="true" />}
                  </React.Fragment>
                );
              })
            )}

            {onAddAccount && (
              <>
                {resolvedAccounts.length > 0 && <div className="ll-divider" aria-hidden="true" />}
                <button
                  className="ll-add-row"
                  onClick={onAddAccount}
                  style={{ animationDelay: `${90 + resolvedAccounts.length * 50}ms` }}
                >
                  <span className="ll-add-avatar">
                    <IconPlus size={18} color="#0E2E4A" />
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#14202B" }}>
                    Ajouter un compte
                  </span>
                </button>
              </>
            )}

            {onRegister && (
              <div
                className="ll-register-row"
                role="button"
                tabIndex={0}
                onClick={onRegister}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onRegister();
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  marginTop: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#1B5386",
                }}
              >
                Nouveau sur LynoraLink ?
                <span style={{ color: "#D9A536" }}>Créer un compte</span>
              </div>
            )}
          </div>

          <div className="ll-card-footer">
            <button className="ll-cta" onClick={handleContinue} disabled={!selectedId}>
              Continuer
            </button>

            <div className="ll-links">
              <button className="ll-link-btn" onClick={onAddAccount}>
                Ajouter un compte
              </button>
              <span className="ll-links-dot" aria-hidden="true">·</span>
              <button className="ll-link-btn" onClick={onSignOut}>
                Se déconnecter
              </button>
            </div>

            <div className="ll-meta">
              <IconShieldCheck size={11} color="#8CA1B6" />
              Vos comptes restent privés sur cet appareil
            </div>
          </div>
        </div>

        <p className="ll-caption">
          <IconShieldCheck size={12} color="#8CA1B6" />
          Connexion chiffrée de bout en bout — LynoraLink
        </p>
      </div>

      {passwordModalOpen && (
        <div
          className="ll-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Vérification de sécurité"
        >
          <div className="ll-modal">
            <Avatar
              name={pendingAccountName}
              photoUrl={pendingAccountPhotoUrl}
              size={64}
              tintIndex={resolvedAccounts.findIndex((a) => a.id === pendingAccountId)}
            />

            <h2>Se connecter en tant que {pendingAccountName || "vous"}</h2>
            <p className="ll-modal-identity">
              Entrez votre mot de passe pour continuer sans mémorisation de session.
            </p>

            <div className="ll-modal-form">
              <div>
                <label className="ll-modal-label" htmlFor="ll-modal-password">
                  Mot de passe
                </label>
                <div className="ll-input-wrap">
                  <input
                    id="ll-modal-password"
                    className="ll-modal-input"
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
                    autoFocus
                  />
                  <button
                    type="button"
                    className="ll-eye"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {passwordError ? <p className="ll-modal-error">{passwordError}</p> : null}

              <button
                type="button"
                className="ll-modal-primary"
                onClick={handlePasswordConfirm}
                disabled={passwordLoading}
              >
                {passwordLoading ? "Vérification..." : "Continuer"}
              </button>

              <div className="ll-modal-links">
                <button
                  type="button"
                  className="ll-link-btn"
                  onClick={() =>
                    window.location.assign(
                      `/reset-password?email=${encodeURIComponent(pendingAccountEmail || currentUserEmail)}`
                    )
                  }
                >
                  Mot de passe oublié ?
                </button>
                <span className="ll-links-dot" aria-hidden="true">·</span>
                <button
                  type="button"
                  className="ll-link-btn ll-link-muted"
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setPendingAccountEmail("");
                    setPendingAccountPhotoUrl("");
                    setPassword("");
                    setPasswordError("");
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
