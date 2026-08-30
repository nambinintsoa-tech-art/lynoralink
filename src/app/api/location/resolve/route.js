import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveGeoFromRequest } from "@/lib/geo";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!currentUser) {
    return NextResponse.json({ error: "Session utilisateur invalide" }, { status: 401 });
  }

  try {
    const geo = await resolveGeoFromRequest(request);

    const entries = [
      { userId: currentUser.id, key: "geo_country_code", value: geo.countryCode || "UNKNOWN" },
      { userId: currentUser.id, key: "geo_country_name", value: geo.countryName || "Inconnu" },
      { userId: currentUser.id, key: "geo_city", value: geo.city || "" },
      { userId: currentUser.id, key: "geo_region", value: geo.region || "" },
      { userId: currentUser.id, key: "geo_source", value: geo.source || "unknown" },
      { userId: currentUser.id, key: "geo_ip", value: geo.ip || "" },
      { userId: currentUser.id, key: "geo_last_seen_at", value: String(Date.now()) },
    ];

    await Promise.all(entries.map((entry) =>
      prisma.userSetting.upsert({
        where: { userId_key: { userId: entry.userId, key: entry.key } },
        update: { value: entry.value },
        create: entry,
      })
    ));

    return NextResponse.json({
      ok: true,
      geo: {
        ip: geo.ip,
        countryCode: geo.countryCode,
        countryName: geo.countryName,
        city: geo.city,
        region: geo.region,
        source: geo.source,
      },
    });
  } catch (error) {
    console.error("Erreur géolocalisation:", error);
    return NextResponse.json({ error: "Impossible de géolocaliser la requête" }, { status: 500 });
  }
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const geo = await resolveGeoFromRequest(request);
  return NextResponse.json({ geo });
}
