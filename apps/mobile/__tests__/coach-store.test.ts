import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  emptyCoachState,
  markTourSeen,
  parseCoachState,
  readCoachState,
  rememberTour,
  replayAllTours,
  replayTours,
  shouldShowQrPageTour,
  shouldShowTour
} from "../src/guide/store";

describe("coach-mark store", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("shows each screen once, then hides it", () => {
    let state = emptyCoachState();
    expect(shouldShowTour(state, "home")).toBe(true);
    expect(shouldShowTour(state, "orders")).toBe(true);
    state = markTourSeen(state, "home");
    expect(shouldShowTour(state, "home")).toBe(false);
    expect(shouldShowTour(state, "orders")).toBe(true);
    expect(shouldShowTour(state, "menu")).toBe(true);
    expect(shouldShowTour(state, "qr")).toBe(true);
  });

  it("replays every screen", () => {
    const seen = markTourSeen(markTourSeen(emptyCoachState(), "home"), "qr");
    const again = replayTours();
    expect(shouldShowTour(again, "home")).toBe(true);
    expect(shouldShowTour(again, "qr")).toBe(true);
    expect(seen.home).toBe(true);
  });

  it("shows the QR tour only on the QR view and outside setup walkthroughs", () => {
    expect(shouldShowQrPageTour(undefined, false)).toBe(true);
    expect(shouldShowQrPageTour("qr", false)).toBe(true);
    expect(shouldShowQrPageTour("buttons", false)).toBe(false);
    expect(shouldShowQrPageTour("link", false)).toBe(false);
    expect(shouldShowQrPageTour("qr", true)).toBe(false);
  });

  it("ignores a broken cache and remembers a finished tour", async () => {
    expect(parseCoachState("nope").menu).toBe(false);
    await rememberTour("orders");
    const stored = await readCoachState();
    expect(shouldShowTour(stored, "orders")).toBe(false);
    expect(shouldShowTour(stored, "home")).toBe(true);
    await replayAllTours();
    const reset = await readCoachState();
    expect(shouldShowTour(reset, "orders")).toBe(true);
  });
});
