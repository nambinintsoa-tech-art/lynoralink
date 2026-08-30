"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Abonnement from "@/components/Abonnement";

export default function AbonnementPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      router.replace("/feed?view=abonnement");
    }
  }, [status, router]);

  return null;
}
