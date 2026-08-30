import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  await prisma.userSetting.deleteMany({
    where: {
      userId: session.user.id,
      key: `restrictedUser:${params.id}`,
    },
  });
  return NextResponse.json({ ok: true, userId: params.id });
}
