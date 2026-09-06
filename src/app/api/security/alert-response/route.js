import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/emailVerification";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const notificationId = typeof body.notificationId === "string" ? body.notificationId : "";
  const response = body.response === "yes" || body.response === "no" ? body.response : null;
  if (!notificationId || !response) return NextResponse.json({ error: "Réponse de sécurité invalide" }, { status: 400 });

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId, type: "security_alert" },
    select: { id: true },
  });
  if (!notification) return NextResponse.json({ error: "Alerte introuvable" }, { status: 404 });

  if (response === "yes") {
    await prisma.notification.update({ where: { id: notification.id }, data: { read: true } });
    return NextResponse.json({ ok: true, response });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email) return NextResponse.json({ error: "Adresse email introuvable" }, { status: 400 });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: `password-reset:${user.email}`,
      token,
      expires: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  try {
    await sendPasswordResetEmail(user.email, token);
  } catch (error) {
    console.error("Security password reset email failed:", error);
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return NextResponse.json({ error: "Le lien de réinitialisation n'a pas pu être envoyé." }, { status: 503 });
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    prisma.loginDevice.deleteMany({ where: { userId } }),
    prisma.notification.update({ where: { id: notification.id }, data: { read: true } }),
  ]);

  return NextResponse.json({ ok: true, response, signedOut: true });
}
