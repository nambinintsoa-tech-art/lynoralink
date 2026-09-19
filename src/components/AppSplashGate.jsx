"use client";

import { useCallback, useEffect, useState } from "react";
import SplashScreen from "@/components/SplashScreen";

const SPLASH_DURATION = 1800;
const SPLASH_STORAGE_KEY = "lynoralink:splash-seen";

export default function AppSplashGate({ children }) {
  const [showSplash, setShowSplash] = useState(false);
  const finishSplash = useCallback(() => setShowSplash(false), []);

  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = window.localStorage.getItem(SPLASH_STORAGE_KEY) === "true";
    } catch {
      alreadyShown = document.cookie.includes(`${SPLASH_STORAGE_KEY}=true`);
    }
    if (alreadyShown) return undefined;
    try {
      window.localStorage.setItem(SPLASH_STORAGE_KEY, "true");
    } catch {
      document.cookie = `${SPLASH_STORAGE_KEY}=true; max-age=31536000; path=/; samesite=lax`;
    }
    setShowSplash(true);
    const timeoutId = window.setTimeout(finishSplash, SPLASH_DURATION + 500);
    return () => window.clearTimeout(timeoutId);
  }, [finishSplash]);

  return (
    <>
      {showSplash && <SplashScreen duration={SPLASH_DURATION} onFinish={finishSplash} />}
      {children}
    </>
  );
}