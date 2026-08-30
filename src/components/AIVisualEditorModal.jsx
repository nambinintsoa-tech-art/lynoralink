"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Sparkles, Wand2, Image as ImageIcon, Download, RefreshCw, Check, X,
  Send, Loader2, ArrowLeft, Settings2, Plus, Crop, Palette,
  CheckCircle2, AlertCircle, Eye, Zap, Maximize2, Trash2, Copy,
  FileText, Type, AlignLeft, List, Heading2, Quote, Bold, Italic,
  Link2, Pilcrow, BookOpen, Newspaper, Megaphone, Lightbulb,
  PenLine, ClipboardList, Hash, Clock, Gauge,
  Briefcase, MessageCircle,
} from "lucide-react";

/* ================================================================== */
/*  SYSTÈME DE DESIGN LYNOAI (basé sur le logo)                     */
/*  Navy #1A253A · Gold #C5984B · White · Slate #3D5068             */
/* ================================================================== */
const C = {
  // Couleurs principales du logo LyNoAI
  navy: "#1A253A",
  navyLight: "#243349",
  navyDeep: "#0F1A2A",
  gold: "#C5984B",
  goldLight: "#D9A536",
  goldPale: "#E8C785",
  goldGlow: "rgba(197, 152, 75, 0.35)",
  slate: "#3D5068",
  silver: "#D1D5DB",
  silverDark: "#64748B",
  // Couleurs neutres (cohérentes avec LynoraLink)
  ink: "var(--app-text)",
  muted: "var(--app-muted)",
  mutedLight: "var(--app-muted-light)",
  line: "var(--app-border)",
  white: "var(--app-surface)",
  whiteText: "#FFFFFF",
  bg: "var(--app-bg)",
  danger: "#C24444",
  // Dégradés signature LyNoAI
  navyGrad: "linear-gradient(160deg, #1A253A 0%, #0F1A2A 100%)",
  goldGrad: "linear-gradient(135deg, #D9A536 0%, #C5984B 100%)",
  lynoaiGrad: "linear-gradient(135deg, #1A253A 0%, #3D5068 50%, #C5984B 100%)",
  lynoaiRadial: "radial-gradient(circle at 30% 20%, rgba(197,152,75,0.18), transparent 60%), radial-gradient(circle at 80% 80%, rgba(61,80,104,0.25), transparent 60%), #1A253A",
};

/* ================================================================== */
/*  DONNÉES DE CONFIGURATION                                         */
/* ================================================================== */
const GEN_MODES = [
  { id: "image", label: "Image", icon: ImageIcon, hint: "Générer un visuel IA" },
  { id: "article", label: "Article", icon: FileText, hint: "Rédiger un contenu textuel" },
];

const STYLES = [
  { id: "realistic", label: "Réaliste", hint: "Photographie hyperréaliste" },
  { id: "anime", label: "Anime", hint: "Style manga japonais" },
  { id: "digital-art", label: "Art Digital", hint: "Illustration numérique" },
  { id: "oil-painting", label: "Peinture", hint: "Huile sur toile" },
  { id: "watercolor", label: "Aquarelle", hint: "Lavis et pigments" },
  { id: "cyberpunk", label: "Cyberpunk", hint: "Néon futuriste" },
  { id: "minimal", label: "Minimaliste", hint: "Lignes épurées" },
  { id: "fantasy", label: "Fantasy", hint: "Monde imaginaire" },
];

const ASPECT_RATIOS = [
  { id: "1:1", label: "Carré", w: 1, h: 1, hint: "1024×1024" },
  { id: "16:9", label: "Paysage", w: 16, h: 9, hint: "1792×1024" },
  { id: "9:16", label: "Portrait", w: 9, h: 16, hint: "1024×1792" },
  { id: "4:3", label: "Classique", w: 4, h: 3, hint: "1365×1024" },
];

const PROMPT_IDEAS = [
  "Coucher de soleil sur les hautes terres de Madagascar",
  "Portrait professionnel en costume, éclairage studio",
  "Rue animée d'Antananarivo au crépuscule, style cinématique",
  "Logo minimaliste pour une startup tech",
  "Café cosy avec plantes vertes et lumière chaude",
];

const ARTICLE_TOPICS = [
  "L'avenir de l'IA en Afrique",
  "Comment réussir son networking professionnel",
  "Tendances design 2026",
  "Le leadership inclusif au quotidien",
  "Construire une marque personnelle authentique",
];

const ARTICLE_TONES = [
  { id: "pro", label: "Professionnel", icon: Briefcase },
  { id: "info", label: "Informatif", icon: BookOpen },
  { id: "conv", label: "Conversationnel", icon: MessageCircle },
  { id: "insp", label: "Inspirant", icon: Lightbulb },
  { id: "persu", label: "Persuasif", icon: Megaphone },
  { id: "analyt", label: "Analytique", icon: ClipboardList },
];

const ARTICLE_LENGTHS = [
  { id: "short", label: "Court", hint: "~300 mots · 1 min" },
  { id: "medium", label: "Moyen", hint: "~700 mots · 3 min" },
  { id: "long", label: "Long", hint: "~1500 mots · 6 min" },
];

