import React, { useState, useRef, useEffect, useCallback, useMemo, useId } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPenToSquare,
  faMagnifyingGlass,
  faBriefcase,
  faChevronDown,
  faChevronUp,
  faArrowLeft,
  faHouse,
  faXmark,
  faPaperPlane,
  faSpinner,
  faCheckCircle,
  faTriangleExclamation,
  faStop,
  faArrowRotateRight,
  faBell,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";

/* ------------------------------------------------------------------ */
/*  TOKENS — identiques à la palette LynoraLink (composant autonome)   */
/* ------------------------------------------------------------------ */
const C = {
  navy900: "var(--navy900)", navy800: "var(--navy800)", navy700: "var(--navy700)",
  navy100: "var(--navy100)", navy50: "var(--app-bg)",
  gold400: "#F6D374", gold600: "#D9A536", gold300: "#FBE7AE",
  ink: "var(--app-text)", muted: "var(--app-muted)", mutedLight: "var(--app-muted-light)",
  line: "var(--app-border)", lineSoft: "var(--app-border)", white: "var(--app-surface)",
  danger: "#C24444", danger50: "#FBEDED",
  teal: "#1D8B84", teal50: "rgba(34,184,176,0.12)", teal600: "#167A73",
};
const goldGrad = `linear-gradient(135deg, ${C.gold400} 0%, ${C.gold600} 100%)`;
const navyGradRich = `linear-gradient(150deg, #24608F 0%, ${C.navy900} 55%, #081F33 100%)`;
const fontDisplay = "'Sora', sans-serif";
const fontBody = "'Inter', sans-serif";

const MAX_STEPS = 6; // nombre maximum d'aller-retours outils par demande

// Extrait le prénom d'un nom complet (« Jean Dupont » → « Jean »), pour un ton
// plus naturel dans les messages qu'un nom complet systématique.
function getFirstName(fullName) {
  const trimmed = (fullName || "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0];
}

// Message de bienvenue — personnalisé avec le prénom de l'utilisateur quand il est connu.
function buildWelcomeMessage(userName) {
  const firstName = getFirstName(userName);
  const greeting = firstName ? `Bonjour ${firstName} !` : "Bonjour !";
  return `${greeting} Je suis votre assistant LynoraLink. Je peux vous expliquer les fonctionnalités de la plateforme, consulter votre contexte (notifications, réseau et profil) et vous guider étape par étape. Que souhaitez-vous faire ?`;
}

/* ------------------------------------------------------------------ */
/*  DONNÉES DE DÉMONSTRATION — utilisées si aucun contexte n'est fourni */
/* ------------------------------------------------------------------ */
const DEFAULT_CONNECTIONS = [
  { id: "c1", name: "Claire Dubois", title: "Designer produit chez Atlas Studio" },
  { id: "c2", name: "Marc Lefèvre", title: "Ingénieur logiciel chez Nova Systems" },
  { id: "c3", name: "Sophie Nguyen", title: "Cheffe de projet chez Orbital" },
  { id: "c4", name: "Yanis Belkacem", title: "Growth manager chez Kaïros" },
];
const DEFAULT_SUGGESTIONS = [
  { id: "s1", name: "Julie Martin", title: "Designer UX freelance" },
  { id: "s2", name: "Thomas Roche", title: "Développeur frontend chez Pixell" },
  { id: "s3", name: "Aïcha Diallo", title: "Consultante en design de service" },
];
const DEFAULT_NOTIFICATIONS = [
  { id: "n1", text: "Claire Dubois a aimé votre publication.", read: false },
  { id: "n2", text: "Marc Lefèvre a commenté votre publication.", read: false },
  { id: "n3", text: "Vous avez une nouvelle suggestion de mise en relation.", read: true },
];

/* ------------------------------------------------------------------ */
/*  DÉFINITION DES ACTIONS DISPONIBLES DANS LE PROJET                  */
/* ------------------------------------------------------------------ */
const VIEW_LABELS = {
  feed: "Fil d'actualité", profile: "Profil", network: "Réseau", messages: "Messages",
  notifications: "Notifications", company: "Mon entreprise", groups: "Groupes",
  saved: "Éléments enregistrés", pages: "Pages suivies", settings: "Paramètres",
};

const TOOLS = [
  /* ---- Exploration / compréhension uniquement — aucun outil ne modifie quoi que ce soit ---- */
  {
    name: "get_context",
    description: "Lire un résumé de l'état actuel de l'application (vue affichée, notifications non lues, nombre de connexions et de suggestions, titre du profil), pour répondre avec un contexte précis. Cet outil ne modifie rien.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_notifications",
    description: "Lister les notifications récentes de l'utilisateur, lues et non lues, pour pouvoir les lui décrire ou les résumer. Cet outil ne modifie rien.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number", description: "Nombre maximum de notifications à retourner (par défaut 10)" } },
    },
  },
  {
    name: "get_connections",
    description: "Lister les connexions établies ou les suggestions de mise en relation de l'utilisateur, pour répondre à des questions à leur sujet. Cet outil ne modifie rien.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["connections", "suggestions"], description: "Type de liste à retourner" },
        limit: { type: "number", description: "Nombre maximum de résultats (par défaut 10)" },
      },
    },
  },
  {
    name: "search_network",
    description: "Rechercher des personnes dans le réseau de l'utilisateur à partir d'un mot-clé (nom, poste, entreprise), pour répondre à une question de recherche. Cet outil ne modifie rien.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Mot-clé de recherche" } },
      required: ["query"],
    },
  },
];

// Métadonnées d'affichage (icône / libellé) pour chaque outil de lecture.
const TOOL_META = {
  get_context: { label: "Lecture du contexte de l'application" },
  get_notifications: { label: "Lecture des notifications" },
  get_connections: { label: "Lecture du réseau" },
  search_network: { label: "Recherche dans le réseau" },
};

