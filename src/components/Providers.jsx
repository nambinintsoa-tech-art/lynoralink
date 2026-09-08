"use client";

import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import ToastProvider from "./ToastProvider";
import NavigationProgress from "./NavigationProgress";
import BrowserNotificationManager from "./BrowserNotificationManager";
import NativePushNotificationManager from "./NativePushNotificationManager";

export default function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      <ToastProvider>
        <BrowserNotificationManager />
        <NativePushNotificationManager />
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
