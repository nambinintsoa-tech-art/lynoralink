import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function userId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

async function authorizedCall(callId, id) {
  return prisma.callSession.findFirst({
    where: {
      id: callId,
      conversation: {
        OR: [
          { userAId: id },
          { userBId: id },
          { members: { some: { userId: id } } },
        ],
      },
    },
  });
}

export async function POST(req) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const { conversationId, type } = await req.json();
  if (!conversationId || !["voice", "video"].includes(type)) return NextResponse.json({ error: "Parametres invalides" }, { status: 400 });
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        { userAId: id },
        { userBId: id },
        { members: { some: { userId: id } } },
      ],
    },
  });
  if (!conversation) return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  const call = await prisma.callSession.create({ data: { conversationId, callerId: id, type } });
  return NextResponse.json({ ok: true, callId: call.id });
}

export async function GET(req) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  if (req.nextUrl.searchParams.get("config") === "1") {
    const stunServers = (process.env.WEBRTC_STUN_SERVERS || "")
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean)
      .map((urls) => ({ urls }));
    const turnUrl = process.env.TURN_SERVER_URL?.trim();
    if (turnUrl && process.env.TURN_SERVER_USERNAME && process.env.TURN_SERVER_PASSWORD) {
      stunServers.push({
        urls: turnUrl,
        username: process.env.TURN_SERVER_USERNAME,
        credential: process.env.TURN_SERVER_PASSWORD,
      });
    }
    return NextResponse.json({ iceServers: stunServers.length ? stunServers : [{ urls: "stun:stun.l.google.com:19302" }] });
  }
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  const callId = req.nextUrl.searchParams.get("callId");
  const incomingSince = new Date(Date.now() - 30000);
  const call = callId
    ? await authorizedCall(callId, id)
    : await prisma.callSession.findFirst({
        where: {
          conversationId,
          callerId: { not: id },
          status: "ringing",
          createdAt: { gte: incomingSince },
          conversation: {
            OR: [
              { userAId: id },
              { userBId: id },
              { members: { some: { userId: id } } },
            ],
          },
        },
        orderBy: { createdAt: "desc" },
      });
  return NextResponse.json({ call: call ? { ...call, isCaller: call.callerId === id } : null });
}

export async function PATCH(req) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const { callId, action, value } = await req.json();
  const call = await authorizedCall(callId, id);
  if (!call) return NextResponse.json({ error: "Appel introuvable" }, { status: 404 });
  const data = {};
  if (action === "offer" && call.callerId === id) data.offer = JSON.stringify(value);
  else if (action === "answer" && call.callerId !== id) data.answer = JSON.stringify(value);
  else if (action === "connect") data.status = "connected";
  else if (action === "candidate") {
    const field = call.callerId === id ? "callerCandidates" : "calleeCandidates";
    const candidates = JSON.parse(call[field] || "[]");
    data[field] = JSON.stringify([...candidates, value]);
  } else if (action === "end") {
    data.status = call.status === "ringing" ? "missed" : "ended";
    data.endedAt = new Date();
  } else if (action === "missed" && call.callerId === id) {
    data.status = "missed";
    data.endedAt = new Date();
  } else if (action === "reject" && call.callerId !== id) {
    data.status = "rejected";
    data.endedAt = new Date();
  } else if (action === "leave") {
    data.status = call.status === "ringing" ? "missed" : "ended";
    data.endedAt = new Date();
  } else return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  await prisma.callSession.update({ where: { id: call.id }, data });
  return NextResponse.json({ ok: true });
}