const QUICK_PROMPTS = [
  { icon: faCircleInfo, label: "Comprendre la plateforme", text: "Explique-moi les grandes sections de LynoraLink et à quoi elles servent." },
  { icon: faPenToSquare, label: "Publier un post", text: "Comment rédiger et publier un post professionnel sur mon fil d'actualité ?" },
  { icon: faBell, label: "Mes notifications", text: "Résume mes notifications actuelles et explique-moi comment les gérer." },
  { icon: faMagnifyingGlass, label: "Trouver un contact", text: "Comment rechercher des personnes de mon réseau qui travaillent dans le design ?" },
  { icon: faBriefcase, label: "Monétisation entreprise", text: "Où et comment gérer la monétisation de mon entreprise sur LynoraLink ?" },
];

/* ------------------------------------------------------------------ */
/*  EXÉCUTION DES ACTIONS — lit/écrit dans l'état vivant de l'app       */
/* ------------------------------------------------------------------ */
function buildExecutor(actions = {}, stateRef, updateState) {
  return async function execute(name, input) {
    switch (name) {
      case "get_context": {
        const s = stateRef.current;
        const unread = s.notifications.filter((n) => !n.read).length;
        return {
          ok: true,
          summary: `Vue actuelle : ${VIEW_LABELS[s.view] || s.view}. ${unread} notification(s) non lue(s) sur ${s.notifications.length}. ${s.connections.length} connexion(s), ${s.suggestions.length} suggestion(s) de mise en relation. Titre du profil : « ${s.profile.headline || "non renseigné"} ». Nom de l'utilisateur : « ${s.profile.name || "non renseigné"} ».`,
        };
      }
      case "get_notifications": {
        const s = stateRef.current;
        const limit = input.limit > 0 ? input.limit : 10;
        const list = s.notifications.slice(0, limit);
        return {
          ok: true,
          summary: list.length
            ? list.map((n) => `${n.read ? "✓" : "●"} ${n.text}`).join(" | ")
            : "Aucune notification.",
        };
      }
      case "get_connections": {
        const s = stateRef.current;
        const type = input.type === "suggestions" ? "suggestions" : "connections";
        const pool = s[type];
        const limit = input.limit > 0 ? input.limit : 10;
        const list = pool.slice(0, limit);
        return {
          ok: true,
          summary: list.length
            ? `${type === "connections" ? "Connexions" : "Suggestions"} : ${list.map((p) => `${p.name} (${p.title})`).join(", ")}.`
            : `Aucune ${type === "connections" ? "connexion" : "suggestion"} trouvée.`,
        };
      }
      case "search_network": {
        const s = stateRef.current;
        const pool = [...s.connections, ...s.suggestions];
        const q = String(input.query).toLowerCase();
        const results = pool.filter((p) => p.name.toLowerCase().includes(q) || p.title.toLowerCase().includes(q));
        return {
          ok: true,
          summary: results.length
            ? `${results.length} résultat(s) trouvé(s) : ${results.slice(0, 5).map((r) => r.name).join(", ")}.`
            : `Aucun résultat pour « ${input.query} ».`,
        };
      }
      default:
        return { ok: false, summary: `Outil inconnu : ${name}.` };
    }
  };
}

/* ------------------------------------------------------------------ */
/*  APPEL API                                                         */
/* ------------------------------------------------------------------ */
// Route the platform-wide assistant through its dedicated server endpoint.
async function callClaude(messages, systemPrompt, signal) {
  const res = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system: systemPrompt }),
    signal,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail || `Erreur de l'assistant (${res.status})`);
  }
  const data = await res.json();
  // Return in the shape expected by runAgent: { content: [ { type:'text', text } , ... ] }
  const blocks = (data && data.blocks) || [];
  if (!Array.isArray(blocks)) throw new Error("Réponse IA invalide : blocks doit être un tableau.");
  return { content: blocks, fallback: data.fallback === true };
}

/* ------------------------------------------------------------------ */
/*  SOUS-COMPOSANTS D'AFFICHAGE                                        */
/* ------------------------------------------------------------------ */
// Puce affichée après une consultation de données (jamais une action) :
// confirme simplement que l'assistant a lu une information avant de répondre.
function InfoChip({ label, ok }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
      borderRadius: 999, background: ok ? C.teal50 : C.danger50,
      color: ok ? C.teal600 : C.danger, fontSize: 11.5, fontWeight: 700, marginTop: 6,
      border: `1px solid ${ok ? "rgba(29,139,132,0.18)" : "rgba(194,68,68,0.18)"}`,
    }}>
      {ok ? (
        <FontAwesomeIcon icon={faCheckCircle} style={{ width: 11, height: 11 }} />
      ) : (
        <FontAwesomeIcon icon={faTriangleExclamation} style={{ width: 11, height: 11 }} />
      )} {label}
    </div>
  );
}

// Puce affichée pendant que l'assistant consulte une donnée en direct
// (notifications, réseau, profil…) — toujours de la lecture, jamais une action.
function ToolCallChip({ name }) {
  const meta = TOOL_META[name] || { label: name };
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px",
      borderRadius: 999, background: C.teal50,
      color: C.teal600, fontSize: 11, fontWeight: 700, marginTop: 4,
    }}>
      <FontAwesomeIcon icon={faMagnifyingGlass} style={{ width: 10, height: 10 }} />
      {meta.label}
    </div>
  );
}

