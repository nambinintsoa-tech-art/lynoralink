import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getSubscriptionAccess } from "@/lib/subscription";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const access = await getSubscriptionAccess(session.user.id);
  if (!access.isPremium) return NextResponse.json({ error: "Acces reserve aux pages entreprise Premium" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const setting = await prisma.userSetting.findFirst({ where: { key: body.id, userId: session.user.id } });
  if (!setting) return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  let campaign;
  try { campaign = JSON.parse(setting.value); } catch { return NextResponse.json({ error: "Campagne invalide" }, { status: 422 }); }
  const amount = Math.round(Number(campaign.budget) * 100);
  if (!Number.isFinite(amount) || amount < 500) return NextResponse.json({ error: "Budget de campagne invalide" }, { status: 400 });
  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const successUrl = `${process.env.AD_PAYMENT_SUCCESS_URL || `${origin}/api/company/campaigns/stripe/return?campaign_payment=success`}&campaign_id=${encodeURIComponent(campaign.id)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${process.env.AD_PAYMENT_CANCEL_URL || `${origin}/feed?campaign_payment=cancelled`}&campaign_id=${encodeURIComponent(campaign.id)}`;
  if (campaign.paymentMethod === "mobile_money") {
    campaign.paymentStatus = "PENDING_PROVIDER";
    await prisma.userSetting.update({ where: { id: setting.id }, data: { value: JSON.stringify(campaign) } });
    return NextResponse.json({ pending: true, message: "Paiement Mobile Money en attente de confirmation." });
  }
  if (campaign.paymentMethod === "paypal") {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      return NextResponse.json({ error: "PayPal n'est pas configuré sur ce serveur." }, { status: 503 });
    }
    try {
      const apiBase = process.env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
      const credentials = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
      const tokenResponse = await fetch(`${apiBase}/v1/oauth2/token`, {
        method: "POST",
        headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials",
      });
      const token = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(token.error_description || "Authentification PayPal impossible");
      const orderResponse = await fetch(`${apiBase}/v2/checkout/orders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{ reference_id: campaign.id, amount: { currency_code: String(campaign.currency || process.env.AD_CURRENCY || "eur").toUpperCase(), value: Number(campaign.budget).toFixed(2) }, description: campaign.title || "Campagne publicitaire LynoraLink" }],
          application_context: { return_url: `${origin}/api/company/campaigns/paypal/return?campaign_id=${encodeURIComponent(campaign.id)}`, cancel_url: cancelUrl, user_action: "PAY_NOW" },
        }),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.message || "Impossible de créer la commande PayPal");
      campaign.paymentStatus = "CHECKOUT_CREATED";
      await prisma.userSetting.update({ where: { id: setting.id }, data: { value: JSON.stringify(campaign) } });
      return NextResponse.json({ url: order.links?.find((link) => link.rel === "approve")?.href });
    } catch (error) {
      return NextResponse.json({ error: error?.message || "Impossible de créer le paiement PayPal" }, { status: 502 });
    }
  }
  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      managed_payments: { enabled: false },
      line_items: [{ price_data: { currency: process.env.AD_CURRENCY || "eur", product_data: { name: campaign.title || "Campagne publicitaire LynoraLink" }, unit_amount: amount }, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId: session.user.id, campaignId: campaign.id },
    });
    campaign.paymentStatus = "CHECKOUT_CREATED";
    await prisma.userSetting.update({ where: { id: setting.id }, data: { value: JSON.stringify(campaign) } });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Impossible de créer le paiement Stripe" }, { status: 502 });
  }
}
