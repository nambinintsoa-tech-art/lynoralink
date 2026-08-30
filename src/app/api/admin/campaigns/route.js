import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CAMPAIGN_PREFIX = "sponsoredCampaign:";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Non authentifie" }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, email: true } });
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const isAdmin = user?.role === "admin" || Boolean(configuredAdminEmail && user?.email?.toLowerCase() === configuredAdminEmail);
  if (!isAdmin) return { error: NextResponse.json({ error: "Acces administrateur requis" }, { status: 403 }) };
  return { user };
}

function parseCampaign(setting) {
  try {
    const campaign = JSON.parse(setting.value);
    return campaign && typeof campaign === "object" ? { ...campaign, storageId: setting.id } : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const settings = await prisma.userSetting.findMany({
    where: { key: { startsWith: CAMPAIGN_PREFIX } },
    orderBy: { createdAt: "desc" },
  });
  const userIds = [...new Set(settings.map((setting) => setting.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const usersById = new Map(users.map((user) => [user.id, user]));
  const campaigns = settings.map(parseCampaign).filter(Boolean).map((campaign) => ({
    ...campaign,
    ownerName: usersById.get(campaign.pageId)?.name || usersById.get(campaign.pageId)?.email || "Page entreprise",
    ownerEmail: usersById.get(campaign.pageId)?.email || "",
  }));
  return NextResponse.json({ campaigns });
}

export async function PATCH(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const status = String(body.status || "").toUpperCase();
  if (!body.id || !["PENDING", "APPROVED", "REJECTED", "PAUSED", "COMPLETED"].includes(status)) {
    return NextResponse.json({ error: "Campagne ou statut invalide" }, { status: 400 });
  }

  const setting = await prisma.userSetting.findUnique({ where: { id: body.id } });
  if (!setting || !setting.key.startsWith(CAMPAIGN_PREFIX)) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }
  const campaign = parseCampaign(setting);
  if (!campaign) return NextResponse.json({ error: "Campagne invalide" }, { status: 422 });
  campaign.status = status;
  campaign.updatedAt = new Date().toISOString();
  await prisma.userSetting.update({ where: { id: setting.id }, data: { value: JSON.stringify(campaign) } });
  return NextResponse.json({ campaign });
}
