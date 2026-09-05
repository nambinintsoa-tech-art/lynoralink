# Deploiement Vercel et Koyeb

## Frontend Vercel

Creer un projet Vercel depuis le depot GitHub `nambinintsoa-tech-art/lynoralink`.

- Root Directory: `/`
- Framework: Next.js
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: laisser la valeur par defaut

Variables a definir dans Vercel avant le premier build:

```env
NODE_ENV=production
DATABASE_URL=...
DIRECT_URL=...
NEXTAUTH_URL=https://<domaine-vercel>
APP_URL=https://<domaine-vercel>
NEXTAUTH_SECRET=...
NEXT_PUBLIC_BACKEND_URL=https://<domaine-koyeb>
ADMIN_EMAIL=...
NEXT_PUBLIC_ADMIN_EMAIL=...
```

Ajouter egalement les variables utilisees par les fonctions actives: Cloudinary, Resend ou SMTP, Stripe, PayPal, LiveKit, Web Push et le fournisseur IA.

Les variables `NEXT_PUBLIC_*` doivent etre presentes avant le build Vercel.

## Backend Koyeb

Creer un service Koyeb depuis le meme depot GitHub.

- Branch: `main`
- Builder: Dockerfile
- Dockerfile path: `backend/Dockerfile`
- Build context: racine du depot `/`
- Exposed port: utiliser la variable `PORT` fournie par Koyeb
- Health check path: `/v1/health`

Ne pas utiliser `cd backend && ...` dans les commandes Koyeb. Le Dockerfile contient deja la commande de demarrage.

Variables a definir dans Koyeb:

```env
NODE_ENV=production
DATABASE_URL=...
DIRECT_URL=...
NEXTAUTH_SECRET=...
FRONTEND_ORIGIN=https://<domaine-vercel>
APP_URL=https://<domaine-vercel>
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

Ajouter egalement les variables backend necessaires pour Prisma, Redis, Cloudinary, Stripe, PayPal, LiveKit, Web Push et l'IA.

Appliquer les migrations Prisma avant la premiere utilisation:

```text
npx prisma migrate deploy
```

Le domaine Koyeb doit ensuite etre utilise dans Vercel:

```env
NEXT_PUBLIC_BACKEND_URL=https://<domaine-koyeb>
```

## Verification

- Frontend: `https://<domaine-vercel>/api/health`
- Backend: `https://<domaine-koyeb>/v1/health`
- Inscription: `POST https://<domaine-koyeb>/v1/register`
