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
  const navigationStartTimer = useRef(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const start = () => {
      clearTimeout(fallbackTimer.current);
      clearTimeout(finishTimer.current);
      setStatus("active");
      fallbackTimer.current = window.setTimeout(() => setStatus("finishing"), 10000);
    };

    const scheduleStart = () => {
      clearTimeout(navigationStartTimer.current);
      navigationStartTimer.current = window.setTimeout(() => {
        navigationStartTimer.current = null;
        start();
      }, 0);
    };

    const handlePopState = scheduleStart;
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    const handleNavigationStart = scheduleStart;
    const handleNavigationComplete = () => {
      clearTimeout(fallbackTimer.current);
      setStatus((currentStatus) => (currentStatus === "idle" ? "idle" : "finishing"));
      clearTimeout(finishTimer.current);
      finishTimer.current = window.setTimeout(() => setStatus("idle"), 260);
    };

    window.history.pushState = function (...args) {
      const currentUrl = window.location.href;
      const nextUrl = args[2] ? new URL(args[2], window.location.href).href : window.location.href;
      const result = originalPushState.apply(this, args);
      if (nextUrl !== currentUrl) {
        window.dispatchEvent(new Event("lynora:navigation-start"));
      }
      return result;
    };
    window.history.replaceState = function (...args) {
      const currentUrl = window.location.href;
      const nextUrl = args[2] ? new URL(args[2], window.location.href).href : window.location.href;
      const result = originalReplaceState.apply(this, args);
      if (nextUrl !== currentUrl) {
        window.dispatchEvent(new Event("lynora:navigation-start"));
      }
      return result;
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("lynora:navigation-start", handleNavigationStart);
    window.addEventListener("lynora:navigation-complete", handleNavigationComplete);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("lynora:navigation-start", handleNavigationStart);
      window.removeEventListener("lynora:navigation-complete", handleNavigationComplete);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      clearTimeout(navigationStartTimer.current);
      clearTimeout(fallbackTimer.current);
      clearTimeout(finishTimer.current);
    };
  }, []);

  useEffect(() => {
    if (previousLocation.current === locationKey) return;
    previousLocation.current = locationKey;
    window.dispatchEvent(new Event("lynora:navigation-complete"));
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
