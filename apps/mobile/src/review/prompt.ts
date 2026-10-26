import AsyncStorage from "@react-native-async-storage/async-storage";

export const REVIEW_GAP_MS = 90 * 24 * 60 * 60 * 1000;
export const ORDER_GOAL = 3;
export const REVIEW_GOAL = 5;
const ASKED_KEY = "reviewqr.reviewAskedAt";
const ORDERS_KEY = "reviewqr.ordersCompleted";
const REVIEWS_KEY = "reviewqr.reviewsReceived";

let blocked = false;
let asking = false;

/** A crash or Sentry error blocks the Play review dialog for this session. */
export function blockReviewAfterError() {
  blocked = true;
}

export function resetReviewBlockForTests() {
  blocked = false;
  asking = false;
}

export function shouldAskForReview(input: {
  ordersCompleted: number;
  reviewsReceived: number;
  lastAskedAt: number | null;
  now: number;
  errored: boolean;
}) {
  if (input.errored || blocked) return false;
  const positive = input.ordersCompleted >= ORDER_GOAL || input.reviewsReceived >= REVIEW_GOAL;
  if (!positive) return false;
  if (input.lastAskedAt != null && input.now - input.lastAskedAt < REVIEW_GAP_MS) return false;
  return true;
}

export function nextCounts(storedOrders: number, storedReviews: number, seenOrders: number, seenReviews: number) {
  return {
    ordersCompleted: Math.max(storedOrders, seenOrders),
    reviewsReceived: Math.max(storedReviews, seenReviews)
  };
}

async function readNumber(key: string) {
  const raw = await AsyncStorage.getItem(key).catch(() => null);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

async function writeNumber(key: string, value: number) {
  await AsyncStorage.setItem(key, String(value)).catch(() => undefined);
}

type PromptDeps = {
  readAskedAt?: () => Promise<number | null>;
  writeAskedAt?: (at: number) => Promise<void>;
  requestReview?: () => Promise<boolean>;
};

export async function considerReviewPrompt(
  input: { ordersCompleted: number; reviewsReceived: number; errored: boolean; now?: number },
  deps?: PromptDeps
) {
  if (asking) return false;
  const now = input.now ?? Date.now();
  const lastAskedAt = deps?.readAskedAt ? await deps.readAskedAt() : await readAskedAt();
  if (!shouldAskForReview({ ...input, lastAskedAt, now })) return false;
  const request = deps?.requestReview ?? requestPlayReview;
  const shown = await request();
  if (!shown) return false;
  asking = true;
  try {
    if (deps?.writeAskedAt) await deps.writeAskedAt(now);
    else await AsyncStorage.setItem(ASKED_KEY, String(now)).catch(() => undefined);
    return true;
  } finally {
    asking = false;
  }
}

async function readAskedAt() {
  const raw = await AsyncStorage.getItem(ASKED_KEY).catch(() => null);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function requestPlayReview() {
  try {
    const StoreReview = await import("expo-store-review");
    if (!(await StoreReview.isAvailableAsync())) return false;
    if (!(await StoreReview.hasAction())) return false;
    await StoreReview.requestReview();
    return true;
  } catch {
    return false;
  }
}

export async function noteOrderCompleted(errored: boolean) {
  const next = (await readNumber(ORDERS_KEY)) + 1;
  await writeNumber(ORDERS_KEY, next);
  const reviewsReceived = await readNumber(REVIEWS_KEY);
  await considerReviewPrompt({ ordersCompleted: next, reviewsReceived, errored });
}

export async function noteObserved(seenOrders: number, seenReviews: number, errored: boolean) {
  const counts = nextCounts(await readNumber(ORDERS_KEY), await readNumber(REVIEWS_KEY), seenOrders, seenReviews);
  await writeNumber(ORDERS_KEY, counts.ordersCompleted);
  await writeNumber(REVIEWS_KEY, counts.reviewsReceived);
  await considerReviewPrompt({ ...counts, errored });
}
