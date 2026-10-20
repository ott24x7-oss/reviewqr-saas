/**
 * Which product modules are live. Modules set to `false` show a
 * "Coming soon" badge on the landing page so we never advertise
 * something a customer can't use yet. Flip to `true` as each ships.
 */
export const LIVE = {
  reviews: true,
  qrPosters: true,
  dashboard: true,
  ai: true,
  alerts: true,
  tapPage: false,
  themes: false,
  whatsappStore: false,
  nfc: false,
  crm: false,
  loyalty: false
} as const;

export type Module = keyof typeof LIVE;
