import { useState, useEffect } from "react";

/**
 * Formate une date en temps relatif en français
 * @param {Date|string|number} dateValue - La date à formater
 * @returns {string} Le temps relatif formaté
 */
export function formatRelativeTime(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "maintenant";

  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 10) return "maintenant";
  if (seconds < 60) return `il y a ${seconds} s`;
  if (minutes === 1) return "il y a 1 min";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours === 1) return "il y a 1 h";
  if (hours < 24) return `il y a ${hours} h`;
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem`;
  if (months < 12) return `il y a ${months} mois`;
  if (years === 1) return "il y a 1 an";
  return `il y a ${years} ans`;
}

/**
 * Hook pour afficher un temps relatif qui se met à jour automatiquement
 * @param {Date|string|number} dateValue - La date à afficher
 * @param {number} updateInterval - Intervalle de mise à jour en ms (défaut: 60000 = 1 minute)
 * @returns {string} Le temps relatif formaté
 */
export function useRelativeTime(dateValue, updateInterval = 1000) {
  const [time, setTime] = useState(() => formatRelativeTime(dateValue));

  useEffect(() => {
    setTime(formatRelativeTime(dateValue));

    const interval = setInterval(() => {
      setTime(formatRelativeTime(dateValue));
    }, updateInterval);

    return () => clearInterval(interval);
  }, [dateValue, updateInterval]);

  return time;
}

export default useRelativeTime;
