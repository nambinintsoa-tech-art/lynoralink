"use client";

/**
 * Abonnement.jsx — LynoraLink
 * ─────────────────────────────────────────────────────────────────────────
 * Page d'abonnement Premium autonome et réutilisable.
 *
 * Props
 * ─────
 *  currentPlan     "free" | "premium" | "premium_annual"  (défaut : "free")
 *  onBack          () => void — retour au feed
 *  onSubscribe     (planId, billingCycle) => Promise<void>
 *                  appelé au clic "Choisir ce plan" ; doit résoudre/rejeter
 *  onManage        () => void — portail de gestion (utilisateur déjà Premium)
 *  onCancel        () => void — annulation d'abonnement (utilisateur déjà Premium)
 *  userName        string (optionnel, pour personnaliser l'en-tête)
 * ─────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Crown, Check, X, Zap, Users, BarChart2,
  MessageSquare, Shield, Star, Sparkles, CheckCircle2,
  AlertTriangle, Loader,
} from "lucide-react";
import { TopNav } from "./TopNav";

/* ── Tokens (identiques au feed) ────────────────────────────────────── */
const C = {
  navy900:    "#0F3352",
  navy800:    "#1B5386",
  navy700:    "#2C6BA0",
  navy100:    "#DCE7F1",
  navy50:     "#EFF4F9",
  gold400:    "#F6D374",
  gold600:    "#D9A536",
  ink:        "#132433",
  muted:      "#5C7488",
  mutedLight: "#8CA0B3",
  line:       "#E3EAF1",
  white:      "#FFFFFF",
  danger:     "#C24444",
  danger50:   "#FBEDED",
  success:    "#2E9E5B",
  success50:  "#EBF8F1",
};

const goldGrad    = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGrad    = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;
const premiumGrad = `linear-gradient(135deg, #1B5386 0%, #0F3352 60%, #2a1a6e 100%)`;

const PLANS = {
  free: {
    id: "free", name: "Essentiel", tagline: "Les fonctionnalités fondamentales pour développer votre réseau",
    monthlyPrice: 0, annualPrice: 0, color: C.muted, badge: null,
    features: [
      { label: "Messagerie sans limitation", included: true },
      { label: "Réseau de connexions sans limitation", included: true },
      { label: "Publication de contenus sans limitation", included: true },
      { label: "Création de pages entreprise", included: false },
      { label: "Création et gestion de groupes sans limitation", included: true },
      { label: "Assistant IA : 3 créations de contenus par jour", included: true },
      { label: "Création de publicités sponsorisées", included: false },
    ],
  },
  premium: {
    id: "premium", name: "Premium Business", tagline: "Développez votre activité avec des fonctionnalités prioritaires",
    monthlyPrice: 9.99, annualPrice: 7.99, color: C.gold600, badge: "Populaire",
    features: [
      { label: "Messagerie sans limitation", included: true },
      { label: "Connexions sans limitation et traitement prioritaire", included: true },
      { label: "Publication et diffusion prioritaires, sans limitation", included: true },
      { label: "Création de pages entreprise", included: true },
      { label: "Création et gestion de groupes prioritaires, sans limitation", included: true },
      { label: "Assistant IA : créations de contenus illimitées et prioritaires", included: true },
      { label: "Création et diffusion de publicités sponsorisées", included: true },
    ],
  },
};

/* ════════════════════════════════════════════════════════════════════════
   Sous-composants
════════════════════════════════════════════════════════════════════════ */

