"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const GOLD = "linear-gradient(90deg, #F6D374 0%, #D9A536 100%)";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationKey = `${pathname}?${searchParams.toString()}`;
  const previousLocation = useRef(locationKey);
  const fallbackTimer = useRef(null);
  const finishTimer = useRef(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const start = () => {
      clearTimeout(fallbackTimer.current);
      clearTimeout(finishTimer.current);
      setStatus("active");
      fallbackTimer.current = window.setTimeout(() => setStatus("finishing"), 10000);
    };

    const handleDocumentClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = event.target.closest("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.href === window.location.href) return;
      start();
    };

    const handlePopState = () => start();
    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
      clearTimeout(fallbackTimer.current);
      clearTimeout(finishTimer.current);
    };
  }, []);

  useEffect(() => {
    if (previousLocation.current === locationKey) return;
    previousLocation.current = locationKey;
    clearTimeout(fallbackTimer.current);
    setStatus((currentStatus) => (currentStatus === "idle" ? "idle" : "finishing"));
    finishTimer.current = window.setTimeout(() => setStatus("idle"), 260);
  }, [locationKey]);

  if (status === "idle") return null;

  return (
    <div className={`navigation-progress navigation-progress-${status}`} role="progressbar" aria-label="Chargement de la page" aria-valuemin="0" aria-valuemax="100">
      <div className="navigation-progress-bar" />
      <style>{`
        .navigation-progress {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          height: 3px;
          pointer-events: none;
          background: rgba(217, 165, 54, 0.14);
        }
        .navigation-progress-bar {
          height: 100%;
          width: 12%;
          background: ${GOLD};
          box-shadow: 0 0 12px rgba(217, 165, 54, 0.7);
          transform-origin: left center;
          animation: navigation-progress-grow 10s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .navigation-progress-finishing .navigation-progress-bar {
          width: 100%;
          animation: navigation-progress-finish 260ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes navigation-progress-grow {
          0% { width: 8%; }
          12% { width: 24%; }
          45% { width: 58%; }
          78% { width: 78%; }
          100% { width: 86%; }
        }
        @keyframes navigation-progress-finish {
          from { width: 86%; opacity: 1; }
          to { width: 100%; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .navigation-progress-bar { animation-duration: 1ms !important; }
        }
      `}</style>
    </div>
  );
}
