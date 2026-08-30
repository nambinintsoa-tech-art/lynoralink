import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * EmojiPicker
 * -----------
 * Sélecteur d'emoji riche : recherche par nom, catégories avec icônes,
 * tons de peau, historique des emojis récents, navigation clavier complète
 * et prise en charge du thème clair / sombre.
 */

// -- Données -----------------------------------------------------------

const SKIN_TONES = [
  { modifier: "", label: "Défaut", swatch: "#F4C46B" },
  { modifier: "\u{1F3FB}", label: "Clair", swatch: "#F5D7B0" },
  { modifier: "\u{1F3FC}", label: "Clair moyen", swatch: "#E3BA8C" },
  { modifier: "\u{1F3FD}", label: "Moyen", swatch: "#C68F5F" },
  { modifier: "\u{1F3FE}", label: "Moyen foncé", swatch: "#9C6A3E" },
  { modifier: "\u{1F3FF}", label: "Foncé", swatch: "#6B4226" },
];

// Emojis qui acceptent un modificateur de ton de peau (base sans modificateur)
const TONE_COMPATIBLE = new Set([
  "👍", "👎", "👌", "✌️", "🤝", "🙏", "👏", "💪", "🤞", "🤟", "🤘", "🤙",
  "👋", "🤚", "🖐️", "✋", "🖖", "👊", "✊", "🤛", "🤜", "🫶", "👐", "🙌",
]);

