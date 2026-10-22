import { channelCopy, type Lang } from "../i18n/copy";

export function channelLabel(channel: string | undefined, lang: Lang) {
  return channelCopy(channel, lang);
}

/** Keep the first six digits so a pasted SMS lands in the field. */
export function digitsFrom(text: string) {
  return text.replace(/\D/g, "").slice(0, 6);
}

export function secondsUntilResend(sentAtMs: number, resendAfterSec: number, now: number) {
  const left = Math.ceil((sentAtMs + resendAfterSec * 1000 - now) / 1000);
  return left > 0 ? left : 0;
}

export function canResend(sentAtMs: number, resendAfterSec: number, now: number) {
  return secondsUntilResend(sentAtMs, resendAfterSec, now) === 0;
}

/** Show a code only when the API included one. The app never invents a code. */
export function devCodeFrom(body: { devCode?: unknown } | null | undefined) {
  const code = body?.devCode;
  return typeof code === "string" && /^\d{6}$/.test(code) ? code : null;
}
