import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isStrongPassword } from "@/lib/passwordPolicy";

const RESET_IDENTIFIER = "password-reset:";

export async function POST(req) {
  const { token, password } = await req.json().catch(() => ({}));
  if (typeof token !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Lien invalide ou données incorrectes." }, { status: 400 });
  }
  if (!isStrongPassword(password)) {
    return NextResponse.json({ error: "Le mot de passe doit contenir 8 caractères, une majuscule, un chiffre et un caractère spécial." }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || !record.identifier.startsWith(RESET_IDENTIFIER) || record.expires < new Date()) {
    if (record) await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return NextResponse.json({ error: "Ce lien est invalide ou expiré." }, { status: 400 });
  }

  const email = record.identifier.slice(RESET_IDENTIFIER.length);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Ce lien est invalide ou expiré." }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(password, 10),
        emailVerified: user.emailVerified || new Date(),
      },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  return NextResponse.json({ ok: true });
}