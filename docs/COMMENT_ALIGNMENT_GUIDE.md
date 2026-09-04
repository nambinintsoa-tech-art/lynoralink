/**
 * GUIDE D'IMPLÉMENTATION - Commentaires unifiés dans LynoraLink
 * ═══════════════════════════════════════════════════════════════════════════
 */

# Alignement de la logique des commentaires

## 🎯 Objectif

Assurer une cohérence structurelle et fonctionnelle des commentaires à travers
tous les modules de l'application (Posts, Réels, Articles, Groupes, etc.).

## 📋 Changements implémentés

### 1. Création d'un utilitaire centralisé (`commentNormalizer.js`)

**Fonctions disponibles:**
- `normalizeComment(rawComment, options)` - Normalise un commentaire unique
- `normalizeComments(comments, options)` - Normalise un tableau de commentaires
- `normalizeCommentMedia(mediaData)` - Traite les médias de manière cohérente
- `countTotalComments(comments)` - Compte tous les commentaires + réponses
- `isValidComment(comment)` - Valide qu'un commentaire a du contenu
- `createEmptyComment(options)` - Crée un commentaire vide structuré
- `enrichCommentWithUser(comment, currentUser)` - Ajoute les données utilisateur

**Exemple d'utilisation:**
```javascript
import { normalizeComment } from "@/lib/commentNormalizer";

const rawComment = { 
  id: "123", 
  author: "Jean", 
  text: "Bien!",
  at: "5 minutes ago"
};

const normalized = normalizeComment(rawComment);
// Résultat:
// {
//   id: "123",
//   author: "Jean",
//   initials: "J",
//   avatarUrl: null,
//   text: "Bien!",
//   media: [],
//   time: Date(...),
//   at: "il y a 5 minutes",
//   likes: 0,
//   liked: false,
//   reaction: null,
//   reactionKeys: [],
//   replies: [],
//   parentId: null,
//   isOwn: false,
//   depth: 0
// }
```

### 2. Mise à jour du composant Reel.jsx

**Avant:**
```javascript
const newComment = { 
  id: `local-${Date.now()}`, 
  author: "Vous", 
  text: trimmed, 
  at: "à l'instant" 
};
```

**Après:**
```javascript
const newComment = normalizeComment({
  id: `local-${Date.now()}`,
  author: "Vous",
  text: trimmed,
  time: new Date(),
  media: [],
});
```

**Améliorations:**
✅ Support pour les médias
✅ Support pour les réponses (replies)
✅ Structure cohérente avec PostCard
✅ Timestamps Date objects
✅ Calcul automatique des initiales
✅ Support pour les réactions

### 3. Affichage amélioré des commentaires (Reel.jsx)

**Nouvelles capacités:**
- Affichage des médias attachés aux commentaires
- Compteur de réactions (❤️ avec nombre)
- Support pour les réponses imbriquées
- Hovers avec tooltips pour les timestamps complets

## 🔄 Flux de synchronisation

```
Utilisateur saisit -> submitComment() -> normalizeComment()
                           ↓
                    Stockage local
                    (commentThreads)
                           ↓
                    Affichage à l'écran
                    (map -> CommentItem)
```

## 📊 Comparaison avant/après

| Aspect | Avant | Après |
|--------|-------|-------|
| **Structure** | `{id, author, text, at}` | Complète avec média, réactions, etc. |
| **Médias** | ❌ Non supporté | ✅ Supporté |
| **Réponses** | ❌ Non supporté | ✅ Supporté |
| **Réactions** | ❌ Non supporté | ✅ Supporté |
| **Timestamps** | String simple | Date object + format relatif |
| **Initiales** | ❌ Manuelles | ✅ Calculées auto |
| **Cohérence Posts** | ⚠️ Différent | ✅ Identique |

## 🚀 Prochaines étapes recommandées

### Phase 2: API Persistence
```javascript
// Créer une route pour persister les commentaires réels en DB
POST /api/reels/[id]/comments
GET /api/reels/[id]/comments
DELETE /api/reels/[id]/comments/[commentId]
```

### Phase 3: Réactions complètes
```javascript
// Implémenter les réactions aux commentaires
POST /api/reels/[id]/comments/[commentId]/reactions
DELETE /api/reels/[id]/comments/[commentId]/reactions
```

### Phase 4: Réponses complètes
```javascript
// Support complet pour les réponses avec threading
POST /api/reels/[id]/comments/[commentId]/replies
GET /api/reels/[id]/comments?includeReplies=true
```

## ✅ Checklist de validation

### Pour les commentaires existants:
- [ ] Tous les commentaires ont un `id` unique
- [ ] Tous les commentaires ont un `text` non-vide
- [ ] Tous les commentaires ont un `time` Date object
- [ ] Le champ `at` affiche le format relatif correct
- [ ] Les initiales sont calculées correctement

### Pour les nouveaux commentaires:
- [ ] Utiliser `normalizeComment()` après création
- [ ] Inclure les média si présents
- [ ] Supporter les réponses via `replies`
- [ ] Afficher les réactions si présentes

### Pour les composants:
- [ ] PostCard.jsx ✅ Déjà compatible
- [ ] Reel.jsx ✅ Mis à jour
- [ ] ArticleViewerPreview.jsx - À vérifier
- [ ] Groupe.jsx - À vérifier
- [ ] CompanyPage.jsx - À vérifier

## 🔗 Fichiers de référence

- **Utilitaires:** `src/lib/commentNormalizer.js`
- **Structure:** `docs/COMMENT_STRUCTURE.md`
- **Composants mis à jour:**
  - `src/components/Reel.jsx` (ligne 637-650)
  - `src/components/Reel.jsx` (ligne 707-745)
- **API Posts:** `src/app/api/posts/[id]/comments/route.js`
- **API Réels:** `src/app/api/reels/[id]` (à implémenter)

## 🎓 Principes de conception

1. **Normalisation**: Tous les commentaires passent par `normalizeComment()`
2. **Cohérence**: Même structure pour tous les types de contenu
3. **Optionnalité**: Les champs avancés sont optionnels
4. **Rétro-compatibilité**: Accepte les anciens formats en entrée
5. **Typage**: Types TypeScript disponibles dans les commentaires JSDoc

## 💡 Conseils d'implémentation

**Toujours utiliser:**
```javascript
import { normalizeComment } from "@/lib/commentNormalizer";

// ✅ BON
const comment = normalizeComment(rawData);

// ❌ MAUVAIS (structure incohérente)
const comment = { id: "123", text: "..." };
```

**Pour compter les commentaires:**
```javascript
import { countTotalComments } from "@/lib/commentNormalizer";

// ✅ Compte aussi les réponses
const total = countTotalComments(comments);

// ❌ Oublie les réponses
const total = comments.length;
```

**Pour afficher l'heure:**
```javascript
// ✅ Affiche le format relatif
<span title={comment.time.toLocaleString()}>{comment.at}</span>

// ❌ Pas de contexte
<span>{comment.at}</span>
```

## 🐛 Dépannage

**Problème:** Les commentaires perdent leurs données après rechargement
**Solution:** Implémenter l'API de persistance (Phase 2)

**Problème:** Les initiales ne s'affichent pas correctement
**Solution:** Vérifier que `normalizeComment()` est appelé

**Problème:** Les réactions ne sont pas visibles
**Solution:** Ajouter les champs `reaction` et `likes` dans les données

---

**Dernière mise à jour:** 2026-09-01
**Auteur:** Système de commentaires centralisé
