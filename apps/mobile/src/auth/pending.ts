export type PendingOtp = {
  phone: string;
  mode: "login" | "signup";
  channel?: string;
  resendAfterSec: number;
  devCode: string | null;
  sentAt: number;
  signupToken?: string;
};

let pending: PendingOtp | null = null;

export function setPendingOtp(value: PendingOtp) {
  pending = value;
}

export function getPendingOtp() {
  return pending;
}

export function patchPendingOtp(patch: Partial<PendingOtp>) {
  if (!pending) return;
  pending = { ...pending, ...patch };
}

export function clearPendingOtp() {
  pending = null;
}
