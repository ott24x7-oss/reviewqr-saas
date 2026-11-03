import { resellerApplicationScreen, validateResellerApplication, type ResellerFormDraft } from "../src/agent/reseller-flow";

const validDraft: ResellerFormDraft = {
  name: "Asha Kumar",
  phone: "9876543210",
  city: "Pune",
  state: "Maharashtra",
  howSell: "SHOP_VISITS",
  experience: "",
  languages: "Hindi, Marathi",
  referralOrTeamCode: ""
};

describe("reseller application form validation", () => {
  it("accepts a valid application with consent", () => {
    expect(validateResellerApplication(validDraft, true)).toEqual({});
  });

  it("reports missing required fields and terms consent", () => {
    expect(validateResellerApplication({ ...validDraft, name: "A", phone: "123", city: "", state: "", howSell: "", languages: "" }, false)).toEqual({
      name: "name",
      phone: "phone",
      city: "city",
      state: "state",
      howSell: "howSell",
      languages: "languages",
      termsAccepted: "termsAccepted"
    });
  });
});

describe("reseller application status mapping", () => {
  it("maps none, pending, approved and rejected to their screens", () => {
    expect(resellerApplicationScreen("none")).toBe("form");
    expect(resellerApplicationScreen("pending")).toBe("pending");
    expect(resellerApplicationScreen("approved")).toBe("approved");
    expect(resellerApplicationScreen("rejected")).toBe("rejected");
  });
});
