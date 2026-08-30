import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/emailVerification";

const RESET_IDENTIFIER = "password-reset:";

export async function POST(req) {
  const { email } = await req.json().catch(() => ({}));
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const genericResponse = NextResponse.json({
    ok: true,
    message: "Si un compte correspond à cette adresse, un lien de réinitialisation a été envoyé.",
  });

  if (!normalizedEmail) return genericResponse;

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user?.password) return genericResponse;

  await prisma.verificationToken.deleteMany({ where: { identifier: `${RESET_IDENTIFIER}${normalizedEmail}` } });
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: `${RESET_IDENTIFIER}${normalizedEmail}`,
      token,
      expires: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  try {
    await sendPasswordResetEmail(normalizedEmail, token);
  } catch (error) {
    const debugUrl = process.env.NODE_ENV !== "production" ? `${process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${encodeURIComponent(token)}` : null;
    return NextResponse.json(
      {
        ok: false,
        error: "Le lien de réinitialisation n’a pas pu être envoyé. Vérifiez la configuration email du serveur.",
        ...(debugUrl ? { debugResetUrl: debugUrl } : {}),
      },
      { status: 500 }
    );
  }

  return genericResponse;
}