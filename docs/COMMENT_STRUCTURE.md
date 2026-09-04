/**
 * STRUCTURE UNIFIÉE DES COMMENTAIRES - LynoraLink
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Ce document définit la structure unifiée des commentaires à travers toute
 * l'application LynoraLink (posts, réels, articles, groupes, etc.)
 * 
 * Version: 1.0
 * Date: 2026-09-01
 * Maintaineur: Système de commentaires centralisé
 */

// ─────────────────────────────────────────────────────────────────────────
// STRUCTURE DE BASE
// ─────────────────────────────────────────────────────────────────────────

interface Comment {
  // ── Identité ──────────────────────────────────────
  id: string;                      // Identifiant unique (local ou DB)
  author: string;                  // Nom de l'auteur
  initials: string;                // Initiales (ex: "JD")
  avatarUrl?: string;              // URL de l'avatar
  authorId?: string;               // ID utilisateur (optionnel pour démo)

  // ── Contenu ────────────────────────────────────────
  text: string;                    // Texte du commentaire
  media?: Array<{                  // Médias attachés (optionnel)
    url: string;
    type: "image" | "video";
    label?: string;
  }>;

  // ── Timing ─────────────────────────────────────────
  time: Date;                      // Timestamp complet (Date object)
  at: string;                      // Format relatif (ex: "il y a 5 minutes")

  // ── Réactions ──────────────────────────────────────
  likes: number;                   // Nombre total de réactions
  liked: boolean;                  // L'utilisateur a-t-il réagi?
  reaction?: string;               // Réaction actuelle de l'utilisateur
  reactionKeys?: string[];         // Types de réactions (ex: ["ok", "love"])

  // ── Threading (Réponses) ───────────────────────────
  replies?: Comment[];             // Réponses à ce commentaire
  parentId?: string;               // ID du commentaire parent

  // ── Métadonnées ────────────────────────────────────
  isOwn?: boolean;                 // Appartient à l'utilisateur actuel?
  depth?: number;                  // Profondeur dans le thread (0 = racine)
}

// ─────────────────────────────────────────────────────────────────────────
// EXEMPLES
// ─────────────────────────────────────────────────────────────────────────

// Exemple 1: Commentaire simple (Posts/Réels)
const exampleSimpleComment: Comment = {
  id: "comment-123",
  author: "Jean Dupont",
  initials: "JD",
  avatarUrl: "https://example.com/jean.jpg",
  authorId: "user-456",
  
  text: "C'est une excellente publication!",
  media: [],
  
  time: new Date("2026-09-01T14:30:00Z"),
  at: "il y a 2 heures",
  
  likes: 5,
  liked: true,
  reaction: "love",
  reactionKeys: ["love"],
  
  replies: [],
  isOwn: false,
  depth: 0,
};

// Exemple 2: Commentaire avec réponses (Threading)
const exampleThreadedComment: Comment = {
  id: "comment-123",
  author: "Jean Dupont",
  initials: "JD",
  avatarUrl: "https://example.com/jean.jpg",
  authorId: "user-456",
  text: "Comment faites-vous cela?",
  time: new Date("2026-09-01T14:30:00Z"),
  at: "il y a 2 heures",
  likes: 3,
  liked: false,
  replies: [
    {
      id: "reply-789",
      author: "Marie Martin",
      initials: "MM",
      avatarUrl: "https://example.com/marie.jpg",
      authorId: "user-789",
      text: "Voici comment on le fait...",
      time: new Date("2026-09-01T15:00:00Z"),
      at: "il y a 1 heure",
      likes: 1,
      liked: true,
      reaction: "ok",
      reactionKeys: ["ok"],
      parentId: "comment-123",
      depth: 1,
    },
  ],
};

// Exemple 3: Commentaire avec médias
const exampleMediaComment: Comment = {
  id: "comment-456",
  author: "Vous",
  initials: "VP",
  text: "Regardez cette image!",
  media: [
    {
      url: "https://example.com/image.jpg",
      type: "image",
      label: "Capture d'écran",
    },
  ],
  time: new Date(),
  at: "à l'instant",
  likes: 0,
  liked: false,
  replies: [],
  isOwn: true,
  depth: 0,
};

