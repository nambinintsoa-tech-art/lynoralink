import { NextResponse } from "next/server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendTwoFactorCode } from "@/lib/emailVerification";

const CHALLENGE_KEY = "twoFactorChallenge";

export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}));
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail || !password) return NextResponse.json({ error: "Identifiants requis" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return NextResponse.json({ error: "Aucun compte trouvé pour cet email.", code: "user_not_found" }, { status: 401 });
  }
  if (!user.password) {
    return NextResponse.json({ error: "Ce compte utilise une connexion externe et ne peut pas être authentifié avec un mot de passe local.", code: "oauth_only" }, { status: 401 });
  }
  if (!user.emailVerified) {
    return NextResponse.json({ error: "Votre email n’a pas encore été vérifié. Vérifiez votre boîte mail ou demandez un nouveau code de confirmation.", code: "email_not_verified" }, { status: 401 });
  }
  if (user.status !== "active") {
    return NextResponse.json({ error: "Ce compte est inactif ou bloqué. Contactez le support pour réactiver l’accès.", code: "account_inactive" }, { status: 401 });
  }
  if (!(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect.", code: "invalid_password" }, { status: 401 });
  }

  const settings = await prisma.userSetting.findMany({ where: { userId: user.id, key: { in: ["twoFactor", CHALLENGE_KEY] } } });
  const enabled = settings.find((setting) => setting.key === "twoFactor")?.value === "true";
  if (!enabled) return NextResponse.json({ requiresTwoFactor: false });

  const hasMailProvider = Boolean(
    process.env.EMAIL_PROVIDER ||
    process.env.BREVO_API_KEY ||
    process.env.SMTP_HOST ||
    process.env.RESEND_API_KEY
  );

  if (process.env.NODE_ENV !== "production" && (!hasMailProvider || (!process.env.SMTP_HOST && !process.env.BREVO_API_KEY && !process.env.RESEND_API_KEY))) {
    return NextResponse.json({ requiresTwoFactor: false, warning: "2FA disabled in local mode without working email provider" });
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const challenge = JSON.stringify({ hash: crypto.createHash("sha256").update(code).digest("hex"), expiresAt: Date.now() + 10 * 60 * 1000 });
  await prisma.userSetting.upsert({
    where: { userId_key: { userId: user.id, key: CHALLENGE_KEY } },
    update: { value: challenge },
    create: { userId: user.id, key: CHALLENGE_KEY, value: challenge },
  });

  try {
    await sendTwoFactorCode(user.email, code);
  } catch {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ requiresTwoFactor: false, warning: "2FA disabled in local mode because email delivery failed" });
    }
    return NextResponse.json({ error: "Impossible d'envoyer le code de sécurité" }, { status: 503 });
  }
  return NextResponse.json({ requiresTwoFactor: true });
}
