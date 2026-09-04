import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const billingCycle = body?.billingCycle === "annual" ? "annual" : "monthly";
  const priceId = billingCycle === "annual"
    ? process.env.STRIPE_PREMIUM_PRICE_ID_YEARLY
    : process.env.STRIPE_PREMIUM_PRICE_ID_MONTHLY;

  if (!priceId) {
    return NextResponse.json({ error: `Prix Stripe Premium ${billingCycle === "annual" ? "annuel" : "mensuel"} non configuré.` }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // Récupère ou crée le customer Stripe
  let customerId = user.subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { stripeCustomerId: customerId },
      create: { userId: user.id, stripeCustomerId: customerId },
    });
  }

  const origin = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      managed_payments: { enabled: false },
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/feed?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?upgrade=cancelled`,
      metadata: { userId: user.id },
      subscription_data: { metadata: { userId: user.id } },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Erreur création checkout Stripe:", error);
    return NextResponse.json({ error: error?.message || "Impossible de créer la session de paiement Stripe." }, { status: 502 });
  }
}
