"use client";

import { useRouter } from "next/navigation";
import WelcomePage from "@/components/WelcomePage";

export default function WelcomeRoute() {
  const router = useRouter();

  return (
    <WelcomePage
      userName=""
      onContinue={() => router.replace("/feed")}
    />
  );
}
