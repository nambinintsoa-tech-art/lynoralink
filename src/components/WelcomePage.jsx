"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Users,
  MessageSquare,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Star,
} from "lucide-react";
import LogoBadge from "./LogoBadge";
import ProfileCompletionModal from "./ProfileCompletionModal";
import { fetchBackendApi } from "@/lib/backend-api";

/* ------------------------------------------------------------------ */
/*  TOKENS — identiques au reste de l'application                    */
/* ------------------------------------------------------------------ */
const C = {
  navy900: "var(--navy900)",
  navy800: "var(--navy800)",
  navy700: "#2C6BA0",
  navy100: "var(--app-border)",
  navy50: "var(--app-bg)",
  gold400: "#F6D374",
  gold600: "#D9A536",
  ink: "var(--app-text)",
  muted: "var(--app-muted)",
  mutedLight: "var(--app-muted-light)",
  line: "var(--app-border)",
  white: "var(--app-surface)",
  gold50: "var(--welcome-gold-bg)",
};
const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;

/* ------------------------------------------------------------------ */
/*  AppName — "Lynora" en doré, "Link" en bleu marine                 */
/* ------------------------------------------------------------------ */
function AppName({ style }) {
  return (
    <span style={style}>
      <span style={{ color: C.gold600 }}>Lynora</span>
      <span style={{ color: C.ink }}>Link</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Données par défaut — surchageables via props                      */
/* ------------------------------------------------------------------ */
const DEFAULT_FEATURES = [
  {
    icon: Users,
    title: "Réseau ciblé",
    text: "Connectez-vous avec des professionnels de votre secteur et élargissez votre cercle en quelques clics.",
  },
  {
    icon: MessageSquare,
    title: "Messagerie sécurisée",
    text: "Échangez en privé ou en groupe, avec vos contacts professionnels, sans bruit ni distraction.",
  },
  {
    icon: Briefcase,
    title: "Opportunités de carrière",
    text: "Repérez les offres, entreprises et projets pertinents directement dans votre fil d'actualité.",
  },
  {
    icon: ShieldCheck,
    title: "Confidentialité maîtrisée",
    text: "Vous décidez qui voit quoi. Vos données restent sous votre contrôle, à tout moment.",
  },
];

/* ------------------------------------------------------------------ */
/*  WelcomePage — écran affiché juste après une inscription réussie   */
/* ------------------------------------------------------------------ */
/**
 * @param {string} [userName]         Prénom de l'utilisateur qui vient de s'inscrire
 * @param {() => void} onContinue     Passe directement au fil d'actualité (peut être fait plus tard)
 * @param {(data: object) => void} [onProfileComplete]  Appelé avec les données saisies (poste, entreprise, bio, compétences, photo...) une fois le formulaire de profil terminé
 * @param {Array} [features]          Surcharge des 4 cartes de fonctionnalités
 * @param {Array} [stats]             Surcharge de la bande de statistiques
 */
export default function WelcomePage({
  userName,
  onContinue,
  onProfileComplete,
  features = DEFAULT_FEATURES,
  stats: statsProp,
}) {
  const { data: session } = useSession();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [stats, setStats] = useState(statsProp || []);
  const [statsLoading, setStatsLoading] = useState(!statsProp);

  useEffect(() => {
    if (statsProp) {
      setStats(statsProp);
      setStatsLoading(false);
      return;
    }
    let cancelled = false;
    fetchBackendApi("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.stats) setStats(data.stats);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statsProp]);

  const handleProfileComplete = (data) => {
    setShowProfileModal(false);
    setProfileCompleted(true);
    onProfileComplete?.(data);
    onContinue?.();
  };

  const professionalsCount = stats.find((s) => s.label === "Professionnels actifs")?.value || "...";
  const displayName = userName || session?.user?.name || "";

  return (
    <div className="lyn-wp-root" style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "var(--app-bg)", color: C.ink, minHeight: "100dvh", width: "100%", overflowX: "hidden" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');

        @keyframes lyn-wp-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lyn-wp-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes lyn-wp-blob {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50%      { transform: scale(1.08) translate(10px, -10px); }
        }
        .lyn-wp-reveal { animation: lyn-wp-fade-up .6s cubic-bezier(0.22,1,0.36,1) both; }
        .lyn-wp-float { animation: lyn-wp-float 4.5s ease-in-out infinite; }
        .lyn-wp-blob { animation: lyn-wp-blob 9s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .lyn-wp-reveal, .lyn-wp-float, .lyn-wp-blob { animation: none !important; }
        }

        .lyn-wp-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(217,165,54,0.38); }
        .lyn-wp-btn-ghost:hover { background: ${C.navy50}; }
        .lyn-wp-feature-card:hover { transform: translateY(-3px); box-shadow: 0 16px 32px rgba(15,51,82,0.10); border-color: ${C.navy100}; }

        .lyn-wp-root { min-height: 100dvh; }
        @media (max-width: 900px) {
          .lyn-wp-hero-grid { grid-template-columns: 1fr !important; }
          .lyn-wp-hero-visual { order: -1; margin-bottom: 8px; }
          .lyn-wp-hero-visual { min-height: 300px !important; }
          .lyn-wp-hero-title { font-size: 34px !important; }
          .lyn-wp-features-grid { grid-template-columns: 1fr 1fr !important; }
          .lyn-wp-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .lyn-wp-nav-cta-label { display: none !important; }
        }
        @media (max-width: 560px) {
          .lyn-wp-root { min-height: 100svh; }
          .lyn-wp-nav-inner { padding: 10px 14px !important; }
          .lyn-wp-hero { padding: 32px 14px 36px !important; }
          .lyn-wp-features { padding: 28px 14px 44px !important; }
          .lyn-wp-stats-inner { padding: 30px 14px !important; }
          .lyn-wp-cta { padding: 36px 14px !important; }
          .lyn-wp-cta-banner { padding: 24px 18px !important; }
          .lyn-wp-cta-banner h3 { font-size: 18px !important; line-height: 1.3; }
          .lyn-wp-cta-banner button { width: 100%; justify-content: center; }
          .lyn-wp-hero-visual { min-height: 250px !important; }
          .lyn-wp-hero-visual > .lyn-wp-float { transform: scale(.88); }
          .lyn-wp-hero-visual > .lyn-wp-float:first-of-type { left: -18px !important; }
          .lyn-wp-hero-visual > .lyn-wp-float:last-of-type { right: -18px !important; }
          .lyn-wp-feature-card { padding: 16px !important; }
          .lyn-wp-features-grid { grid-template-columns: 1fr !important; }
          .lyn-wp-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .lyn-wp-hero-title { font-size: 28px !important; }
          .lyn-wp-cta-banner { flex-direction: column !important; text-align: center; }
        }
      `}</style>

      {/* ---------------------------------------------------------- */}
      {/*  NAV — plus de connexion/inscription : l'utilisateur a déjà un compte */}
      {/* ---------------------------------------------------------- */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "color-mix(in srgb, var(--app-surface) 92%, transparent)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${C.line}` }}>
        <div className="lyn-wp-nav-inner" style={{ maxWidth: 1180, width: "100%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogoBadge size={34} />
            <AppName style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 16 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={onContinue}
              className="lyn-wp-btn-ghost"
              style={{ border: "none", background: "transparent", color: C.navy800, fontWeight: 700, fontSize: 13.5, padding: "9px 14px", borderRadius: 10, cursor: "pointer", transition: "background .2s ease" }}
            >
              Plus tard
            </button>
            <button
              onClick={() => !profileCompleted && setShowProfileModal(true)}
              disabled={profileCompleted}
              style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: navyGrad, color: C.white, fontWeight: 700, fontSize: 13.5, padding: "9px 16px", borderRadius: 10, cursor: "pointer" }}
            >
              <span className="lyn-wp-nav-cta-label">{profileCompleted ? "Profil complété" : "Compléter mon profil"}</span>
              {profileCompleted ? <CheckCircle2 size={15} /> : <ArrowRight size={15} />}
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  HERO — message de bienvenue personnalisé                  */}
      {/* ---------------------------------------------------------- */}
      <div className="lyn-wp-hero" style={{ position: "relative", maxWidth: 1180, width: "100%", margin: "0 auto", padding: "72px 24px 64px" }}>
        <div className="lyn-wp-hero-grid" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 48, alignItems: "center" }}>
          {/* Colonne texte */}
          <div>
            <div className="lyn-wp-reveal" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.gold50, border: `1px solid ${C.gold400}`, color: C.gold600, fontSize: 12.5, fontWeight: 700, padding: "6px 12px", borderRadius: 20, marginBottom: 18 }}>
              <CheckCircle2 size={13} /> Compte créé avec succès
            </div>

            <h1 className="lyn-wp-hero-title lyn-wp-reveal" style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 44, lineHeight: 1.12, color: C.ink, margin: "0 0 18px", animationDelay: ".08s" }}>
              Bienvenue{displayName ? `, ${displayName}` : ""}{" "}
              <span style={{ background: goldGrad, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                sur LynoraLink
              </span>
            </h1>

            <p className="lyn-wp-reveal" style={{ fontSize: 16, lineHeight: 1.65, color: C.muted, maxWidth: 480, marginBottom: 28, animationDelay: ".16s" }}>
              Votre compte est prêt. Complétez votre profil pour être trouvé·e plus facilement par les bonnes personnes, ou explorez directement votre fil d'actualité.
            </p>

            <div className="lyn-wp-reveal" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28, animationDelay: ".24s" }}>
              <button
                onClick={() => !profileCompleted && setShowProfileModal(true)}
                className="lyn-wp-btn-primary"
                disabled={profileCompleted}
                style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: profileCompleted ? "var(--welcome-success-bg)" : goldGrad, color: profileCompleted ? "var(--welcome-success)" : C.navy900, fontWeight: 800, fontSize: 14.5, padding: "13px 22px", borderRadius: 12, cursor: profileCompleted ? "default" : "pointer", boxShadow: profileCompleted ? "none" : "0 10px 22px rgba(217,165,54,0.28)", transition: "all .2s ease" }}
              >
                {profileCompleted ? <><CheckCircle2 size={16} /> Profil complété avec succès</> : <>Compléter mon profil <ArrowRight size={16} /></>}
              </button>
              <button
                onClick={onContinue}
                className="lyn-wp-btn-ghost"
                style={{ border: `1px solid ${C.line}`, background: C.white, color: C.navy800, fontWeight: 700, fontSize: 14.5, padding: "13px 22px", borderRadius: 12, cursor: "pointer", transition: "background .2s ease" }}
              >
                Accéder à mon fil d'actualité
              </button>
            </div>

            <div className="lyn-wp-reveal" style={{ display: "flex", alignItems: "center", gap: 10, animationDelay: ".32s" }}>
              <span style={{ fontSize: 13, color: C.muted }}>
                Vous rejoignez <strong style={{ color: C.ink }}>{professionalsCount}</strong> professionnels
              </span>
            </div>
          </div>

          {/* Colonne visuelle */}
          <div className="lyn-wp-hero-visual" style={{ position: "relative", minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="lyn-wp-blob" style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: goldGrad, opacity: 0.18, filter: "blur(10px)", top: -10, right: 10 }} />
            <div className="lyn-wp-blob" style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: navyGrad, opacity: 0.12, filter: "blur(10px)", bottom: -10, left: 10, animationDelay: "1.5s" }} />

            {/* Carte "post" stylisée */}
            <div className="lyn-wp-reveal" style={{ position: "relative", width: "100%", maxWidth: 340, background: C.white, border: `1px solid ${C.line}`, borderRadius: 18, padding: 18, boxShadow: "0 24px 60px rgba(15,51,82,0.16)", animationDelay: ".2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: navyGrad }} />
                <div>
                  <div style={{ width: 100, height: 9, borderRadius: 4, background: C.navy100, marginBottom: 6 }} />
                  <div style={{ width: 60, height: 7, borderRadius: 4, background: C.line }} />
                </div>
              </div>
              <div style={{ width: "100%", height: 8, borderRadius: 4, background: C.line, marginBottom: 6 }} />
              <div style={{ width: "85%", height: 8, borderRadius: 4, background: C.line, marginBottom: 6 }} />
              <div style={{ width: "60%", height: 8, borderRadius: 4, background: C.line, marginBottom: 14 }} />
              <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 12, background: C.navy50, border: `1px solid ${C.line}` }} />
              <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                <div style={{ width: 46, height: 16, borderRadius: 6, background: C.navy50 }} />
                <div style={{ width: 46, height: 16, borderRadius: 6, background: C.navy50 }} />
                <div style={{ width: 46, height: 16, borderRadius: 6, background: C.navy50 }} />
              </div>
            </div>

            {/* Badges flottants */}
            <div className="lyn-wp-float" style={{ position: "absolute", top: 6, left: -10, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "8px 12px", boxShadow: "0 10px 24px rgba(15,51,82,0.12)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: goldGrad, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={14} color={C.navy900} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>Profil créé</div>
                <div style={{ fontSize: 10, color: C.muted }}>à l'instant</div>
              </div>
            </div>

            <div className="lyn-wp-float" style={{ position: "absolute", bottom: 14, right: -14, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "8px 12px", boxShadow: "0 10px 24px rgba(15,51,82,0.12)", display: "flex", alignItems: "center", gap: 8, animationDelay: "1.2s" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: navyGrad, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageSquare size={13} color={C.white} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>Bienvenue !</div>
                <div style={{ fontSize: 10, color: C.muted }}>Équipe LynoraLink</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  FEATURES — "ce qui vous attend" plutôt qu'un argumentaire commercial */}
      {/* ---------------------------------------------------------- */}
      <div className="lyn-wp-features" style={{ maxWidth: 1180, width: "100%", margin: "0 auto", padding: "40px 24px 72px" }}>
        <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 40px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.gold600, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Pour bien démarrer</div>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 28, color: C.ink, margin: "0 0 10px" }}>
            Voici ce qui vous attend
          </h2>
          <p style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.6 }}>
            Maintenant que vous êtes des nôtres, profitez pleinement de ces fonctionnalités.
          </p>
        </div>

        <div className="lyn-wp-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="lyn-wp-feature-card lyn-wp-reveal"
                style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20, transition: "all .25s ease", animationDelay: `${i * 0.08}s` }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 12, background: C.navy50, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Icon size={20} color={C.navy800} strokeWidth={1.8} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.ink, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{f.text}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  STATS                                                     */}
      {/* ---------------------------------------------------------- */}
      <div style={{ background: navyGrad }}>
        <div className="lyn-wp-stats-inner" style={{ maxWidth: 1180, width: "100%", margin: "0 auto", padding: "44px 24px" }}>
          <div className="lyn-wp-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 26, color: C.white, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.72)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  CTA BANNER — pousse vers la complétion du profil           */}
      {/* ---------------------------------------------------------- */}
      <div className="lyn-wp-cta" style={{ maxWidth: 1180, width: "100%", margin: "0 auto", padding: "64px 24px" }}>
        <div className="lyn-wp-cta-banner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, background: C.gold50, border: `1px solid ${C.gold400}`, borderRadius: 20, padding: "36px 40px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.gold600, fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
              <Star size={14} fill={C.gold600} strokeWidth={0} /> Bienvenue dans la communauté
            </div>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 22, color: C.ink, margin: 0 }}>
              {profileCompleted ? "Votre profil est maintenant complet" : "Encore une étape : complétez votre profil"}
            </h3>
          </div>
          <button
            onClick={() => !profileCompleted && setShowProfileModal(true)}
            className="lyn-wp-btn-primary"
            disabled={profileCompleted}
            style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: profileCompleted ? "var(--welcome-success-bg)" : navyGrad, color: profileCompleted ? "var(--welcome-success)" : C.white, fontWeight: 800, fontSize: 14.5, padding: "13px 24px", borderRadius: 12, cursor: profileCompleted ? "default" : "pointer", whiteSpace: "nowrap", transition: "all .2s ease" }}
          >
            {profileCompleted ? <><CheckCircle2 size={16} /> Profil complété avec succès</> : <>Compléter mon profil <ArrowRight size={16} /></>}
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  FOOTER                                                    */}
      {/* ---------------------------------------------------------- */}
      <div style={{ borderTop: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoBadge size={26} />
            <AppName style={{ fontSize: 13, fontWeight: 700 }} />
          </div>
          <div style={{ fontSize: 12.5, color: C.mutedLight }}>
            © {new Date().getFullYear()} LynoraLink. Tous droits réservés.
          </div>
        </div>
      </div>

      <ProfileCompletionModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onComplete={handleProfileComplete}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EXEMPLE D'INTÉGRATION                                              */
/* ------------------------------------------------------------------ */
//
// "use client";
// import { useRouter } from "next/navigation";
// import { useSession } from "@/hooks/useSession"; // exemple, à adapter
// import WelcomePage from "./WelcomePage";
//
// export default function Page() {
//   const router = useRouter();
//   const { user } = useSession(); // ex. { firstName: "Sarah", ... }
//
//   return (
//     <WelcomePage
//       userName={user?.firstName}
//       onContinue={() => router.push("/feed")}
//       onProfileComplete={async (data) => {
//         // data = { title, company, sector, location, bio, skills, photoPreview }
//         await fetch("/api/profile", { method: "POST", body: JSON.stringify(data) });
//         // WelcomePage appelle ensuite onContinue automatiquement
//       }}
//     />
//   );
// }
