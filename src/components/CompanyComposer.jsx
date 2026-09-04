"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faNewspaper, faPhotoFilm, faWandSparkles } from "@fortawesome/free-solid-svg-icons";

const C = {
  navy50: "var(--app-bg)",
  muted: "var(--app-muted)",
  line: "var(--app-border)",
  surface: "var(--app-surface)",
  white: "#FFFFFF",
};

function Avatar({ initials = "U", size = 42, imgUrl = null }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1B5386", color: C.white, fontWeight: 700, fontSize: size * 0.36 }}>
      {imgUrl ? <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
}

function TriggerAction({ icon, label, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "8px 6px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: C.muted }}
      onMouseEnter={(event) => { event.currentTarget.style.background = C.navy50; }}
      onMouseLeave={(event) => { event.currentTarget.style.background = "transparent"; }}
    >
      <FontAwesomeIcon icon={icon} style={{ fontSize: 19, color }} />
      {label}
    </button>
  );
}

export default function CompanyComposer({ onOpen, avatarUrl = null, initials = "U" }) {
  return (
    <>
      <style>{`
        @media (max-width: 560px) {
          .company-composer-mobile {
            width: 100vw !important;
            max-width: none !important;
            margin-left: calc(50% - 50vw) !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: var(--app-surface) !important;
          }
          .company-composer-mobile > * {
            border-radius: 0 !important;
          }
        }
      `}</style>
      <div className="company-composer-mobile" style={{ padding: 16, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar initials={initials} imgUrl={avatarUrl} />
          <button
            type="button"
            onClick={() => onOpen?.("post")}
            style={{ flex: 1, textAlign: "left", padding: "11px 16px", borderRadius: 22, border: `1.5px solid ${C.line}`, background: C.navy50, color: C.muted, fontSize: 14, cursor: "pointer" }}
          >
            Exprimez vos idées, partagez vos projets ou vos inspirations...
          </button>
        </div>
        <div style={{ display: "flex", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
          <TriggerAction icon={faPhotoFilm} label="Médias" color="#2E9E5B" onClick={() => onOpen?.("image")} />
          <div style={{ width: 1, background: C.line, margin: "6px 0", alignSelf: "stretch" }} />
          <TriggerAction icon={faNewspaper} label="Article" color="#1B5386" onClick={() => onOpen?.("article")} />
          <div style={{ width: 1, background: C.line, margin: "6px 0", alignSelf: "stretch" }} />
          <TriggerAction icon={faWandSparkles} label="VisuelFocus" color="#D9A536" onClick={() => onOpen?.("visuelfocus")} />
        </div>
      </div>
    </>
  );
}