FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --include=dev
RUN npm --prefix backend ci --legacy-peer-deps

COPY backend ./backend

EXPOSE 4001
CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && npm --prefix backend start"]
