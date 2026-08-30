"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AccountPicker from "@/components/AccountPicker";
import AuthRedirectTransition from "@/components/AuthRedirectTransition";
import SplashScreen from "@/components/SplashScreen";

const STARTUP_SPLASH_KEY = "lynoralink_startup_splash_seen";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [accounts, setAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);
  const [showStartupSplash, setShowStartupSplash] = useState(true);

  useEffect(() => {
    if (window.sessionStorage.getItem(STARTUP_SPLASH_KEY) === "1") {
      setShowStartupSplash(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      let storedAccounts = [];
      try {
        const saved = window.localStorage.getItem("lynoralink:connectedAccounts");
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) storedAccounts = parsed;
      } catch {
        storedAccounts = [];
      }
      setAccounts(storedAccounts);
      setIsLoadingAccounts(false);
      return;
    }

    const primaryAccount = {
      id: session.user.id || "primary",
      name: session.user.name || session.user.email || "Utilisateur",
      handle: session.user.email ? `@${session.user.email.split("@")[0]}` : "@compte",
      online: true,
      verified: Boolean(session.user.plan || session.user.title),
      photoUrl: session.user.image || null,
    };

    let storedAccounts = [];
    try {
      const saved = window.localStorage.getItem("lynoralink:connectedAccounts");
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) storedAccounts = parsed;
    } catch {
      storedAccounts = [];
    }

    let active = true;
    setIsLoadingAccounts(true);
    const initialAccounts = [primaryAccount, ...storedAccounts.filter((account) => account?.id !== primaryAccount.id)];
    setAccounts(initialAccounts);

    fetch("/api/account")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load accounts");
        const data = await response.json();
        if (!active) return;

        const fetchedAccounts = Array.isArray(data.accounts) ? data.accounts : [];
        const seen = new Set();
        const mergedAccounts = [primaryAccount, ...storedAccounts, ...fetchedAccounts].filter((account) => {
          if (!account?.id || seen.has(account.id)) return false;
          seen.add(account.id);
          return true;
        });

        setAccounts(mergedAccounts);
        window.localStorage.setItem("lynoralink:connectedAccounts", JSON.stringify(mergedAccounts));
      })
      .catch(() => {
        if (!active) return;
        setAccounts(initialAccounts);
        window.localStorage.setItem("lynoralink:connectedAccounts", JSON.stringify(initialAccounts));
      })
      .finally(() => {
        if (active) setIsLoadingAccounts(false);
      });

    return () => {
      active = false;
    };
  }, [status, session?.user?.id, session?.user?.name, session?.user?.email, session?.user?.image, session?.user?.plan, session?.user?.title]);

  if (showStartupSplash) {
    return (
      <SplashScreen
        duration={1100}
        tagline="Le réseau professionnel nouvelle génération"
        onFinish={() => {
          window.sessionStorage.setItem(STARTUP_SPLASH_KEY, "1");
          setShowStartupSplash(false);
        }}
      />
    );
  }

  if (status === "loading" || (status === "authenticated" && isLoadingAccounts) || (status === "authenticated" && !accounts.length)) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#5C7690" }}>
        Chargement de votre espace…
      </div>
    );
  }

  return (
    <>
      {navigationTarget && (
        <AuthRedirectTransition
          mode={navigationTarget}
          navigation
          duration={900}
          onComplete={() => router.push(`/${navigationTarget}`)}
        />
      )}
      {!navigationTarget && (
        <AccountPicker
          accounts={accounts}
          currentUserEmail={session?.user?.email || ""}
          onContinue={() => router.push("/feed")}
          onAddAccount={() => setNavigationTarget("login")}
          onRegister={() => setNavigationTarget("register")}
          onSignOut={() => signOut({ callbackUrl: "/" })}
        />
      )}
    </>
  );
}
