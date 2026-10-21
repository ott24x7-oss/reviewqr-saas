import { prisma } from "./db";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound: "default";
};

export type ExpoTicket = {
  status?: string;
  details?: { error?: string };
};

export function expoMessages(tokens: string[], payload: PushPayload): ExpoMessage[] {
  return tokens.filter(Boolean).map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: "default"
  }));
}

export function deadPushTokens(messages: Array<{ to: string }>, tickets: Array<ExpoTicket | undefined>) {
  const dead: string[] = [];
  tickets.forEach((ticket, index) => {
    if (ticket?.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      const token = messages[index]?.to;
      if (token) dead.push(token);
    }
  });
  return dead;
}

export async function postExpoPush(messages: ExpoMessage[], fetchImpl: typeof fetch = fetch) {
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json"
  };
  if (process.env.EXPO_ACCESS_TOKEN) headers.authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetchImpl(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(chunk)
    });
    if (!res.ok) continue;
    const json = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
    const tickets = Array.isArray(json?.data) ? json.data : [];
    const dead = deadPushTokens(chunk, tickets);
    if (dead.length) {
      await prisma.pushDevice.deleteMany({ where: { token: { in: dead } } });
    }
    const live = chunk.map((message) => message.to).filter((token) => !dead.includes(token));
    if (live.length) {
      await prisma.pushDevice.updateMany({
        where: { token: { in: live } },
        data: { lastSeenAt: new Date() }
      });
    }
  }
}

/** Sends only to users who still want push. Failures stay inside this function. */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;
  try {
    const users = await prisma.user.findMany({
      where: { id: { in: ids }, pushEnabled: true, deletedAt: null },
      select: { id: true }
    });
    if (!users.length) return;
    const devices = await prisma.pushDevice.findMany({
      where: { userId: { in: users.map((user) => user.id) } },
      select: { token: true }
    });
    const messages = expoMessages(
      devices.map((device) => device.token),
      payload
    );
    if (!messages.length) return;
    await postExpoPush(messages);
  } catch {
    console.error("[push] send failed");
  }
}
