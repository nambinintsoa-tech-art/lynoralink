import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AccessToken } from "livekit-server-sdk";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.NEXT_PUBLIC_LIVEKIT_URL) {
    return NextResponse.json({ error: "Configuration LiveKit incomplete" }, { status: 503 });
  }

  const { callId } = await req.json().catch(() => ({}));
  const call = await prisma.callSession.findFirst({
    where: {
      id: callId,
      status: { in: ["ringing", "connected"] },
      conversation: { OR: [{ userAId: userId }, { userBId: userId }, { members: { some: { userId } } }] },
    },
  });
  if (!call) return NextResponse.json({ error: "Appel introuvable" }, { status: 404 });

  const roomName = `call-${call.id}`;
  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: userId,
    name: session.user.name || userId,
    metadata: JSON.stringify({ image: session.user.image || null }),
    ttl: "2h",
  });
  token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
  return NextResponse.json({ token: await token.toJwt(), roomName, url: process.env.NEXT_PUBLIC_LIVEKIT_URL, type: call.type });
}