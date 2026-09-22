LYNORALINK BACKEND
Service API indépendant de l’interface Next.js

ROLE DU SERVICE

Le backend fournit les routes HTTP versionnées sous le préfixe /v1. Il gère les traitements métier, les accès PostgreSQL, l’authentification serveur, les permissions, les notifications, les appels et les intégrations externes.

INSTALLATION

Depuis la racine du projet :
cd backend
npm install

Créer le fichier d’environnement backend :
Copy-Item .env.example .env

Renseigner ensuite les variables nécessaires dans backend/.env.

DEVELOPPEMENT

npm run dev

Le service écoute par défaut sur le port 4001.

Le contrôle de santé est disponible sur :
http://localhost:4001/v1/health

PRODUCTION

npm run start

Le démarrage de production génère le client Prisma à partir du schéma situé dans ../prisma/schema.prisma avant de lancer le serveur.

REGLES DE SEPARATION

Les secrets et l’accès PostgreSQL restent exclusivement côté backend.

Le frontend utilise uniquement les routes HTTP versionnées sous /v1 pour les fonctionnalités déléguées au service.

FRONTEND_ORIGIN doit contenir uniquement l’origine publique du frontend, sans chemin supplémentaire.

L’authentification et les permissions doivent être vérifiées côté backend avant toute opération métier.

Les domaines métier sont migrés progressivement, notamment les publications, reels, messages, groupes et paiements.

SECURITE

Ne jamais publier backend/.env, les secrets PostgreSQL, les clés API, les certificats ou les identifiants de fournisseurs externes.
