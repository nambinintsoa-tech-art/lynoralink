LYNORALINK
Application de réseau social professionnel

PRESENTATION

LynoraLink permet de créer un profil professionnel, développer son réseau, publier des contenus, échanger avec des membres et gérer une présence entreprise.

DOCUMENTATION COMPLETE

La documentation fonctionnelle et technique complète se trouve dans :
docs/DOCUMENTATION_COMPLETE.txt

INSTALLATION RAPIDE

Installer les dépendances :
npm install

Créer le fichier d’environnement frontend :
Copy-Item .env.example .env

Générer Prisma et préparer la base de données :
npx prisma generate
npm run db:migrate

Démarrer l’interface web :
npm run dev

L’application est disponible sur http://localhost:3000.

BACKEND

Le service backend indépendant se trouve dans le dossier backend.

Installation :
cd backend
npm install

Créer le fichier d’environnement backend :
Copy-Item .env.example .env

Démarrer le service :
npm run dev

Le contrôle de santé est disponible sur http://localhost:4001/v1/health.

APPLICATION ANDROID

L’application Android utilise Capacitor. Android Studio est nécessaire pour compiler et lancer le projet.

Depuis la racine du projet :
npm install
npm run mobile:add:android
npm run mobile:sync
npm run mobile:open:android

Une URL différente peut être utilisée en développement avec CAPACITOR_SERVER_URL.

COMMANDES PRINCIPALES

Démarrer le frontend :
npm run dev

Démarrer le backend :
npm run backend:dev

Construire le frontend :
npm run build

Démarrer la version compilée :
npm run start

Lancer les tests de sécurité :
npm run test:security

Ouvrir Prisma Studio :
npm run db:studio

SECURITE

Ne jamais publier les fichiers .env, les clés privées, les identifiants de paiement ou les comptes de service. Les variables secrètes doivent rester côté serveur.
