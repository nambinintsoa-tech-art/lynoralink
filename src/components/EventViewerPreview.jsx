"use client";

import React, { useEffect } from "react";
import { CalendarDays, Clock, MapPin, Users, Video, X, ArrowLeft } from "lucide-react";

const C = {
  navy900: "#0F3352",
  navy800: "#1B5386",
  navy50: "#EFF4F9",
  gold400: "#F6D374",
  ink: "#132433",
  muted: "#5C7488",
  line: "#E3EAF1",
  white: "#FFFFFF",
};

const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;

function formatEventDate(date) {
  if (!date) return "Date à définir";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}

export default function EventViewerPreview({ post, onClose }) {
  const event = post?.event || post || {};
  const group = post?.group || {};
  const authorName = post?.author || event.createdByName || "Utilisateur";
  const authorInitials = (post?.initials || authorName)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
  const attendees = Number(event.attendees || 0);
  const maxAttendees = Number(event.maxAttendees || 0);

  useEffect(() => {
    const handleKeyDown = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Détail de l'événement" className="event-viewer-overlay" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 500, overflowY: "auto", padding: 20, background: "rgba(10, 22, 35, 0.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@media (max-width: 700px) {
        .event-viewer-overlay { padding: 0 !important; align-items: stretch !important; }
        .event-viewer-modal { max-width: none !important; max-height: 100dvh !important; height: 100dvh !important; border-radius: 0 !important; padding-bottom: env(safe-area-inset-bottom); }
        .event-viewer-modal input, .event-viewer-modal textarea { font-size: 16px !important; }
      }`}</style>
      <div className="event-viewer-modal" onClick={(eventClick) => eventClick.stopPropagation()} style={{ width: "100%", maxWidth: 640, maxHeight: "calc(100dvh - 40px)", overflow: "hidden", borderRadius: 18, background: C.white, boxShadow: "0 24px 80px rgba(0,0,0,.28)" }}>
        <style>{`
          @media (max-width: 700px) {
            .event-viewer-modal { max-height: none !important; height: 100dvh; border-radius: 0 !important; }
          }
        `}</style>
        <div style={{ height: "100%", overflowY: "auto" }}>
          <header style={{ padding: "18px 20px", background: navyGrad, color: C.white, display: "flex", alignItems: "center", gap: 12 }}>
            <button type="button" onClick={onClose} aria-label="Fermer le détail" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 9, background: "rgba(255,255,255,.13)", color: C.white, cursor: "pointer" }}><ArrowLeft size={17} /></button>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.gold400, fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}><CalendarDays size={14} /> Événement du groupe</div>
              <h1 style={{ margin: "5px 0 0", fontSize: 21, lineHeight: 1.3 }}>{event.title || "Événement"}</h1>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", color: C.white, cursor: "pointer" }}><X size={19} /></button>
          </header>

          <main style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 18, marginBottom: 18, borderBottom: `1px solid ${C.line}` }}>
            <IdentityAvatar src={post?.avatarUrl || event.createdByAvatar} initials={authorInitials} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 3 }}>Créé par</div>
              <div style={{ color: C.ink, fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{authorName}</div>
            </div>
            <div style={{ width: 1, height: 34, background: C.line, flexShrink: 0 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, maxWidth: "48%" }}>
              <GroupAvatar src={group.coverUrl} gradient={group.coverGradient} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.muted, fontSize: 11.5, marginBottom: 3 }}>Groupe</div>
                <div style={{ color: C.navy800, fontSize: 13.5, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name || "Groupe"}</div>
              </div>
            </div>
          </div>
          {event.description && <p style={{ margin: "0 0 22px", color: C.ink, fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{event.description}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
            <Info icon={CalendarDays} label="Date" value={formatEventDate(event.date)} />
            <Info icon={Clock} label="Horaire" value={`${event.time || "À définir"}${event.duration ? ` · ${event.duration}` : ""}`} />
            <Info icon={event.type === "online" ? Video : MapPin} label={event.type === "online" ? "En ligne" : "Lieu"} value={event.location || "Lieu à définir"} />
            <Info icon={Users} label="Participants" value={maxAttendees ? `${attendees}/${maxAttendees}` : String(attendees)} />
          </div>

          </main>
        </div>

      </div>
    </div>
  );
}

function IdentityAvatar({ src, initials }) {
  return src
    ? <img src={src} alt={initials} style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: navyGrad, color: C.white, fontSize: 14, fontWeight: 800 }}>{initials}</div>;
}

function GroupAvatar({ src, gradient }) {
  return src
    ? <img src={src} alt="" style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: gradient || C.navy50, color: C.navy800 }}><Users size={17} /></div>;
}

function Info({ icon: Icon, label, value }) {
  return <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 13, border: `1px solid ${C.line}`, borderRadius: 11, background: "#F8FBFD" }}><Icon size={17} style={{ color: C.navy800, marginTop: 2, flexShrink: 0 }} /><div><div style={{ color: C.muted, fontSize: 11.5, marginBottom: 3 }}>{label}</div><div style={{ color: C.ink, fontSize: 13.5, fontWeight: 700, lineHeight: 1.4, wordBreak: "break-word" }}>{value}</div></div></div>;
}
