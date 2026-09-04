"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserDashboard from "@/components/UserDashboard";
import { TopNav } from "@/components/TopNav";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#EFF4F9", color: "#5C7488" }}>
        Chargement du tableau de bord...
      </div>
    );
  }

  const profile = {
    id: session?.user?.id || null,
    name: session?.user?.name || "Utilisateur",
    title: session?.user?.title || "Membre LynoraLink",
    avatarUrl: session?.user?.image || null,
  };

  const handleNavigate = (view) => {
    if (view === "feed") {
      router.push("/feed");
      return;
    }
    if (view === "dashboard") {
      router.push("/dashboard");
      return;
    }
    if (view === "profile" || view === "settings" || view === "abonnement") {
      router.push(`/feed?view=${view}`);
      return;
    }
    router.push(`/feed?view=${view}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#EFF4F9" }}>
      <style>{`
        :root {
          --lynora-header-offset: 96px;
        }
        @media (max-width: 900px) {
          :root {
            --lynora-header-offset: 150px;
          }
        }
      `}</style>
      <div style={{ position: "relative" }}>
        <TopNav
          profile={profile}
          view="dashboard"
          onNavigate={handleNavigate}
          onRequestLogout={() => signOut({ callbackUrl: "/login" })}
          unreadMessages={0}
          unreadNotifications={0}
          isAdmin={Boolean(session?.user?.email && session.user.email.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase())}
          onSearch={(query) => {
            if (query.trim()) {
              router.push(`/feed?view=feed&search=${encodeURIComponent(query.trim())}`);
            }
          }}
        />
        <div style={{ background: "#EFF4F9", paddingTop: "var(--lynora-header-offset)" }}>
          <UserDashboard profile={profile} />
        </div>
      </div>
    </div>
  );
}