function Avatar({ initials, size = 40, gold = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: gold ? goldGrad : navyGrad,
      color: gold ? C.navy900 : C.white,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.35,
      fontFamily: "'Sora', sans-serif", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

/* Pill de cycle de facturation */
function BillingToggle({ cycle, onChange }) {
  return (
    <div style={{
      display:        "inline-flex",
      alignItems:     "center",
      background:     C.navy50,
      border:         `1px solid ${C.line}`,
      borderRadius:   999,
      padding:        4,
      gap:            4,
    }}>
      {["monthly", "annual"].map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{
            padding:      "7px 18px",
            borderRadius: 999,
            border:       "none",
            cursor:       "pointer",
            fontSize:     13,
            fontWeight:   700,
            background:   cycle === c ? C.navy800 : "transparent",
            color:        cycle === c ? C.white : C.muted,
            transition:   "all 0.18s ease",
            display:      "flex",
            alignItems:   "center",
            gap:          6,
          }}
        >
          {c === "monthly" ? "Mensuel" : (
            <>
              Annuel
              <span style={{
                fontSize:     10, fontWeight: 800,
                background:   goldGrad, color: C.navy900,
                borderRadius: 999, padding: "1px 7px",
              }}>
                −20 %
              </span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}

/* Carte de plan */
function PlanCard({ plan, cycle, isCurrentPlan, isUpgrade, onChoose, loading }) {
  const isPremium = plan.id === "premium";
  const price     = cycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
  const isFree    = plan.monthlyPrice === 0;

  return (
    <div style={{
      position:     "relative",
      borderRadius: 20,
      border:       isPremium
        ? `2px solid ${C.gold500 || C.gold600}`
        : `1.5px solid ${C.line}`,
      background:   isPremium ? premiumGrad : C.white,
      padding:      "28px 24px 24px",
      display:      "flex",
      flexDirection:"column",
      gap:          20,
      boxShadow:    isPremium
        ? "0 20px 60px rgba(15,51,82,0.28), 0 0 0 1px rgba(246,211,116,0.2)"
        : "0 2px 12px rgba(15,51,82,0.06)",
      transition:   "transform 0.18s ease, box-shadow 0.18s ease",
      flex:         1,
    }}
      onMouseEnter={(e) => { if (!isPremium) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(15,51,82,0.12)"; } }}
      onMouseLeave={(e) => { if (!isPremium) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,51,82,0.06)"; } }}
    >
      {/* Badge "Populaire" */}
      {plan.badge && (
        <div style={{
          position:   "absolute", top: -13, left: "50%",
          transform:  "translateX(-50%)",
          background: goldGrad, color: C.navy900,
          fontFamily: "'Sora', sans-serif", fontWeight: 800,
          fontSize:   11, letterSpacing: "0.05em",
          padding:    "3px 14px", borderRadius: 999,
          whiteSpace: "nowrap",
          boxShadow:  "0 4px 12px rgba(217,165,54,0.35)",
        }}>
          ✦ {plan.badge}
        </div>
      )}

      {/* En-tête du plan */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {isPremium
            ? <Crown size={18} color={C.gold400} fill={C.gold400} />
            : <Star  size={18} color={C.muted} />
          }
          <span style={{
            fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 18,
            color: isPremium ? C.white : C.ink,
          }}>
            {plan.name}
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: isPremium ? "rgba(220,231,241,0.8)" : C.muted, margin: 0 }}>
          {plan.tagline}
        </p>
      </div>

      {/* Prix */}
      <div>
        {isFree ? (
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 36, color: isPremium ? C.white : C.ink }}>
            Gratuit
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
              <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 36, color: isPremium ? C.gold400 : C.ink, lineHeight: 1 }}>
                {price.toFixed(2)} €
              </span>
              <span style={{ fontSize: 13, color: isPremium ? "rgba(220,231,241,0.7)" : C.muted, paddingBottom: 5 }}>
                / mois
              </span>
            </div>
            {cycle === "annual" && (
              <div style={{ fontSize: 11.5, color: isPremium ? C.gold400 : C.success, fontWeight: 600, marginTop: 4 }}>
                Soit {(price * 12).toFixed(2)} € facturés annuellement
              </div>
            )}
          </>
        )}
      </div>

      {/* Liste des fonctionnalités */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
        {plan.features.map(({ label, included }) => (
          <li
            key={label}
            style={{
              display:    "flex",
              alignItems: "flex-start",
              gap:        9,
              fontSize:   13,
              color:      included
                ? (isPremium ? C.white : C.ink)
                : (isPremium ? "rgba(220,231,241,0.35)" : C.mutedLight),
              textDecoration: included ? "none" : "none",
            }}
          >
            <span style={{
              flexShrink: 0, marginTop: 1,
              width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {included
                ? <Check size={14} color={isPremium ? C.gold400 : C.success} strokeWidth={2.5} />
                : <X     size={13} color={isPremium ? "rgba(220,231,241,0.3)" : C.line} />
              }
            </span>
            {label}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrentPlan ? (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "11px 0", borderRadius: 12, border: `1.5px solid ${isPremium ? "rgba(246,211,116,0.4)" : C.line}`,
          fontSize: 13, fontWeight: 700,
          color: isPremium ? C.gold400 : C.muted,
          background: "transparent",
        }}>
          <CheckCircle2 size={15} /> Plan actuel
        </div>
      ) : isFree ? (
        <div style={{
          padding: "11px 0", borderRadius: 12, textAlign: "center",
          fontSize: 13, fontWeight: 600, color: C.muted,
        }}>
          Plan de base inclus
        </div>
      ) : (
        <button
          onClick={onChoose}
          disabled={loading}
          style={{
            padding:      "13px 0",
            borderRadius: 12,
            border:       "none",
            background:   loading ? C.line : goldGrad,
            color:        loading ? C.muted : C.navy900,
            fontFamily:   "'Sora', sans-serif",
            fontWeight:   800,
            fontSize:     14,
            cursor:       loading ? "default" : "pointer",
            display:      "flex",
            alignItems:   "center",
            justifyContent:"center",
            gap:          8,
            boxShadow:    loading ? "none" : "0 6px 20px rgba(217,165,54,0.4)",
            transition:   "all 0.18s ease",
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = "0 8px 28px rgba(217,165,54,0.55)"; }}
          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.boxShadow = "0 6px 20px rgba(217,165,54,0.4)"; }}
        >
          {loading
            ? <><Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> Traitement…</>
            : <><Sparkles size={15} /> {isUpgrade ? "Passer à Premium" : "Choisir ce plan"}</>
          }
        </button>
      )}
    </div>
  );
}

/* Modale de confirmation de souscription */
function ConfirmModal({ cycle, onCancel, onConfirm, loading }) {
  const plan  = PLANS.premium;
  const price = cycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
  const label = cycle === "annual"
    ? `${(price * 12).toFixed(2)} € / an`
    : `${price.toFixed(2)} € / mois`;

  return (
    <div
      onClick={onCancel}
      style={{
        position:       "fixed", inset: 0, zIndex: 300,
        background:     "rgba(15,51,82,0.6)",
        display:        "flex", alignItems: "center", justifyContent: "center",
        padding:        16,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, background: C.white, borderRadius: 20, padding: "28px 24px", boxShadow: "0 32px 80px rgba(15,51,82,0.35)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <Crown size={28} color={C.gold600} fill={C.gold600} />
        </div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 18, color: C.ink, textAlign: "center", marginBottom: 8 }}>
          Activer Premium Business
        </div>
        <p style={{ fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.6, margin: "0 0 20px" }}>
          Vous serez débité de <strong style={{ color: C.ink }}>{label}</strong>. La gestion de votre abonnement reste disponible depuis le portail Stripe.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "13px 0", borderRadius: 12, border: "none",
              background: loading ? C.line : goldGrad,
              color: loading ? C.muted : C.navy900,
              fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 14,
              cursor: loading ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: loading ? "none" : "0 6px 20px rgba(217,165,54,0.35)",
            }}
          >
            {loading
              ? <><Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> Traitement en cours…</>
              : <><Sparkles size={15} /> Confirmer l'abonnement</>
            }
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "11px 0", borderRadius: 12,
              border: `1.5px solid ${C.line}`, background: "transparent",
              color: C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            Annuler
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 14, fontSize: 11, color: C.mutedLight }}>
          <Shield size={11} /> Paiement sécurisé via Stripe
        </div>
      </div>
    </div>
  );
}

