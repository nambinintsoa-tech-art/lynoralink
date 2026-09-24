"use client";

import { useCallback, useEffect, useState } from "react";
import SplashScreen from "@/components/SplashScreen";

const SPLASH_DURATION = 1800;
let splashShownForDocument = false;

export default function AppSplashGate({ children }) {
  const [showSplash, setShowSplash] = useState(() => !splashShownForDocument);
  const finishSplash = useCallback(() => setShowSplash(false), []);

  useEffect(() => {
    if (splashShownForDocument) return undefined;
    splashShownForDocument = true;
    setShowSplash(true);
    const timeoutId = window.setTimeout(finishSplash, SPLASH_DURATION + 500);
    return () => window.clearTimeout(timeoutId);
  }, [finishSplash]);

  if (showSplash) return <SplashScreen duration={SPLASH_DURATION} onFinish={finishSplash} />;
  return children;
}