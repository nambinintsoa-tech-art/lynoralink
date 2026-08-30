import React, { useState } from "react";

export const DEFAULT_REACTIONS = [
  { key: "ok", label: "J'aime", src: "/emoji_picker/j'aime.png" },
  { key: "love", label: "Love", src: "/emoji_picker/love.png" },
  { key: "triste", label: "Triste", src: "/emoji_picker/triste.png" },
  { key: "hahaha", label: "Hahaha", src: "/emoji_picker/hahaha.png" },
  { key: "colere", label: "Colère", src: "/emoji_picker/colere.png" },
  { key: "waouh", label: "Waouh", src: "/emoji_picker/waouh.png" },
];

export default function ReactionPicker({
  reactions = DEFAULT_REACTIONS,
  selectedKey,
  onSelect,
  title = "Choisir une réaction",
  className = "",
  size = 52,
  imgSize = 36,
}) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const hoveredReaction = reactions.find((reaction) => reaction.key === hoveredKey);

  return (
    <div
      className={`reaction-picker ${className}`.trim()}
      style={{
        width: "auto",
        background: "rgba(255,255,255,0.96)",
        border: "1px solid rgba(28,80,145,0.16)",
        borderRadius: 999,
        boxShadow: "0 18px 40px rgba(15,51,82,0.12)",
        padding: "6px 8px",
        display: "inline-flex",
        alignItems: "center",
        position: "relative",
        zIndex: 2147483647,
        overflow: "visible",
        isolation: "isolate",
        pointerEvents: "auto",
      }}
    >
      <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", position: "relative" }}>
        {reactions.map((reaction) => {
            const isSelected = reaction.key === selectedKey;
            return (
              <button
                key={reaction.key}
                type="button"
                onClick={() => onSelect?.(reaction.key)}
                aria-label={reaction.label}
                onMouseEnter={() => setHoveredKey(reaction.key)}
                onMouseLeave={() => setHoveredKey(null)}
                style={{
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  border: isSelected ? "2px solid #D9A536" : "1px solid rgba(227,234,241,0.9)",
                  background: isSelected ? "rgba(217,165,54,0.18)" : "#F8FBFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: Math.max(6, Math.floor((size - imgSize) / 2)),
                  cursor: "pointer",
                  transition: "transform 0.15s ease, border-color 0.15s ease, background 0.15s ease",
                  position: "relative",
                  overflow: "visible",
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(1px)"; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <img
                  src={reaction.src}
                  alt={reaction.label}
                  style={{ width: imgSize, height: imgSize, objectFit: "contain", borderRadius: Math.max(4, Math.floor(imgSize / 4)) }}
                />
              {hoveredKey === reaction.key && (
                <span
                  style={{
                    position: "absolute",
                      bottom: `-${Math.max(20, Math.floor(size * 0.6))}px`,
                    left: "50%",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                    padding: "4px 8px",
                    borderRadius: 999,
                    background: "rgba(15,51,82,0.92)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    boxShadow: "0 8px 20px rgba(15,51,82,0.16)",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                >
                  {reaction.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
