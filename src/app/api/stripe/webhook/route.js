import { NextResponse } from "next/server";
import { headers } from "next/headers";
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

async function activatePaidCampaign(userId, campaignId) {
  if (!userId || !campaignId) return;
  const setting = await prisma.userSetting.findFirst({ where: { key: campaignId, userId } });
  if (!setting) return;
  const campaign = JSON.parse(setting.value);
  campaign.paymentStatus = "PAID";
  campaign.status = "APPROVED";
  campaign.updatedAt = new Date().toISOString();
  await prisma.userSetting.update({ where: { id: setting.id }, data: { value: JSON.stringify(campaign) } });
}

export async function POST(req) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Signature webhook Stripe invalide:", err.message);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object;
        const userId = checkoutSession.metadata?.userId;
        const campaignId = checkoutSession.metadata?.campaignId;
        if (userId && campaignId && !checkoutSession.subscription && checkoutSession.payment_status === "paid") {
          await activatePaidCampaign(userId, campaignId);
        }
        if (userId && checkoutSession.subscription) {
          const subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription);
          await prisma.subscription.upsert({
            where: { userId },
            update: {
              stripeCustomerId: checkoutSession.customer,
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0]?.price.id,
              status: STATUS_MAP[subscription.status] ?? "INCOMPLETE",
              currentPeriodEnd: getCurrentPeriodEnd(subscription),
            },
            create: {
              userId,
              stripeCustomerId: checkoutSession.customer,
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0]?.price.id,
              status: STATUS_MAP[subscription.status] ?? "INCOMPLETE",
              currentPeriodEnd: getCurrentPeriodEnd(subscription),
            },
          });
          await prisma.user.update({ where: { id: userId }, data: { plan: "PREMIUM" } });
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const checkoutSession = event.data.object;
        if (!checkoutSession.subscription) {
          await activatePaidCampaign(checkoutSession.metadata?.userId, checkoutSession.metadata?.campaignId);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;
        const record = userId
          ? await prisma.subscription.findUnique({ where: { userId } })
          : await prisma.subscription.findFirst({
              where: { stripeSubscriptionId: subscription.id },
            });

        if (record) {
          const status = STATUS_MAP[subscription.status] ?? "INCOMPLETE";
          await prisma.subscription.update({
            where: { id: record.id },
            data: {
              status,
              currentPeriodEnd: getCurrentPeriodEnd(subscription),
            },
          });
          await prisma.user.update({
            where: { id: record.userId },
            data: { plan: status === "ACTIVE" || status === "TRIALING" ? "PREMIUM" : "FREE" },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Erreur traitement webhook Stripe:", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
