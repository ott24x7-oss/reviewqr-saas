import AsyncStorage from "@react-native-async-storage/async-storage";

export const COACH_SCREENS = ["home", "orders", "menu", "qr"] as const;
export type CoachScreen = (typeof COACH_SCREENS)[number];
export type CoachState = Record<CoachScreen, boolean>;

export const COACH_KEY = "reviewqr.coach";

export function emptyCoachState(): CoachState {
  return { home: false, orders: false, menu: false, qr: false };
}

export function parseCoachState(raw: string | null): CoachState {
  const next = emptyCoachState();
  if (!raw) return next;
  try {
    const parsed = JSON.parse(raw) as Partial<CoachState>;
    for (const screen of COACH_SCREENS) {
      next[screen] = parsed[screen] === true;
    }
  } catch {
    return emptyCoachState();
  }
  return next;
}

/** A tour shows once. Seen screens stay hidden until replay. */
export function shouldShowTour(state: CoachState, screen: CoachScreen) {
  return state[screen] !== true;
}

export function markTourSeen(state: CoachState, screen: CoachScreen): CoachState {
  return { ...state, [screen]: true };
}

/** Replay clears every screen so the next visit shows tips again. */
export function replayTours(): CoachState {
  return emptyCoachState();
}

export async function readCoachState() {
  const raw = await AsyncStorage.getItem(COACH_KEY).catch(() => null);
  return parseCoachState(raw);
}

export async function writeCoachState(state: CoachState) {
  await AsyncStorage.setItem(COACH_KEY, JSON.stringify(state));
}

export async function rememberTour(screen: CoachScreen) {
  const state = await readCoachState();
  await writeCoachState(markTourSeen(state, screen));
}

const listeners = new Set<() => void>();

export function subscribeCoach(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyCoach() {
  listeners.forEach((listener) => listener());
}

export async function replayAllTours() {
  await writeCoachState(replayTours());
  notifyCoach();
}
