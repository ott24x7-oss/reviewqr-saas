import AsyncStorage from "@react-native-async-storage/async-storage";

export const ORDER_QUEUE_KEY = "reviewqr.orderStatusQueue";
const STATUSES = new Set(["ACCEPTED", "PREPARING", "READY", "COMPLETED"]);

export type QueuedOrderStatus = { orderId: string; status: string; at: number };

export function queueOrderStatus(queue: QueuedOrderStatus[], next: QueuedOrderStatus) {
  if (!next.orderId || !STATUSES.has(next.status)) return queue;
  const row = { orderId: next.orderId, status: next.status, at: next.at };
  return [...queue.filter((item) => item.orderId !== row.orderId), row];
}

export function isNetworkFailure(err: unknown) {
  if (err instanceof TypeError) return true;
  if (!err || typeof err !== "object") return false;
  const status = "status" in err ? Number((err as { status?: number }).status) : 0;
  if (!Number.isFinite(status) || status === 0 || status >= 500) return true;
  const message = err instanceof Error ? err.message : "";
  return /network|failed to fetch|offline|timeout/i.test(message);
}

export async function flushOrderQueue(queue: QueuedOrderStatus[], send: (row: QueuedOrderStatus) => Promise<void>) {
  const left: QueuedOrderStatus[] = [];
  let sent = 0;
  for (const row of queue) {
    try {
      await send(row);
      sent += 1;
    } catch (err) {
      if (isNetworkFailure(err)) left.push(row);
    }
  }
  return { left, sent };
}

export async function readOrderQueue() {
  const raw = await AsyncStorage.getItem(ORDER_QUEUE_KEY).catch(() => null);
  if (!raw) return [] as QueuedOrderStatus[];
  try {
    const parsed = JSON.parse(raw) as QueuedOrderStatus[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row) => row && typeof row.orderId === "string" && STATUSES.has(row.status));
  } catch {
    return [];
  }
}

export async function enqueueOrderStatus(next: { orderId: string; status: string; at?: number }) {
  const queue = queueOrderStatus(await readOrderQueue(), {
    orderId: next.orderId,
    status: next.status,
    at: next.at ?? Date.now()
  });
  await AsyncStorage.setItem(ORDER_QUEUE_KEY, JSON.stringify(queue));
  return queue;
}

export async function flushStoredOrderQueue(send: (row: QueuedOrderStatus) => Promise<void>) {
  const result = await flushOrderQueue(await readOrderQueue(), send);
  await AsyncStorage.setItem(ORDER_QUEUE_KEY, JSON.stringify(result.left));
  return result.sent;
}
