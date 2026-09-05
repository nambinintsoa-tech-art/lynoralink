# Deploiement Netlify et Render

## Frontend Netlify

Creer un site Netlify depuis le depot GitHub `nambinintsoa-tech-art/lynoralink`.

- Branch: `main`
- Base directory: `/`
- Build command: `npm run build`
- Publish directory: `.next`
- Node version: `20`

Le fichier `netlify.toml` et le plugin `@netlify/plugin-nextjs` configurent le rendu SSR Next.js et les routes `/api`.

Variables Netlify a definir avant le premier build:

```env
NODE_ENV=production
DATABASE_URL=...
DIRECT_URL=...
NEXTAUTH_URL=https://<domaine-netlify>
APP_URL=https://<domaine-netlify>
NEXTAUTH_SECRET=...
NEXT_PUBLIC_BACKEND_URL=https://<domaine-render>
ADMIN_EMAIL=...
NEXT_PUBLIC_ADMIN_EMAIL=...
```

Ajouter egalement les variables utilisees par les fonctions actives: Cloudinary, Resend ou SMTP, Stripe, PayPal, LiveKit, Web Push et le fournisseur IA.

Les variables `NEXT_PUBLIC_*` doivent etre definies avant le build Netlify.

## Backend Render

Creer un Web Service Render depuis le meme depot GitHub.

- Branch: `main`
- Runtime: Docker
- Dockerfile path: `backend/Dockerfile`
- Docker context: `/`
- Health check path: `/v1/health`
- Region: la meme region que Netlify si possible

Le fichier `render.yaml` peut etre utilise comme Blueprint. Ne pas utiliser `cd backend && ...`; le Dockerfile contient deja la commande de demarrage.

Render fournit la variable `PORT`. Le backend l'utilise automatiquement. Ne pas forcer un port fixe dans la commande de demarrage.

Variables Render:

```env
NODE_ENV=production
DATABASE_URL=...
DIRECT_URL=...
NEXTAUTH_SECRET=...
FRONTEND_ORIGIN=https://<domaine-netlify>
APP_URL=https://<domaine-netlify>
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

Ajouter aussi les variables backend necessaires pour Redis, Cloudinary, Stripe, PayPal, LiveKit, Web Push et l'IA.

Appliquer les migrations Prisma avant la premiere utilisation avec un Shell Render ou une commande de release:

```text
npx prisma migrate deploy --schema prisma/schema.prisma
```

Une fois le domaine Render obtenu, le mettre dans Netlify:

```env
NEXT_PUBLIC_BACKEND_URL=https://<domaine-render>
```

Puis redeployer Netlify, car cette variable est integree au bundle pendant `next build`.

## Verification

- Frontend: `https://<domaine-netlify>/api/health`
- Backend: `https://<domaine-render>/v1/health`
- Inscription: `POST https://<domaine-render>/v1/register`
