import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/emailVerification";
import { isStrongPassword } from "@/lib/passwordPolicy";

const parseBirthDate = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("La date de naissance doit être au format YYYY-MM-DD.");
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  if (Number.isNaN(date.getTime())) {
    throw new Error("La date de naissance est invalide.");
  }

  return date;
};

const registerSchema = z.object({
  name: z.string().min(2, "Le nom est trop court").max(80),
  email: z.string().email("Adresse email invalide"),
  password: z.string().refine(isStrongPassword, "Le mot de passe ne respecte pas tous les critères de sécurité."),
  title: z.string().max(120).optional(),
  birthDate: z.string().min(1, "La date de naissance est obligatoire").refine((value) => {
    try {
      parseBirthDate(value);
      return true;
    } catch {
      return false;
    }
  }, "La date de naissance est invalide."),
});

export async function POST(req) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const { name, email, password, title, birthDate } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedBirthDate = parseBirthDate(birthDate);

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      if (existing.emailVerified) {
        return NextResponse.json({ error: "Un compte existe déjà avec cet email." }, { status: 409 });
      }
      await prisma.user.delete({ where: { id: existing.id } });
    }

    const hashed = await bcrypt.hash(password, 10);

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.pendingRegistration.upsert({
      where: { email: normalizedEmail },
      update: { name, title: title || null, birthDate: normalizedBirthDate, password: hashed },
      create: { name, email: normalizedEmail, password: hashed, title: title || null, birthDate: normalizedBirthDate },
    });

    await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
    await prisma.verificationToken.create({
      data: { identifier: normalizedEmail, token, expires },
    });

    try {
      await sendVerificationEmail(normalizedEmail, token);
    } catch (error) {
      await prisma.pendingRegistration.delete({ where: { email: normalizedEmail } });
      await prisma.verificationToken.delete({ where: { token } });
      throw error;
    }

    return NextResponse.json({ message: "Un lien de confirmation a été envoyé à votre adresse email." }, { status: 201 });
  } catch (err) {
    console.error("Erreur inscription:", err);
    return NextResponse.json({ error: "Erreur serveur, réessayez." }, { status: 500 });
  }
}
