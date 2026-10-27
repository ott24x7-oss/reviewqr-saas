import { formatDuration, formatServicePrice } from "@reviewqr/shared";
import { bookingStatusChoices, moveBookingStatus } from "../src/bookings/flow";

describe("service duration and price", () => {
  it("formats length and the three price types", () => {
    expect(formatDuration(45, "en")).toBe("45 min");
    expect(formatDuration(45, "hi")).toBe("45 मिनट");
    expect(formatDuration(60, "en")).toBe("1 hr");
    expect(formatDuration(60, "hi")).toBe("1 घंटा");
    expect(formatDuration(75, "en")).toBe("1 hr, 15 min");
    expect(formatDuration(120, "hi")).toBe("2 घंटे");
    expect(formatServicePrice({ pricePaise: 30000, priceType: "FIXED" })).toBe("₹300");
    expect(formatServicePrice({ pricePaise: 30000, priceType: "FROM", lang: "en" })).toBe("from ₹300");
    expect(formatServicePrice({ pricePaise: 30000, priceType: "FROM", lang: "hi" })).toBe("₹300 से");
    expect(formatServicePrice({ pricePaise: 0, priceType: "ON_REQUEST" })).toBe("Price on request");
    expect(formatServicePrice({ pricePaise: 0, priceType: "ON_REQUEST", lang: "hi" })).toBe("कीमत पूछें");
  });
});

describe("booking status flow", () => {
  it("accepts every known status and refuses an unknown one", () => {
    expect(moveBookingStatus("NEW", "CONFIRMED")).toBe("CONFIRMED");
    expect(moveBookingStatus("CONFIRMED", "DONE")).toBe("DONE");
    expect(moveBookingStatus("DONE", "NO_SHOW")).toBe("NO_SHOW");
    expect(moveBookingStatus("NO_SHOW", "CANCELLED")).toBe("CANCELLED");
    expect(moveBookingStatus("NEW", "LATER")).toBeNull();
    expect(moveBookingStatus("mystery", "DONE")).toBeNull();
    expect(bookingStatusChoices("NEW")).toEqual(["CONFIRMED", "DONE", "CANCELLED", "NO_SHOW"]);
    expect(bookingStatusChoices("CONFIRMED")).not.toContain("CONFIRMED");
    expect(bookingStatusChoices("not-a-status")).toEqual([]);
  });
});
