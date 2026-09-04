"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchBackendApi } from "@/lib/backend-api";
import {
  ArrowLeft, FileText, LifeBuoy, MessageSquare, Search, ChevronDown,
  Send, Mail, Clock, ShieldCheck, ExternalLink, CheckCircle2,
  Sparkles, HelpCircle, BadgeCheck, Timer,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  TOKENS — repris à l'identique de la charte LynoraLink              */
/* ------------------------------------------------------------------ */
const C = {
  navy900: "var(--navy900)",
  navy800: "var(--navy800)",
  navy700: "var(--navy700)",
  navy100: "var(--app-border)",
  navy50: "var(--app-bg)",
  gold400: "#F6D374",
  gold600: "#D9A536",
  ink: "var(--app-text)",
  muted: "var(--app-muted)",
  mutedLight: "var(--app-muted-light)",
  line: "var(--app-border)",
  white: "var(--app-surface)",
  danger: "#C24444",
  danger50: "#FBEDED",
  success: "#2E8B57",
  success50: "#EAF6EF",
};

const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGrad = `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 100%)`;
const SORA = "'Sora', sans-serif";
const INTER = "'Inter', sans-serif";

/* ------------------------------------------------------------------ */
/*  DONNÉES — à remplacer par le contenu réel du service juridique     */
/* ------------------------------------------------------------------ */
const CGU_LAST_UPDATE = "12 août 2026";

export const CGU_SECTIONS = [
  {
    id: "objet",
    title: "1. Objet et champ d'application",
    body: "Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'accès et l'utilisation de LynoraLink, plateforme dédiée à la mise en réseau professionnelle, au partage de publications et à la gestion de pages d'entreprise. Elles s'appliquent à tout membre, quel que soit son mode de connexion (web ou application).",
  },
  {
    id: "acceptation",
    title: "2. Acceptation des conditions",
    body: "La création d'un compte vaut acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas tout ou partie de ces conditions, vous ne devez pas utiliser le service.",
  },
  {
    id: "compte",
    title: "3. Création et sécurité du compte",
    body: "Chaque membre s'engage à fournir des informations exactes lors de son inscription et à préserver la confidentialité de ses identifiants. Toute activité réalisée depuis un compte est réputée effectuée par son titulaire, sauf signalement d'un accès non autorisé auprès du support.",
  },
  {
    id: "contenu",
    title: "4. Contenu publié par les membres",
    body: "Les membres restent seuls responsables des contenus qu'ils publient (posts, articles, commentaires, médias). LynoraLink se réserve le droit de retirer tout contenu contraire à la loi, aux présentes CGU ou aux règles de la communauté, sans préavis.",
  },
  {
    id: "propriete",
    title: "5. Propriété intellectuelle",
    body: "La marque LynoraLink, son logo et l'ensemble des éléments graphiques et logiciels de la plateforme sont protégés. Les membres conservent la propriété de leurs contenus et concèdent à LynoraLink une licence limitée nécessaire à l'hébergement et à la diffusion de ces contenus sur le service.",
  },
  {
    id: "donnees",
    title: "6. Données personnelles",
    body: "Les données collectées sont traitées conformément à la politique de confidentialité de LynoraLink. Chaque membre dispose d'un droit d'accès, de rectification, d'opposition et de suppression de ses données, exerçable depuis les paramètres du compte ou auprès du support.",
  },
  {
    id: "interdits",
    title: "7. Comportements interdits",
    body: "Sont notamment interdits : l'usurpation d'identité, le harcèlement, la diffusion de contenus haineux ou trompeurs, le démarchage non sollicité et toute tentative d'accès non autorisé aux systèmes de la plateforme.",
  },
  {
    id: "resiliation",
    title: "8. Résiliation et suspension",
    body: "LynoraLink peut suspendre ou résilier un compte en cas de manquement grave ou répété aux présentes CGU. Chaque membre peut à tout moment clôturer son compte depuis les paramètres, sans justification.",
  },
  {
    id: "responsabilite",
    title: "9. Responsabilité et garanties",
    body: "LynoraLink s'efforce d'assurer la disponibilité et la sécurité du service, sans garantie d'absence totale d'interruption. La responsabilité de LynoraLink ne saurait être engagée pour un usage non conforme du service par un membre.",
  },
  {
    id: "modification",
    title: "10. Modification des CGU",
    body: "LynoraLink peut modifier les présentes CGU à tout moment. Les membres seront informés de toute modification substantielle et la poursuite de l'utilisation du service après notification vaudra acceptation des nouvelles conditions.",
  },
  {
    id: "droit",
    title: "11. Droit applicable et litiges",
    body: "Les présentes CGU sont soumises au droit applicable au siège social de LynoraLink. En cas de litige, une solution amiable sera recherchée en priorité avant toute action contentieuse.",
  },
];

const FAQ_CATEGORIES = ["Toutes", "Compte & profil", "Publications", "Réseau & messagerie", "Confidentialité", "Facturation"];

export const FAQ_ITEMS = [
  { id: "f1", category: "Compte & profil", q: "Comment modifier mon nom ou ma photo de profil ?", a: "Rendez-vous dans Paramètres > Profil, puis modifiez les champs souhaités. Les changements sont visibles immédiatement sur votre page et vos publications." },
  { id: "f2", category: "Compte & profil", q: "Comment supprimer définitivement mon compte ?", a: "Depuis Paramètres > Compte > Supprimer le compte. Cette action est irréversible : vos publications, connexions et messages seront définitivement effacés après un délai de rétractation de 14 jours." },
  { id: "f3", category: "Compte & profil", q: "J'ai perdu l'accès à mon compte, que faire ?", a: "Utilisez « Mot de passe oublié » depuis l'écran de connexion. Si vous n'avez plus accès à votre e-mail, contactez le support avec une pièce justifiant votre identité." },
  { id: "f4", category: "Publications", q: "Qui peut voir mes publications ?", a: "Par défaut, vos publications sont visibles par votre réseau. Vous pouvez ajuster la visibilité (public, réseau, personnalisé) au moment de la publication ou a posteriori depuis le menu de la publication." },
  { id: "f5", category: "Publications", q: "Comment supprimer ou modifier un commentaire ?", a: "Survolez le commentaire concerné et cliquez sur les trois points pour le modifier ou le supprimer. Les auteurs d'une publication peuvent également masquer les commentaires reçus." },
  { id: "f6", category: "Réseau & messagerie", q: "Comment retirer une invitation envoyée par erreur ?", a: "Depuis Réseau > Invitations envoyées, cliquez sur « Annuler » en face de l'invitation concernée." },
  { id: "f7", category: "Réseau & messagerie", q: "Puis-je bloquer un membre ?", a: "Oui, depuis son profil, ouvrez le menu « ⋯ » puis « Bloquer ». Le membre bloqué ne pourra plus voir votre profil ni vous contacter." },
  { id: "f8", category: "Confidentialité", q: "Comment télécharger mes données personnelles ?", a: "Depuis Paramètres > Confidentialité > Télécharger mes données. Un fichier récapitulatif vous sera envoyé par e-mail sous 48 heures." },
  { id: "f9", category: "Confidentialité", q: "Qui a accès à mon adresse e-mail ?", a: "Votre adresse e-mail n'est jamais affichée publiquement et n'est partagée avec des tiers que dans les cas prévus par la politique de confidentialité." },
  { id: "f10", category: "Facturation", q: "Comment annuler mon abonnement Premium ?", a: "Depuis Paramètres > Abonnement > Gérer, puis « Résilier ». L'accès Premium reste actif jusqu'à la fin de la période déjà payée." },
  { id: "f11", category: "Facturation", q: "Où trouver mes factures ?", a: "Toutes vos factures sont disponibles dans Paramètres > Abonnement > Historique de facturation, au format PDF téléchargeable." },
];

const SUPPORT_CATEGORIES = ["Question générale", "Problème technique", "Compte & sécurité", "Facturation", "Signaler un contenu"];

/* ------------------------------------------------------------------ */
/*  PRIMITIVES — cohérentes avec le reste de l'application             */
/* ------------------------------------------------------------------ */
function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(15,51,82,0.05)", ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: SORA, fontWeight: 800, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: C.navy700 }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ONGLET — CGU                                                       */
/* ------------------------------------------------------------------ */
function CguTab({ managedContent = "", cguSections = CGU_SECTIONS }) {
  const [activeSection, setActiveSection] = useState(CGU_SECTIONS[0].id);

  const selectSection = (sectionId) => {
    setActiveSection(sectionId);
    document.getElementById(`cgu-${sectionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0,1fr)", gap: 24 }} className="lhs-cgu-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 4, position: "sticky", top: 20, alignSelf: "start" }} className="lhs-cgu-toc lhs-cgu-toc-desktop">
        <SectionLabel>Sommaire</SectionLabel>
        {cguSections.map((s) => (
          <button
            key={s.id}
            onClick={() => selectSection(s.id)}
            style={{
              textAlign: "left", background: "none", border: "none", cursor: "pointer",
              padding: "8px 10px", borderRadius: 9, fontSize: 12.5, lineHeight: 1.4,
              fontWeight: activeSection === s.id ? 700 : 500,
              color: activeSection === s.id ? C.navy900 : C.muted,
              background: activeSection === s.id ? C.navy50 : "transparent",
            }}
          >
            {s.title}
          </button>
        ))}
      </div>

      <label className="lhs-cgu-select-wrap">
        <span>Section consultée</span>
        <select value={activeSection} onChange={(event) => selectSection(event.target.value)}>
          {CGU_SECTIONS.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
        </select>
      </label>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {managedContent && <Card style={{ padding: "14px 16px", background: C.navy50, border: "none" }}><div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: C.navy800 }}><ShieldCheck size={15} /> Information publiée par LynoraLink</div><div style={{ marginTop: 6, color: C.muted, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{managedContent}</div></Card>}
        <Card style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, background: C.navy50, border: "none" }}>
          <ShieldCheck size={16} color={C.navy700} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: C.navy800, lineHeight: 1.5 }}>
            Dernière mise à jour le <strong>{CGU_LAST_UPDATE}</strong>. Ce texte est un modèle de référence à faire relire par un conseil juridique avant publication officielle.
          </span>
        </Card>

        {cguSections.map((s) => (
          <Card key={s.id} style={{ padding: "20px 22px", scrollMarginTop: 20 }}>
            <div id={`cgu-${s.id}`} className="lhs-cgu-anchor" />
            <div style={{ fontFamily: SORA, fontWeight: 800, fontSize: 15.5, color: C.ink, marginBottom: 8 }}>
              {s.title}
            </div>
            <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.7 }}>{s.body}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ONGLET — AIDE & ASSISTANT                                          */
/* ------------------------------------------------------------------ */
function AideTab({ onOpenAssistant, managedContent = "", faqItems = FAQ_ITEMS }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Toutes");
  const [openId, setOpenId] = useState(FAQ_ITEMS[0].id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqItems.filter((item) => {
      const matchesCategory = category === "Toutes" || item.category === category;
      const matchesQuery = !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, category, faqItems]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {managedContent && <Card style={{ padding: "14px 16px", background: C.navy50, border: "none" }}><div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: C.navy800 }}><LifeBuoy size={15} /> Message de l'équipe support</div><div style={{ marginTop: 6, color: C.muted, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{managedContent}</div></Card>}
      <Card
        style={{
          padding: 22, border: "none", color: C.white, background: navyGrad,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={20} color={C.gold400} />
          </div>
          <div>
            <div style={{ fontFamily: SORA, fontWeight: 800, fontSize: 16 }}>Besoin d'une réponse immédiate ?</div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              L'assistant IA peut chercher dans votre compte et agir directement pour vous.
            </div>
          </div>
        </div>
        <button
          onClick={onOpenAssistant}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 10,
            border: "none", cursor: "pointer", background: goldGrad, color: C.navy900, fontWeight: 700, fontSize: 12.5, flexShrink: 0,
          }}
        >
          <Sparkles size={14} /> Ouvrir l'assistant
        </button>
      </Card>

      <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.white, border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "10px 14px" }}>
        <Search size={16} color={C.mutedLight} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une question (ex. « mot de passe », « facture »...)"
          style={{ border: "none", outline: "none", flex: 1, fontSize: 13, fontFamily: INTER, color: C.ink, background: "transparent" }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {FAQ_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              flexShrink: 0, padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: category === c ? "none" : `1.5px solid ${C.line}`,
              background: category === c ? goldGrad : "transparent",
              color: category === c ? C.navy900 : C.muted,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 ? (
          <Card style={{ padding: 28, textAlign: "center" }}>
            <HelpCircle size={22} color={C.mutedLight} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: C.muted }}>Aucun résultat pour cette recherche.</div>
          </Card>
        ) : (
          filtered.map((item) => {
            const isOpen = openId === item.id;
            return (
              <Card key={item.id} style={{ padding: 0, overflow: "hidden" }}>
                <button
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  style={{
                    width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 18px",
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{item.q}</span>
                  <ChevronDown
                    size={16}
                    color={C.mutedLight}
                    style={{ flexShrink: 0, transition: "transform 0.2s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>
                {isOpen && (
                  <div style={{ padding: "0 18px 16px", fontSize: 13, color: C.muted, lineHeight: 1.65 }}>
                    {item.a}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ONGLET — SUPPORT                                                    */
/* ------------------------------------------------------------------ */
function SupportTab({ initialSupportReason = null }) {
  const getDefaultForm = (reason) => {
    if (reason === "banned") {
      return {
        category: "Compte & sécurité",
        subject: "Compte bloqué - demande de réexamen",
        message: "Bonjour,\n\nMon compte a été bloqué et je souhaite demander une vérification de cette décision. Merci de me donner les informations nécessaires pour rétablir l'accès ou comprendre la situation."
      };
    }
    if (reason === "deleted") {
      return {
        category: "Compte & sécurité",
        subject: "Compte supprimé - demande de réexamen",
        message: "Bonjour,\n\nMon compte a été supprimé et je souhaite demander une vérification ou une clarification de cette décision. Merci de me permettre de connaître les raisons et les options possibles pour rétablir l'accès."
      };
    }
    if (reason === "suspended") {
      return {
        category: "Compte & sécurité",
        subject: "Compte suspendu - demande de réexamen",
        message: "Bonjour,\n\nMon compte a été suspendu et je souhaite demander une vérification de cette décision. Merci de me donner les informations nécessaires pour comprendre la situation et reprendre l'accès si possible."
      };
    }
    return { category: SUPPORT_CATEGORIES[0], subject: "", message: "" };
  };

  const [form, setForm] = useState(() => getDefaultForm(initialSupportReason));
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    setForm(getDefaultForm(initialSupportReason));
  }, [initialSupportReason]);

  const loadRequests = async () => {
    try {
      const response = await fetchBackendApi("/api/support", { cache: "no-store" });
      if (response.ok) setRequests((await response.json()).requests || []);
    } catch {}
  };

  useEffect(() => {
    loadRequests().finally(() => setLoadingRequests(false));
    const refreshTimer = window.setInterval(loadRequests, 5000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.subject.trim().length < 5 || form.message.trim().length < 20) {
      setError("Le sujet doit contenir au moins 5 caractères et le message au moins 20 caractères.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetchBackendApi("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
      setSent(data.request);
      setRequests((current) => [
        { ...form, ...data.request },
        ...current.filter((item) => item.id !== data.request.id),
      ]);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 260px", gap: 20 }} className="lhs-support-grid">
      <Card style={{ padding: 24, gridColumn: "1", gridRow: "1" }}>
        {sent ? (
          <div style={{ textAlign: "center", padding: "24px 12px" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.success50, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <CheckCircle2 size={26} color={C.success} />
            </div>
            <div style={{ fontFamily: SORA, fontWeight: 800, fontSize: 16, color: C.ink }}>Demande envoyée</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
              Votre demande <strong>#{sent.id.slice(-8).toUpperCase()}</strong> est enregistrée. {sent.response ? "Une réponse automatique est déjà disponible dans votre espace support." : "Notre équipe vous répondra dès que possible."}
            </div>
            <button
              onClick={() => { setSent(null); setError(""); setForm(getDefaultForm(initialSupportReason)); }}
              style={{ marginTop: 16, background: "none", border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "8px 16px", fontSize: 12.5, fontWeight: 700, color: C.navy800, cursor: "pointer" }}
            >
              Envoyer une autre demande
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontFamily: SORA, fontWeight: 800, fontSize: 17, color: C.ink }}>Contacter le support</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>Décrivez votre problème, nous revenons vers vous rapidement.</div>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>Catégorie</span>
              <select
                value={form.category}
                onChange={set("category")}
                style={{ padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 13, color: C.ink, fontFamily: INTER, background: C.white }}
              >
                {SUPPORT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>Sujet</span>
              <input
                value={form.subject}
                onChange={set("subject")}
                placeholder="Ex. : Impossible d'envoyer une invitation"
                style={{ padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 13, color: C.ink, fontFamily: INTER }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>Message</span>
              <textarea
                value={form.message}
                onChange={set("message")}
                rows={6}
                placeholder="Expliquez votre problème le plus précisément possible : ce que vous avez fait, ce qui s'est passé, ce que vous attendiez."
                style={{ padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 13, color: C.ink, fontFamily: INTER, resize: "vertical" }}
              />
            </label>

            {error && <div role="alert" style={{ padding: "10px 12px", borderRadius: 10, background: C.danger50, color: C.danger, fontSize: 12.5, lineHeight: 1.5 }}>{error}</div>}

            <button
              type="submit"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4,
                padding: "12px 18px", borderRadius: 11, border: "none", cursor: isSubmitting ? "wait" : "pointer",
                background: isSubmitting ? C.navy100 : goldGrad, color: C.navy900, fontWeight: 800, fontSize: 13.5,
                opacity: isSubmitting ? 0.75 : 1,
              }}
              disabled={isSubmitting}
            >
              <Send size={15} /> {isSubmitting ? "Envoi en cours..." : "Envoyer la demande"}
            </button>
          </form>
        )}
      </Card>

      <Card style={{ padding: 20, gridColumn: "1 / -1", gridRow: "2" }}>
        <div style={{ fontFamily: SORA, fontWeight: 800, fontSize: 16, color: C.ink }}>Mes demandes</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>Retrouvez ici vos échanges avec l'équipe LynoraLink.</div>
        {loadingRequests ? <div style={{ marginTop: 16, color: C.muted, fontSize: 12.5 }}>Chargement de vos demandes...</div> : requests.length === 0 ? <div style={{ marginTop: 16, color: C.muted, fontSize: 12.5 }}>Aucune demande enregistrée.</div> : <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {requests.map((item) => <div key={item.id} style={{ padding: 14, border: `1px solid ${C.line}`, borderRadius: 10, background: C.navy50 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><strong style={{ fontSize: 13, color: C.ink }}>{item.subject}</strong><span style={{ fontSize: 11, fontWeight: 700, color: item.response ? C.success : C.muted }}>{item.response ? "Répondu" : "En attente"}</span></div>
            <div style={{ marginTop: 7, fontSize: 12, color: C.muted }}>{item.message}</div>
            {item.response && <div style={{ marginTop: 10, padding: "10px 12px", borderLeft: `3px solid ${C.navy700}`, background: C.white, color: C.ink, fontSize: 12.5, lineHeight: 1.55 }}><strong>Réponse du support</strong><br />{item.response}</div>}
          </div>)}
        </div>}
      </Card>

      <div className="lhs-support-info" style={{ display: "flex", flexDirection: "column", gap: 14, gridColumn: "2", gridRow: "1" }}>
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Mail size={16} color={C.navy700} />
            <span style={{ fontFamily: SORA, fontWeight: 700, fontSize: 13.5, color: C.ink }}>Par e-mail</span>
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
            support@lynoralink.com — pour les demandes détaillées avec captures d'écran.
          </div>
        </Card>

        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Timer size={16} color={C.navy700} />
            <span style={{ fontFamily: SORA, fontWeight: 700, fontSize: 13.5, color: C.ink }}>Délai de réponse</span>
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
            Sous 24h en semaine, jusqu'à 48h le week-end. Comptes Premium traités en priorité.
          </div>
        </Card>

        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <BadgeCheck size={16} color={C.navy700} />
            <span style={{ fontFamily: SORA, fontWeight: 700, fontSize: 13.5, color: C.ink }}>Statut de la plateforme</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.success, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: C.muted }}>Tous les services fonctionnent normalement</span>
          </div>
          <a href="/status" style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 12, fontWeight: 700, color: C.navy700, textDecoration: "none" }}>
            Page de statut <ExternalLink size={12} />
          </a>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  COMPOSANT PRINCIPAL                                                 */
/* ------------------------------------------------------------------ */
const TABS = [
  { id: "cgu", label: "CGU", icon: FileText },
  { id: "aide", label: "Aide & FAQ", icon: LifeBuoy },
  { id: "support", label: "Support", icon: MessageSquare },
];

export default function LegalHelpSupport({ onBack, onOpenAssistant, initialTab = "aide", standalone = false, initialSupportReason = null }) {
  const [tab, setTab] = useState(initialTab);
  const [managedContent, setManagedContent] = useState({ supportFaq: "", supportCgu: "" });
  const [managedFaq, setManagedFaq] = useState(FAQ_ITEMS);
  const [managedCgu, setManagedCgu] = useState(CGU_SECTIONS);

  useEffect(() => {
    fetchBackendApi("/api/support/content", { cache: "no-store" }).then((response) => response.ok ? response.json() : { content: {} })
      .then((data) => {
        const content = data.content || {};
        setManagedContent(content);
        try { if (content.supportFaq) setManagedFaq(JSON.parse(content.supportFaq)); } catch {}
        try { if (content.supportCgu) setManagedCgu(JSON.parse(content.supportCgu)); } catch {}
      }).catch(() => {});
  }, []);

  return (
    <div className="lhs-root" style={{ fontFamily: INTER, background: C.navy50, minHeight: "100dvh", width: "100%" }}>
      <div className="lhs-content" style={{ maxWidth: 1180, width: "100%", margin: "0 auto", padding: "28px 24px 64px", display: "flex", flexDirection: "column", gap: 22 }}>
        {onBack && (
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.navy800, fontWeight: 700, fontSize: 12.5, padding: 0, alignSelf: "flex-start" }}>
            <ArrowLeft size={15} /> Retour au fil
          </button>
        )}

        <div className="lhs-heading" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div className="lhs-heading-copy" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: navyGrad, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px rgba(15,51,82,0.18)" }}>
              {standalone && tab === "cgu" ? <FileText size={22} /> : <LifeBuoy size={22} />}
            </div>
            <div>
              <div className="lhs-heading-title" style={{ fontFamily: SORA, fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em", color: C.ink }}>{standalone && tab === "cgu" ? "Informations légales" : "Aide & Support"}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 5 }}>
                {standalone && tab === "cgu" ? "Les règles et engagements qui encadrent LynoraLink." : "Une aide claire pour avancer dans votre réseau professionnel."}
              </div>
            </div>
          </div>
          {!standalone && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 11px", borderRadius: 9, background: C.white, border: `1px solid ${C.line}`, color: C.muted, fontSize: 11.5, fontWeight: 700 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.success }} /> Support opérationnel
            </div>
          )}
        </div>

        <div className="lhs-tabs" style={{ display: "flex", gap: 3, background: C.white, border: `1px solid ${C.line}`, borderRadius: 11, padding: 4, width: "fit-content", maxWidth: "100%", overflowX: "auto" }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={active ? "page" : undefined}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 15px", borderRadius: 8, border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: 12.5, fontWeight: 700, fontFamily: INTER, background: active ? navyGrad : "transparent", color: active ? C.white : C.muted, transition: "background 0.15s ease, color 0.15s ease" }}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        {standalone && tab !== "cgu" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 15px", borderRadius: 10, background: C.white, border: `1px solid ${C.line}`, color: C.muted, fontSize: 12.5 }}>
            <ShieldCheck size={16} color={C.navy700} /> Des réponses pensées pour les usages réels de LynoraLink : profil, réseau, publications et messagerie.
          </div>
        )}

        {tab === "cgu" && <CguTab managedContent="" cguSections={managedCgu} />}
        {tab === "aide" && <AideTab onOpenAssistant={onOpenAssistant} managedContent="" faqItems={managedFaq} />}
        {tab === "support" && <SupportTab initialSupportReason={initialSupportReason} />}
      </div>

    </div>
  );
}
