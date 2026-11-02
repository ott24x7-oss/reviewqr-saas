import type { AgentApplicationStatus } from "@reviewqr/shared";

export type ResellerHowSell = "SHOP_VISITS" | "EXISTING_CLIENTS" | "ONLINE" | "OTHER";
export type ResellerFormDraft = {
  name: string;
  phone: string;
  city: string;
  state: string;
  howSell: ResellerHowSell | "";
  experience: string;
  languages: string;
  referralOrTeamCode: string;
};
export type ResellerFormErrors = Partial<Record<keyof ResellerFormDraft | "termsAccepted", string>>;

export function validateResellerApplication(draft: ResellerFormDraft, termsAccepted: boolean): ResellerFormErrors {
  const errors: ResellerFormErrors = {};
  if (draft.name.trim().length < 2) errors.name = "name";
  const phone = draft.phone.replace(/\D/g, "");
  if (phone.length < 10 || phone.length > 15) errors.phone = "phone";
  if (draft.city.trim().length < 2) errors.city = "city";
  if (draft.state.trim().length < 2) errors.state = "state";
  if (!draft.howSell) errors.howSell = "howSell";
  if (!draft.languages.split(",").some((language) => language.trim().length >= 2)) errors.languages = "languages";
  if (!termsAccepted) errors.termsAccepted = "termsAccepted";
  return errors;
}

export function resellerApplicationScreen(status: AgentApplicationStatus["status"] | null | undefined) {
  if (status === "pending") return "pending" as const;
  if (status === "approved") return "approved" as const;
  if (status === "rejected") return "rejected" as const;
  return "form" as const;
}
