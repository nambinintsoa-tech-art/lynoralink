"use client";

import dynamic from "next/dynamic";
import FeedLoadingShell from "@/components/FeedLoadingShell";

const FeedShell = dynamic(() => import("@/components/FeedShell"), {
  ssr: false,
  loading: () => <FeedLoadingShell view="feed" />,
});

export default function FeedPage() {
  return <FeedShell initialPosts={[]} />;
}
