import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { sendTwoFactorCode } from "@/lib/emailVerification";

const PASSWORD_CHANGE_CHALLENGE_KEY = "passwordChangeTwoFactorChallenge";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const { currentPassword, newPassword, otp } = body || {};

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "currentPassword et newPassword requis" }, { status: 400 });
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.password) {
    return NextResponse.json({ error: "Impossible de modifier le mot de passe d'un compte OAuth" }, { status: 400 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 401 });
  }

  const twoFactor = await prisma.userSetting.findUnique({ where: { userId_key: { userId: user.id, key: "twoFactor" } } });
  if (twoFactor?.value === "true") {
    const challengeSetting = await prisma.userSetting.findUnique({ where: { userId_key: { userId: user.id, key: PASSWORD_CHANGE_CHALLENGE_KEY } } });
    if (!otp) {
      const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
      const challenge = JSON.stringify({ hash: crypto.createHash("sha256").update(code).digest("hex"), expiresAt: Date.now() + 10 * 60 * 1000 });
      await prisma.userSetting.upsert({
        where: { userId_key: { userId: user.id, key: PASSWORD_CHANGE_CHALLENGE_KEY } },
        update: { value: challenge },
        create: { userId: user.id, key: PASSWORD_CHANGE_CHALLENGE_KEY, value: challenge },
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
    await prisma.userSetting.delete({ where: { userId_key: { userId: user.id, key: PASSWORD_CHANGE_CHALLENGE_KEY } } });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ ok: true });
}
