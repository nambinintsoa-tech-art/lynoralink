import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!currentUser) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  const setting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId: currentUser.id, key: "activeAccount" } },
  });
  return NextResponse.json({ account: setting?.value === "company" ? "company" : "personal" });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!currentUser) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const account = body.account === "company" ? "company" : "personal";

  if (account === "company") {
    const companyPage = await prisma.userSetting.findUnique({
      where: { userId_key: { userId: currentUser.id, key: "companyPage" } },
    });
    if (!companyPage) {
      return NextResponse.json({ error: "Page entreprise introuvable" }, { status: 404 });
    }
  }

  await prisma.userSetting.upsert({
    where: { userId_key: { userId: currentUser.id, key: "activeAccount" } },
    create: { userId: currentUser.id, key: "activeAccount", value: account },
    update: { value: account },
  });

  return NextResponse.json({ account });
}
