import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendRegistrationCode } from "@/lib/emailVerification";

const emailSchema = z.string().email();
const genericMessage = "Si un compte non confirmé correspond à cette adresse, un nouveau code vient d'être envoyé.";

export async function POST(req) {
  try {
    const body = await req.json();
    const parsedEmail = emailSchema.safeParse(body?.email?.trim().toLowerCase());
    if (!parsedEmail.success) {
      return NextResponse.json({ message: genericMessage });
    }

    const email = parsedEmail.data;
    const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
    if (!pending) return NextResponse.json({ message: genericMessage });

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    const code = String(crypto.randomInt(100000, 1000000));
    await prisma.verificationToken.create({
      data: { identifier: email, token: code, expires: new Date(Date.now() + 10 * 60 * 1000) },
    });
    await sendRegistrationCode(email, code);

    return NextResponse.json({ message: genericMessage });
  } catch (error) {
    console.error("Erreur renvoi confirmation email:", error);
    return NextResponse.json({ message: genericMessage });
  }
}
