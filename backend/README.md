# LynoraLink Backend

Service API indépendant de l'interface Next.js.

## Démarrage

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

Le endpoint de vérification est disponible sur `http://localhost:4001/v1/health`.

## Règles de séparation

- Les secrets et l'accès PostgreSQL restent exclusivement dans ce service.
- Le frontend ne doit appeler que les routes HTTP versionnées sous `/v1`.
- `FRONTEND_ORIGIN` doit contenir uniquement l'origine publique du frontend.
- L'authentification et les permissions doivent être vérifiées côté backend avant le déplacement des routes métier.

La migration des domaines métier se fera progressivement, en commençant par les posts, puis les reels, messages, groupes et paiements.
