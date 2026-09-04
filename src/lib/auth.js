import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: SESSION_TTL_SECONDS,
  },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        otp: { label: "Code de sécurité", type: "text" },
        remember: { label: "Se souvenir de moi", type: "checkbox" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          console.warn("[auth] credentials rejected: unknown email");
          return null;
        }
        if (!user.password) {
          console.warn("[auth] credentials rejected: OAuth-only account");
          return null;
        }
        if (!user.emailVerified) {
          console.warn("[auth] credentials rejected: email not verified");
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          console.warn("[auth] credentials rejected: invalid password");
          return null;
        }

        if (user.status !== "active") {
          console.warn(`[auth] credentials rejected: account status is ${user.status}`);
          return null;
        }

        const twoFactor = await prisma.userSetting.findUnique({ where: { userId_key: { userId: user.id, key: "twoFactor" } } });
        if (twoFactor?.value === "true") {
          if (!credentials.otp) return null;
          const challengeSetting = await prisma.userSetting.findUnique({ where: { userId_key: { userId: user.id, key: "twoFactorChallenge" } } });
          let challenge;
          try { challenge = JSON.parse(challengeSetting?.value || "null"); } catch { challenge = null; }
          const codeHash = crypto.createHash("sha256").update(String(credentials.otp)).digest("hex");
          if (!challenge || challenge.expiresAt < Date.now() || challenge.hash !== codeHash) return null;
          await prisma.userSetting.delete({ where: { userId_key: { userId: user.id, key: "twoFactorChallenge" } } });
        }

        return {
          id: user.id,
          remember: credentials.remember === "true" || credentials.remember === true,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id || token.sub;
        token.sub = token.id || token.sub;
        token.remember = user.remember ?? true;
      }
      if (!token.id && token.sub) {
        token.id = token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const resolvedUserId = token.id || token.sub;
        session.user.id = resolvedUserId || session.user.id;

        if (!resolvedUserId) {
          return session;
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: resolvedUserId },
          select: { name: true, email: true, image: true, title: true, plan: true, status: true, createdAt: true },
        });
        if (!dbUser) {
          session.user.id = resolvedUserId;
          session.user.status = "deleted";
          session.user.deleted = true;
          return session;
        }
        session.user.id = resolvedUserId;
        session.user.name = dbUser.name;
        session.user.email = dbUser.email;
        session.user.image = dbUser.image;
        session.user.title = dbUser.title;
        session.user.plan = dbUser.plan;
        session.user.status = dbUser.status;
        session.user.deleted = false;
        session.user.createdAt = dbUser.createdAt;
      }
      return session;
    },
  },
};
