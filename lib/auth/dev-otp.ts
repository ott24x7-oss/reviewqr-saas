/**
 * OTP_DEV_REVEAL is a local debugging aid. It is ignored whenever NODE_ENV
 * is production, even if the variable is present.
 */
function flagSet(value: string | undefined) {
  return typeof value === "string" && value.length > 0;
}

export function devOtpCode(code: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (env.NODE_ENV === "production") return undefined;
  if (!flagSet(env.OTP_DEV_REVEAL)) return undefined;
  return code;
}

export function warnDevOtpInProduction(
  env: NodeJS.ProcessEnv = process.env,
  warn: (message: string) => void = console.warn
) {
  if (env.NODE_ENV === "production" && flagSet(env.OTP_DEV_REVEAL)) {
    warn("[otp] OTP_DEV_REVEAL is set but ignored because NODE_ENV is production");
  }
}

export function otpRequestBody(issuedCode: string | null, env: NodeJS.ProcessEnv = process.env) {
  const devCode = issuedCode ? devOtpCode(issuedCode, env) : undefined;
  if (!devCode) return { sent: true as const };
  return { sent: true as const, devCode };
}
