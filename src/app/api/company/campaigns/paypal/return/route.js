import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("token");
  const campaignId = searchParams.get("campaign_id");
  const fallback = process.env.AD_PAYMENT_CANCEL_URL || `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/feed?campaign_payment=cancelled`;
  if (!session?.user?.id || !orderId || !campaignId) return NextResponse.redirect(fallback);
  const setting = await prisma.userSetting.findFirst({ where: { key: campaignId, userId: session.user.id } });
  if (!setting) return NextResponse.redirect(fallback);
  const apiBase = process.env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  try {
    const credentials = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
    const tokenResponse = await fetch(`${apiBase}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
    const token = await tokenResponse.json();
    const captureResponse = await fetch(`${apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" } });
    if (!captureResponse.ok) throw new Error("Capture PayPal refusée");
    const campaign = JSON.parse(setting.value);
    campaign.paymentStatus = "PAID";
    campaign.status = "APPROVED";
    await prisma.userSetting.update({ where: { id: setting.id }, data: { value: JSON.stringify(campaign) } });
    const success = process.env.AD_PAYMENT_SUCCESS_URL || `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/feed?campaign_payment=success`;
    return NextResponse.redirect(`${success}&campaign_id=${encodeURIComponent(campaignId)}`);
  } catch {
    return NextResponse.redirect(fallback);
  }
}
