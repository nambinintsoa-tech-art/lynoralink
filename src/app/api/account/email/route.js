import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { sendTwoFactorCode, sendVerificationEmail } from "@/lib/emailVerification";

const EMAIL_CHANGE_CHALLENGE_KEY = "emailChangeTwoFactorChallenge";

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { email, currentPassword, otp } = await req.json().catch(() => ({}));
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || !currentPassword) {
    return NextResponse.json({ error: "Nouvel e-mail et mot de passe requis" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.password) {
    return NextResponse.json({ error: "Impossible de modifier l'e-mail d'un compte OAuth" }, { status: 400 });
  }
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  const twoFactor = await prisma.userSetting.findUnique({ where: { userId_key: { userId: user.id, key: "twoFactor" } } });
  if (twoFactor?.value === "true") {
    const challengeSetting = await prisma.userSetting.findUnique({ where: { userId_key: { userId: user.id, key: EMAIL_CHANGE_CHALLENGE_KEY } } });
    if (!otp) {
      const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
      const challenge = JSON.stringify({ hash: crypto.createHash("sha256").update(code).digest("hex"), expiresAt: Date.now() + 10 * 60 * 1000 });
      await prisma.userSetting.upsert({
        where: { userId_key: { userId: user.id, key: EMAIL_CHANGE_CHALLENGE_KEY } },
        update: { value: challenge },
        create: { userId: user.id, key: EMAIL_CHANGE_CHALLENGE_KEY, value: challenge },
      });
      try {
        await sendTwoFactorCode(user.email, code);
      } catch {
        return NextResponse.json({ error: "Impossible d'envoyer le code de sécurité" }, { status: 503 });
      }
      return NextResponse.json({ requiresTwoFactor: true });
    }

    const codeHash = crypto.createHash("sha256").update(String(otp)).digest("hex");
    let challenge;
    try { challenge = JSON.parse(challengeSetting?.value || "null"); } catch { challenge = null; }
    if (!challenge || challenge.expiresAt < Date.now() || challenge.hash !== codeHash) {
      return NextResponse.json({ error: "Code de sécurité invalide ou expiré" }, { status: 401 });
    }
    await prisma.userSetting.delete({ where: { userId_key: { userId: user.id, key: EMAIL_CHANGE_CHALLENGE_KEY } } });
  }
  if (normalizedEmail === user.email.toLowerCase()) {
    return NextResponse.json({ error: "Cet e-mail est déjà utilisé" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail" }, { status: 409 });
  }

  const pendingToken = crypto.randomBytes(32).toString("hex");
  const key = JSON.stringify({ type: "email-change", userId: user.id, email: normalizedEmail });
  const expiryDate = new Date(Date.now() + 1000 * 60 * 60 * 24);

  try {
    await prisma.verificationToken.create({
      data: {
        identifier: key,
        token: pendingToken,
        expires: expiryDate,
      },
    });
  } catch (error) {
    console.error("Failed to create verification token for email change:", error);
    return NextResponse.json({ error: "Impossible de créer la demande de confirmation" }, { status: 500 });
  }

  try {
    await sendVerificationEmail(normalizedEmail, pendingToken);
  } catch (error) {
    console.error("Failed to send email confirmation for email change:", error);
    await prisma.verificationToken.deleteMany({ where: { token: pendingToken } }).catch(() => {});
    return NextResponse.json({ error: "Impossible d'envoyer le lien de confirmation à ce nouvel e-mail" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, pendingVerification: true, email: normalizedEmail });
}
