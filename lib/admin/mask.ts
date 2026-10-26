/** Last four digits stay visible. Lists never return the rest of a phone. */
export function maskPhone(value: string | null | undefined) {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length < 4) return "";
  return `••••${digits.slice(-4)}`;
}
