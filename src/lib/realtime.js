const globalState = globalThis.__lynoraRealtime ??= {
  clients: new Map(),
};

const encoder = new TextEncoder();

export function registerRealtimeClient(userId, client) {
  const userClients = globalState.clients.get(userId) ?? new Set();
  userClients.add(client);
  globalState.clients.set(userId, userClients);
  return client;
}

export function unregisterRealtimeClient(userId, client) {
  const userClients = globalState.clients.get(userId);
  if (!userClients) return;
  userClients.delete(client);
  if (userClients.size === 0) {
    globalState.clients.delete(userId);
  }
}

export function broadcastRealtimeEvent({ userId = null, userIds = [], type = "update", payload = {}, broadcastToAll = false } = {}) {
  const recipients = new Set();

  if (broadcastToAll) {
    for (const userClients of globalState.clients.values()) {
      for (const client of userClients) recipients.add(client);
    }
  }

  if (userId) recipients.add(userId);

  for (const nextUserId of userIds) {
    const userClients = globalState.clients.get(nextUserId);
    if (userClients) {
      for (const client of userClients) recipients.add(client);
    }
  }

  if (!broadcastToAll && !userId && userIds.length === 0) {
    return;
  }

  const message = `event: realtime\ndata: ${JSON.stringify({
    type,
    ...payload,
    sentAt: new Date().toISOString(),
  })}\n\n`;

  for (const client of recipients) {
    try {
      if (client && typeof client.enqueue === "function") {
        client.enqueue(encoder.encode(message));
      }
    } catch {
      // Ignore dead streams.
    }
  }
}
