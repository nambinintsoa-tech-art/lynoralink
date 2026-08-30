import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({ email: z.string().email() });

export async function POST(req) {
  const parsed = statusSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ verified: false }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true },
  });

  return NextResponse.json({ verified: Boolean(user?.emailVerified) });
}