const ARTICLE_FORMATS = [
  { id: "article", label: "Article", icon: FileText, hint: "Billet structuré avec H1/H2" },
  { id: "post", label: "Post court", icon: PenLine, hint: "Statut pour le fil" },
  { id: "list", label: "Liste", icon: List, hint: "Ex : 5 conseils pour..." },
  { id: "newsletter", label: "Newsletter", icon: Newspaper, hint: "Format email digest" },
];

/* ================================================================== */
/*  GÉNÉRATION MOCK (image + article)                                 */
/* ================================================================== */
function buildMockImage(prompt, styleLabel, aspect, idx, total) {
  const [w, h] = aspect.id.split(":").map(Number);
  const ratio = w / h;
  const W = 800;
  const H = Math.round(800 / ratio);
  const palettes = [
    ["#1A253A", "#C5984B"],
    ["#3D5068", "#D9A536"],
    ["#0F1A2A", "#E8C785"],
    ["#243349", "#C5984B"],
    ["#1A253A", "#D1D5DB"],
  ];
  const [c1, c2] = palettes[(idx + prompt.length) % palettes.length];
  const safePrompt = String(prompt || "").slice(0, 60).replace(/[<>&]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g${idx}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <filter id="b${idx}"><feGaussianBlur stdDeviation="40"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#g${idx})"/>
  <circle cx="${150 + idx * 90}" cy="${200 + idx * 60}" r="${80 + idx * 20}" fill="white" opacity="0.08" filter="url(#b${idx})"/>
  <circle cx="${W - 200 - idx * 70}" cy="${H - 150 - idx * 50}" r="${100 + idx * 15}" fill="white" opacity="0.06" filter="url(#b${idx})"/>
  <text x="50%" y="${H / 2 - 10}" font-family="'Sora', sans-serif" font-size="26" font-weight="700" fill="white" text-anchor="middle" opacity="0.97">${safePrompt}</text>
  <text x="50%" y="${H / 2 + 24}" font-family="'Sora', sans-serif" font-size="14" fill="white" text-anchor="middle" opacity="0.75">${styleLabel} · ${aspect.id}</text>
  <text x="50%" y="${H - 28}" font-family="'Sora', sans-serif" font-size="11" fill="white" text-anchor="middle" opacity="0.55">LyNoAI · variation ${idx + 1}/${total}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildMockArticle({ topic, tone, length, format }) {
  // Génère un article de démonstration structuré selon le format et la longueur
  const lenMap = { short: 3, medium: 5, long: 7 };
  const secCount = lenMap[length] || 5;
  const toneIntro = {
    pro: "Dans un contexte professionnel en pleine mutation,",
    info: "Il convient d'examiner en détail",
    conv: "Vous êtes-vous déjà demandé pourquoi",
    insp: "Chaque grand parcours commence par",
    persu: "Il est temps d'agir :",
    analyt: "L'analyse des données récentes révèle que",
  };
  const intro = toneIntro[tone] || toneIntro.pro;

  const sections = Array.from({ length: secCount }, (_, i) => ({
    heading: `Point clé ${i + 1} — ${["Contexte", "Enjeux", "Opportunités", "Méthode", "Résultats", "Perspectives", "Conclusion"][i] || "Approfondissement"}`,
    body: `${intro} ${topic}. Cette dimension mérite une attention particulière car elle touche à la fois aux aspects stratégiques et opérationnels. Les acteurs impliqués doivent articuler vision long terme et exécution quotidienne, sans négliger les signaux faibles qui peuvent révéler des tendances structurantes. En pratique, cela implique de mettre en place des processus itératifs, d'écouter les retours terrain, et d'ajuster le cap à mesure que de nouvelles données deviennent disponibles. Plusieurs exemples concrets, observés dans des contextes comparables, illustrent ce principe et suggèrent des leviers actionnables pour les mois à venir.`,
  }));

  const lead = `${intro} ${topic}. Cet article explore ${secCount} dimensions clés pour comprendre les enjeux et identifier des actions concrètes.`;

  const paragraphs = [lead, ...sections.flatMap((s) => [`## ${s.heading}`, s.body])];
  const body = paragraphs.join("\n\n");
  const excerpt = lead.slice(0, 140) + (lead.length > 140 ? "…" : "");

  return {
    headline: topic.charAt(0).toUpperCase() + topic.slice(1),
    excerpt,
    body,
    wordCount: body.split(/\s+/).length,
    readingTime: Math.max(1, Math.round(body.split(/\s+/).length / 220)),
  };
}

/* ================================================================== */
/*  COMPOSANTS UI INTERNES                                            */
/* ================================================================== */
function LyNoAILogo({ size = 32, isMobile = false }) {
  return (
    <img
      src="/logo_lynoAI.svg"
      alt="LyNoAI"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: isMobile ? 10 : 12,
        objectFit: "contain",
        objectPosition: "center",
        boxShadow: "0 4px 14px rgba(26, 37, 58, 0.18)",
        background: "rgba(26, 37, 58, 0.02)",
        padding: 2,
        display: "block",
      }}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 9, textTransform: "uppercase", letterSpacing: "0.04em" }}>
      <Icon size={13} /> {children}
    </div>
  );
}

