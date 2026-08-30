import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const STATUS_MAP = {
  active: "ACTIVE",
  canceled: "CANCELED",
  past_due: "PAST_DUE",
  incomplete: "INCOMPLETE",
  incomplete_expired: "CANCELED",
  trialing: "TRIALING",
  unpaid: "PAST_DUE",
};

function getCurrentPeriodEnd(subscription) {
  const timestamp = Number(subscription?.current_period_end ?? subscription?.items?.data?.[0]?.current_period_end);
  return Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp * 1000) : null;
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const { sessionId } = await request.json().catch(() => ({}));
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "Session Stripe manquante" }, { status: 400 });
  }

  try {
    let checkoutSession;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
        break;
      } catch (error) {
        lastError = error;
        if (error?.code !== "resource_missing" || attempt === 2) {
          lastError = error;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    if (!checkoutSession && lastError?.code === "resource_missing") {
      const localSubscription = await prisma.subscription.findUnique({
        where: { userId: session.user.id },
        select: { stripeCustomerId: true },
      });
      if (localSubscription?.stripeCustomerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: localSubscription.stripeCustomerId,
          status: "all",
          limit: 10,
        });
        const latestSubscription = subscriptions.data.sort((first, second) => second.created - first.created)[0];
        if (latestSubscription) {
          checkoutSession = {
            metadata: { userId: session.user.id },
            mode: "subscription",
            customer: localSubscription.stripeCustomerId,
            subscription: latestSubscription,
          };
        }
      }
    }
    if (!checkoutSession) throw lastError || new Error("Session Stripe introuvable");
    if (checkoutSession.metadata?.userId !== session.user.id || checkoutSession.mode !== "subscription") {
      return NextResponse.json({ error: "Session Stripe invalide" }, { status: 403 });
    }

    const subscriptionId = typeof checkoutSession.subscription === "string"
      ? checkoutSession.subscription
      : checkoutSession.subscription?.id;
    if (!subscriptionId) {
      return NextResponse.json({ error: "Abonnement Stripe indisponible" }, { status: 409 });
    }
    const subscription = typeof checkoutSession.subscription === "object"
      ? checkoutSession.subscription
      : await stripe.subscriptions.retrieve(subscriptionId);

    const status = STATUS_MAP[subscription.status] ?? "INCOMPLETE";
    await prisma.subscription.upsert({
      where: { userId: session.user.id },
      update: {
        stripeCustomerId: typeof checkoutSession.customer === "string" ? checkoutSession.customer : checkoutSession.customer?.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id,
        status,
        currentPeriodEnd: getCurrentPeriodEnd(subscription),
      },
      create: {
        userId: session.user.id,
        stripeCustomerId: typeof checkoutSession.customer === "string" ? checkoutSession.customer : checkoutSession.customer?.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id,
        status,
        currentPeriodEnd: getCurrentPeriodEnd(subscription),
      },
    });
    await prisma.user.update({ where: { id: session.user.id }, data: { plan: status === "ACTIVE" || status === "TRIALING" ? "PREMIUM" : "FREE" } });

    return NextResponse.json({ synced: true, status });
  } catch (error) {
    console.error("Erreur synchronisation abonnement Stripe:", {
      message: error?.message,
      type: error?.type,
      code: error?.code,
      statusCode: error?.statusCode,
    });
    return NextResponse.json({
      error: process.env.NODE_ENV === "development"
        ? error?.message || "Erreur Stripe inconnue"
        : "Impossible de synchroniser l'abonnement Stripe",
    }, { status: 502 });
  }
}
