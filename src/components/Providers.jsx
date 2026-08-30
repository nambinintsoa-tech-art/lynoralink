"use client";

import { SessionProvider } from "next-auth/react";
import ToastProvider from "./ToastProvider";
import NavigationProgress from "./NavigationProgress";

export default function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      <ToastProvider>
        <NavigationProgress />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