// ─────────────────────────────────────────────────────────────────────────
// DIFFÉRENCES AVEC LES ANCIENS FORMATS
// ─────────────────────────────────────────────────────────────────────────

/*
ANCIENNE STRUCTURE (Réels):
{
  id: string,
  author: string,
  text: string,
  at: string,
}
❌ Pas d'initiales, avatarUrl, authorId
❌ Pas de support pour les médias
❌ Pas de support pour les réactions
❌ Pas de support pour les réponses
❌ `at` was a simple string, pas un Date object


NOUVELLE STRUCTURE (Unifiée):
✅ Support complet des métadonnées utilisateur
✅ Support optionnel des médias
✅ Support pour les réactions
✅ Support pour le threading (réponses)
✅ `time` est un Date object, `at` est le format relatif
*/

// ─────────────────────────────────────────────────────────────────────────
// UTILISATION
// ─────────────────────────────────────────────────────────────────────────

/*
NORMALISATION DE COMMENTAIRES:

import { normalizeComment, normalizeComments } from "@/lib/commentNormalizer";

// Convertir un commentaire brut
const rawComment = { id: "123", author: "Jean", text: "Bien!" };
const normalized = normalizeComment(rawComment);

// Convertir un tableau de commentaires
const comments = [{ ... }, { ... }];
const normalized = normalizeComments(comments);

COMPTAGE DE COMMENTAIRES:

import { countTotalComments } from "@/lib/commentNormalizer";

const total = countTotalComments(comments); // Inclut les réponses


VALIDATION:

import { isValidComment } from "@/lib/commentNormalizer";

if (isValidComment(comment)) {
  // Le commentaire a du contenu
}
*/

// ─────────────────────────────────────────────────────────────────────────
// RÈGLES DE COHÉRENCE
// ─────────────────────────────────────────────────────────────────────────

const CONSISTENCY_RULES = {
  // Tous les commentaires DOIVENT avoir ces champs
  REQUIRED: [
    "id",
    "author",
    "text",
    "time",
    "at",
    "likes",
  ],

  // Ces champs PEUVENT être null/undefined
  OPTIONAL: [
    "authorId",
    "avatarUrl",
    "media",
    "reaction",
    "parentId",
    "replies",
  ],

  // Formats attendus
  FORMATS: {
    id: "string (unique)",
    author: "string (non-vide)",
    text: "string (contenu du commentaire)",
    time: "Date object (ISO ou Date())",
    at: "string (format relatif en français)",
    likes: "number (>= 0)",
    liked: "boolean",
    media: "Array<{url: string, type: 'image'|'video', label?: string}>",
    replies: "Array<Comment>",
    depth: "number (0 pour racine)",
  },

  // Conventions de nommage
  NAMING: {
    commentThreads: "Map of reel/post ID => Comment[] (dans Reel.jsx)",
    localComments: "État local des commentaires (dans PostCard.jsx)",
    commentDraft: "Brouillon de commentaire en cours de saisie",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// MIGRATION
// ─────────────────────────────────────────────────────────────────────────

const MIGRATION_CHECKLIST = {
  "Importer normalizeComment": "✅ Fait dans Reel.jsx",
  "Remplacer submitComment": "✅ Fait dans Reel.jsx",
  "Mettre à jour l'affichage": "✅ Fait dans Reel.jsx",
  "Ajouter support pour replies": "✅ Fait dans Reel.jsx",
  "Ajouter support pour media": "✅ Fait dans Reel.jsx",
  "Tester cohérence PostCard": "⏳ À faire",
  "Tester cohérence Reel": "⏳ À faire",
  "Documenter dans README": "⏳ À faire",
};

// ─────────────────────────────────────────────────────────────────────────
// FICHIERS AFFECTÉS
// ─────────────────────────────────────────────────────────────────────────

const FILES_UPDATED = [
  "src/lib/commentNormalizer.js (nouveau fichier)",
  "src/components/Reel.jsx (submitComment, affichage)",
  "docs/COMMENT_STRUCTURE.md (cette documentation)",
];

const FILES_COMPATIBLE = [
  "src/components/PostCard.jsx (pas de changement, déjà compatible)",
  "src/components/ArticleViewerPreview.jsx (compatible)",
  "src/components/Groupe.jsx (compatible)",
];
