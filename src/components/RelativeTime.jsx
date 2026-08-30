import React from "react";
import { useRelativeTime } from "@/hooks/useRelativeTime";

/**
 * Composant réutilisable pour afficher un temps relatif en temps réel
 *
 * @param {Object} props
 * @param {Date|string|number} props.date - La date à afficher
 * @param {string} [props.className] - Classes CSS additionnelles
 * @param {Object} [props.style] - Styles additionnels
 * @param {number} [props.interval=1000] - Intervalle de mise à jour en ms
 * @param {React.ReactNode} [props.children] - Contenu personnalisé (sinon affiche le temps formaté)
 */
export default function RelativeTime({ date, className, style, interval = 1000, children }) {
  const time = useRelativeTime(date, interval);

  return (
    <span className={className} style={style}>
      {children ?? time}
    </span>
  );
}