/* Toast de succès */
function SuccessToast({ onClose }) {
  return (
    <div
      style={{
        position:   "fixed", bottom: 28, left: "50%",
        transform:  "translateX(-50%)",
        zIndex:     400,
        background: C.navy900,
        border:     `1px solid rgba(246,211,116,0.3)`,
        borderRadius: 999,
        padding:    "12px 22px",
        display:    "flex", alignItems: "center", gap: 10,
        boxShadow:  "0 16px 48px rgba(15,51,82,0.4)",
        animation:  "toastIn 0.3s cubic-bezier(0.16,1,0.3,1) both",
        whiteSpace: "nowrap",
      }}
    >
      <CheckCircle2 size={16} color={C.gold400} />
      <span style={{ fontSize: 13.5, fontWeight: 700, color: C.white }}>
        Bienvenue dans LynoraLink Premium 🎉
      </span>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", padding: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ExpiredToast() {
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      zIndex: 400, maxWidth: "calc(100vw - 32px)", background: C.navy900,
      border: `1px solid rgba(246,211,116,0.35)`, borderRadius: 14,
      padding: "13px 18px", boxShadow: "0 16px 48px rgba(15,51,82,0.4)",
      color: C.white, fontSize: 13, fontWeight: 700, textAlign: "center",
    }}>
      Votre période Premium est terminée. Les fonctionnalités Premium sont désactivées.
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
════════════════════════════════════════════════════════════════════════ */
export default function Abonnement({
  currentPlan   = "free",
  onBack,
  onSubscribe,
  onManage,
  onCancel,
  userName      = "vous",
  showTopNav    = true,
  subscriptionExpired = false,
}) {
  const router = useRouter();
  const [cycle,       setCycle]       = useState("monthly");
  const [confirming,  setConfirming]  = useState(false);  // modale ouverte
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState("");

  const isPremium   = currentPlan === "premium" || currentPlan === "premium_annual";
  const planEntries = Object.values(PLANS);
  const profile = {
    name: userName,
    title: "Membre LynoraLink",
    avatarUrl: null,
  };

  const handleNavigate = (view) => {
    if (view === "feed") {
      onBack?.();
      return;
    }

    const routeMap = {
      profile: "/feed?view=profile",
      settings: "/feed?view=settings",
      network: "/feed?view=network",
      groups: "/feed?view=groups",
      company: "/feed?view=company",
      messages: "/feed?view=messages",
      notifications: "/feed?view=notifications",
    };

    router.push(routeMap[view] || "/feed");
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  /* Ouverture de la modale de confirmation */
  const handleChoosePremium = () => {
    setError("");
    setConfirming(true);
  };

  /* Confirmation de la souscription */
  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      await onSubscribe?.("premium", cycle);
      setConfirming(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err?.message || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── CSS global (animations + offsets) ───────────────────── */}
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        :root {
          --lynora-header-offset: 96px;
        }
        @media (max-width: 900px) {
          :root {
            --lynora-header-offset: 150px;
          }
        }

        @media (max-width: 640px) {
          .abo-root { width: 100% !important; min-width: 0 !important; }
          .abo-content { width: 100% !important; max-width: none !important; padding: 8px 12px 20px !important; gap: 28px !important; }
          .abo-plans  { flex-direction: column !important; }
          .abo-plans > * { width: 100% !important; min-width: 0 !important; }
          .abo-testi  { flex-direction: column !important; }
          .abo-hero-title { font-size: 24px !important; }
          .abo-cta { border-radius: 14px !important; padding: 24px 16px !important; }
          .abo-brand-footer { border-radius: 10px !important; padding: 12px 14px !important; }
        }
      `}</style>

      <div className="abo-root" style={{ minHeight: "100vh", background: C.navy50, fontFamily: "'Inter', sans-serif" }}>

        {showTopNav && (
          <TopNav
            profile={profile}
            view="feed"
            onNavigate={handleNavigate}
            onRequestLogout={handleLogout}
            unreadMessages={0}
            unreadNotifications={0}
            isAdmin={false}
            isPremium={isPremium}
            onSearch={(query) => {
              if (query.trim()) {
                router.push(`/feed?view=feed&search=${encodeURIComponent(query.trim())}`);
              }
            }}
          />
        )}

        <div className="abo-content" style={{ maxWidth: 860, margin: "0 auto", padding: showTopNav ? "var(--lynora-header-offset) 20px 80px" : "20px 20px 80px", display: "flex", flexDirection: "column", gap: 52 }}>

          {/* ── Section Hero ─────────────────────────────────────────── */}
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>

            {/* Icône animée */}
            <div className="abo-cta" style={{
              width: 72, height: 72, borderRadius: 22,
              background: goldGrad,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 16px 48px rgba(217,165,54,0.35)",
            }}>
              <Crown size={34} color={C.navy900} fill={C.navy900} />
            </div>

            {isPremium ? (
              <>
                <h1 className="abo-hero-title" style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 30, color: C.ink, margin: 0 }}>
                  Vous êtes déjà Premium 🎉
                </h1>
                <p style={{ fontSize: 15, color: C.muted, maxWidth: 480, lineHeight: 1.7, margin: 0 }}>
                  Profitez pleinement de tous vos avantages LynoraLink Premium, {userName}.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  {onManage && (
                    <button
                      onClick={onManage}
                      style={{
                        padding: "10px 20px", borderRadius: 12,
                        border: "none", background: navyGrad,
                        color: C.white, fontWeight: 700, fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Gérer mon abonnement
                    </button>
                  )}
                  {onCancel && (
                    <button
                      onClick={onCancel}
                      style={{
                        padding: "10px 20px", borderRadius: 12,
                        border: `1.5px solid ${C.line}`,
                        background: "transparent",
                        color: C.muted, fontWeight: 600, fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Annuler l'abonnement
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h1 className="abo-hero-title" style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 32, color: C.ink, margin: 0, lineHeight: 1.2 }}>
                  Débloquez tout votre potentiel<br />
                  <span style={{ background: goldGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    professionnel
                  </span>
                </h1>
                <p style={{ fontSize: 15, color: C.muted, maxWidth: 500, lineHeight: 1.7, margin: 0 }}>
                  Visibilité, messagerie illimitée, statistiques avancées — tout ce qu'il vous faut pour accélérer votre carrière ou votre activité.
                </p>

                {/* Toggle mensuel / annuel */}
                <BillingToggle cycle={cycle} onChange={setCycle} />
              </>
            )}
          </div>

          {/* ── Cartes de plans ──────────────────────────────────────── */}
          {!isPremium && (
            <div className="abo-plans" style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
              {planEntries.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  cycle={cycle}
                  isCurrentPlan={
                    (plan.id === "free"    && !isPremium) ||
                    (plan.id === "premium" && isPremium)
                  }
                  isUpgrade={plan.id === "premium" && !isPremium}
                  onChoose={handleChoosePremium}
                  loading={false}
                />
              ))}
            </div>
          )}

          {/* Message d'erreur global */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: C.danger50, border: `1px solid ${C.danger}`,
              borderRadius: 12, padding: "12px 16px",
              fontSize: 13, color: C.danger, fontWeight: 600,
            }}>
              <AlertTriangle size={15} /> {error}
            </div>
          )}

          {/* ── CTA bas de page ──────────────────────────────────────── */}
          {!isPremium && (
            <div style={{
              background:   premiumGrad,
              borderRadius: 20,
              padding:      "36px 28px",
              display:      "flex",
              flexDirection:"column",
              alignItems:   "center",
              gap:          16,
              textAlign:    "center",
              boxShadow:    "0 16px 48px rgba(15,51,82,0.22)",
            }}>
              <Crown size={32} color={C.gold400} fill={C.gold400} />
              <h2 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 22, color: C.white, margin: 0 }}>
                Prêt à passer à la vitesse supérieure ?
              </h2>
              <p style={{ fontSize: 14, color: "rgba(220,231,241,0.8)", maxWidth: 420, lineHeight: 1.65, margin: 0 }}>
                Essayez Premium gratuitement pendant 7 jours. Aucune carte requise pour commencer.
              </p>
              <button
                onClick={handleChoosePremium}
                style={{
                  padding:    "14px 36px",
                  borderRadius: 14,
                  border:     "none",
                  background: goldGrad,
                  color:      C.navy900,
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 800,
                  fontSize:   15,
                  cursor:     "pointer",
                  display:    "flex", alignItems: "center", gap: 8,
                  boxShadow:  "0 8px 28px rgba(217,165,54,0.45)",
                }}
              >
                <Sparkles size={16} /> Démarrer l'essai gratuit
              </button>
              <p style={{ fontSize: 11.5, color: "rgba(220,231,241,0.5)", margin: 0 }}>
                Sans engagement · Annulation en un clic
              </p>
            </div>
          )}

          <div className="abo-brand-footer" style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "16px 20px",
            borderRadius: 16,
            background: C.white,
            border: `1px solid ${C.line}`,
            color: C.ink,
          }}>
            <Crown size={18} color={C.gold600} fill={C.gold600} />
            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 15 }}>
              LynoraLink Premium
            </span>
          </div>

        </div>
      </div>

      {/* ── Modale de confirmation ───────────────────────────────── */}
      {confirming && (
        <ConfirmModal
          cycle={cycle}
          onCancel={() => !loading && setConfirming(false)}
          onConfirm={handleConfirm}
          loading={loading}
        />
      )}

      {/* ── Toast succès ─────────────────────────────────────────── */}
      {success && <SuccessToast onClose={() => setSuccess(false)} />}
      {subscriptionExpired && <ExpiredToast />}
    </>
  );
}