function StyleChip({ active, label, hint, onClick }) {
  return (
    <button
      onClick={onClick}
      title={hint}
      style={{
        padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${active ? C.gold : C.line}`,
        background: active ? "rgba(197, 152, 75, 0.08)" : C.white,
        color: active ? C.gold : C.ink, fontSize: 12.5, fontWeight: 600,
        cursor: "pointer", transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = C.mutedLight; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = C.line; }}
    >
      {label}
    </button>
  );
}

function AspectChip({ active, label, hint, onClick }) {
  return (
    <button
      onClick={onClick}
      title={hint}
      style={{
        padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${active ? C.gold : C.line}`,
        background: active ? "rgba(197, 152, 75, 0.08)" : C.white,
        color: active ? C.gold : C.ink, fontSize: 12, fontWeight: 600,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
      }}
    >
      <Crop size={13} />
      {label}
    </button>
  );
}

function ImageThumb({ src, selected, onSelect, idx }) {
  return (
    <button
      onClick={onSelect}
      style={{
        position: "relative", padding: 0, cursor: "pointer",
        border: `2px solid ${selected ? C.gold : C.line}`,
        borderRadius: 12, overflow: "hidden", background: C.bg,
        aspectRatio: "1 / 1",
      }}
    >
      <img src={src} alt={`Variation ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {selected && (
        <span style={{
          position: "absolute", top: 6, right: 6,
          width: 22, height: 22, borderRadius: "50%", background: C.gold, color: C.navy,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Check size={13} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function Spinner({ label = "Génération en cours..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "40px 20px" }}>
      <Loader2 size={36} color={C.gold} style={{ animation: "ai-spin 1s linear infinite" }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{label}</div>
      <div style={{ fontSize: 11, color: C.mutedLight }}>LyNoAI rédige votre contenu</div>
      <style>{`@keyframes ai-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ModeTab({ active, label, icon: Icon, hint, onClick }) {
  return (
    <button
      onClick={onClick}
      title={hint}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        padding: "11px 12px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
        background: active ? C.navy : "transparent", color: active ? C.whiteText : C.muted,
        borderBottom: active ? `2px solid ${C.gold}` : "2px solid transparent",
        transition: "all 0.15s ease",
      }}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

function ToneChip({ active, label, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 11px", borderRadius: 10, border: `1.5px solid ${active ? C.gold : C.line}`,
        background: active ? "rgba(197, 152, 75, 0.08)" : C.white,
        color: active ? C.gold : C.ink, fontSize: 12, fontWeight: 600, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 6,
      }}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

function LengthChip({ active, label, hint, onClick }) {
  return (
    <button
      onClick={onClick}
      title={hint}
      style={{
        flex: 1, padding: "9px 0", borderRadius: 8,
        border: `1.5px solid ${active ? C.gold : C.line}`,
        background: active ? "rgba(197, 152, 75, 0.08)" : C.white,
        color: active ? C.gold : C.ink, fontSize: 12, fontWeight: 600, cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 500, color: C.mutedLight }}>{hint}</span>
    </button>
  );
}

function FormatChip({ active, label, hint, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      title={hint}
      style={{
        padding: "9px 11px", borderRadius: 10, border: `1.5px solid ${active ? C.gold : C.line}`,
        background: active ? "rgba(197, 152, 75, 0.08)" : C.white,
        color: active ? C.gold : C.ink, fontSize: 12, fontWeight: 600, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 7,
      }}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

/* ================================================================== */
/*  PANNEAU IMAGE (génération visuelle)                               */
/* ================================================================== */
function ImagePanel({
  prompt, setPrompt, styleId, setStyleId, aspectId, setAspectId,
  count, setCount, images, selectedIdx, setSelectedIdx, isGenerating,
  onGenerate, error, isMobile,
}) {
  const aspect = ASPECT_RATIOS.find((a) => a.id === aspectId);
  const selectedStyle = STYLES.find((s) => s.id === styleId);
  const aspectRatio = `${aspect.w} / ${aspect.h}`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 380px) minmax(0, 1fr)", gap: isMobile ? 16 : 24, alignItems: "start" }}>
      {/* Colonne gauche : contrôles */}
      <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, padding: isMobile ? 14 : 18, position: isMobile ? "static" : "sticky", top: isMobile ? 0 : 84 }}>
        <SectionLabel icon={Sparkles}>Description</SectionLabel>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Décrivez l'image que vous souhaitez générer : sujet, ambiance, couleurs, composition..."
          rows={4}
          style={{
            width: "100%", padding: "11px 13px", border: `1.5px solid ${C.line}`,
            borderRadius: 10, fontSize: 13.5, fontFamily: "inherit", resize: "vertical",
            color: C.ink, background: C.white, outline: "none", lineHeight: 1.5,
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = C.gold)}
          onBlur={(e) => (e.currentTarget.style.borderColor = C.line)}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 11, color: error ? C.danger : C.mutedLight }}>
            {error || `${prompt.length} caractères`}
          </span>
          <button
            onClick={() => setPrompt(PROMPT_IDEAS[Math.floor(Math.random() * PROMPT_IDEAS.length)])}
            style={{
              border: "none", background: "transparent", color: C.gold,
              fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <RefreshCw size={11} /> Inspiration
          </button>
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionLabel icon={Palette}>Style artistique</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {STYLES.map((s) => (
              <StyleChip key={s.id} active={s.id === styleId} label={s.label} hint={s.hint} onClick={() => setStyleId(s.id)} />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionLabel icon={Crop}>Format</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {ASPECT_RATIOS.map((a) => (
              <AspectChip key={a.id} active={a.id === aspectId} label={a.id} hint={a.hint} onClick={() => setAspectId(a.id)} />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionLabel icon={Settings2}>Variations</SectionLabel>
          <div style={{ display: "flex", gap: 7 }}>
            {[1, 2, 4].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 8,
                  border: `1.5px solid ${count === n ? C.gold : C.line}`,
                  background: count === n ? "rgba(197, 152, 75, 0.08)" : C.white,
                  color: count === n ? C.gold : C.ink, fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating}
          style={{
            marginTop: 20, width: "100%", padding: "12px 16px", borderRadius: 999,
            border: "none", cursor: isGenerating ? "wait" : "pointer",
            background: isGenerating ? C.mutedLight : C.navy, color: "white",
            fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: "0 4px 12px rgba(26, 37, 58, 0.25)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { if (!isGenerating) e.currentTarget.style.background = C.navyLight; }}
          onMouseLeave={(e) => { if (!isGenerating) e.currentTarget.style.background = C.navy; }}
        >
          {isGenerating ? <Loader2 size={16} style={{ animation: "ai-spin 1s linear infinite" }} /> : <Wand2 size={16} />}
          {isGenerating ? "Génération..." : "Générer"}
        </button>
      </div>

      {/* Colonne droite : aperçu */}
      <div>
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden", minHeight: isMobile ? 260 : 400 }}>
          {isGenerating ? (
            <Spinner />
          ) : images.length > 0 ? (
            <div style={{ position: "relative", background: C.bg, aspectRatio: aspectRatio }}>
              <img src={images[selectedIdx].url} alt={images[selectedIdx].prompt} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 7, alignItems: "center" }}>
                <span style={{
                  background: "rgba(26, 37, 58, 0.85)", color: "white", padding: "4px 10px",
                  borderRadius: 999, fontSize: 11, fontWeight: 600, backdropFilter: "blur(6px)",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <Sparkles size={11} /> {selectedStyle.label}
                </span>
                <span style={{
                  background: "rgba(26, 37, 58, 0.85)", color: "white", padding: "4px 10px",
                  borderRadius: 999, fontSize: 11, fontWeight: 600, backdropFilter: "blur(6px)",
                }}>
                  {aspect.id}
                </span>
              </div>
              <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}>
                <button
                  onClick={() => navigator.clipboard?.writeText(images[selectedIdx].prompt)}
                  title="Copier le prompt"
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                    background: "rgba(26, 37, 58, 0.85)", color: "white", backdropFilter: "blur(6px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={onGenerate}
                  title="Régénérer"
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                    background: "rgba(26, 37, 58, 0.85)", color: "white", backdropFilter: "blur(6px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              aspectRatio: aspectRatio, background: C.bg, display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 14, padding: 40, color: C.muted,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, background: C.lynoaiGrad,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", opacity: 0.85, boxShadow: "0 6px 20px rgba(26, 37, 58, 0.25)",
              }}>
                <ImageIcon size={28} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Aucun visuel généré</div>
              <div style={{ fontSize: 12.5, color: C.muted, textAlign: "center", maxWidth: 320 }}>
                Décrivez votre image dans le panneau de gauche, choisissez un style et un format, puis cliquez sur « Générer ».
              </div>
            </div>
          )}
        </div>

        {images.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Variations · {images.length}
              </span>
              <span style={{ fontSize: 11, color: C.mutedLight }}>Cliquez pour sélectionner</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(images.length, 4)}, 1fr)`, gap: 10 }}>
              {images.map((img, idx) => (
                <ImageThumb key={img.id} src={img.url} idx={idx} selected={idx === selectedIdx} onSelect={() => setSelectedIdx(idx)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  PANNEAU ARTICLE (génération textuelle)                            */
/* ================================================================== */
function ArticlePanel({
  topic, setTopic, tone, setTone, length, setLength, format, setFormat,
  article, isGenerating, onGenerate, error, isMobile, articleImages, setArticleImages, fileInputRef,
  presentation, setPresentation,
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 380px) minmax(0, 1fr)", gap: isMobile ? 16 : 24, alignItems: "start" }}>
      {/* Colonne gauche : contrôles */}
      <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, padding: isMobile ? 14 : 18, position: isMobile ? "static" : "sticky", top: isMobile ? 0 : 84 }}>
        <SectionLabel icon={Type}>Sujet de l'article</SectionLabel>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ex : L'impact de l'IA sur le travail collaboratif..."
          rows={3}
          style={{
            width: "100%", padding: "11px 13px", border: `1.5px solid ${C.line}`,
            borderRadius: 10, fontSize: 13.5, fontFamily: "inherit", resize: "vertical",
            color: C.ink, background: C.white, outline: "none", lineHeight: 1.5,
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = C.gold)}
          onBlur={(e) => (e.currentTarget.style.borderColor = C.line)}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 11, color: error ? C.danger : C.mutedLight }}>
            {error || `${topic.length} caractères`}
          </span>
          <button
            onClick={() => setTopic(ARTICLE_TOPICS[Math.floor(Math.random() * ARTICLE_TOPICS.length)])}
            style={{
              border: "none", background: "transparent", color: C.gold,
              fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <RefreshCw size={11} /> Inspiration
          </button>
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionLabel icon={Megaphone}>Ton</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {ARTICLE_TONES.map((t) => (
              <ToneChip key={t.id} active={t.id === tone} label={t.label} icon={t.icon} onClick={() => setTone(t.id)} />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionLabel icon={Gauge}>Longueur</SectionLabel>
          <div style={{ display: "flex", gap: 7 }}>
            {ARTICLE_LENGTHS.map((l) => (
              <LengthChip key={l.id} active={l.id === length} label={l.label} hint={l.hint} onClick={() => setLength(l.id)} />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionLabel icon={FileText}>Format</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {ARTICLE_FORMATS.map((f) => (
              <FormatChip key={f.id} active={f.id === format} label={f.label} hint={f.hint} icon={f.icon} onClick={() => setFormat(f.id)} />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionLabel icon={ImageIcon}>Images de contexte (optionnel)</SectionLabel>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: 1, padding: "10px 12px", borderRadius: 10,
                border: `1.5px dashed ${C.gold}`, background: C.white,
                color: C.gold, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <Plus size={14} /> Ajouter une image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach((file) => {
                  if (file.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const data = evt.target?.result;
                      setArticleImages((prev) => [...prev, { id: Date.now() + Math.random(), src: data, name: file.name }]);
                    };
                    reader.readAsDataURL(file);
                  }
                });
              }}
            />
            {articleImages.length > 0 && (
              <button
                onClick={() => setArticleImages([])}
                style={{
                  padding: "8px 12px", borderRadius: 8,
                  border: `1px solid ${C.line}`, background: C.white,
                  color: C.danger, fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
          {articleImages.length > 0 && (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
              padding: "10px", borderRadius: 10, background: C.bg,
              border: `1px solid ${C.line}`,
            }}>
              {articleImages.map((img) => (
                <div key={img.id} style={{ position: "relative", aspectRatio: "1/1" }}>
                  <img src={img.src} alt={img.name} style={{
                    width: "100%", height: "100%", objectFit: "cover",
                    borderRadius: 8, display: "block",
                  }} />
                  <button
                    onClick={() => setArticleImages((prev) => prev.filter((i) => i.id !== img.id))}
                    style={{
                      position: "absolute", top: 4, right: 4,
                      width: 20, height: 20, borderRadius: "50%",
                      background: "rgba(255,255,255,0.9)", border: "none",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", padding: 0,
                    }}
                  >
                    <X size={12} color={C.danger} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: 11, color: C.mutedLight, marginTop: 6 }}>
            {articleImages.length > 0 ? `${articleImages.length} image(s) ajoutée(s) · Les images aideront LyNoAI à contextualiser le contenu.` : "Les images sont facultatives mais enrichissent la génération."}
          </p>
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionLabel icon={Palette}>Mise en forme</SectionLabel>
          <div style={{ display: "grid", gap: 8 }}>
            <select
              value={presentation.theme}
              onChange={(e) => setPresentation((prev) => ({ ...prev, theme: e.target.value }))}
              style={{ width: "100%", padding: "9px 10px", border: `1px solid ${C.line}`, borderRadius: 9, color: C.ink, background: C.white, fontSize: 12.5 }}
            >
              <option value="navy-gold">Navy & doré</option>
              <option value="forest">Forêt & ivoire</option>
              <option value="coral">Corail & graphite</option>
              <option value="ocean">Océan & sable</option>
            </select>
            <select
              value={presentation.font}
              onChange={(e) => setPresentation((prev) => ({ ...prev, font: e.target.value }))}
              style={{ width: "100%", padding: "9px 10px", border: `1px solid ${C.line}`, borderRadius: 9, color: C.ink, background: C.white, fontSize: 12.5 }}
            >
              <option value="editorial">Editorial</option>
              <option value="modern">Moderne</option>
              <option value="compact">Compacte</option>
            </select>
            <select
              value={presentation.density}
              onChange={(e) => setPresentation((prev) => ({ ...prev, density: e.target.value }))}
              style={{ width: "100%", padding: "9px 10px", border: `1px solid ${C.line}`, borderRadius: 9, color: C.ink, background: C.white, fontSize: 12.5 }}
            >
              <option value="airy">Aérée</option>
              <option value="balanced">Équilibrée</option>
              <option value="dense">Dense</option>
            </select>
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating}
          style={{
            marginTop: 20, width: "100%", padding: "12px 16px", borderRadius: 999,
            border: "none", cursor: isGenerating ? "wait" : "pointer",
            background: isGenerating ? C.mutedLight : C.navy, color: "white",
            fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: "0 4px 12px rgba(26, 37, 58, 0.25)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { if (!isGenerating) e.currentTarget.style.background = C.navyLight; }}
          onMouseLeave={(e) => { if (!isGenerating) e.currentTarget.style.background = C.navy; }}
        >
          {isGenerating ? <Loader2 size={16} style={{ animation: "ai-spin 1s linear infinite" }} /> : <Wand2 size={16} />}
          {isGenerating ? "Rédaction..." : "Rédiger"}
        </button>
      </div>

      {/* Colonne droite : aperçu */}
      <div>
        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden", minHeight: isMobile ? 260 : 400 }}>
          {isGenerating ? (
            <Spinner label="Rédaction en cours..." />
          ) : article ? (
            <ArticlePreview article={article} presentation={presentation} />
          ) : (
            <div style={{
              minHeight: 400, background: C.bg, display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 14, padding: 40, color: C.muted,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, background: C.lynoaiGrad,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", opacity: 0.85, boxShadow: "0 6px 20px rgba(26, 37, 58, 0.25)",
              }}>
                <FileText size={28} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Aucun contenu rédigé</div>
              <div style={{ fontSize: 12.5, color: C.muted, textAlign: "center", maxWidth: 320 }}>
                Indiquez un sujet, un ton et un format dans le panneau de gauche, puis cliquez sur « Rédiger ».
              </div>
            </div>
          )}
        </div>

        {article && (
          <div style={{
            marginTop: 14, padding: "11px 14px", borderRadius: 12,
            background: "rgba(197, 152, 75, 0.06)", border: `1px solid rgba(197, 152, 75, 0.18)`,
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <AlertCircle size={15} style={{ color: C.gold, flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
              Contenu rédigé par <strong style={{ color: C.ink }}>LyNoAI</strong>. Relisez, ajustez et vérifiez les sources avant publication.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ARTICLE_PRESENTATION_DEFAULTS = { theme: "navy-gold", font: "editorial", density: "airy" };

function cleanGeneratedContent(value = "") {
  return String(value)
    .replace(/^```(?:markdown|md|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\*{2,3}([^*\n]+)\*{2,3}/g, "$1")
    .replace(/(^|\n)\s*\*([^*\n]+)\*(?=\s*(?:\n|$))/g, "$1$2")
    .replace(/(^|\n)\s*[-*+]\s+/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ArticlePresentationStyle(presentation = ARTICLE_PRESENTATION_DEFAULTS) {
  const themes = {
    "navy-gold": { accent: C.navy, soft: "#F7F3EA", text: C.ink },
    forest: { accent: "#24594A", soft: "#F1F5EF", text: "#20352E" },
    coral: { accent: "#B75245", soft: "#FFF3EF", text: "#302426" },
    ocean: { accent: "#176A83", soft: "#EEF7F8", text: "#20333A" },
  };
  const fonts = { editorial: "Georgia, serif", modern: "'Sora', sans-serif", compact: "'Trebuchet MS', sans-serif" };
  const densities = { airy: { lineHeight: 1.85, margin: 16 }, balanced: { lineHeight: 1.7, margin: 12 }, dense: { lineHeight: 1.55, margin: 8 } };
  return { ...(themes[presentation.theme] || themes["navy-gold"]), font: fonts[presentation.font] || fonts.editorial, ...(densities[presentation.density] || densities.airy) };
}

function ArticlePreview({ article, presentation }) {
  const style = ArticlePresentationStyle(presentation);
  const blocks = article.body.split("\n\n").map((block) => {
    return { type: "p", text: block };
  });

  return (
    <div style={{ padding: "24px 28px", background: style.soft, color: style.text }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: style.accent, fontFamily: style.font, marginBottom: 10, lineHeight: 1.2 }}>
        {article.headline}
      </h1>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.55, marginBottom: 16, fontStyle: "italic" }}>
        {article.excerpt}
      </p>
      <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 11.5, color: C.mutedLight, marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${C.line}` }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Clock size={12} /> {article.readingTime} min de lecture
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Hash size={12} /> {article.wordCount} mots
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Sparkles size={12} color={C.gold} /> Rédigé par LyNoAI
        </span>
      </div>
      {blocks.map((b, i) => (
        <p key={i} style={{ fontSize: 14, color: style.text, lineHeight: style.lineHeight, marginBottom: style.margin, fontFamily: style.font }}>
          {b.text}
        </p>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  MODALE PRINCIPALE LyNoAI                                         */
/* ================================================================== */
export default function AIVisualEditorModal({ onClose, onPublish, currentUser }) {
  // Mode commun
  const [mode, setMode] = useState("image"); // "image" | "article"
  // State image
  const [prompt, setPrompt] = useState("");
  const [styleId, setStyleId] = useState("realistic");
  const [aspectId, setAspectId] = useState("1:1");
  const [count, setCount] = useState(2);
  const [images, setImages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  // State article
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("pro");
  const [length, setLength] = useState("medium");
  const [format, setFormat] = useState("article");
  const [article, setArticle] = useState(null);
  const [articleImages, setArticleImages] = useState([]);
  const [presentation, setPresentation] = useState({ theme: "navy-gold", font: "editorial", density: "airy" });
  // États partagés
  const [isGenerating, setIsGenerating] = useState(false);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleGenerateImage = useCallback(async () => {
    if (!prompt.trim()) { setError("Veuillez décrire l'image à générer."); return; }
    if (prompt.trim().length < 8) { setError("Décrivez plus en détail (minimum 8 caractères)."); return; }
    setError(""); setIsGenerating(true); setImages([]);
    try {
      const res = await fetch("/api/ai-image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), style: styleId, aspect: aspectId, count }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "La génération d'image a échoué.");
      }

      if (Array.isArray(data.images) && data.images.length > 0) {
        setImages(data.images); setSelectedIdx(0); setIsGenerating(false); return;
      }

      throw new Error("Le fournisseur n'a renvoyé aucune image.");
    } catch (err) {
      setIsGenerating(false);
      setError(err?.message || "Erreur inconnue pendant la génération.");
    }
  }, [prompt, styleId, aspectId, count]);

  const handleGenerateArticle = useCallback(async () => {
    if (!topic.trim()) { setError("Veuillez indiquer un sujet."); return; }
    if (topic.trim().length < 5) { setError("Sujet trop court (minimum 5 caractères)."); return; }
    setError(""); setIsGenerating(true); setArticle(null);
    try {
      const res = await fetch("/api/ai-article/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), tone, length, format, images: articleImages }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "La génération d'article a échoué.");
      }

      if (data.article) {
        setArticle(data.article); setIsGenerating(false); return;
      }

      throw new Error("Le fournisseur n'a renvoyé aucun article.");
    } catch (err) {
      setIsGenerating(false);
      setError(err?.message || "Erreur inconnue pendant la génération.");
    }
  }, [topic, tone, length, format, articleImages]);

  const handlePublish = () => {
    if (mode === "image") {
      if (images.length === 0) return;
      const selected = images[selectedIdx];
      onPublish({
        mode: "visuelfocus",
        text: cleanGeneratedContent(caption),
        media: [{
          type: "image", url: selected.url,
          name: "LyNoAI · Image", label: prompt.trim().slice(0, 80),
        }],
      });
    } else {
      if (!article) return;
      onPublish({
        mode: "article",
        isArticle: true,
        articleTitle: cleanGeneratedContent(article.headline),
        articleExcerpt: cleanGeneratedContent(article.excerpt),
        text: cleanGeneratedContent(article.body),
        presentation,
      });
    }
  };

  const canPublish = mode === "image" ? images.length > 0 : !!article;
  const publishLabel = mode === "image" ? "Publier l'image" : "Publier l'article";
  const statusText = mode === "image"
    ? (images.length > 0 ? `${images.length} variation(s) prête(s) · variation ${selectedIdx + 1} sélectionnée` : "Générez au moins un visuel pour publier")
    : (article ? `${article.wordCount} mots · ${article.readingTime} min` : "Rédigez un article pour publier");

  return (
    <div className="ai-visual-modal" style={{ position: "fixed", top: "var(--lynora-header-offset, 0px)", right: 0, bottom: 0, left: 0, width: "100vw", height: "calc(100dvh - var(--lynora-header-offset, 0px))", background: C.bg, zIndex: 100, overflow: "hidden", boxSizing: "border-box" }}>
      {/* En-tête collant */}
      <div className="ai-visual-modal-header" style={{
        position: "sticky", top: 0, background: C.white,
        borderBottom: `1px solid ${C.line}`, zIndex: 5,
        boxShadow: "0 1px 3px rgba(26, 37, 58, 0.04)",
      }}>
        <div style={{
          maxWidth: 1080,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 8 : 12,
          padding: isMobile ? "10px 12px" : "14px 20px",
          flexWrap: "nowrap",
          flexDirection: "row",
        }}>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: C.bg, border: "none",
              borderRadius: 10, padding: "7px 12px", cursor: "pointer",
              color: C.navy, fontWeight: 600, fontSize: 12.5,
            }}
          >
            <ArrowLeft size={15} /> Retour
          </button>
          <div style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 6 : 10,
            minHeight: 44,
            width: isMobile ? "auto" : "auto",
            justifyContent: "flex-start",
            overflow: "hidden",
          }}>
            <LyNoAILogo size={isMobile ? 28 : 40} isMobile={isMobile} />
            <div style={{ display: "flex", flexDirection: "row", minWidth: 0, alignItems: "center", gap: 6, overflow: "hidden" }}>
              <span style={{
                fontSize: isMobile ? 13 : 16,
                fontWeight: 800,
                color: C.navy,
                fontFamily: "'Sora', sans-serif",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}>
                Lynora AI
              </span>
            </div>
          </div>
          {/* Onglets de mode */}
          <div style={{
            display: "flex",
            background: C.bg,
            borderRadius: 10,
            padding: 3,
            gap: 2,
            flexWrap: "nowrap",
            justifyContent: "center",
            width: isMobile ? "auto" : "100%",
            maxWidth: isMobile ? 220 : 360,
            marginLeft: "auto",
            flex: isMobile ? "0 0 auto" : 1,
          }}>
            {GEN_MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => { setMode(m.id); setError(""); }}
                  title={m.hint}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: isMobile ? "7px 10px" : "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontSize: isMobile ? 11.5 : 12.5, fontWeight: 700,
                    background: active ? C.white : "transparent",
                    color: active ? C.navy : C.muted,
                    boxShadow: active ? "0 1px 3px rgba(26, 37, 58, 0.08)" : "none",
                    transition: "all 0.15s ease",
                    flex: "1 1 0",
                    justifyContent: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon size={14} /> {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Corps */}
      <div className="ai-visual-modal-body" style={{ maxWidth: 1080, height: "calc(100% - 78px)", margin: "0 auto", padding: isMobile ? "16px 12px 100px" : "24px 20px 100px", overflowY: "auto" }}>
        {mode === "image" ? (
          <ImagePanel
            prompt={prompt} setPrompt={setPrompt}
            styleId={styleId} setStyleId={setStyleId}
            aspectId={aspectId} setAspectId={setAspectId}
            count={count} setCount={setCount}
            images={images} selectedIdx={selectedIdx} setSelectedIdx={setSelectedIdx}
            isGenerating={isGenerating} onGenerate={handleGenerateImage}
            error={error}
            isMobile={isMobile}
          />
        ) : (
          <ArticlePanel
            topic={topic} setTopic={setTopic}
            tone={tone} setTone={setTone}
            length={length} setLength={setLength}
            format={format} setFormat={setFormat}
            article={article} isGenerating={isGenerating}
            onGenerate={handleGenerateArticle}
            error={error}
            isMobile={isMobile}
            articleImages={articleImages}
            setArticleImages={setArticleImages}
            fileInputRef={fileInputRef}
            presentation={presentation}
            setPresentation={setPresentation}
          />
        )}

        {/* Légende pour le mode image */}
        {mode === "image" && images.length > 0 && (
          <div style={{
            marginTop: 16, background: C.white, border: `1px solid ${C.line}`,
            borderRadius: 16, padding: 16, maxWidth: "100%",
          }}>
            <SectionLabel icon={Eye}>Légende (optionnel)</SectionLabel>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ajoutez une description, un contexte ou des hashtags..."
              rows={2}
              style={{
                width: "100%", padding: "10px 12px", border: `1.5px solid ${C.line}`,
                borderRadius: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical",
                color: C.ink, background: C.white, outline: "none", lineHeight: 1.5,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = C.gold)}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.line)}
            />
            <div style={{ fontSize: 11, color: C.mutedLight, marginTop: 6 }}>
              Si vide, le prompt sera utilisé comme légende.
            </div>
          </div>
        )}
      </div>

      {/* Barre d'action collante */}
      <div className="ai-visual-modal-footer" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, width: "100vw", boxSizing: "border-box", background: C.white,
        borderTop: `1px solid ${C.line}`, zIndex: 5, boxShadow: "0 -2px 8px rgba(26, 37, 58, 0.05)",
      }}>
        <div style={{
          maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between", gap: 12, padding: isMobile ? "12px 14px" : "14px 20px",
          flexDirection: isMobile ? "column" : "row",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: C.muted, justifyContent: isMobile ? "center" : "flex-start", textAlign: isMobile ? "center" : "left" }}>
            {canPublish ? (
              <>
                <CheckCircle2 size={15} color={C.gold} />
                <span>{statusText}</span>
              </>
            ) : (
              <>
                <Zap size={15} color={C.mutedLight} />
                <span>{statusText}</span>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row", width: isMobile ? "100%" : "auto" }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 18px", borderRadius: 999, border: `1.5px solid ${C.line}`,
                background: C.white, color: C.ink, fontSize: 13, fontWeight: 600, cursor: "pointer",
                width: isMobile ? "100%" : "auto",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handlePublish}
              disabled={!canPublish}
              style={{
                padding: "9px 22px", borderRadius: 999, border: "none",
                cursor: !canPublish ? "not-allowed" : "pointer",
                background: !canPublish ? C.mutedLight : C.navy, color: "white",
                fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7,
                boxShadow: !canPublish ? "none" : "0 4px 12px rgba(26, 37, 58, 0.25)",
                width: isMobile ? "100%" : "auto",
                justifyContent: "center",
              }}
            >
              <Send size={14} /> {publishLabel}
            </button>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .ai-visual-modal { top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important; width: 100vw !important; height: 100dvh !important; max-height: 100dvh !important; border-radius: 0 !important; overflow: hidden !important; } .ai-visual-modal-header { flex-shrink: 0; } .ai-visual-modal-body { width: 100% !important; max-width: none !important; height: calc(100% - 74px) !important; margin: 0 !important; overflow-y: auto !important; padding: 12px 12px calc(86px + env(safe-area-inset-bottom)) !important; box-sizing: border-box !important; } .ai-visual-modal-body > div > div { border: 0 !important; border-radius: 0 !important; background: transparent !important; padding: 0 !important; } .ai-visual-modal-footer { bottom: 0 !important; padding-bottom: env(safe-area-inset-bottom) !important; } .ai-visual-modal-footer > div { width: 100% !important; min-height: 54px; flex-direction: row !important; align-items: center !important; padding: 6px 10px !important; } .ai-visual-modal-footer > div > div:first-child { display: none !important; } .ai-visual-modal-footer > div > div:last-child { display: flex !important; flex: 1; min-width: 0; justify-content: center !important; flex-direction: row !important; width: 100% !important; gap: 10px !important; } .ai-visual-modal-footer button { flex: 0 1 44% !important; max-width: 150px; min-width: 0; width: auto !important; min-height: 38px; padding: 7px 6px !important; font-size: 11px !important; gap: 4px !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .ai-visual-modal-footer button svg { width: 13px; height: 13px; } }`}</style>
    </div>
  );
}
