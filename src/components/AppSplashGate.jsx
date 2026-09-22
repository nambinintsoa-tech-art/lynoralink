"use client";

import { useCallback, useEffect, useState } from "react";
import SplashScreen from "@/components/SplashScreen";

const SPLASH_DURATION = 1800;

export default function AppSplashGate({ children }) {
  const [showSplash, setShowSplash] = useState(false);
  const finishSplash = useCallback(() => setShowSplash(false), []);

  useEffect(() => {
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