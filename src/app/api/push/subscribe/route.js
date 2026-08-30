import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  if (!currentUser) {
    return NextResponse.json({ error: "Session utilisateur invalide" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const subscription = body?.subscription;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Souscription Push invalide" }, { status: 400 });
  }

  const existingSubscription = await prisma.pushSubscription.findUnique({
    where: { endpoint: subscription.endpoint },
    select: { id: true, userId: true },
  });

  if (existingSubscription && existingSubscription.userId !== currentUser.id) {
    await prisma.pushSubscription.delete({ where: { id: existingSubscription.id } }).catch(() => {});
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      userId: currentUser.id,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    create: {
      userId: currentUser.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { endpoint } = await req.json().catch(() => ({}));
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id } });
  }
  return NextResponse.json({ ok: true });
}