function normalizeAssistantText(value) {
  let text = String(value || "").trim();
  try {
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, ""));
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    const results = entries
      .map((entry) => {
        if (!entry || typeof entry !== "object") return entry;
        if (entry.result !== undefined) return entry.result;
        if (entry.text !== undefined) return entry.text;
        return entry;
      })
      .filter((entry) => typeof entry === "string" && entry.trim())
      .map((entry) => entry.trim());
    if (results.length) text = results.join("\n\n");
  } catch {
    // Le contenu est déjà du texte naturel.
  }

  return text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-z]*\n?/gi, "").replace(/```/g, ""))
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function Bubble({ role, children }) {
  const mine = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
      {!mine && (
        <div style={{
          width: 24, height: 24, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
          boxShadow: "0 1px 4px rgba(15,51,82,0.18)", marginBottom: 2,
        }}>
          <LogoLynoAI size={24} />
        </div>
      )}
      <div style={{
        maxWidth: "82%", padding: "11px 14px", borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: mine ? navyGradRich : C.white,
        color: mine ? C.white : C.ink, fontSize: 13.5, lineHeight: 1.6,
        boxShadow: mine ? "0 4px 14px rgba(15,51,82,0.22)" : "0 1px 3px rgba(15,51,82,0.08)",
        border: mine ? "none" : `1px solid ${C.lineSoft}`,
      }}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SKELETONS DE CHARGEMENT                                            */
/* ------------------------------------------------------------------ */
// Bloc de base animé (effet "shimmer") utilisé pour composer tous les skeletons.
function SkeletonBlock({ width = "100%", height = 10, radius = 6, style = {} }) {
  return (
    <div
      className="lm-skeleton"
      style={{ width, height, borderRadius: radius, flexShrink: 0, ...style }}
    />
  );
}

// Bulle de message factice — imite la forme d'un Bubble pendant le chargement
// des contenus internes (historique en cours de récupération, réponse en préparation…).
function SkeletonBubble({ mine = false, lines = 2 }) {
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
      {!mine && <SkeletonBlock width={24} height={24} radius="50%" />}
      <div style={{
        maxWidth: "70%", width: mine ? 130 : 190, padding: "11px 14px",
        borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: C.white, border: `1px solid ${C.lineSoft}`,
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBlock key={i} width={i === lines - 1 ? "55%" : "92%"} height={9} />
        ))}
      </div>
    </div>
  );
}

// Skeleton de chargement plein panneau — affiché tant que la connexion initiale
// à l'assistant n'est pas établie (avant de savoir si l'API est disponible).
function PanelLoadingSkeleton({ isMobile }) {
  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "9px 14px",
        borderBottom: `1px solid ${C.lineSoft}`, flexShrink: 0,
        background: `linear-gradient(180deg, ${C.navy50} 0%, ${C.white} 100%)`,
      }}>
        <SkeletonBlock width={78} height={20} radius={999} />
        <SkeletonBlock width={64} height={20} radius={999} />
        <SkeletonBlock width={86} height={20} radius={999} />
      </div>

      <div style={{
        flex: 1, overflow: "hidden", padding: isMobile ? "14px 12px" : 16,
        display: "flex", flexDirection: "column", gap: 14,
        background: `linear-gradient(180deg, ${C.navy50} 0%, ${C.white} 140px)`,
      }}>
        <SkeletonBubble lines={3} />
        <SkeletonBubble mine lines={1} />
        <SkeletonBubble lines={2} />
      </div>

      <div style={{ padding: "2px 14px 12px", flexShrink: 0 }}>
        <SkeletonBlock width={130} height={9} style={{ margin: "6px 0 10px" }} />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 7 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} height={40} radius={12} />
          ))}
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "10px 12px" : "12px 12px",
        borderTop: `1px solid ${C.lineSoft}`, flexShrink: 0,
      }}>
        <SkeletonBlock height={isMobile ? 42 : 40} radius={999} style={{ flex: 1 }} />
        <SkeletonBlock width={isMobile ? 42 : 38} height={isMobile ? 42 : 38} radius="50%" />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  SVG INLINE — icône circulaire et avatar depuis public/              */
/* ------------------------------------------------------------------ */
function IconeIA({ size = 32 }) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");

  return (
    <svg
      className="lm-ai-icon"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Assistant IA LynoraLink"
      style={{ display: "block" }}
    >
      <title>Assistant IA LynoraLink</title>
      <defs>
        <radialGradient id={`bgSpace-${uid}`} cx="50%" cy="42%" r="75%">
          <stop offset="0%" stopColor="#123B5C" />
          <stop offset="100%" stopColor="#03101C" />
        </radialGradient>
        <linearGradient id={`goldGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F6D374" />
          <stop offset="100%" stopColor="#D9A536" />
        </linearGradient>
        <linearGradient id={`cyanGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8FF3EE" />
          <stop offset="100%" stopColor="#22B8B0" />
        </linearGradient>
        <linearGradient id={`hexGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F6D374" />
          <stop offset="100%" stopColor="#22B8B0" />
        </linearGradient>
        <filter id={`glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Fond "espace tech" — cercle plein pour une icône parfaitement ronde */}
      <circle cx="100" cy="100" r="100" fill={`url(#bgSpace-${uid})`} />

      {/* Lignes circuit vers les bords, avec noeuds lumineux */}
      <g stroke={`url(#hexGrad-${uid})`} strokeWidth="1.4" opacity="0.75">
        <line x1="100" y1="40" x2="100" y2="16" />
        <line x1="152" y1="70" x2="174" y2="56" />
        <line x1="152" y1="130" x2="174" y2="144" />
        <line x1="100" y1="160" x2="100" y2="184" />
        <line x1="48" y1="130" x2="26" y2="144" />
        <line x1="48" y1="70" x2="26" y2="56" />
      </g>
      <g filter={`url(#glow-${uid})`}>
        <circle cx="100" cy="14" r="3" fill={`url(#goldGrad-${uid})`} />
        <circle cx="177" cy="55" r="2.4" fill={`url(#cyanGrad-${uid})`} />
        <circle cx="177" cy="145" r="2.4" fill={`url(#cyanGrad-${uid})`} />
        <circle cx="100" cy="186" r="3" fill={`url(#goldGrad-${uid})`} />
        <circle cx="23" cy="145" r="2.4" fill={`url(#cyanGrad-${uid})`} />
        <circle cx="23" cy="55" r="2.4" fill={`url(#cyanGrad-${uid})`} />
      </g>

      {/* Hexagone neon */}
      <polygon
        points="100,38 154,69 154,131 100,162 46,131 46,69"
        fill="none"
        stroke={`url(#hexGrad-${uid})`}
        strokeWidth="2.6"
        filter={`url(#glow-${uid})`}
        opacity="0.9"
      />

      {/* Monogramme Ln, style géométrique */}
      <text
        x="100" y="106" textAnchor="middle" dominantBaseline="central"
        fontFamily="'Helvetica Neue', Arial, 'Segoe UI', sans-serif" fontWeight="800"
        fontSize="78" letterSpacing="-1" filter={`url(#glow-${uid})`}
      >
        <tspan fill={`url(#goldGrad-${uid})`}>L</tspan>
        <tspan fill={`url(#cyanGrad-${uid})`}>n</tspan>
      </text>
    </svg>
  );
}

/* Logo officiel LynoAI — utilisé pour le bouton flottant et l'en-tête,
   avec repli automatique sur l'icône vectorielle si l'asset est absent. */
function LogoLynoAI({ size = 32, rounded = true }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <IconeIA size={size} />;
  return (
    <img
      src="/logo_lynoAI.svg"
      alt="LynoAI"
      onError={() => setFailed(true)}
      style={{
        width: size, height: size, objectFit: "cover", display: "block",
        borderRadius: rounded ? "50%" : 0,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  COMPOSANT PRINCIPAL                                                */
/* ------------------------------------------------------------------ */
export default function AIAgentAssistant({ actions = {}, context = {}, userName = "", variant = "floating", onBack = null, pageTitle = "Assistant IA", pageDescription = "" }) {
  const isPage = variant === "page";
  const [open, setOpen] = useState(isPage);
  const [hidden, setHidden] = useState(false);
  // Détection réactive du smartphone réel (largeur ET support tactile), pour
  // adapter le panneau en plein écran natif plutôt qu'en simple redimensionnement CSS.
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 640 : false));
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange);
    };
  }, []);
  // Verrouille le scroll de la page hôte quand le panneau occupe l'écran entier sur mobile,
  // pour un comportement natif d'application plutôt qu'une simple fenêtre flottante.
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const shouldLock = isMobile && (open || isPage);
    if (!shouldLock) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isMobile, open, isPage]);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: buildWelcomeMessage(userName),
    },
  ]);
  const draftStorageKey = `lynoralink:ai-draft:${variant}`;
  const [input, setInput] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return window.sessionStorage.getItem(draftStorageKey) || ""; } catch { return ""; }
  });
  const [loading, setLoading] = useState(false);
  const [apiMode, setApiMode] = useState("checking");
  const [phase, setPhase] = useState(null); // "thinking" | "exploring" | "acting" | null
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    try {
      if (input) window.sessionStorage.setItem(draftStorageKey, input);
      else window.sessionStorage.removeItem(draftStorageKey);
    } catch {}
  }, [draftStorageKey, input]);

  // État vivant de l'application, consulté et modifié par l'assistant.
  const [appState, setAppState] = useState(() => {
    const conns = (Array.isArray(context.connections) ? context.connections : DEFAULT_CONNECTIONS)
      .map((p, i) => ({ id: p.id || `c${i}`, ...p }));
    const suggs = (Array.isArray(context.suggestions) ? context.suggestions : DEFAULT_SUGGESTIONS)
      .map((p, i) => ({ id: p.id || `s${i}`, ...p }));
    const notifs = (Array.isArray(context.notifications) ? context.notifications : DEFAULT_NOTIFICATIONS)
      .map((n, i) => ({ id: n.id || `n${i}`, read: !!n.read, ...n }));
    return {
      view: context.view || "feed",
      connections: conns,
      suggestions: suggs,
      notifications: notifs,
      posts: context.posts || [],
      followedPages: context.followedPages || [],
      profile: { headline: context.profile?.headline || "", name: userName || context.profile?.name || "Vous" },
    };
  });

  const appStateRef = useRef(appState);
  useEffect(() => { appStateRef.current = appState; }, [appState]);

  // Garde la vue synchronisée si l'application parente change de section
  // en dehors de l'assistant.
  useEffect(() => {
    if (context.view && context.view !== appStateRef.current.view) {
      setAppState((s) => ({ ...s, view: context.view }));
    }
  }, [context.view]);

  useEffect(() => {
    if (!Array.isArray(context.connections) && !Array.isArray(context.notifications)) return;
    setAppState((current) => ({
      ...current,
      ...(Array.isArray(context.connections) ? { connections: context.connections.map((item, index) => ({ id: item.id || `c${index}`, ...item })) } : {}),
      ...(Array.isArray(context.notifications) ? { notifications: context.notifications.map((item, index) => ({ id: item.id || `n${index}`, read: !!item.read, ...item })) } : {}),
    }));
  }, [context.connections, context.notifications]);

  const updateAppState = useCallback((updater) => {
    setAppState((prev) => {
      const next = updater(prev);
      appStateRef.current = next;
      return next;
    });
  }, []);

  const apiHistoryRef = useRef([]); // historique brut au format API Anthropic
  const abortControllerRef = useRef(null);

  const execute = useMemo(() => buildExecutor(actions, appStateRef, updateAppState), [actions, updateAppState]);

  const unreadCount = useMemo(() => appState.notifications.filter((n) => !n.read).length, [appState.notifications]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [messages, open]);

  // Fermeture au clavier (Échap) — comportement attendu d'un assistant professionnel.
  useEffect(() => {
    if (isPage || !open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPage, open]);

  // Skeleton de chargement initial du panneau — affiché brièvement à la première
  // ouverture (ou au montage en variant "page"), avant que le contenu soit prêt.
  const [initializing, setInitializing] = useState(true);
  useEffect(() => {
    if (!isPage && !open) return undefined; // attend l'ouverture du panneau flottant
    const t = setTimeout(() => setInitializing(false), 650);
    return () => clearTimeout(t);
  }, [isPage, open]);

  const [unseenCount, setUnseenCount] = useState(0);
  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; if (open) setUnseenCount(0); }, [open]);
  const appendUIMessage = useCallback((msg) => {
    setMessages((ms) => [...ms, msg]);
    if (!isPage && !openRef.current && msg.content) setUnseenCount((n) => n + 1);
  }, [isPage]);

  const getSystemPrompt = useCallback(() => {
    const s = appStateRef.current;
    const unread = s.notifications.filter((n) => !n.read).length;
    const firstName = getFirstName(userName);
    return `Tu es l'assistant LynoraLink, intégré à un réseau social professionnel. Tu aides ${firstName || "l'utilisateur"} à comprendre et à utiliser la plateforme avec des réponses naturelles, concrètes et adaptées à sa situation.

UTILISATEUR : ${firstName ? `il s'appelle ${firstName}. Adresse-toi à lui par son prénom de temps en temps (au début d'une réponse ou pour personnaliser un conseil), sans le répéter à chaque phrase pour rester naturel.` : "son prénom n'est pas connu pour l'instant, ne l'invente pas et ne t'adresse pas à lui par un nom."}

TON RÔLE : accompagne l'utilisateur comme un assistant intégré à LynoraLink. Explique clairement les possibilités de la plateforme, propose la prochaine étape utile et indique la section exacte ainsi que le chemin de clics. Tu peux consulter les données en direct avec les outils disponibles, mais tu ne dois jamais prétendre avoir publié, envoyé, supprimé ou modifié quelque chose : ces outils sont actuellement en lecture seule.

CONNAISSANCE DE LA PLATEFORME :
- Le Fil d'actualité permet de lire, rechercher et publier des posts texte ou article, avec médias, réactions, commentaires et enregistrements.
- Le Profil permet de consulter et modifier les informations publiques, notamment le titre professionnel.
- Le Réseau regroupe les connexions et les suggestions de personnes; la recherche peut porter sur un nom, un poste ou une entreprise.
- Messages correspond aux conversations privées, Notifications aux alertes d'activité, Groupes aux communautés, Pages suivies aux pages suivies, Éléments enregistrés aux contenus sauvegardés.
- Mon entreprise ouvre l'espace entreprise, dont la monétisation, les abonnements, les publicités, les offres d'emploi et la facturation.
- Paramètres concerne les préférences et la sécurité du compte. Abonnement concerne l'offre Premium et la facturation Stripe.
- Les publications, likes et comptes sont reliés aux API/base de données. Les notifications, invitations réseau, messages et groupes peuvent encore être gérés en mémoire dans certaines vues : ne prétends pas qu'une donnée est persistée si tu ne peux pas le confirmer.

CONTEXTE VIVANT : vue affichée = "${s.view}", ${unread} notification(s) non lue(s) sur ${s.notifications.length}, ${s.connections.length} connexion(s), ${s.suggestions.length} suggestion(s), titre du profil = "${s.profile.headline || "non renseigné"}".

RÈGLES : réponds en français, avec un ton professionnel, chaleureux et direct. Donne une réponse approfondie et bien structurée : un titre court, une explication claire, puis des étapes numérotées ou des paragraphes séparés lorsque c'est utile. Utilise uniquement du texte brut, sans Markdown, sans astérisques, sans dièses, sans backticks et sans liens formatés. Explique le pourquoi et le comment, donne les chemins de navigation exacts dans LynoraLink et précise les limites ou conditions importantes. Utilise un outil de consultation uniquement lorsqu'il apporte un contexte réel. Si la demande est ambiguë, pose une seule question ciblée. Si l'utilisateur demande une action non disponible, dis-le simplement et guide-le pour la réaliser lui-même. N'invente jamais de données, de résultat ou de fonctionnalité.`;
  }, [userName]);

  /* ------------------------------------------------------------------ */
  /*  L'assistant consulte les données utiles puis répond — il n'agit jamais. */
  /* ------------------------------------------------------------------ */
  const runAgent = useCallback(async () => {
    setError(null);
    setLoading(true);
    setPhase("thinking");
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        const data = await callClaude(apiHistoryRef.current, getSystemPrompt(), controller.signal);
        if (!data.derived) setApiMode(data.fallback ? "local" : "connected");
        const blocks = data.content || [];
        apiHistoryRef.current = [...apiHistoryRef.current, { role: "assistant", content: blocks }];

        const textBlock = blocks.find((b) => b.type === "text" && b.text);
        if (textBlock) appendUIMessage({ role: "assistant", content: normalizeAssistantText(textBlock.text) });

        const toolUse = blocks.find((b) => b.type === "tool_use");
        if (!toolUse) return; // réponse finale de l'assistant

        appendUIMessage({ role: "assistant", content: "", statusChip: { name: toolUse.name } });
        setPhase("exploring");

        // If the backend already returned a tool_result for this tool_use, use it
        const toolResultBlock = blocks.find((b) => b.type === "tool_result" && b.tool_use_id === toolUse.id);
        let result;
        if (toolResultBlock) {
          result = { ok: !toolResultBlock.is_error, summary: toolResultBlock.content };
          appendUIMessage({ role: "assistant", content: "", infoResult: result });
          // ensure history contains the tool_result
          apiHistoryRef.current = [...apiHistoryRef.current, { role: "user", content: [{ type: "tool_result", tool_use_id: toolUse.id, content: toolResultBlock.content, is_error: toolResultBlock.is_error }] }];
        } else {
          // fallback: execute locally
          result = await execute(toolUse.name, toolUse.input || {});
          appendUIMessage({ role: "assistant", content: "", infoResult: result });
          apiHistoryRef.current = [...apiHistoryRef.current, { role: "user", content: [{ type: "tool_result", tool_use_id: toolUse.id, content: result.summary, is_error: !result.ok }] }];
        }
        setPhase("thinking");
      }
      appendUIMessage({ role: "assistant", content: "J'ai atteint la limite d'étapes pour cette demande — reformulez votre question si vous souhaitez que je continue." });
    } catch (e) {
      if (e.name === "AbortError") {
        appendUIMessage({ role: "assistant", content: "Interrompu à votre demande." });
      } else {
        setError(e?.message || "Le fournisseur IA est momentanément indisponible.");
      }
    } finally {
      setLoading(false);
      setPhase(null);
      abortControllerRef.current = null;
    }
  }, [execute, getSystemPrompt, appendUIMessage]);

  const send = (text) => {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;
    setInput("");
    appendUIMessage({ role: "user", content: userText });
    apiHistoryRef.current = [...apiHistoryRef.current, { role: "user", content: userText }];
    runAgent();
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const returnToAssistantHome = () => {
    abortControllerRef.current?.abort();
    apiHistoryRef.current = [];
    setMessages([{ role: "assistant", content: buildWelcomeMessage(userName) }]);
    setInput("");
    setError(null);
    setLoading(false);
    setPhase(null);
  };

  /* ------------------------------------------------------------------ */
  /*  STYLES MODERNES                                                   */
  /* ------------------------------------------------------------------ */
  const safeBottom = "max(18px, env(safe-area-inset-bottom, 0px))";
  const safeBottomHide = "calc(max(18px, env(safe-area-inset-bottom, 0px)) + 68px)";

  const fabStyle = {
    position: "fixed", bottom: safeBottom, right: 18, width: isMobile ? 56 : 62, height: isMobile ? 56 : 62, borderRadius: "50%",
    border: `1px solid ${C.line}`, background: C.white,
    boxShadow: "0 14px 30px rgba(15,51,82,0.24), 0 0 0 1px rgba(246,211,116,0.18)", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 400, transition: "transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease",
    padding: 0, overflow: "visible", opacity: 0.97,
  };

  const toggleStyle = {
    position: "fixed", bottom: safeBottom, right: 18, width: 44, height: 44, borderRadius: 999,
    border: `1px solid ${C.line}`, background: C.white,
    boxShadow: "0 10px 22px rgba(15,51,82,0.12)", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 410, transition: "transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease",
    padding: 0, overflow: "hidden", opacity: 0.95,
    color: C.navy900, fontSize: 18, fontWeight: 700,
  };

  const hideButtonStyle = {
    position: "fixed", bottom: safeBottomHide, right: 28, width: 36, height: 36, borderRadius: 999,
    border: `1px solid ${C.line}`, background: C.white,
    boxShadow: "0 10px 22px rgba(15,51,82,0.12)", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 410, transition: "transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease",
    padding: 0, overflow: "hidden", opacity: 0.95,
    color: C.navy900, fontSize: 20, fontWeight: 700,
  };

  // Sur smartphone réel, le panneau flottant se comporte comme une vraie app :
  // plein écran, sans coins arrondis, avec gestion des zones sûres (encoche, barre du bas).
  const panelStyle = isMobile
    ? {
        position: "fixed", inset: 0, width: "100vw", height: "100dvh", maxWidth: "100vw", maxHeight: "100dvh",
        boxSizing: "border-box", background: C.white, borderRadius: 0, boxShadow: "none", display: "flex", flexDirection: "column",
        overflow: "hidden", zIndex: 500, fontFamily: fontBody,
        paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }
    : isPage
    ? {
        position: "relative", width: "100%", maxWidth: "100%", height: "min(74vh, 720px)", minHeight: 480,
        background: C.white, borderRadius: 20, boxShadow: "0 10px 32px rgba(15,51,82,0.14)", display: "flex", flexDirection: "column",
        overflow: "hidden", zIndex: 1, fontFamily: fontBody, border: `1px solid ${C.line}`,
      }
    : {
        position: "fixed", bottom: 22, right: 22, width: 384, maxWidth: "calc(100vw - 24px)", height: 568, maxHeight: "calc(100vh - 40px)",
        background: C.white, borderRadius: 22, boxShadow: "0 28px 64px rgba(15,51,82,0.34), 0 4px 14px rgba(15,51,82,0.12)", display: "flex", flexDirection: "column",
        overflow: "hidden", zIndex: 400, fontFamily: fontBody, border: `1px solid ${C.line}`,
      };

  const headerStyle = {
    background: navyGradRich, padding: isMobile ? "13px 14px" : "15px 16px", display: "flex", alignItems: "center", gap: 11,
    position: "relative", overflow: "hidden", flexShrink: 0,
    boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset",
  };

  const headerGlowStyle = {
    position: "absolute", top: -34, right: -24, width: 120, height: 120,
    background: "radial-gradient(circle, rgba(246,211,116,0.3) 0%, transparent 70%)",
    pointerEvents: "none",
  };

  const headerGlowStyle2 = {
    position: "absolute", bottom: -40, left: -10, width: 100, height: 100,
    background: "radial-gradient(circle, rgba(143,243,238,0.16) 0%, transparent 70%)",
    pointerEvents: "none",
  };

  const contextBarStyle = {
    display: "flex", alignItems: "center", gap: 6, padding: "9px 14px",
    borderBottom: `1px solid ${C.lineSoft}`, background: `linear-gradient(180deg, ${C.navy50} 0%, ${C.white} 100%)`,
    fontSize: 11, color: C.muted, fontWeight: 600, flexWrap: "wrap", flexShrink: 0,
  };

  const contextPillStyle = {
    display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px",
    borderRadius: 999, background: C.white, border: `1px solid ${C.line}`,
    color: C.navy800, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap",
  };

  const inputContainerStyle = {
    display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "10px 12px" : "12px 12px",
    borderTop: `1px solid ${C.lineSoft}`, background: C.white, flexShrink: 0,
    paddingBottom: isMobile ? "calc(10px + env(safe-area-inset-bottom, 0px))" : 12,
    boxShadow: "0 -2px 8px rgba(15,51,82,0.03)",
  };

  const inputStyle = {
    flex: 1, border: `1px solid ${C.line}`, borderRadius: 999, padding: "11px 17px",
    fontSize: 16, outline: "none", color: C.ink, fontFamily: fontBody, background: C.navy50,
    transition: "border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
  };

  const sendBtnStyle = (canSend) => ({
    width: isMobile ? 42 : 38, height: isMobile ? 42 : 38, borderRadius: "50%", border: "none", flexShrink: 0, cursor: canSend ? "pointer" : "default",
    background: canSend ? goldGrad : C.line, color: canSend ? C.navy900 : C.mutedLight,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    boxShadow: canSend ? "0 3px 10px rgba(217,165,54,0.35)" : "none",
  });

  const stopBtnStyle = {
    width: isMobile ? 42 : 38, height: isMobile ? 42 : 38, borderRadius: "50%", border: "none", flexShrink: 0, cursor: "pointer",
    background: C.danger50, color: C.danger,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "transform 0.15s ease",
  };

  const phaseLabel = phase === "exploring" ? "Je consulte vos informations…" : "Je prépare votre réponse…";

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        .lm-spin { animation: lm-spin 1s linear infinite; } @keyframes lm-spin { to { transform: rotate(360deg); } }
        .lm-ai-icon { animation: lm-ai-icon-rotate 5s ease-in-out infinite; transform-origin: center center; }
        @keyframes lm-ai-icon-rotate { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(360deg); } }
        @keyframes lm-panel-in { from { opacity: 0; transform: translateY(${isMobile ? 24 : 12}px); } to { opacity: 1; transform: translateY(0); } }
        .lm-panel-enter { animation: lm-panel-in 220ms cubic-bezier(0.22,1,0.36,1); }
        @keyframes lm-msg-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .lm-msg-enter { animation: lm-msg-in 200ms ease-out; }
        @keyframes lm-fab-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(246,211,116,0.32); } 50% { box-shadow: 0 0 0 8px rgba(246,211,116,0); } }
        .lm-fab-pulse { animation: lm-fab-pulse 2.8s ease-in-out infinite; border-radius: 50%; }
        @keyframes lm-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .lm-skeleton { background: linear-gradient(90deg, ${C.lineSoft} 25%, ${C.line} 50%, ${C.lineSoft} 75%); background-size: 250% 100%; animation: lm-shimmer 1.5s ease-in-out infinite; }
        /* Les effets de survol ne s'appliquent qu'aux pointeurs fins (souris) —
           sur smartphone réel (tactile), ils resteraient collés après un tap. */
        @media (hover: hover) and (pointer: fine) {
          .lm-fab-hover:hover { transform: scale(1.08); box-shadow: 0 16px 34px rgba(15,51,82,0.32), 0 0 0 3px rgba(246,211,116,0.4); }
          .lm-send-hover:hover { transform: scale(1.1); }
        }
        .lm-fab-hover:active, .lm-send-hover:active { transform: scale(0.94); }
        /* Empêche Safari iOS de zoomer sur les champs texte < 16px et neutralise le highlight tactile bleu. */
        input, textarea, button { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/* Bouton discret pour afficher l'assistant (icône circulaire) — mode flottant uniquement */}
      {!isPage && !open && !hidden && (
        <button
          onClick={() => setOpen(true)}
          style={fabStyle}
          className="lm-fab-hover lm-fab-pulse"
          title="Afficher l'assistant IA"
        >
          <LogoLynoAI size={62} />
          {unseenCount > 0 && (
            <span style={{
              position: "absolute", top: -2, right: -2, minWidth: 20, height: 20, padding: "0 5px",
              borderRadius: 999, background: C.danger, color: C.white, fontSize: 11, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.white}`,
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            }}>
              {unseenCount > 9 ? "9+" : unseenCount}
            </span>
          )}
        </button>
      )}

      {!isPage && !open && !hidden && (
        <button
          onClick={() => setHidden(true)}
          style={hideButtonStyle}
          className="lm-fab-hover"
          title="Masquer l'icône de l'assistant"
        >
          <FontAwesomeIcon icon={faChevronDown} style={{ width: 18, height: 18 }} />
        </button>
      )}

      {!isPage && !open && hidden && (
        <button
          onClick={() => setHidden(false)}
          style={toggleStyle}
          title="Réafficher l'icône de l'assistant"
        >
          <FontAwesomeIcon icon={faChevronUp} style={{ width: 18, height: 18 }} />
        </button>
      )}

      {/* Panneau de discussion */}
      {(isPage || open) && (
        <div style={panelStyle} className={!isPage ? "lm-panel-enter" : undefined}>
          {isPage && isMobile && (
            <div style={{ padding: "14px 14px 12px", background: C.white, borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
              {onBack && (
                <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, background: "none", border: "none", cursor: "pointer", color: C.navy800, fontWeight: 600, fontSize: 13, padding: 0 }}>
                  <FontAwesomeIcon icon={faArrowLeft} style={{ width: 13, height: 13 }} /> Retour au fil
                </button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src="/assistant-icone.svg" alt="" width="24" height="24" style={{ display: "block", flexShrink: 0 }} />
                <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 20, color: C.ink }}>Assistant IA LynoraLink</span>
              </div>
              {pageDescription && <div style={{ fontSize: 13, lineHeight: 1.5, color: C.muted, marginTop: 7 }}>{pageDescription}</div>}
            </div>
          )}
          {/* Header */}
          <div style={headerStyle}>
            <div style={headerGlowStyle} />
            <div style={headerGlowStyle2} />
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              background: C.white, display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", flexShrink: 0,
              boxShadow: "0 3px 10px rgba(0,0,0,0.22), 0 0 0 3px rgba(246,211,116,0.22)",
              zIndex: 1,
            }}>
              <LogoLynoAI size={42} />
            </div>
            <div style={{ flex: 1, zIndex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 14.5, color: C.white, letterSpacing: "-0.01em" }}>
                Assistant IA LynoraLink
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.76)", fontWeight: 500, marginTop: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: apiMode === "connected" ? "#7DE2B0" : apiMode === "local" ? C.gold400 : "#B8C7D5", boxShadow: apiMode === "connected" ? "0 0 0 3px rgba(125,226,176,0.16)" : "none", flexShrink: 0 }} />
                {apiMode === "connected" ? "En ligne · prêt à vous aider" : apiMode === "local" ? "Disponible en mode limité" : "Connexion en cours…"}
              </div>
            </div>
            <button
              onClick={returnToAssistantHome}
              style={{
                background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", cursor: "pointer", color: C.white,
                borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s ease",
                width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
              title="Revenir à l'accueil de l'assistant"
              aria-label="Revenir à l'accueil de l'assistant"
            >
              <FontAwesomeIcon icon={faHouse} style={{ width: 15, height: 15 }} />
            </button>
            {!isPage && (
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", cursor: "pointer", color: C.white,
                  borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s ease",
                  width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, flexShrink: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
                title="Fermer le chat"
                aria-label="Fermer le chat"
              >
                <FontAwesomeIcon icon={faXmark} style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>

          {initializing ? (
            <PanelLoadingSkeleton isMobile={isMobile} />
          ) : (
          <>
          {/* Barre de contexte live — ce que l'assistant sait consulter en direct */}
          <div style={contextBarStyle}>
            <span style={contextPillStyle}>
              <FontAwesomeIcon icon={faCircleInfo} style={{ width: 9, height: 9 }} />
              {VIEW_LABELS[appState.view] || appState.view}
            </span>
            <span style={contextPillStyle}>
              <FontAwesomeIcon icon={faBell} style={{ width: 9, height: 9 }} />
              {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
            </span>
            <span style={contextPillStyle}>
              <FontAwesomeIcon icon={faMagnifyingGlass} style={{ width: 9, height: 9 }} />
              {appState.connections.length} connexion{appState.connections.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: isMobile ? "14px 12px" : 16, display: "flex", flexDirection: "column", gap: 10,
            WebkitOverflowScrolling: "touch", overscrollBehavior: "contain",
            background: `linear-gradient(180deg, ${C.navy50} 0%, ${C.white} 140px)`,
          }}>
            {messages.map((m, i) => (
              <div key={i} className="lm-msg-enter">
                {m.content && <Bubble role={m.role}>{m.content}</Bubble>}
                {m.statusChip && (
                  <div style={{ display: "flex", justifyContent: "flex-start", marginLeft: 32 }}>
                    <ToolCallChip name={m.statusChip.name} />
                  </div>
                )}
                {m.infoResult && (
                  <div style={{ display: "flex", justifyContent: "flex-start", marginLeft: 32 }}>
                    <InfoChip label={m.infoResult.summary} ok={m.infoResult.ok} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="lm-msg-enter" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <SkeletonBubble lines={phase === "exploring" ? 1 : 2} />
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.mutedLight, fontSize: 11.5, marginLeft: 32, padding: "2px 0" }}>
                  <FontAwesomeIcon icon={faSpinner} className="lm-spin" style={{ width: 11, height: 11 }} /> {phaseLabel}
                </div>
              </div>
            )}
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.danger, padding: "6px 10px", background: C.danger50, borderRadius: 10 }}>
                <span style={{ flex: 1 }}>{error}</span>
                <button
                  onClick={() => runAgent()}
                  style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "transparent", color: C.danger, fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}
                >
                  <FontAwesomeIcon icon={faArrowRotateRight} style={{ width: 11, height: 11 }} /> Réessayer
                </button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div style={{ padding: "2px 14px 12px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: C.mutedLight, textTransform: "uppercase", letterSpacing: "0.05em", margin: "6px 0 8px" }}>
                Questions fréquentes
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 7 }}>
                {QUICK_PROMPTS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => send(q.text)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "9px 11px",
                      borderRadius: 12, border: `1px solid ${C.line}`, background: C.white,
                      color: C.navy800, fontSize: 11.5, fontWeight: 650, cursor: "pointer", textAlign: "left",
                      transition: "all 0.18s ease", boxShadow: "0 1px 2px rgba(15,51,82,0.04)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.navy50; e.currentTarget.style.borderColor = C.navy100; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = C.white; e.currentTarget.style.borderColor = C.line; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <span style={{
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      width: 26, height: 26, borderRadius: 8, background: C.teal50, color: C.teal600,
                    }}>
                      <FontAwesomeIcon icon={q.icon} style={{ width: 12, height: 12 }} />
                    </span>
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={inputContainerStyle}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Posez-moi une question sur LynoraLink..."
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = C.navy800; e.target.style.boxShadow = "0 0 0 3px rgba(27,83,134,0.15)"; e.target.style.background = C.white; }}
              onBlur={(e) => { e.target.style.borderColor = C.line; e.target.style.boxShadow = "none"; e.target.style.background = C.navy50; }}
            />
            {loading ? (
              <button onClick={stopGeneration} style={stopBtnStyle} className="lm-send-hover" title="Interrompre">
                <FontAwesomeIcon icon={faStop} style={{ width: 14, height: 14 }} />
              </button>
            ) : (
              <button
                onClick={() => send()}
                disabled={!input.trim()}
                style={sendBtnStyle(!!input.trim())}
                className="lm-send-hover"
              >
                <FontAwesomeIcon icon={faPaperPlane} style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>
          </>
          )}
        </div>
      )}
    </>
  );
}
