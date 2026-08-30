import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveGeoFromRequest } from "@/lib/geo";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  if (!currentUser) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  await prisma.userSetting.upsert({
    where: { userId_key: { userId: currentUser.id, key: "presenceLastSeen" } },
    update: { value: String(Date.now()) },
    create: { userId: currentUser.id, key: "presenceLastSeen", value: String(Date.now()) },
  });

  try {
    const geo = await resolveGeoFromRequest(request);
    if (geo.countryCode) {
      const geoRows = [
        { userId: currentUser.id, key: "geo_country_code", value: geo.countryCode },
        { userId: currentUser.id, key: "geo_country_name", value: geo.countryName || geo.countryCode },
        { userId: currentUser.id, key: "geo_city", value: geo.city || "" },
        { userId: currentUser.id, key: "geo_region", value: geo.region || "" },
        { userId: currentUser.id, key: "geo_source", value: geo.source || "ipapi" },
        { userId: currentUser.id, key: "geo_last_seen_at", value: String(Date.now()) },
      ];

      await Promise.all(geoRows.map((row) =>
        prisma.userSetting.upsert({
          where: { userId_key: { userId: row.userId, key: row.key } },
          update: { value: row.value },
          create: row,
        })
      ));
    }
  } catch {
    // Ne pas casser la présence si la géolocalisation ne fonctionne pas.
  }

  return NextResponse.json({ ok: true });
}
