"use client";

import { useRouter } from "next/navigation";
import WelcomePage from "@/components/WelcomePage";

export default function WelcomeRoute() {
  const router = useRouter();

  const goToFeed = () => {
    router.replace("/feed");
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/feed")) {
      window.location.assign("/feed");
    }
  };

  return (
    <WelcomePage
      userName=""
      onContinue={goToFeed}
    />
  );
}
