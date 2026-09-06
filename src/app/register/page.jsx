"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, Sparkles, Shield, Rocket } from "lucide-react";
import LogoBadge from "@/components/LogoBadge";
import BrandName from "@/components/BrandName";
import { getPasswordRequirements } from "@/lib/passwordPolicy";
import { fetchBackendApi } from "@/lib/backend-api";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", title: "", birthDate: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationStep, setVerificationStep] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const updateBirthDate = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    const formatted = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
    setForm((f) => ({ ...f, birthDate: formatted }));
  };

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
    if (verificationStep) {
      setError("");
      setLoading(true);
      try {
        const response = await fetchBackendApi("/api/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: verificationEmail, code: verificationCode }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || "Code de confirmation invalide.");
          return;
        }
        window.location.href = "/welcome";
      } catch {
        setError("Impossible de confirmer votre adresse email.");
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!cguAccepted) {
      setError("Vous devez accepter les conditions générales d'utilisation.");
      return;
    }
    if (!allRequirementsMet) {
      setError("Le mot de passe ne respecte pas tous les critères.");
      return;
    }
    const birthDateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(form.birthDate);
    if (!birthDateMatch) {
      setError("Saisissez une date de naissance valide au format JJ/MM/AAAA.");
      return;
    }
    const birthDateValue = new Date(Date.UTC(
      Number(birthDateMatch[3]),
      Number(birthDateMatch[2]) - 1,
      Number(birthDateMatch[1]),
      12,
    ));
    const today = new Date();
    const latestBirthDate = new Date(Date.UTC(
      today.getUTCFullYear() - 16,
      today.getUTCMonth(),
      today.getUTCDate(),
      12,
    ));
    if (Number.isNaN(birthDateValue.getTime())
      || birthDateValue.getUTCFullYear() !== Number(birthDateMatch[3])
      || birthDateValue.getUTCMonth() !== Number(birthDateMatch[2]) - 1
      || birthDateValue.getUTCDate() !== Number(birthDateMatch[1])) {
      setError("Saisissez une date de naissance valide au format JJ/MM/AAAA.");
      return;
    }
    if (birthDateValue > latestBirthDate) {
      setError("Vous devez avoir au moins 16 ans pour créer un compte.");
      return;
    }
    
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetchBackendApi("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, birthDate: `${birthDateMatch[3]}-${birthDateMatch[2]}-${birthDateMatch[1]}` }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
        return;
      }

      setSuccess(data.message || "Un code de confirmation a été envoyé à votre adresse email.");
      setVerificationEmail(form.email.trim());
      setVerificationStep(true);
    } catch {
      setError("Le serveur est momentanément indisponible. Réessayez dans quelques instants.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetchBackendApi("/api/verify-email/resend", {
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#081827] font-inter">
      <div className="absolute inset-0 opacity-70 bg-[linear-gradient(120deg,rgba(27,83,134,.55),transparent_45%),linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:auto,4rem_4rem,4rem_4rem]" />

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
            <div className="mb-7 flex flex-col items-center gap-3 text-center">
              <LogoBadge />
              <h1 className="font-brand text-2xl font-bold text-navy900">Rejoignez <BrandName /></h1>
              <p className="text-sm text-muted">Créez votre profil professionnel en 1 minute</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {!verificationStep && (
                <>
              <input
                required
                placeholder="Nom complet"
                value={form.name}
                onChange={update("name")}
                className="rounded-lg border border-navy100 bg-white px-3.5 py-2.5 text-sm text-[#132433] placeholder:text-[#5c7488] outline-none focus:border-navy700 focus:ring-2 focus:ring-navy700 focus:ring-opacity-20 transition-all"
              />
              <input
                placeholder="Titre professionnel (facultatif)"
                value={form.title}
                onChange={update("title")}
                className="rounded-lg border border-navy100 bg-white px-3.5 py-2.5 text-sm text-[#132433] placeholder:text-[#5c7488] outline-none focus:border-navy700 focus:ring-2 focus:ring-navy700 focus:ring-opacity-20 transition-all"
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="birthDate" className="text-xs font-medium text-muted">Date de naissance</label>
                <input
                  id="birthDate"
                  type="text"
                  inputMode="numeric"
                  required
                  autoComplete="bday"
                  placeholder="JJ/MM/AAAA"
                  maxLength={10}
                  value={form.birthDate}
                  onChange={updateBirthDate}
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
                </>
              )}

              {verificationStep && (
                <div className="rounded-xl border border-gold600/40 bg-gold400/10 p-4">
                  <label htmlFor="verificationCode" className="text-xs font-semibold text-navy900">Code de confirmation</label>
                  <p className="mt-1 text-xs text-muted">Saisissez le code à 6 chiffres envoyé à {verificationEmail}.</p>
                  <input
                    id="verificationCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="mt-3 w-full rounded-lg border border-navy100 bg-white px-3.5 py-3 text-center text-lg font-bold tracking-[0.45em] text-[#132433] outline-none focus:border-navy700 focus:ring-2 focus:ring-navy700 focus:ring-opacity-20"
                  />
                </div>
              )}

              {!verificationStep && <div className="flex items-start gap-2">
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
                  <Link href="/legal" className="text-navy800 underline hover:text-navy900">
                    conditions générales d'utilisation
                  </Link>
                </label>
              </div>}

              {error && <p className="text-xs font-medium text-red-600">{error}</p>}
              {success && <p className="text-xs font-medium text-green-600">{success}</p>}
              {success && (
                <button type="button" onClick={handleResend} disabled={resending} className="text-xs font-semibold text-navy800 underline disabled:opacity-60">
                  {resending ? "Envoi en cours..." : "Renvoyer le code de confirmation"}
                </button>
              )}

              <button
                type="submit"
                disabled={loading || (verificationStep ? verificationCode.length !== 6 : !cguAccepted || !allRequirementsMet)}
                className="mt-1 flex items-center justify-center gap-2 rounded-full bg-navy800 py-2.5 text-sm font-bold text-white hover:bg-navy900 disabled:opacity-60 transition-all hover:shadow-lg hover:scale-105 active:scale-95"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {verificationStep ? "Confirmer mon adresse" : "Créer mon compte"}
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