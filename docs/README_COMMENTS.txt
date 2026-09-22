LYNORALINK
INDEX DE LA DOCUMENTATION DES COMMENTAIRES

OBJECTIF

Cette documentation décrit la structure commune des commentaires utilisée par les posts, reels, articles, groupes et pages entreprise.

DOCUMENTS DISPONIBLES

COMMENT_ALIGNMENT_SUMMARY.txt
Résumé des changements, de l’état de la phase 1 et des prochaines étapes.

COMMENT_STRUCTURE.txt
Spécification des champs, des formats, des règles de validation et de la rétrocompatibilité.

COMMENT_ALIGNMENT_GUIDE.txt
Guide d’implémentation pour les développeurs frontend et backend.

COMMENT_USAGE_EXAMPLES.txt
Exemples de création, affichage, normalisation, réactions et réponses.

DOCUMENT DE REFERENCE

src/lib/commentNormalizer.js

Ce fichier contient la logique centrale. Tout nouveau composant doit utiliser ses fonctions plutôt que construire directement un objet commentaire partiel.

PARCOURS RECOMMANDE

Pour comprendre la fonctionnalité, commencer par COMMENT_ALIGNMENT_SUMMARY.txt.

Pour connaître la structure exacte, consulter COMMENT_STRUCTURE.txt.

Pour développer une nouvelle fonctionnalité, suivre COMMENT_ALIGNMENT_GUIDE.txt.

Pour intégrer le système dans un composant, consulter COMMENT_USAGE_EXAMPLES.txt.

ETAT ACTUEL

La phase 1 de normalisation est terminée pour les posts et les reels.

La persistance complète des commentaires de reels, les réactions persistées et le threading avancé restent des évolutions recommandées.

REGLE D’ARCHITECTURE

Les commentaires entrants et sortants doivent utiliser une structure cohérente, être validés côté serveur et être normalisés avant affichage.
