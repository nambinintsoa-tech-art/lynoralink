import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const campaignId = searchParams.get("campaign_id");
  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const cancelUrl = `${origin}/feed?campaign_payment=cancelled`;

  if (!session?.user?.id || !sessionId || !campaignId) {
    return NextResponse.redirect(cancelUrl);
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    if (
      checkoutSession.metadata?.userId !== session.user.id
      || checkoutSession.metadata?.campaignId !== campaignId
      || checkoutSession.mode !== "payment"
      || checkoutSession.payment_status !== "paid"
    ) {
      return NextResponse.redirect(cancelUrl);
    }

    const setting = await prisma.userSetting.findFirst({ where: { key: campaignId, userId: session.user.id } });
    if (!setting) return NextResponse.redirect(cancelUrl);

    const campaign = JSON.parse(setting.value);
    campaign.paymentStatus = "PAID";
    campaign.status = "APPROVED";
    campaign.updatedAt = new Date().toISOString();
    await prisma.userSetting.update({ where: { id: setting.id }, data: { value: JSON.stringify(campaign) } });

    return NextResponse.redirect(`${origin}/feed?campaign_payment=success&campaign_id=${encodeURIComponent(campaignId)}`);
  } catch (error) {
    console.error("Erreur de confirmation du paiement de campagne :", error);
    return NextResponse.redirect(cancelUrl);
  }
}
