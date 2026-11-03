import { formatHoursLabels, formatStoreTime } from "../src/store/hours";

describe("store hours formatting", () => {
  it("formats 24-hour values with localized label slots", () => {
    expect(formatStoreTime("09:00")).toBe("9:00 AM");
    expect(formatStoreTime("21:30")).toBe("9:30 PM");
    expect(formatStoreTime("00:00")).toBe("12:00 AM");
    expect(formatHoursLabels("09:00", "21:00", { opens: "Opens", closes: "Closes" })).toBe("Opens 9:00 AM · Closes 9:00 PM");
  });

  it("keeps malformed values visible for correction", () => {
    expect(formatStoreTime("9am")).toBe("9am");
  });
});
