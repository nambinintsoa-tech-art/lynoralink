"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, Sparkles, Shield, Rocket } from "lucide-react";
import LogoBadge from "@/components/LogoBadge";
import BrandName from "@/components/BrandName";
import FacebookIcon from "@/components/FacebookIcon";
import AuthRedirectTransition from "@/components/AuthRedirectTransition";
import { getPasswordRequirements } from "@/lib/passwordPolicy";

const getSafeRedirectTarget = (value) => {
  if (!value) return "/feed";
  const nextValue = value.trim();
  if (!nextValue.startsWith("/")) return "/feed";
  return nextValue;
};

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ name: "", title: "", birthDate: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [transitionMode, setTransitionMode] = useState("register");
  const [transitionName, setTransitionName] = useState("");
  const [redirectTarget, setRedirectTarget] = useState("/feed");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [watchingVerification, setWatchingVerification] = useState(false);

  useEffect(() => {
    if (!watchingVerification || !verificationEmail) return undefined;

    let active = true;
    const checkVerification = async () => {
      try {
        const response = await fetch("/api/register/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: verificationEmail }),
          cache: "no-store",
        });
        const data = await response.json();
        if (active && response.ok && data.verified) {
          setWatchingVerification(false);
          setSuccess("Votre adresse email est confirmée. Vous pouvez maintenant vous connecter.");
        }
      } catch {}
    };

    checkVerification();
    const intervalId = window.setInterval(checkVerification, 3000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [verificationEmail, watchingVerification]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const calculatePasswordStrength = (password) => {
    if (!password) return { strength: 0, label: "", color: "" };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { strength: 1, label: "Faible", color: "bg-red-500" };
    if (score <= 3) return { strength: 2, label: "Moyen", color: "bg-yellow-500" };
    return { strength: 3, label: "Fort", color: "bg-green-500" };
  };

  const passwordStrength = calculatePasswordStrength(form.password);

  const passwordRequirements = getPasswordRequirements(form.password);

  const allRequirementsMet = passwordRequirements.every((req) => req.met);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cguAccepted) {
      setError("Vous devez accepter les conditions générales d'utilisation.");
      return;
    }
    if (!allRequirementsMet) {
      setError("Le mot de passe ne respecte pas tous les critères.");
      return;
    }
    
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Une erreur est survenue.");
      setLoading(false);
      return;
    }

    setSuccess(data.message || "Un lien de confirmation a été envoyé à votre adresse email.");
    setVerificationEmail(form.email.trim());
    setWatchingVerification(true);
    setLoading(false);
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

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      setSuccess(data.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-navy900 via-navy800 to-navy900 font-inter">
      {redirecting && (
        <AuthRedirectTransition
          mode={transitionMode}
          userName={transitionName}
          duration={1600}
          onComplete={() => {
            const target = getSafeRedirectTarget(redirectTarget);
            window.location.replace(target);
          }}
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
            Rejoignez <span style={{ color: "#F6D374" }}><BrandName /></span>
          </h1>
          <p className="mb-8 text-lg text-navy100 leading-relaxed">
            Créez votre profil professionnel et accédez à un monde d'opportunités exclusives.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 animate-fade-in animate-delay-200">
              <div className="rounded-lg bg-gold400 bg-opacity-20 p-2">
                <Sparkles className="h-6 w-6 text-gold400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Profil optimisé</h3>
                <p className="text-sm text-navy100">Mettez en valeur vos compétences et expériences</p>
              </div>
            </div>

            <div className="flex items-start gap-3 animate-fade-in animate-delay-300">
              <div className="rounded-lg bg-gold400 bg-opacity-20 p-2">
                <Shield className="h-6 w-6 text-gold400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Sécurité garantie</h3>
                <p className="text-sm text-navy100">Vos données sont protégées et cryptées</p>
              </div>
            </div>

            <div className="flex items-start gap-3 animate-fade-in animate-delay-400">
              <div className="rounded-lg bg-gold400 bg-opacity-20 p-2">
                <Rocket className="h-6 w-6 text-gold400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Démarrage rapide</h3>
                <p className="text-sm text-navy100">Inscription en 1 minute, accès immédiat aux fonctionnalités</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Register card */}
        <div className="w-full max-w-md animate-scale-in">
          <div className="auth-page-card rounded-2xl border border-navy100 bg-white p-8 shadow-2xl">
            <div className="mb-6 flex flex-col items-center gap-3 lg:hidden">
              <LogoBadge />
              <h1 className="font-brand text-2xl font-bold text-navy900">Rejoignez <BrandName /></h1>
              <p className="text-sm text-muted">Créez votre profil professionnel en 1 minute</p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={!!oauthLoading}
                className="flex items-center justify-center gap-2.5 rounded-full border border-navy100 py-2.5 text-sm font-semibold text-ink hover:bg-navy50 disabled:opacity-60 transition-all hover:shadow-md"
              >
                {oauthLoading === "google" ? <Loader2 size={16} className="animate-spin" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm"><svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.79-.07-1.54-.2-2.27H12v4.29h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.97-4.33 2.97-7.54Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.61-2.41l-3.24-2.5c-.9.6-2.05.96-3.37.96-2.59 0-4.79-1.75-5.58-4.1H3.07v2.58A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.42 13.95A6.02 6.02 0 0 1 6.42 10.05V7.47H3.07a10 10 0 0 0 0 12.96l3.35-2.48Z"/><path fill="#EA4335" d="M12 6.04c1.46 0 2.78.5 3.82 1.48l2.86-2.86A9.96 9.96 0 0 0 12 2a10 10 0 0 0-8.93 5.47l3.35 2.58C7.21 7.79 9.41 6.04 12 6.04Z"/></svg></span>}
                S'inscrire avec Google
              </button>
              <button
                type="button"
                onClick={() => handleOAuth("facebook")}
                disabled={!!oauthLoading}
                className="flex items-center justify-center gap-2.5 rounded-full border border-navy100 py-2.5 text-sm font-semibold text-ink hover:bg-navy50 disabled:opacity-60 transition-all hover:shadow-md"
              >
                {oauthLoading === "facebook" ? <Loader2 size={16} className="animate-spin" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1877F2] shadow-sm overflow-hidden"><FacebookIcon className="h-5 w-5 text-white bg-transparent" /></span>}
                S'inscrire avec Facebook
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-navy100" />
              <span className="text-xs text-muted">ou</span>
              <div className="h-px flex-1 bg-navy100" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                required
                placeholder="Nom complet"
                value={form.name}
                onChange={update("name")}
                className="rounded-lg border border-navy100 bg-white px-3.5 py-2.5 text-sm text-[#132433] placeholder:text-[#5c7488] outline-none focus:border-navy700 focus:ring-2 focus:ring-navy700 focus:ring-opacity-20 transition-all"
              />
              <input
                placeholder="Titre professionnel (ex: Product Designer @ Entreprise)"
                value={form.title}
                onChange={update("title")}
                className="rounded-lg border border-navy100 bg-white px-3.5 py-2.5 text-sm text-[#132433] placeholder:text-[#5c7488] outline-none focus:border-navy700 focus:ring-2 focus:ring-navy700 focus:ring-opacity-20 transition-all"
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="birthDate" className="text-xs font-medium text-muted">Date de naissance</label>
                <input
                  id="birthDate"
                  type="date"
                  required
                  value={form.birthDate}
                  onChange={update("birthDate")}
                  className="rounded-lg border border-navy100 bg-white px-3.5 py-2.5 text-sm text-[#132433] placeholder:text-[#5c7488] outline-none focus:border-navy700 focus:ring-2 focus:ring-navy700 focus:ring-opacity-20 transition-all"
                />
              </div>
              <input
                type="email"
                required
                placeholder="Adresse email"
                value={form.email}
                onChange={update("email")}
                className="rounded-lg border border-navy100 bg-white px-3.5 py-2.5 text-sm text-[#132433] placeholder:text-[#5c7488] outline-none focus:border-navy700 focus:ring-2 focus:ring-navy700 focus:ring-opacity-20 transition-all"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Mot de passe (8 caractères min.)"
                  value={form.password}
                  onChange={update("password")}
                  className="w-full rounded-lg border border-navy100 bg-white px-3.5 py-2.5 pr-10 text-sm text-[#132433] placeholder:text-[#5c7488] outline-none focus:border-navy700 focus:ring-2 focus:ring-navy700 focus:ring-opacity-20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy800 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {form.password && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-navy100 rounded-full overflow-hidden">
                      <div className={`h-full ${passwordStrength.color} transition-all`} style={{ width: `${(passwordStrength.strength / 3) * 100}%` }} />
                    </div>
                    {passwordStrength.label && (
                      <span className="text-xs font-medium text-muted whitespace-nowrap">{passwordStrength.label}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {passwordRequirements.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        {req.met ? <CheckCircle2 size={14} className="text-green-600" /> : <XCircle size={14} className="text-red-500" />}
                        <span className={`text-xs ${req.met ? "text-green-700" : "text-red-600"}`}>{req.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="cgu"
                  required
                  checked={cguAccepted}
                  onChange={(e) => setCguAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-navy100 text-navy800 focus:ring-navy700"
                />
                <label htmlFor="cgu" className="text-xs text-muted">
                  J'accepte les{" "}
                  <a href="/cgu" className="text-navy800 underline hover:text-navy900">
                    conditions générales d'utilisation
                  </a>
                </label>
              </div>

              {error && <p className="text-xs font-medium text-red-600">{error}</p>}
              {success && <p className="text-xs font-medium text-green-600">{success}</p>}
              {success && (
                <button type="button" onClick={handleResend} disabled={resending} className="text-xs font-semibold text-navy800 underline disabled:opacity-60">
                  {resending ? "Envoi en cours..." : "Renvoyer le lien de confirmation"}
                </button>
              )}

              <button
                type="submit"
                disabled={loading || !cguAccepted || !allRequirementsMet}
                className="mt-1 flex items-center justify-center gap-2 rounded-full bg-navy800 py-2.5 text-sm font-bold text-white hover:bg-navy900 disabled:opacity-60 transition-all hover:shadow-lg hover:scale-105 active:scale-95"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Créer mon compte
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-navy100">
            Déjà inscrit ?{" "}
            <Link href="/login" className="font-semibold text-gold400 hover:text-gold600 transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}