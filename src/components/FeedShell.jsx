"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import LynoraLinkFeed from "@/components/LynoraLinkFeed";
import FeedLoadingShell from "@/components/FeedLoadingShell";

export default function FeedShell({ initialPosts }) {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [initialSearch, setInitialSearch] = useState("");
  const requestedView = searchParams.get("view") || "feed";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const search = params.get("search");
    if (search) {
      setInitialSearch(search);
    }
  }, []);

  if (status === "loading") return <FeedLoadingShell view={requestedView} />;

  return (
    <LynoraLinkFeed
      session={session}
      initialPosts={Array.isArray(initialPosts) ? initialPosts : []}
      initialSearch={initialSearch}
    />
  );
}
