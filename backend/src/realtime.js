import { createClient } from "redis";
import { getSessionUserId } from "./auth.js";

const CHANNEL = "lynoralink:realtime";
const INSTANCE_ID = `${process.pid}-${Date.now()}-${Math.random()}`;
const clients = new Map();
let publisher;
let subscriber;
let redisReady = false;

function messageFor({ type = "update", payload = {} } = {}) {
  return `event: realtime\ndata: ${JSON.stringify({ type, ...payload, sentAt: new Date().toISOString() })}\n\n`;
}

function deliver({ userId = null, userIds = [], type = "update", payload = {}, broadcastToAll = false } = {}) {
  const recipients = new Set();
  if (broadcastToAll) for (const userClients of clients.values()) for (const client of userClients) recipients.add(client);
  for (const id of [userId, ...userIds].filter(Boolean)) {
    for (const client of clients.get(String(id)) || []) recipients.add(client);
  }
  const message = messageFor({ type, payload });
  for (const client of recipients) {
    try { client.enqueue(message); } catch { unregisterRealtimeClient(client.userId, client); }
  }
}

async function ensureRedis() {
  if (!process.env.REDIS_URL || redisReady) return;
  if (!publisher) {
    publisher = createClient({ url: process.env.REDIS_URL });
    subscriber = publisher.duplicate();
    publisher.on("error", () => { redisReady = false; });
    subscriber.on("error", () => { redisReady = false; });
    try {
      await Promise.all([publisher.connect(), subscriber.connect()]);
      await subscriber.subscribe(CHANNEL, (raw) => {
        try {
          const event = JSON.parse(raw);
          if (event.origin !== INSTANCE_ID) deliver(event);
        } catch { /* Ignore malformed broker messages. */ }
      });
      redisReady = true;
    } catch {
      redisReady = false;
      publisher = undefined;
      subscriber = undefined;
    }
  }
}

export function registerRealtimeClient(userId, client) {
  client.userId = String(userId);
  const userClients = clients.get(client.userId) || new Set();
  userClients.add(client);
  clients.set(client.userId, userClients);
  void ensureRedis();
  return client;
}

export function unregisterRealtimeClient(userId, client) {
  const key = String(userId);
  const userClients = clients.get(key);
  if (!userClients) return;
  userClients.delete(client);
  if (userClients.size === 0) clients.delete(key);
}

export function broadcastRealtimeEvent(event = {}) {
  const normalized = { userId: null, userIds: [], type: "update", payload: {}, broadcastToAll: false, ...event, origin: INSTANCE_ID };
  deliver(normalized);
  if (process.env.REDIS_URL) {
    void ensureRedis().then(() => {
      if (redisReady) return publisher.publish(CHANNEL, JSON.stringify(normalized));
      return null;
    }).catch(() => {});
  }
}

export async function registerRealtimeRoutes(app) {
  app.get("/v1/realtime", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });

    reply.hijack();
    const response = reply.raw;
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "http://localhost:3000",
      "Access-Control-Allow-Credentials": "true",
    });
    const client = { userId, enqueue: (message) => response.write(message) };
    registerRealtimeClient(userId, client);
    response.write("retry: 1000\n\n");
    const heartbeat = setInterval(() => { try { response.write(`event: ping\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`); } catch { cleanup(); } }, 30000);
    const keepAlive = setInterval(() => { try { response.write(": keepalive\n\n"); } catch { cleanup(); } }, 15000);
    const cleanup = () => {
      clearInterval(heartbeat);
      clearInterval(keepAlive);
      unregisterRealtimeClient(userId, client);
      try { response.end(); } catch {}
    };
    request.raw.on("close", cleanup);
  });

  app.post("/v1/realtime", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const body = request.body || {};
    if (!body.broadcastToAll && !body.userId && !(Array.isArray(body.userIds) && body.userIds.length)) return reply.code(400).send({ error: "Aucun destinataire pour l'événement temps réel." });
    broadcastRealtimeEvent(body);
    return reply.send({ ok: true });
  });
}
