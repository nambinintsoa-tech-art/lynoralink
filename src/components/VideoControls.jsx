"use client";

import React, { useState } from "react";
import { Maximize2, Pause, Play, Settings2, Volume2, VolumeX } from "lucide-react";

function formatTime(value = 0) {
  const total = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function VideoControls({
  duration = 0,
  currentTime = 0,
  isPlaying = false,
  isMuted = true,
  playbackRate = 1,
  onTogglePlay,
  onToggleMute,
  onSeek,
  onPlaybackRateChange,
  onFullscreen,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const stop = (event) => event.stopPropagation();

  return (
    <div
      className="lynora-video-controls"
      onClick={stop}
      onPointerDown={stop}
      style={{
        position: "absolute",
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 4,
        padding: "28px 10px 8px",
        color: "#fff",
        background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.82))",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <input
        type="range"
        min="0"
        max={duration || 0}
        step="0.1"
        value={Math.min(currentTime, duration || 0)}
        onChange={(event) => onSeek?.(Number(event.target.value))}
        aria-label="Progression de la vidéo"
        style={{
          display: "block",
          width: "100%",
          height: 4,
          margin: "0 0 7px",
          accentColor: "#D9A536",
          cursor: "pointer",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 5, minHeight: 28 }}>
        <button type="button" onClick={onTogglePlay} aria-label={isPlaying ? "Mettre en pause" : "Lire la vidéo"} title={isPlaying ? "Pause" : "Lire"} style={buttonStyle}>
          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <button type="button" onClick={onToggleMute} aria-label={isMuted ? "Activer le son" : "Couper le son"} title={isMuted ? "Activer le son" : "Couper le son"} style={buttonStyle}>
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <span style={{ minWidth: 72, color: "rgba(255,255,255,0.9)", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <button type="button" onClick={() => setSettingsOpen((open) => !open)} aria-label="Paramètres vidéo" title="Paramètres" style={buttonStyle}>
            <Settings2 size={16} />
          </button>
          {settingsOpen && (
            <div style={{ position: "absolute", right: 0, bottom: 36, width: 150, padding: 6, borderRadius: 8, background: "rgba(15,15,15,0.96)", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
              <div style={{ padding: "5px 8px 6px", color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Vitesse</div>
              {[0.5, 1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => { onPlaybackRateChange?.(rate); setSettingsOpen(false); }}
                  style={{ display: "block", width: "100%", padding: "7px 8px", border: 0, borderRadius: 5, background: rate === playbackRate ? "rgba(217,165,54,0.22)" : "transparent", color: "#fff", textAlign: "left", fontSize: 12, cursor: "pointer" }}
                >
                  {rate === 1 ? "Normale" : `${rate}x`}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={onFullscreen} aria-label="Plein écran" title="Plein écran" style={buttonStyle}>
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  );
}

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  padding: 0,
  border: 0,
  borderRadius: 4,
  background: "transparent",
  color: "#fff",
  cursor: "pointer",
};