const DEFAULT_CATEGORIES = [
  {
    key: "recent",
    label: "Récents",
    icon: "🕒",
    emojis: [],
  },
  {
    key: "smileys",
    label: "Smileys",
    icon: "😀",
    emojis: [
      { emoji: "😀", name: "visage souriant" },
      { emoji: "😃", name: "visage souriant yeux ouverts" },
      { emoji: "😄", name: "visage souriant yeux plissés" },
      { emoji: "😁", name: "visage radieux" },
      { emoji: "😆", name: "visage riant" },
      { emoji: "😅", name: "visage rieur soulagé" },
      { emoji: "😂", name: "visage pleurant de rire" },
      { emoji: "🤣", name: "mort de rire" },
      { emoji: "😊", name: "visage souriant yeux rieurs" },
      { emoji: "😇", name: "visage angélique innocent" },
      { emoji: "🙂", name: "léger sourire" },
      { emoji: "🙃", name: "visage à l'envers" },
      { emoji: "😉", name: "clin d'œil" },
      { emoji: "😌", name: "visage soulagé" },
      { emoji: "😍", name: "yeux en cœur amoureux" },
      { emoji: "🥰", name: "visage souriant entouré de cœurs" },
      { emoji: "😘", name: "bisou cœur" },
      { emoji: "😗", name: "visage qui embrasse" },
      { emoji: "😙", name: "bisou yeux souriants" },
      { emoji: "😚", name: "bisou yeux fermés" },
      { emoji: "😋", name: "visage gourmand miam" },
      { emoji: "😛", name: "langue tirée" },
      { emoji: "🤪", name: "visage loufoque fou" },
      { emoji: "😜", name: "clin d'œil langue tirée" },
      { emoji: "🤔", name: "visage pensif réflexion" },
      { emoji: "🥲", name: "sourire larme" },
      { emoji: "😴", name: "visage endormi" },
      { emoji: "🤯", name: "tête qui explose" },
      { emoji: "😎", name: "lunettes de soleil cool" },
      { emoji: "🥳", name: "visage en fête chapeau" },
      { emoji: "😢", name: "visage qui pleure triste" },
      { emoji: "😭", name: "pleurs sanglots" },
      { emoji: "😡", name: "visage en colère fâché" },
      { emoji: "🥺", name: "visage suppliant implorant" },
    ],
  },
  {
    key: "hands",
    label: "Mains",
    icon: "👋",
    emojis: [
      { emoji: "👍", name: "pouce levé bravo ok" },
      { emoji: "👎", name: "pouce baissé" },
      { emoji: "👌", name: "ok parfait" },
      { emoji: "✌️", name: "victoire paix" },
      { emoji: "🤝", name: "poignée de main accord" },
      { emoji: "🙏", name: "prière merci sil te plait" },
      { emoji: "👏", name: "applaudissements bravo" },
      { emoji: "🤗", name: "câlin accolade" },
      { emoji: "🫶", name: "cœur avec les mains" },
      { emoji: "💪", name: "muscle force courage" },
      { emoji: "🤞", name: "doigts croisés chance" },
      { emoji: "🤟", name: "je t'aime signe" },
      { emoji: "🤘", name: "corne rock" },
      { emoji: "🤙", name: "appelle moi" },
      { emoji: "👋", name: "au revoir salut bonjour" },
      { emoji: "✋", name: "main levée stop" },
      { emoji: "👊", name: "poing check" },
      { emoji: "🙌", name: "mains levées célébration" },
    ],
  },
  {
    key: "hearts",
    label: "Cœurs",
    icon: "❤️",
    emojis: [
      { emoji: "❤️", name: "cœur rouge amour" },
      { emoji: "🧡", name: "cœur orange" },
      { emoji: "💛", name: "cœur jaune" },
      { emoji: "💚", name: "cœur vert" },
      { emoji: "💙", name: "cœur bleu" },
      { emoji: "💜", name: "cœur violet" },
      { emoji: "🖤", name: "cœur noir" },
      { emoji: "🤍", name: "cœur blanc" },
      { emoji: "🤎", name: "cœur marron" },
      { emoji: "💔", name: "cœur brisé rupture" },
      { emoji: "❣️", name: "point d'exclamation cœur" },
      { emoji: "💕", name: "deux cœurs" },
      { emoji: "💞", name: "cœurs tournoyants" },
      { emoji: "💗", name: "cœur qui grandit" },
      { emoji: "💓", name: "cœur battant" },
      { emoji: "💖", name: "cœur scintillant" },
      { emoji: "💘", name: "cœur flèche cupidon" },
      { emoji: "💝", name: "cœur cadeau" },
    ],
  },
  {
    key: "celebrate",
    label: "Célébrer",
    icon: "🎉",
    emojis: [
      { emoji: "🎉", name: "confettis fête félicitations" },
      { emoji: "🎊", name: "boule de confettis" },
      { emoji: "🎈", name: "ballon anniversaire" },
      { emoji: "🎂", name: "gâteau anniversaire" },
      { emoji: "🥳", name: "visage en fête" },
      { emoji: "🎁", name: "cadeau" },
      { emoji: "🎀", name: "ruban" },
      { emoji: "🍾", name: "champagne bouchon" },
      { emoji: "✨", name: "étincelles brillant" },
      { emoji: "🔥", name: "feu top génial" },
      { emoji: "💡", name: "ampoule idée" },
      { emoji: "🌟", name: "étoile brillante" },
      { emoji: "🏆", name: "trophée victoire" },
      { emoji: "🥇", name: "médaille d'or" },
    ],
  },
  {
    key: "animals",
    label: "Animaux",
    icon: "🐶",
    emojis: [
      { emoji: "🐶", name: "chien" },
      { emoji: "🐱", name: "chat" },
      { emoji: "🐭", name: "souris" },
      { emoji: "🐹", name: "hamster" },
      { emoji: "🐰", name: "lapin" },
      { emoji: "🦊", name: "renard" },
      { emoji: "🐻", name: "ours" },
      { emoji: "🐼", name: "panda" },
      { emoji: "🐨", name: "koala" },
      { emoji: "🐯", name: "tigre" },
      { emoji: "🦁", name: "lion" },
      { emoji: "🐮", name: "vache" },
      { emoji: "🐷", name: "cochon" },
      { emoji: "🐸", name: "grenouille" },
      { emoji: "🐵", name: "singe" },
    ],
  },
  {
    key: "objects",
    label: "Objets",
    icon: "💻",
    emojis: [
      { emoji: "💻", name: "ordinateur portable" },
      { emoji: "📱", name: "téléphone mobile" },
      { emoji: "⌚", name: "montre" },
      { emoji: "📷", name: "appareil photo" },
      { emoji: "🎧", name: "casque audio" },
      { emoji: "📚", name: "livres" },
      { emoji: "✏️", name: "crayon" },
      { emoji: "📌", name: "épingle" },
      { emoji: "🔒", name: "cadenas verrouillé" },
      { emoji: "⏰", name: "réveil" },
      { emoji: "☕", name: "café" },
      { emoji: "💰", name: "argent sac" },
    ],
  },
];

