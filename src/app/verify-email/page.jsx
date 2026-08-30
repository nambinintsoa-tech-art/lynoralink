"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useSearchParams();
  const verificationStarted = useRef(false);
  const [state, setState] = useState({ loading: true, verified: false, message: "" });
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (verificationStarted.current) return;
    verificationStarted.current = true;
    if (!token) {
      setState({ loading: false, verified: false, message: "Lien de confirmation invalide." });
      return;
    }

    fetch("/api/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json();
        setState({ loading: false, verified: response.ok, message: data.message || data.error });
        if (response.ok && typeof window !== "undefined") window.location.replace("/login?verified=1");
      })
      .catch(() => setState({ loading: false, verified: false, message: "Impossible de confirmer cette adresse email." }));
  }, [params]);

  const handleResend = async (event) => {
    event.preventDefault();
    setResending(true);
    setResendMessage("");
    try {
      const response = await fetch("/api/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setResendMessage(data.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy900 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        {state.loading ? <Loader2 className="mx-auto h-10 w-10 animate-spin text-navy700" /> : state.verified ? <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" /> : <XCircle className="mx-auto h-12 w-12 text-red-600" />}
        <h1 className="mt-4 text-2xl font-bold text-navy900">{state.loading ? "Confirmation en cours" : state.verified ? "Email confirmé" : "Confirmation impossible"}</h1>
        {!state.loading && <p className="mt-3 text-muted">{state.message}</p>}
        {!state.loading && !state.verified && <form onSubmit={handleResend} className="mt-6 flex flex-col gap-3">
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Votre adresse email" className="rounded-lg border border-navy100 px-3 py-2.5 text-sm outline-none focus:border-navy700" />
          <button type="submit" disabled={resending} className="rounded-full bg-navy800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{resending ? "Envoi en cours..." : "Renvoyer la confirmation"}</button>
          {resendMessage && <p className="text-xs text-green-600">{resendMessage}</p>}
        </form>}
        {!state.loading && <Link href="/login" className="mt-6 inline-flex rounded-full bg-navy900 px-5 py-2.5 text-sm font-semibold text-white">Aller à la connexion</Link>}
      </section>
    </main>
  );
}
