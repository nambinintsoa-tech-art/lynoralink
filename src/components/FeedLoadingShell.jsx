"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useLayoutEffect } from "react";
import { TopNav } from "@/components/TopNav";
import { ComposerSkeleton, FeedSkeleton, LeftSidebarSkeleton, ProfileSkeleton, RightSidebarSkeleton } from "@/components/Skeleton";
import { SkeletonStoryRail } from "@/components/StorySkeleton";

export default function FeedLoadingShell({ profileView = false }) {
  const router = useRouter();
  const { data: session } = useSession();
  const profile = {
    id: session?.user?.id || null,
    name: session?.user?.name || "Utilisateur",
    title: session?.user?.title || "Membre LynoraLink",
    avatarUrl: session?.user?.image || null,
  };

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="lynora-skeleton-feed-shell" style={{ minHeight: "100dvh", paddingTop: profileView ? 0 : "var(--lynora-header-offset, 96px)", background: "#EFF4F9" }}>
      <TopNav
        profile={profile}
        view="feed"
        onNavigate={(view) => router.push(view === "feed" ? "/feed" : `/feed?view=${view}`)}
        onRequestLogout={() => signOut({ callbackUrl: "/login" })}
        unreadMessages={0}
        unreadNotifications={0}
        isAdmin={false}
        profileLoading
        onSearch={(query) => {
          if (query.trim()) router.push(`/feed?view=feed&search=${encodeURIComponent(query.trim())}`);
        }}
      />

      {profileView ? <main aria-hidden="true" className="lynora-profile-loading-main" style={{ maxWidth: 1400, margin: "0 auto", padding: "calc(var(--lynora-header-offset, 96px) + 24px) 16px 24px", pointerEvents: "none" }}><ProfileSkeleton /></main> : <div aria-hidden="true" style={{ maxWidth: 1400, width: "100%", margin: "0 auto", display: "grid", gridTemplateColumns: "300px minmax(0, 1fr) 320px", gap: 32, alignItems: "start", padding: "28px 20px 60px", pointerEvents: "none" }} className="lynora-grid lynora-feed-container lynora-skeleton-feed-grid">
        <aside aria-label="Chargement de la navigation latérale" style={{ minWidth: 0 }}>
          <div className="lynora-skeleton-fixed-sidebar" style={{ position: "fixed", top: "calc(var(--lynora-header-offset, 96px) + 28px)", left: "calc((100vw - min(1400px, 100vw)) / 2 + 20px)", width: 300, maxHeight: "calc(100vh - var(--lynora-header-offset, 96px) - 28px)", overflowY: "auto", paddingRight: 8 }}>
            <LeftSidebarSkeleton />
          </div>
        </aside>
        <main style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, width: "100%" }}>
          <ComposerSkeleton />
          <SkeletonStoryRail />
          <FeedSkeleton count={5} />
        </main>
        <aside aria-label="Chargement des informations latérales" style={{ minWidth: 0, width: "100%" }}>
          <div className="lynora-skeleton-fixed-sidebar" style={{ position: "fixed", top: "calc(var(--lynora-header-offset, 96px) + 28px)", right: "calc((100vw - min(1400px, 100vw)) / 2 + 20px)", width: 320, maxHeight: "calc(100vh - var(--lynora-header-offset, 96px) - 28px)", overflowY: "auto", paddingRight: 8 }}>
            <RightSidebarSkeleton />
          </div>
        </aside>
      </div>}
    </div>
  );
}
