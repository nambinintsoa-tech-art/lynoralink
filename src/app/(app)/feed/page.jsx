"use client";

import dynamic from "next/dynamic";

const FeedShell = dynamic(() => import("@/components/FeedShell"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "100vh", background: "#EFF4F9" }} aria-label="Chargement" />,
});

export default function FeedPage() {
  return <FeedShell initialPosts={[]} />;
}
