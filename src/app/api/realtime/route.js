import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { registerRealtimeClient, unregisterRealtimeClient, broadcastRealtimeEvent } from "@/lib/realtime";

export const runtime = "nodejs";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const client = {
        enqueue: (chunk) => controller.enqueue(chunk),
        close: () => controller.close(),
      };

      registerRealtimeClient(session.user.id, client);
      controller.enqueue(new TextEncoder().encode("retry: 1000\n\n"));

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`event: ping\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`));
        } catch {
          clearInterval(heartbeat);
          unregisterRealtimeClient(session.user.id, client);
        }
      }, 30000);

      const closeHandler = () => {
        clearInterval(heartbeat);
        unregisterRealtimeClient(session.user.id, client);
      };

      req.signal?.addEventListener("abort", closeHandler, { once: true });

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepAlive);
          clearInterval(heartbeat);
          unregisterRealtimeClient(session.user.id, client);
        }
      }, 15000);

      const cleanup = () => {
        clearInterval(keepAlive);
        clearInterval(heartbeat);
        unregisterRealtimeClient(session.user.id, client);
      };

      req.signal?.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      // stream closed by client; cleanup happens via abort handlers
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { userId, userIds = [], type = "update", payload = {}, broadcastToAll = false } = body || {};

  if (!broadcastToAll && !userId && userIds.length === 0) {
    return NextResponse.json({ error: "Aucun destinataire pour l'événement temps réel." }, { status: 400 });
  }

  broadcastRealtimeEvent({ userId, userIds, type, payload, broadcastToAll });
  return NextResponse.json({ ok: true });
}
