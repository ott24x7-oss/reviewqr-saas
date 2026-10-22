const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|embedly|quora|pinterest|slackbot|telegrambot|discord|headless|lighthouse|pagespeed|wget|curl\//i;

/** Link-preview and crawler user agents are not visits. */
export function isBotUserAgent(userAgent: string | null | undefined) {
  const value = (userAgent || "").trim();
  if (!value) return false;
  return BOT.test(value);
}
