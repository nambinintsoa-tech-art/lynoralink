import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ accounts: [] }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { accounts: true },
  });

  if (!user) {
    return NextResponse.json({ accounts: [] }, { status: 404 });
  }

  const primaryAccount = {
    id: user.id,
    name: user.name || user.email || "Compte principal",
    handle: user.email ? `@${user.email.split("@")[0]}` : "@compte",
    online: true,
    verified: Boolean(user.plan || user.title),
    photoUrl: user.image || null,
    provider: "email",
  };

  const linkedAccounts = [];

  return NextResponse.json({
    accounts: [primaryAccount, ...linkedAccounts],
  });
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const { currentPassword } = body || {};
  if (!currentPassword) {
    return NextResponse.json({ error: "Mot de passe requis pour la suppression." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.password) {
    return NextResponse.json({ error: "Impossible de vérifier le mot de passe." }, { status: 403 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 403 });
  }

  const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  if (sub?.stripeSubscriptionId) {
    await stripe.subscriptions.cancel(sub.stripeSubscriptionId).catch(() => {});
  }

  const deleteResult = await prisma.user.deleteMany({ where: { id: session.user.id } });
  if (deleteResult.count === 0) {
    return NextResponse.json({ error: "Utilisateur introuvable ou déjà supprimé." }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
