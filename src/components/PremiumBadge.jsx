import { BadgeCheck } from "lucide-react";

export default function PremiumBadge({ size = 18, label = "Profil Premium" }) {
  const textSize = Math.max(9, size * 0.52);
  const iconSize = Math.max(12, size * 0.76);
  return (
    <span title={label} aria-label={label} style={{ display: "inline-flex", alignItems: "center", gap: 5, minHeight: size + 8, padding: "3px 8px 3px 4px", borderRadius: "999px", background: "transparent", border: "1px solid var(--app-border)", color: "var(--app-text)", fontSize: textSize, fontWeight: 750, letterSpacing: "0.04em", lineHeight: 1, whiteSpace: "nowrap" }}>
      <span style={{ width: iconSize + 4, height: iconSize + 4, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "transparent", color: "var(--app-text)", border: "1px solid var(--app-border)", flexShrink: 0 }}>
        <BadgeCheck size={iconSize} color="currentColor" strokeWidth={2.5} />
      </span>
      PREMIUM
    </span>
  );
}