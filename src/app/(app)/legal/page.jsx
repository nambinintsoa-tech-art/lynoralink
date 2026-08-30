"use client";

import React from "react";
import LegalHelpSupport from "@/components/LegalHelpSupport";
import { useRouter } from "next/navigation";

export default function LegalPage() {
  const router = useRouter();

  return (
    <LegalHelpSupport
      onBack={() => router.push("/feed")}
      standalone
      initialTab="cgu"
    />
  );
}
