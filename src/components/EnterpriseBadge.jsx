import { BadgeCheck } from "lucide-react";

export default function EnterpriseBadge({ size = 18, label = "Profil officiel LynoraLink" }) {
  const textSize = Math.max(9, size * 0.52);
  const iconSize = Math.max(12, size * 0.76);
  return (
    <span title={label} aria-label={label} style={{ display: "inline-flex", alignItems: "center", gap: 5, minHeight: size + 8, padding: "3px 8px 3px 4px", borderRadius: 999, background: "#EEF8F3", border: "1px solid #B9DCCA", color: "#176246", fontSize: textSize, fontWeight: 750, letterSpacing: "0.04em", lineHeight: 1, whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(23,98,70,0.1)" }}>
      <span style={{ width: iconSize + 4, height: iconSize + 4, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "#1F8A63", color: "#FFFFFF", flexShrink: 0 }}>
        <BadgeCheck size={iconSize} color="currentColor" strokeWidth={2.5} />
      </span>
      OFFICIEL
    </span>
  );
}