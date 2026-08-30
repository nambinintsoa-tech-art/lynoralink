"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import LogoBadge from "@/components/LogoBadge";
import { getPasswordRequirements, isStrongPassword } from "@/lib/passwordPolicy";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const requestResetLink = async () => {
    if (!email.trim()) return setError("Saisissez votre adresse email.");
    setError("");
    setLoading(true);
    const response = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) return setError(data.error || "Impossible d'envoyer le lien.");
    setDone(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!token) {
      await requestResetLink();
      return;
    }
    if (!isStrongPassword(password)) return setError("Le mot de passe ne respecte pas tous les critères de sécurité.");
    if (password !== confirmation) return setError("Les mots de passe ne correspondent pas.");
    setLoading(true);
    const response = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) return setError(data.error || "Impossible de réinitialiser le mot de passe.");
    setDone(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy900 via-navy800 to-navy900 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <LogoBadge />
          <h1 className="font-brand text-2xl font-bold text-navy900">{token ? "Nouveau mot de passe" : "Mot de passe oublié"}</h1>
          <p className="text-sm text-muted">{token ? "Choisissez un nouveau mot de passe pour votre compte." : "Recevez un lien pour réinitialiser votre mot de passe."}</p>
        </div>
        {done ? (
          <div className="text-center">
            <p className="text-sm text-navy800">{token ? "Votre mot de passe a été modifié." : "Si un compte correspond à cette adresse, un lien vient d’être envoyé."}</p>
            {!token && (
              <div className="mt-5 flex flex-col gap-3">
                <button type="button" onClick={requestResetLink} disabled={loading} className="rounded-full bg-navy800 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                  {loading ? "Envoi..." : "Réenvoyer le lien"}
                </button>
                <button type="button" onClick={() => router.push("/login")} className="rounded-full border border-navy100 bg-white px-5 py-2.5 text-sm font-bold text-navy800">Se connecter</button>
              </div>
            )}
            {token && (
              <button type="button" onClick={() => router.push("/login")} className="mt-5 rounded-full bg-navy800 px-5 py-2.5 text-sm font-bold text-white">Se connecter</button>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            {!token && <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Adresse email" className="rounded-lg border border-navy100 px-3.5 py-2.5 text-sm outline-none focus:border-navy700" />}
            {token && <>
              <div className="relative">
                <input type={visible ? "text" : "password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nouveau mot de passe" className="w-full rounded-lg border border-navy100 px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-navy700" />
                <button type="button" onClick={() => setVisible((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              <input type={visible ? "text" : "password"} required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Confirmer le mot de passe" className="rounded-lg border border-navy100 px-3.5 py-2.5 text-sm outline-none focus:border-navy700" />
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted">
                {getPasswordRequirements(password).map((requirement) => (
                  <span key={requirement.key} className={requirement.met ? "text-green-600" : "text-muted"}>
                    {requirement.met ? "✓" : "○"} {requirement.label}
                  </span>
                ))}
              </div>
            </>}
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="mt-1 flex items-center justify-center gap-2 rounded-full bg-navy800 py-2.5 text-sm font-bold text-white disabled:opacity-60">{loading && <Loader2 size={16} className="animate-spin" />} {token ? "Réinitialiser le mot de passe" : "Envoyer le lien"}</button>
          </form>
        )}
      </section>
    </main>
  );
}