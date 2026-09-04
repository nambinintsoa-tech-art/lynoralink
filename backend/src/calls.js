import { AccessToken } from "livekit-server-sdk";
import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

async function authorizedCall(callId, userId) {
  return prisma.callSession.findFirst({ where: { id: callId, conversation: { OR: [{ userAId: userId }, { userBId: userId }, { members: { some: { userId } } }] } } });
}

async function authorizedConversation(conversationId, userId) {
  return prisma.conversation.findFirst({ where: { id: conversationId, OR: [{ userAId: userId }, { userBId: userId }, { members: { some: { userId } } }] }, select: { id: true } });
}

export async function registerCallRoutes(app) {
  app.post("/v1/calls", async (request, reply) => {
    const userId = await getSessionUserId(request);
    const { conversationId, type } = request.body || {};
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    if (!conversationId || !["voice", "video"].includes(type)) return reply.code(400).send({ error: "Paramètres invalides" });
    if (!await authorizedConversation(conversationId, userId)) return reply.code(404).send({ error: "Conversation introuvable" });
    const call = await prisma.callSession.create({ data: { conversationId, callerId: userId, type } });
    return reply.send({ ok: true, callId: call.id });
  });

  app.get("/v1/calls", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    if (request.query?.config === "1") {
      const iceServers = (process.env.WEBRTC_STUN_SERVERS || "stun:stun.l.google.com:19302").split(",").map((urls) => ({ urls: urls.trim() })).filter((item) => item.urls);
      if (process.env.TURN_SERVER_URL && process.env.TURN_SERVER_USERNAME && process.env.TURN_SERVER_PASSWORD) iceServers.push({ urls: process.env.TURN_SERVER_URL, username: process.env.TURN_SERVER_USERNAME, credential: process.env.TURN_SERVER_PASSWORD });
      return reply.send({ iceServers });
    }
    const call = request.query?.callId
      ? await authorizedCall(request.query.callId, userId)
      : await prisma.callSession.findFirst({ where: { conversationId: request.query?.conversationId, callerId: { not: userId }, status: "ringing", createdAt: { gte: new Date(Date.now() - 30000) }, conversation: { OR: [{ userAId: userId }, { userBId: userId }, { members: { some: { userId } } }] } }, orderBy: { createdAt: "desc" } });
    return reply.send({ call: call ? { ...call, isCaller: call.callerId === userId } : null });
  });

  app.patch("/v1/calls", async (request, reply) => {
    const userId = await getSessionUserId(request);
    const { callId, action, value } = request.body || {};
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const call = await authorizedCall(callId, userId);
    if (!call) return reply.code(404).send({ error: "Appel introuvable" });
    const data = {};
    if (action === "offer" && call.callerId === userId) data.offer = JSON.stringify(value);
    else if (action === "answer" && call.callerId !== userId) data.answer = JSON.stringify(value);
    else if (action === "connect") data.status = "connected";
    else if (action === "candidate") {
      const field = call.callerId === userId ? "callerCandidates" : "calleeCandidates";
      let candidates = [];
      try { candidates = JSON.parse(call[field] || "[]"); } catch {}
      data[field] = JSON.stringify([...candidates, value]);
    } else if (["end", "leave"].includes(action)) { data.status = call.status === "ringing" ? "missed" : "ended"; data.endedAt = new Date(); }
    else if (action === "missed" && call.callerId === userId) { data.status = "missed"; data.endedAt = new Date(); }
    else if (action === "reject" && call.callerId !== userId) { data.status = "rejected"; data.endedAt = new Date(); }
    else return reply.code(400).send({ error: "Action invalide" });
    await prisma.callSession.update({ where: { id: call.id }, data });
    return reply.send({ ok: true });
  });

  app.post("/v1/calls/token", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.NEXT_PUBLIC_LIVEKIT_URL) return reply.code(503).send({ error: "Configuration LiveKit incomplète" });
    const call = await authorizedCall(request.body?.callId, userId);
    if (!call || !["ringing", "connected"].includes(call.status)) return reply.code(404).send({ error: "Appel introuvable" });
    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity: userId, name: userId, ttl: "2h" });
    token.addGrant({ roomJoin: true, room: `call-${call.id}`, canPublish: true, canSubscribe: true });
    return reply.send({ token: await token.toJwt(), roomName: `call-${call.id}`, url: process.env.NEXT_PUBLIC_LIVEKIT_URL, type: call.type });
  });
}
