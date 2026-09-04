import { BadgeCheck } from "lucide-react";

export default function PremiumBadge({ size = 18, label = "Profil Premium" }) {
  const textSize = Math.max(9, size * 0.52);
  const iconSize = Math.max(12, size * 0.76);
  return (
    <span title={label} aria-label={label} style={{ display: "inline-flex", alignItems: "center", gap: 5, minHeight: size + 8, padding: "3px 8px 3px 4px", borderRadius: "999px", background: "#FFF8E7", border: "1px solid #E8D39A", color: "#795A16", fontSize: textSize, fontWeight: 750, letterSpacing: "0.04em", lineHeight: 1, whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(121,90,22,0.1)" }}>
      <span style={{ width: iconSize + 4, height: iconSize + 4, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "#C49A27", color: "#FFFFFF", flexShrink: 0 }}>
        <BadgeCheck size={iconSize} color="currentColor" strokeWidth={2.5} />
      </span>
      PREMIUM
    </span>
  );
}