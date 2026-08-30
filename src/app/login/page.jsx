"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, Mail, Zap, Users, TrendingUp } from "lucide-react";
import LogoBadge from "@/components/LogoBadge";
import BrandName from "@/components/BrandName";
import FacebookIcon from "@/components/FacebookIcon";
import AuthRedirectTransition from "@/components/AuthRedirectTransition";
import { useEffect } from "react";

const getSafeRedirectTarget = (value) => {
  if (!value) return "/feed";
  const nextValue = value.trim();
  if (!nextValue.startsWith("/")) return "/feed";
  return nextValue;
};

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [transitionName, setTransitionName] = useState("");
  const [redirectTarget, setRedirectTarget] = useState("/feed");
  const [navigationTransition, setNavigationTransition] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("lynoralink:rememberMe");
    if (saved === "true") setRememberMe(true);
    else if (saved === "false") setRememberMe(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("lynoralink:rememberMe", rememberMe ? "true" : "false");
  }, [rememberMe]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (!twoFactorStep) {
      const challenge = await fetch("/api/auth/2fa/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }).then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => ({})) }));
      if (!challenge.ok) {
        setLoading(false);
        setError(challenge.data.error || "Email ou mot de passe incorrect.");
        return;
      }
      if (challenge.data.requiresTwoFactor) {
        setTwoFactorStep(true);
        setLoading(false);
        return;
      }
    }
    const res = await signIn("credentials", {
      email,
      password,
      otp: twoFactorStep ? twoFactorCode : undefined,
      remember: rememberMe,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setTwoFactorCode("");
      setError("Email ou mot de passe incorrect.");
      return;
    }

    try {
      const accountResponse = await fetch("/api/account");
      const accountData = await accountResponse.json();
      const authenticatedAccount = accountData?.accounts?.[0];
      if (accountResponse.ok && authenticatedAccount?.id) {
        const saved = window.localStorage.getItem("lynoralink:connectedAccounts");
        const storedAccounts = saved ? JSON.parse(saved) : [];
        const accounts = Array.isArray(storedAccounts) ? storedAccounts : [];
        const mergedAccounts = [authenticatedAccount, ...accounts.filter((account) => account?.id !== authenticatedAccount.id)];
        window.localStorage.setItem("lynoralink:connectedAccounts", JSON.stringify(mergedAccounts));
      }
    } catch {}

    const displayName = email.trim().split("@")[0] || "";
    setTransitionName(displayName);
    const callbackUrl = params.get("verified")
      ? "/welcome"
      : getSafeRedirectTarget(params.get("callbackUrl"));
    setRedirectTarget(callbackUrl);
    setRedirecting(true);
  };

  const handleOAuth = async (provider) => {
    setOauthLoading(provider);
    const callbackUrl = getSafeRedirectTarget(params.get("callbackUrl"));
    try {
      await signIn(provider, { callbackUrl });
    } catch (e) {
      setOauthLoading(null);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-navy900 via-navy800 to-navy900 font-inter">
      {redirecting && (
        <AuthRedirectTransition
          mode="login"
          userName={transitionName}
          duration={1400}
          onComplete={() => {
            const target = getSafeRedirectTarget(redirectTarget);
            window.location.replace(target);
          }}
        />
      )}
      {navigationTransition && (
        <AuthRedirectTransition
          mode={navigationTransition}
          navigation
          duration={900}
          onComplete={() => router.push(`/${navigationTransition}`)}
        />
      )}
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 animate-float rounded-full bg-gold400 opacity-10 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 animate-float-delayed rounded-full bg-navy700 opacity-20 blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 h-60 w-60 animate-rotate-slow rounded-full bg-gold600 opacity-5 blur-2xl"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

      <div className="auth-page-shell relative z-10 flex w-full max-w-6xl items-center justify-center gap-12 px-4">
        {/* Left side - Text content */}
        <div className="hidden lg:block flex-1 max-w-lg animate-slide-in-left">
          <div className="mb-6">
            <LogoBadge size={56} />
          </div>
          <h1 className="mb-4 font-brand text-5xl font-bold text-white leading-tight">
            Connectez-vous à votre <span style={{ color: "#F6D374" }}>avenir professionnel</span>
          </h1>
          <p className="mb-8 text-lg text-navy100 leading-relaxed">
            Accédez à des opportunités exclusives, développez votre réseau et propulsez votre carrière avec LynoraLink.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 animate-fade-in animate-delay-200">
              <div className="rounded-lg bg-gold400 bg-opacity-20 p-2">
                <Zap className="h-6 w-6 text-gold400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Opportunités instantanées</h3>
                <p className="text-sm text-navy100">Recevez des offres adaptées à votre profil en temps réel</p>
              </div>
            </div>

            <div className="flex items-start gap-3 animate-fade-in animate-delay-300">
              <div className="rounded-lg bg-gold400 bg-opacity-20 p-2">
                <Users className="h-6 w-6 text-gold400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Réseau professionnel</h3>
                <p className="text-sm text-navy100">Connectez-vous avec des recruteurs et professionnels du monde entier</p>
              </div>
            </div>

            <div className="flex items-start gap-3 animate-fade-in animate-delay-400">
              <div className="rounded-lg bg-gold400 bg-opacity-20 p-2">
                <TrendingUp className="h-6 w-6 text-gold400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Croissance continue</h3>
                <p className="text-sm text-navy100">Suivez votre progression et développez vos compétences</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login card */}
        <div className="w-full max-w-md animate-scale-in">
          <div className="auth-page-card rounded-2xl border border-navy100 bg-white p-8 shadow-2xl">
            <div className="mb-6 flex flex-col items-center gap-3 lg:hidden">
              <LogoBadge />
              <h1 className="font-brand text-2xl font-bold text-navy900">Bon retour parmi nous</h1>
              <p className="text-sm text-muted">
                Connectez-vous à votre compte <BrandName />
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={!!oauthLoading}
                className="flex items-center justify-center gap-2.5 rounded-full border border-navy100 py-2.5 text-sm font-semibold text-ink hover:bg-navy50 disabled:opacity-60 transition-all hover:shadow-md"
              >
                {oauthLoading === "google" ? <Loader2 size={16} className="animate-spin" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm"><svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.79-.07-1.54-.2-2.27H12v4.29h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.97-4.33 2.97-7.54Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.61-2.41l-3.24-2.5c-.9.6-2.05.96-3.37.96-2.59 0-4.79-1.75-5.58-4.1H3.07v2.58A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.42 13.95A6.02 6.02 0 0 1 6.42 10.05V7.47H3.07a10 10 0 0 0 0 12.96l3.35-2.48Z"/><path fill="#EA4335" d="M12 6.04c1.46 0 2.78.5 3.82 1.48l2.86-2.86A9.96 9.96 0 0 0 12 2a10 10 0 0 0-8.93 5.47l3.35 2.58C7.21 7.79 9.41 6.04 12 6.04Z"/></svg></span>}
                Continuer avec Google
              </button>
              <button
                type="button"
                onClick={() => handleOAuth("facebook")}
                disabled={!!oauthLoading}
                className="flex items-center justify-center gap-2.5 rounded-full border border-navy100 py-2.5 text-sm font-semibold text-ink hover:bg-navy50 disabled:opacity-60 transition-all hover:shadow-md"
              >
                {oauthLoading === "facebook" ? <Loader2 size={16} className="animate-spin" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1877F2] shadow-sm overflow-hidden"><FacebookIcon className="h-5 w-5 text-white bg-transparent" /></span>}
                Continuer avec Facebook
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-navy100" />
              <span className="text-xs text-muted">ou</span>
              <div className="h-px flex-1 bg-navy100" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                required
                placeholder="Adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-navy100 bg-white px-3.5 py-2.5 text-sm text-[#132433] placeholder:text-[#5c7488] outline-none focus:border-navy700 focus:ring-2 focus:ring-navy700 focus:ring-opacity-20 transition-all"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-navy100 bg-white px-3.5 py-2.5 text-sm text-[#132433] placeholder:text-[#5c7488] outline-none focus:border-navy700 focus:ring-2 focus:ring-navy700 focus:ring-opacity-20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy800 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {twoFactorStep && (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  placeholder="Code reçu par e-mail"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                  className="rounded-lg border border-navy100 bg-white px-3.5 py-2.5 text-sm text-[#132433] placeholder:text-[#5c7488] tracking-[0.3em] outline-none focus:border-navy700 focus:ring-2 focus:ring-navy700 focus:ring-opacity-20 transition-all"
                />
              )}
              <Link
                href={`/reset-password${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""}`}
                className="self-end text-xs font-semibold text-navy700 hover:text-navy900"
              >
                Mot de passe oublié ?
              </Link>

              {error && <p className="text-xs font-medium text-red-600">{error}</p>}
              {params.get("registered") && (
                <p className="text-xs font-medium text-navy700">
                  Compte créé avec succès, connectez-vous.
                </p>
              )}
              {params.get("verified") && (
                <p className="text-xs font-medium text-green-600">
                  Adresse e-mail confirmée. Connectez-vous pour compléter votre profil.
                </p>
              )}

              <label className="flex items-center gap-2 text-xs text-muted select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-navy100 text-navy800 focus:ring-navy700"
                />
                Se souvenir de moi
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex items-center justify-center gap-2 rounded-full bg-navy800 py-2.5 text-sm font-bold text-white hover:bg-navy900 disabled:opacity-60 transition-all hover:shadow-lg hover:scale-105 active:scale-95"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {twoFactorStep ? "Vérifier le code" : "Se connecter"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-navy100">
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              onClick={(event) => {
                event.preventDefault();
                setNavigationTransition("register");
              }}
              className="font-semibold text-gold400 hover:text-gold600 transition-colors"
            >
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}