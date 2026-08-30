import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true, plan: true } } },
  });

  await prisma.$transaction(
    subscriptions
      .filter((subscription) => subscription.user)
      .map((subscription) => {
        const effectivePlan = hasActiveSubscription(subscription) ? "PREMIUM" : "FREE";
        return subscription.user.plan === effectivePlan
          ? null
          : prisma.user.update({ where: { id: subscription.user.id }, data: { plan: effectivePlan } });
      })
      .filter(Boolean)
  );

  const shaped = subscriptions.map((s) => ({
    id: s.id,
    userId: s.userId,
    userName: s.user?.name || "Utilisateur",
    plan: hasActiveSubscription(s) ? "PREMIUM" : "FREE",
    status: s.status.toLowerCase(),
    startedAt: s.createdAt,
    nextBilling: s.currentPeriodEnd,
    amount: 0,
    currency: "USD",
    paymentMethod: "",
  }));

  return NextResponse.json({ subscriptions: shaped });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, plan, status } = body || {};

    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const data = {};
    if (status) data.status = String(status).toUpperCase();

    const subscription = await prisma.subscription.update({
      where: { id },
      data,
      include: { user: { select: { name: true, email: true, plan: true } } },
    });

    if (plan) {
      await prisma.user.update({
        where: { id: subscription.userId },
        data: { plan: String(plan).toUpperCase() },
      });
    }

    return NextResponse.json({ ok: true, subscription });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