const MAX_RECENT = 18;
const RECENT_KEY = "recent";

// -- Utilitaires ---------------------------------------------------------

function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function applySkinTone(emoji, modifier) {
  if (!modifier || !TONE_COMPATIBLE.has(emoji)) return emoji;
  // Retire le variation selector (️) avant d'insérer le modificateur de ton
  const base = emoji.replace(/\uFE0F/g, "");
  return base + modifier;
}

// -- Composant -------------------------------------------------------------

export default function EmojiPicker({
  categories: categoriesProp = DEFAULT_CATEGORIES,
  onSelect,
  value = null,
  size = 40,
  columns = 6,
  showSkinTones = true,
  showRecent = true,
  maxRecent = MAX_RECENT,
  className = "",
  buttonClassName = "",
  theme = "auto", // "light" | "dark" | "auto"
  autoFocus = false,
}) {
  const [selected, setSelected] = useState(value);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState([]);
  const [skinTone, setSkinTone] = useState(SKIN_TONES[0]);
  const [toneMenuOpen, setToneMenuOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  const searchInputRef = useRef(null);
  const gridButtonRefs = useRef([]);

  // Normalise l'entrée `categories` : accepte soit un tableau de catégories,
  // soit un simple tableau d'emojis (string ou {emoji, name}).
  const baseCategories = useMemo(() => {
    if (!Array.isArray(categoriesProp) || categoriesProp.length === 0) return [];
    const first = categoriesProp[0];
    if (typeof first === "string" || (first && first.emoji && !first.emojis)) {
      const list = categoriesProp.map((item) => (typeof item === "string" ? { emoji: item, name: item } : item));
      return [{ key: "all", label: "Tous", icon: "🙂", emojis: list }];
    }
    return categoriesProp;
  }, [categoriesProp]);

  const categories = useMemo(() => {
    if (!showRecent) return baseCategories.filter((c) => c.key !== RECENT_KEY);
    return baseCategories.map((c) => (c.key === RECENT_KEY ? { ...c, emojis: recent } : c));
  }, [baseCategories, recent, showRecent]);

  const [activeCategory, setActiveCategory] = useState(() => {
    const firstNonEmpty = categories.find((c) => c.key !== RECENT_KEY) || categories[0];
    return firstNonEmpty?.key || "";
  });

  const flattenedEmojis = useMemo(() => {
    const seen = new Set();
    const out = [];
    baseCategories.forEach((category) => {
      if (category.key === RECENT_KEY) return;
      category.emojis.forEach((item) => {
        if (!seen.has(item.emoji)) {
          seen.add(item.emoji);
          out.push({ ...item, category: category.label });
        }
      });
    });
    return out;
  }, [baseCategories]);

  const normalizedQuery = normalize(query.trim());

  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return flattenedEmojis.filter(
      ({ emoji, name }) => emoji === query.trim() || normalize(name || "").includes(normalizedQuery)
    );
  }, [flattenedEmojis, normalizedQuery, query]);

  const activeEmojis = useMemo(() => {
    const current = categories.find((c) => c.key === activeCategory) || categories[0];
    return current?.emojis || [];
  }, [activeCategory, categories]);

  const displayedEmojis = normalizedQuery ? searchResults : activeEmojis;

  useEffect(() => {
    setFocusIndex(0);
  }, [activeCategory, normalizedQuery]);

  useEffect(() => {
    if (autoFocus) searchInputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    gridButtonRefs.current = gridButtonRefs.current.slice(0, displayedEmojis.length);
  }, [displayedEmojis.length]);

  const handleSelect = useCallback(
    (item) => {
      const finalEmoji = applySkinTone(item.emoji, skinTone.modifier);
      setSelected(finalEmoji);
      if (showRecent) {
        setRecent((prev) => {
          const withoutDupe = prev.filter((p) => p.emoji !== item.emoji);
          return [{ emoji: item.emoji, name: item.name }, ...withoutDupe].slice(0, maxRecent);
        });
      }
      onSelect?.(finalEmoji, item);
    },
    [onSelect, showRecent, maxRecent, skinTone]
  );

  const handleGridKeyDown = (event) => {
    const count = displayedEmojis.length;
    if (count === 0) return;
    let next = focusIndex;
    if (event.key === "ArrowRight") next = Math.min(focusIndex + 1, count - 1);
    else if (event.key === "ArrowLeft") next = Math.max(focusIndex - 1, 0);
    else if (event.key === "ArrowDown") next = Math.min(focusIndex + columns, count - 1);
    else if (event.key === "ArrowUp") next = Math.max(focusIndex - columns, 0);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else return;
    event.preventDefault();
    setFocusIndex(next);
    gridButtonRefs.current[next]?.focus();
  };

  const emptyState = normalizedQuery && displayedEmojis.length === 0;
  const showingRecentEmpty = !normalizedQuery && activeCategory === RECENT_KEY && displayedEmojis.length === 0;

  return (
    <div className={`ep-root ep-theme-${theme} ${className}`} style={{ "--ep-size": `${size}px` }}>
      <style>{EMOJI_PICKER_STYLES}</style>

      <div className="ep-search-row">
        <svg className="ep-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <line x1="16.65" y1="16.65" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={searchInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un emoji…"
          aria-label="Rechercher un emoji"
          className="ep-search-input"
        />
        {query && (
          <button type="button" className="ep-clear-btn" onClick={() => setQuery("")} aria-label="Effacer la recherche">
            ✕
          </button>
        )}

        {showSkinTones && (
          <div className="ep-tone-wrap">
            <button
              type="button"
              className="ep-tone-trigger"
              style={{ background: skinTone.swatch }}
              onClick={() => setToneMenuOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={toneMenuOpen}
              aria-label={`Ton de peau : ${skinTone.label}`}
              title={`Ton de peau : ${skinTone.label}`}
            />
            {toneMenuOpen && (
              <div className="ep-tone-menu" role="listbox">
                {SKIN_TONES.map((tone) => (
                  <button
                    key={tone.label}
                    type="button"
                    role="option"
                    aria-selected={tone.label === skinTone.label}
                    className="ep-tone-option"
                    style={{ background: tone.swatch }}
                    title={tone.label}
                    onClick={() => {
                      setSkinTone(tone);
                      setToneMenuOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!normalizedQuery && (
        <div className="ep-tabs" role="tablist" aria-label="Catégories d'emojis">
          {categories.map((category) => (
            <button
              key={category.key}
              type="button"
              role="tab"
              aria-selected={activeCategory === category.key}
              onClick={() => setActiveCategory(category.key)}
              className={`ep-tab ${activeCategory === category.key ? "is-active" : ""}`}
              title={category.label}
            >
              <span className="ep-tab-icon" aria-hidden="true">
                {category.icon || "🙂"}
              </span>
              <span className="ep-tab-label">{category.label}</span>
            </button>
          ))}
        </div>
      )}

      <div
        className="ep-grid-scroll"
        role="grid"
        aria-label={normalizedQuery ? "Résultats de recherche" : "Emojis"}
        onKeyDown={handleGridKeyDown}
      >
        {emptyState && (
          <div className="ep-empty">
            <span className="ep-empty-emoji" aria-hidden="true">🔍</span>
            <p>Aucun emoji ne correspond à « {query.trim()} »</p>
          </div>
        )}

        {showingRecentEmpty && (
          <div className="ep-empty">
            <span className="ep-empty-emoji" aria-hidden="true">🕒</span>
            <p>Vos emojis récents apparaîtront ici</p>
          </div>
        )}

        {!emptyState && !showingRecentEmpty && (
          <div className="ep-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {displayedEmojis.map((item, index) => {
              const displayEmoji = applySkinTone(item.emoji, skinTone.modifier);
              const isActive = selected === displayEmoji || selected === item.emoji;
              const isToneable = showSkinTones && TONE_COMPATIBLE.has(item.emoji) && skinTone.modifier;
              return (
                <button
                  key={`${activeCategory}-${item.emoji}-${index}`}
                  ref={(el) => (gridButtonRefs.current[index] = el)}
                  type="button"
                  role="gridcell"
                  tabIndex={index === focusIndex ? 0 : -1}
                  className={`ep-emoji-btn ${buttonClassName} ${isActive ? "is-selected" : ""}`}
                  onClick={() => handleSelect(item)}
                  onFocus={() => setFocusIndex(index)}
                  aria-label={item.name || item.emoji}
                  title={item.name ? `${displayEmoji}  ${item.name}` : displayEmoji}
                >
                  {displayEmoji}
                  {isToneable && <span className="ep-tone-dot" style={{ background: skinTone.swatch }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// -- Styles ---------------------------------------------------------------

const EMOJI_PICKER_STYLES = `
.ep-root {
  --ep-bg: #ffffff;
  --ep-panel-bg: #F8FBFF;
  --ep-border: rgba(28,80,145,0.14);
  --ep-border-soft: rgba(227,234,241,0.9);
  --ep-text: #132433;
  --ep-text-muted: #5C7488;
  --ep-accent: #1B5386;
  --ep-accent-soft: #EFF4F9;
  --ep-selected-border: #D9A536;
  --ep-selected-bg: rgba(217,165,54,0.16);
  --ep-shadow: 0 20px 48px rgba(15,51,82,0.16);
  --ep-radius: 18px;

  width: 340px;
  max-width: 100%;
  background: var(--ep-bg);
  border: 1px solid var(--ep-border);
  border-radius: var(--ep-radius);
  box-shadow: var(--ep-shadow);
  overflow: hidden;
  backdrop-filter: blur(10px);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  box-sizing: border-box;
}
.ep-root * { box-sizing: border-box; }

@media (max-width: 560px) {
  .ep-root {
    width: min(300px, calc(100vw - 24px));
    max-width: calc(100vw - 24px);
    border-radius: 14px;
  }
  .ep-search-row {
    gap: 6px;
    padding: 8px;
  }
  .ep-search-input {
    min-height: 40px;
    font-size: 16px !important;
  }
  .ep-tabs {
    gap: 2px;
    padding: 6px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .ep-tab {
    min-width: 40px;
    min-height: 40px;
    justify-content: center;
    padding: 6px 8px;
  }
  .ep-tab-label { display: none; }
  .ep-grid-scroll {
    max-height: min(260px, 38dvh);
    overflow-y: auto;
    padding: 8px;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
  .ep-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    gap: 6px !important;
  }
  .ep-emoji-btn {
    width: 100% !important;
    min-width: 40px;
    min-height: 40px;
    height: auto !important;
    aspect-ratio: 1;
    border-radius: 10px;
  }
}

@media (prefers-color-scheme: dark) {
  .ep-theme-auto {
    --ep-bg: #15202B;
    --ep-panel-bg: #1C2A38;
    --ep-border: rgba(255,255,255,0.10);
    --ep-border-soft: rgba(255,255,255,0.08);
    --ep-text: #E7EEF5;
    --ep-text-muted: #8CA0B3;
    --ep-accent: #7FB8F0;
    --ep-accent-soft: rgba(127,184,240,0.14);
    --ep-selected-border: #D9A536;
    --ep-selected-bg: rgba(217,165,54,0.22);
    --ep-shadow: 0 20px 48px rgba(0,0,0,0.45);
  }
}
.ep-theme-dark {
  --ep-bg: #15202B;
  --ep-panel-bg: #1C2A38;
  --ep-border: rgba(255,255,255,0.10);
  --ep-border-soft: rgba(255,255,255,0.08);
  --ep-text: #E7EEF5;
  --ep-text-muted: #8CA0B3;
  --ep-accent: #7FB8F0;
  --ep-accent-soft: rgba(127,184,240,0.14);
  --ep-selected-border: #D9A536;
  --ep-selected-bg: rgba(217,165,54,0.22);
  --ep-shadow: 0 20px 48px rgba(0,0,0,0.45);
}

.ep-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 10px 8px;
  border-bottom: 1px solid var(--ep-border-soft);
}
.ep-search-icon { color: var(--ep-text-muted); flex: none; margin-left: 6px; }
.ep-search-input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--ep-border-soft);
  border-radius: 999px;
  padding: 8px 12px;
  outline: none;
  font-size: 13px;
  color: var(--ep-text);
  background: var(--ep-panel-bg);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.ep-search-input:focus-visible {
  border-color: var(--ep-accent);
  box-shadow: 0 0 0 3px var(--ep-accent-soft);
}
.ep-clear-btn {
  border: none;
  background: transparent;
  color: var(--ep-text-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 4px;
  border-radius: 999px;
  line-height: 1;
}
.ep-clear-btn:hover { background: var(--ep-accent-soft); color: var(--ep-accent); }

.ep-tone-wrap { position: relative; flex: none; }
.ep-tone-trigger {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 2px solid var(--ep-border-soft);
  cursor: pointer;
  padding: 0;
}
.ep-tone-trigger:hover { border-color: var(--ep-accent); }
.ep-tone-menu {
  position: absolute;
  top: 28px;
  right: 0;
  display: flex;
  gap: 5px;
  padding: 6px;
  background: var(--ep-bg);
  border: 1px solid var(--ep-border);
  border-radius: 999px;
  box-shadow: var(--ep-shadow);
  z-index: 10;
}
.ep-tone-option {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}
.ep-tone-option:hover, .ep-tone-option[aria-selected="true"] { border-color: var(--ep-accent); }

.ep-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 8px 6px;
  border-bottom: 1px solid var(--ep-border-soft);
  overflow-x: auto;
  scrollbar-width: thin;
}
.ep-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  border: none;
  border-radius: 999px;
  padding: 6px 10px;
  background: transparent;
  color: var(--ep-text-muted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}
.ep-tab:hover { background: var(--ep-accent-soft); }
.ep-tab.is-active { background: var(--ep-accent-soft); color: var(--ep-accent); font-weight: 700; }
.ep-tab-icon { font-size: 14px; line-height: 1; }

.ep-grid-scroll {
  max-height: 240px;
  overflow-y: auto;
  padding: 10px;
  scrollbar-width: thin;
}
.ep-grid {
  display: grid;
  gap: 6px;
}
.ep-emoji-btn {
  position: relative;
  width: var(--ep-size);
  height: var(--ep-size);
  border-radius: 12px;
  border: 1px solid transparent;
  background: var(--ep-panel-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: max(18px, calc(var(--ep-size) * 0.45));
  line-height: 1;
  transition: transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
  justify-self: center;
}
.ep-emoji-btn:hover { transform: translateY(-1px) scale(1.08); background: var(--ep-accent-soft); }
.ep-emoji-btn:focus-visible {
  outline: none;
  border-color: var(--ep-accent);
  box-shadow: 0 0 0 3px var(--ep-accent-soft);
}
.ep-emoji-btn.is-selected {
  border-color: var(--ep-selected-border);
  background: var(--ep-selected-bg);
}
.ep-tone-dot {
  position: absolute;
  bottom: 3px;
  right: 3px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  border: 1px solid var(--ep-bg);
}

.ep-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 28px 16px;
  color: var(--ep-text-muted);
  text-align: center;
}
.ep-empty-emoji { font-size: 26px; }
.ep-empty p { margin: 0; font-size: 13px; }

@media (prefers-reduced-motion: reduce) {
  .ep-emoji-btn, .ep-search-input, .ep-tab, .ep-clear-btn { transition: none; }
  .ep-emoji-btn:hover { transform: none; }
}
`;
