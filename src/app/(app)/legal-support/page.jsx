"use client";

import React, { Suspense } from "react";
import LegalHelpSupport from "@/components/LegalHelpSupport";
import { useRouter, useSearchParams } from "next/navigation";

function LegalSupportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const requestedReason = searchParams.get("reason");
  const initialTab = requestedTab === "support" ? "support" : "aide";
  const initialSupportReason = requestedReason === "banned" || requestedReason === "deleted" || requestedReason === "suspended" ? requestedReason : null;

  return (
    <LegalHelpSupport 
      onBack={() => router.push("/feed")} 
      onOpenAssistant={() => router.push("/feed?view=ai-assistant")}
      standalone
      initialTab={initialTab}
      initialSupportReason={initialSupportReason}
    />
  );
}

export default function LegalSupportPage() {
  return <Suspense fallback={<main className="min-h-screen bg-white" />}><LegalSupportPageContent /></Suspense>;
}