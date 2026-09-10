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
  if (!user?.password || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
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
