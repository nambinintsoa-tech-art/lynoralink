"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";

const COLORS = {
  navy: "#0D2C48",
  gold: "#D9A536",
  white: "#FFFFFF",
  muted: "#DCE7F1",
};

function getConnectionDuration() {
  if (typeof navigator === "undefined") return 1500;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!navigator.onLine) return 2600;
  if (connection?.saveData) return 2300;

  const downlink = Number(connection?.downlink || 0);
  if (downlink > 0 && downlink < 0.7) return 2800;
  if (downlink > 0 && downlink < 1.5) return 2200;

  switch (connection?.effectiveType) {
    case "slow-2g": return 3000;
    case "2g": return 2700;
    case "3g": return 2100;
    case "4g": return 1500;
    default: return 1700;
  }
}

function Identity({ account }) {
  const name = account?.name || "Compte";
  const initials = account?.initials || name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const image = account?.image || account?.avatarUrl || null;

  return (
    <div className="account-switch-identity">
      <div className="account-switch-avatar">
        {image ? <img src={image} alt="" /> : initials}
      </div>
      <div className="account-switch-ring" aria-hidden="true">
        <RotateCw size={178} strokeWidth={1.35} />
      </div>
      <div className="account-switch-name">{name}</div>
      {account?.title && <div className="account-switch-title">{account.title}</div>}
    </div>
  );
}

export default function AccountSwitchTransition({ from, to, duration, onDone }) {
  const transitionDuration = duration || getConnectionDuration();

  useEffect(() => {
    const timer = window.setTimeout(() => onDone?.(), transitionDuration);
    return () => window.clearTimeout(timer);
  }, [transitionDuration, onDone]);

  return (
    <div className="account-switch-overlay" role="status" aria-live="polite" aria-label={`Basculement vers ${to?.name || "le compte"}`}>
      <style>{`
        .account-switch-overlay {
          position: fixed;
          inset: 0;
          z-index: 120;
          display: grid;
          place-items: center;
          background: ${COLORS.navy};
          animation: account-switch-overlay-in 180ms ease-out both;
          color: ${COLORS.white};
        }
        .account-switch-stage {
          width: min(100%, 520px);
          min-height: 100%;
          display: grid;
          place-items: center;
          padding: 40px 24px;
        }
        .account-switch-visual {
          position: relative;
          width: min(78vw, 260px);
          aspect-ratio: 1;
          display: grid;
          place-items: center;
        }
        .account-switch-identity {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          animation: account-switch-target-in ${transitionDuration}ms cubic-bezier(.22, 1, .36, 1) both;
        }
        .account-switch-avatar {
          position: absolute;
          top: 50%;
          left: 50%;
          width: min(42vw, 142px);
          height: min(42vw, 142px);
          transform: translate(-50%, -58%);
          display: grid;
          place-items: center;
          border: 5px solid ${COLORS.white};
          border-radius: 50%;
          background: #2c6ba0;
          color: ${COLORS.white};
          box-shadow: 0 0 0 8px rgba(217, 165, 54, .22), 0 18px 44px rgba(0, 0, 0, .3);
          font: 800 42px/1 Sora, sans-serif;
          overflow: hidden;
        }
        .account-switch-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .account-switch-name {
          position: absolute;
          top: calc(50% + 92px);
          left: 0;
          right: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font: 700 18px/1.3 Inter, sans-serif;
        }
        .account-switch-title {
          position: absolute;
          top: calc(50% + 120px);
          left: 0;
          right: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: ${COLORS.muted};
          font: 400 13px/1.3 Inter, sans-serif;
        }
        .account-switch-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 178px;
          height: 178px;
          display: grid;
          place-items: center;
          color: ${COLORS.gold};
          transform: translate(-50%, -58%);
          animation: account-switch-ring-rotate ${transitionDuration}ms cubic-bezier(.22, 1, .36, 1) both;
        }
        @keyframes account-switch-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes account-switch-target-in {
          0% { opacity: 0; transform: scale(.72); }
          65%, 100% { opacity: 1; transform: scale(1); }
        }
        @keyframes account-switch-ring-rotate {
          0% { opacity: 0; transform: translate(-50%, -58%) rotate(-180deg) scale(.72); }
          45% { opacity: 1; }
          100% { opacity: 1; transform: translate(-50%, -58%) rotate(180deg) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .account-switch-overlay,
          .account-switch-identity,
          .account-switch-ring { animation-duration: 1ms !important; }
        }
      `}</style>
      <div className="account-switch-stage">
        <div className="account-switch-visual">
          <Identity account={to} />
        </div>
      </div>
    </div>
  );
}
