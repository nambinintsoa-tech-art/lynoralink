import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id },
    orderBy: { expires: "desc" },
  });

  const now = new Date();
  const items = sessions.map((s) => {
    const expired = s.expires ? new Date(s.expires) < now : false;
    return {
      id: s.id,
      sessionToken: s.sessionToken,
      expires: s.expires,
      expired,
      device: s.sessionToken ? "Session active" : "Appareil inconnu",
      location: "En ligne",
      current: !expired,
    };
  });

  return NextResponse.json({ sessions: items });
}
