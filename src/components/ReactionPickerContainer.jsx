import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactionPicker from "./ReactionPicker";

/**
 * Enveloppe <ReactionPicker /> et le rend via un portail directement dans
 * <body>, positionné en `position: fixed` par-dessus l'élément qui l'a
 * déclenché (le message survolé).
 *
 * Pourquoi un portail : le fil de messages a un `overflow-y: auto` et la
 * modale de chat a un `overflow: hidden` avec une largeur fixe. Un picker
 * positionné en `absolute` à l'intérieur de ces conteneurs serait rogné ou
 * masqué dès qu'il dépasse leurs bords. En le sortant dans <body> et en le
 * repositionnant nous-mêmes à chaque scroll/resize, il reste toujours
 * entièrement visible, au-dessus de tout le reste (modale, appel, etc.).
 *
 * Usage : à placer comme enfant direct d'un conteneur `position: relative`
 * (le wrapper de la bulle de message) — le picker se cale automatiquement
 * dessus, en choisissant de s'ouvrir vers le haut ou vers le bas et en se
 * recentrant pour ne jamais sortir de l'écran.
 */
export default function ReactionPickerContainer({
  reactions,
  selectedKey,
  onSelect,
  onRequestClose,
  align = "center", // "left" | "right" | "center" — préférence de départ, ajustée si besoin pour rester visible
  size = 40,
  imgSize = 26,
}) {
  const anchorRef = useRef(null);
  const popupRef = useRef(null);
  const [anchorRect, setAnchorRect] = useState(null);
  const [popupWidth, setPopupWidth] = useState(0);

  // Recalcule la position de l'ancre au montage, ainsi qu'au scroll et au redimensionnement.
  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return undefined;
    const update = () => setAnchorRect(el.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, []);

  // Mesure la largeur réelle du picker une fois rendu, pour le recadrer dans le viewport.
  useLayoutEffect(() => {
    if (popupRef.current) setPopupWidth(popupRef.current.offsetWidth);
  }, [anchorRect, reactions]);

  // Ferme le picker au clic en dehors (ancre ou popup) — même logique que les autres menus du composant.
  useEffect(() => {
    if (!onRequestClose) return undefined;
    const handleClick = (e) => {
      if (popupRef.current?.contains(e.target)) return;
      if (anchorRef.current?.contains(e.target)) return;
      onRequestClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onRequestClose]);

  // Ferme le picker à la touche Échap.
  useEffect(() => {
    if (!onRequestClose) return undefined;
    const handleKey = (e) => { if (e.key === "Escape") onRequestClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onRequestClose]);

  const MARGIN = 12;
  let left = 0;
  let transformX = "translateX(-50%)";

  if (anchorRect) {
    const half = popupWidth / 2;
    const maxLeft = Math.max(MARGIN, window.innerWidth - popupWidth - MARGIN);
    if (align === "left") {
      transformX = "translateX(0)";
      left = Math.max(MARGIN, Math.min(anchorRect.left, maxLeft));
    } else if (align === "right") {
      transformX = "translateX(-100%)";
      left = Math.max(popupWidth + MARGIN, Math.min(anchorRect.right, window.innerWidth - MARGIN));
    } else {
      const center = anchorRect.left + anchorRect.width / 2;
      left = Math.min(Math.max(center, half + MARGIN), window.innerWidth - half - MARGIN);
    }
  }

  const spaceAbove = anchorRect ? anchorRect.top : 0;
  const spaceBelow = anchorRect ? window.innerHeight - anchorRect.bottom : 0;
  const showBelow = anchorRect ? (spaceBelow >= 110 || spaceAbove < 110) : false;
  const top = anchorRect ? (showBelow ? anchorRect.bottom + 8 : anchorRect.top - 8) : 0;
  const transformY = showBelow ? "translateY(0)" : "translateY(-100%)";

  return (
    <>
      {/* Ancre invisible : calque son rectangle sur le conteneur parent (position: relative) */}
      <span ref={anchorRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      {anchorRect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              top: Math.max(MARGIN, Math.min(top, window.innerHeight - 80)),
              left: Math.max(MARGIN, Math.min(left, window.innerWidth - MARGIN)),
              transform: `${transformX} ${transformY}`,
              zIndex: 2147483647,
              pointerEvents: "auto",
              isolation: "isolate",
              overflow: "visible",
            }}
          >
            <ReactionPicker
              reactions={reactions}
              selectedKey={selectedKey}
              onSelect={onSelect}
              size={size}
              imgSize={imgSize}
            />
          </div>,
          document.body
        )}
    </>
  );
}
