# Admin web inventory

Mapped on 2026-10-26 from `app/admin/**`, `components/admin/**`, and `app/api/admin/**` on `feat/admin-api` (`f183ff8`). Part 1 rebuilds Home through Apps. Part 2 screens stay on their current URLs inside the new shell so nothing is unreachable. Nothing in this list is deleted in part 1.

Evidence for "remove" is "the new route renders the same control, and the old file has no other importer." Deletion waits for part 2.

## Pages

| Current | What it does | New home |
|---|---|---|
| `app/admin/page.tsx` | Overview: four counters plus time-to-first-QR. Loads recent users in the page. | **Home** `/admin`. Rebuilt on `loadAdminDashboard`. Old file moves to `app/admin/_legacy/overview.tsx` (not a route). |
| `app/admin/layout.tsx` | `requireAdminPage` + `AdminShell`. | Stays. Shell implementation moves to `components/admin/ui`. |
| `app/admin/users/page.tsx` | Owner list, search, tier and role filters, capped at 100 rows. | **Customers** `/admin/customers`. Redirect `/admin/users`. |
| `app/admin/users/[id]/page.tsx` + `user-edit.tsx` | Plan, tier, role, suspend, extend, businesses. | **Customer detail** `/admin/customers/[id]`. Redirect `/admin/users/:id`. Actions call `lib/admin/people.ts`. |
| `app/admin/businesses/page.tsx` | Business list, search, active filter, capped at 100. | **Businesses** `/admin/businesses` (same URL, rebuilt, server-paginated). |
| `app/admin/businesses/[id]/page.tsx` + `edit-form.tsx` | Name, active, review gating, threshold. | **Business detail** `/admin/businesses/[id]`. Editor stays; detail adds QR, orders, reviews from `loadAdminBusiness`. |
| `app/admin/payments/page.tsx` + `payment-actions.tsx` + `payments-form.tsx` | Queue, approve, reject, refund, UPI settings. | **Payments** `/admin/payments` and `/admin/payments/[id]`. UPI settings form stays on the page (no feature drop). List uses `listAdminPayments`. |
| `app/admin/plans/page.tsx` + `plans-board.tsx` | Module plan editor. Playwright depends on New plan, Name (English/Hindi), Slug, Menu, MONTH_* price, Save plan. | **Plans & pricing** `/admin/plans`. Board stays. Pricing copy becomes the Copy tab. |
| `app/admin/plans` has no `[id]` | — | **Plan detail** `/admin/plans/[id]` opens the same editor for one plan. |
| `app/admin/pricing/page.tsx` + `pricing-form.tsx` | Marketing prices, features, limits via `getPricingConfig`. | Tab on `/admin/plans?tab=copy`. Redirect `/admin/pricing`. Form component stays. |
| `app/admin/referrals/page.tsx` + `reward-form.tsx` | Reward days and hold. | **Referrals** `/admin/referrals`. Form stays; a paginated reward table is added. |
| `app/admin/agents/page.tsx` + `agents-board.tsx` + `team-desk.tsx` + `team-settings-form.tsx` | Create agent, rules, team tree, depth, TDS, leaderboard. Playwright depends on Name, Phone, Email, Create agent, Max team depth, TDS percent. | **Agents & teams** `/admin/agents` and `/admin/agents/[id]`. Existing boards stay on the list so those labels remain. |
| `app/admin/commissions/page.tsx` + `pay-button.tsx` + `legacy-actions.tsx` | Ledger, pay with UTR, legacy mark paid. | **Commissions & payouts** `/admin/commissions`. Mark paid requires a step-up OTP. Legacy actions stay. |
| `app/admin/audit/page.tsx` | Last 200 rows, no filters, no before/after. | **Audit log** `/admin/audit` via `listAdminAudit`, with filters and a diff. |
| `app/admin/app/page.tsx` + `app-form.tsx` + `devices.tsx` | versionCode, device approve/revoke, sign out all, funnel. Playwright looks for heading "Admin devices" and Approve. | **Apps & devices** `/admin/apps`. Redirect `/admin/app`. `AdminDevices` and `AppReleaseForm` stay mounted. |
| — | No settings screen for maintenance, TDS caps, flags. Those live on the agent form and the v1 settings service. | **Settings** `/admin/settings` on `loadAdminSettings` / `patchAdminSettings`. |
| — | No inbox. Pending agents are only on the agents page. | **Inbox** `/admin/inbox` on `loadAdminInbox` / `applyInboxAction`. |
| — | No subscription list. Status is a column on the user. | **Subscriptions** `/admin/subscriptions`. |
| — | No component gallery. | **Kit** `/admin/_kit` (admin only, `noindex`). |
| `app/admin/qr/page.tsx` + `stock-board.tsx` | Bulk QR codes, assign, disable. | Part 2 **Print & NFC tools** `/admin/tools` (QR stock tab). Stays at `/admin/qr` until then. |
| `app/admin/print/page.tsx` + `editor.tsx` | Print studio. | Part 2 `/admin/tools` print tab. Stays at `/admin/print`. |
| `app/admin/print/paper/page.tsx` | Paper preview. | Stays. Linked from print studio. Part 2 keeps it. |
| `app/admin/nfc/page.tsx` + `writer.tsx` | NFC writer. | Part 2 `/admin/tools` NFC tab. Stays at `/admin/nfc`. |
| `app/admin/production/page.tsx` | Shop board. Playwright uses article, "Send proof", region "Design proof sent", "Move to Printing". | Part 2 **Orders** `/admin/orders`. Stays at `/admin/production` until then. Do not restyle in part 1. |
| `app/admin/production/nfc/page.tsx` | NFC write queue. | Part 2 orders/tools. Stays. |
| `app/admin/shipping/page.tsx` + `shipping-form.tsx` | Carrier settings. | Part 2 orders pipeline. Stays at `/admin/shipping`. |
| `app/admin/shop/page.tsx` + `catalog-board.tsx` | Products, variants, stock. | Part 2 **Catalogue** `/admin/catalogue`. Stays at `/admin/shop`. |
| `app/admin/shop/reports/page.tsx` | Shop revenue cards. | Part 2 orders. Stays at `/admin/shop/reports`. |
| `app/admin/whatsapp/page.tsx` + `whatsapp-form.tsx` + `baileys-panel.tsx` | Cloud config, pairing, test send. | Part 2 **WhatsApp** `/admin/whatsapp`. Stays. |
| `app/admin/email/page.tsx` + `email-form.tsx` | SMTP provider and test. | Part 2 **Email** `/admin/email`. Stays. |
| `app/admin/ai/page.tsx` + `ai-form.tsx` | Model and usage settings. | Part 2 **AI reviews** `/admin/ai`. Stays. |
| `app/admin/site/page.tsx` + `site-form.tsx` | Maintenance is not here; landing and contact fields are. | Part 2 **Website** `/admin/site` merged with branding. Stays. |
| `app/admin/branding/page.tsx` + `branding-form.tsx` | Logo, name, tagline. | Part 2 website. Stays at `/admin/branding` until the merge. |
| `app/admin/themes/page.tsx` + `themes-form.tsx` | Tap themes. | Part 2 **Tap themes** `/admin/themes`. Stays. |
| `app/admin/presets/page.tsx` + `preset-form.tsx` | Industry presets. | Part 2 themes. Stays at `/admin/presets`. |
| `app/admin/help/page.tsx` | Help articles EN/HI. Uses `components/admin/help-manager.tsx`. | Part 2 **Help centre** `/admin/help`. Stays. |
| `app/admin/support/page.tsx` + `reply-form.tsx` | Ticket list and reply. | Part 2 **Tickets** `/admin/support`. Stays. No `[id]` route yet; the list is the thread. |

## Shared admin components

| File | Used by | New home |
|---|---|---|
| `components/admin/shell.tsx` | `app/admin/layout.tsx` | Replaced by `components/admin/ui` shell. Old sidebar labels move into the grouped nav. Part 2 URLs stay as links. |
| `components/admin/production-board.tsx` | Production page | Part 2 orders. Keep. |
| `components/admin/help-manager.tsx` | Help page | Part 2 help. Keep. |
| `components/admin/shop-checkout-settings.tsx` | Shop page | Part 2 catalogue. Keep. |
| `components/admin/shop-credit-form.tsx` | Shop order tools | Part 2 orders. Keep. |

## Cookie API routes (`app/api/admin`)

These stay. Part 1 adds thin cookie routes that call the same `lib/admin` services. None of the routes below are removed in part 1.

| Route | New home |
|---|---|
| `POST /api/admin/agents`, `POST /api/admin/agents/[id]`, `POST /api/admin/agents/team-settings` | Agents screen. Still the create/approve/settings endpoints the current boards and Playwright call. |
| `PATCH /api/admin/businesses/[id]` | Business detail editor. |
| `POST /api/admin/branding` | Part 2 website. |
| `POST /api/admin/commission-rules` | Agents commission rules. |
| `POST /api/admin/commissions`, `POST /api/admin/commissions/legacy`, `GET /api/admin/commissions/export` | Commissions. New mark-paid UI adds step-up before this POST. |
| `POST /api/admin/devices` | Apps & devices. Approve / revoke / sign out all. |
| `POST /api/admin/email/test` | Part 2 email. |
| `POST /api/admin/help`, `POST /api/admin/help/video` | Part 2 help. |
| `POST /api/admin/impersonate` | Customer detail keeps a link to this. |
| `POST /api/admin/nfc` | Part 2 tools. |
| `POST /api/admin/payments/[id]` | Payment detail actions. |
| `POST /api/admin/plans`, `PATCH /api/admin/plans/[id]`, `POST /api/admin/plans/reorder` | Plans editor. |
| `POST /api/admin/presets` | Part 2 themes. |
| `POST /api/admin/pricing` | Plans copy tab. |
| `POST /api/admin/print`, `POST /api/admin/print/batch` | Part 2 tools. |
| `POST /api/admin/qr` | Part 2 tools. |
| `POST /api/admin/referrals` | Referrals form. |
| `POST /api/admin/settings/ai`, `.../ai/models`, `.../ai/test` | Part 2 AI. |
| `POST /api/admin/settings/app` | Apps release form. |
| `POST /api/admin/settings/email` | Part 2 email. |
| `POST /api/admin/settings/payments`, `.../test-email` | Payments UPI settings. |
| `POST /api/admin/settings/shipping` | Part 2 shipping. |
| `POST /api/admin/settings/site` | Part 2 website. Maintenance for the new Settings screen uses `patchAdminSettings`, which already calls `setSiteConfig` without wiping other keys. |
| `POST /api/admin/settings/turnstile` | Part 2 website. |
| `POST /api/admin/settings/whatsapp` | Part 2 WhatsApp. |
| `shop/orders/[id]/credit|move|proof|reprint|ship`, `shop/orders/labels`, `shop/orders/print` | Part 2 orders. |
| `shop/products`, `shop/products/[id]`, `shop/variants`, `shop/variants/[id]`, `shop/settings` | Part 2 catalogue. |
| `POST /api/admin/support/[id]` | Part 2 tickets. |
| `POST /api/admin/themes` | Part 2 themes. |
| `POST /api/admin/users/[id]` | Customer actions that the old user editor still posts. The new detail page calls `lib/admin/people.ts` through a cookie route. |
| `whatsapp/baileys/connect|disconnect|status`, `whatsapp/test` | Part 2 WhatsApp. |

## Part 2 completion map (2026-10-26)

| Screen | Current route | Shared service / retained capability |
|---|---|---|
| Orders pipeline and detail | `/admin/orders`, `/admin/orders/[id]` | `lib/admin/orders.ts` owns safe filters, server pagination, masked customer data, detail and status audit timeline. Board actions keep using audited order endpoints. Table/board, proof links, tracking, NFC queue, reports and shipping are reachable from Orders. |
| Catalogue | `/admin/catalogue` | `lib/admin/catalogue.ts` loads catalogue, stock status and checkout settings. Existing product/variant editor and checkout settings remain mounted. |
| Print & NFC tools | `/admin/tools?tab=qr|print|nfc` | `lib/admin/tools.ts` owns QR stock filters; existing QR assignment, print editor and NFC writer remain available. `/admin/print/paper` remains reachable from the print editor. |
| WhatsApp, Email, AI reviews | `/admin/whatsapp`, `/admin/email`, `/admin/ai` | Existing forms remain. WhatsApp web pairing requires the action-bound, single-use `whatsapp_pairing` step-up before connect or disconnect. |
| Website | `/admin/site?tab=settings|branding` | Existing site and platform branding editors are merged in one page. `lib/admin/site-admin.ts` loads platform branding. |
| Tap themes | `/admin/themes?tab=themes|presets` | Existing theme and industry preset editors are merged; saved settings load through `lib/admin/site-admin.ts`. |
| Help centre | `/admin/help` | Help manager supports create and edit as well as publish, announcements and settings. Existing help API endpoints remain. |
| Support tickets | `/admin/support`, `/admin/support/[id]` | `lib/admin/support-admin.ts` provides masked, paginated list and detail data plus replies. |

Legacy routes permanently redirect in `next.config.mjs`: production and shipping screens to Orders tabs, shop to Catalogue, QR/print/NFC to Tools tabs, branding to Website, and presets to Tap themes. The removed page files in `REMOVALS.md` were deleted after the importer and route search check.

## Services already shared with the admin API

Part 1 pages call these instead of querying Prisma in the page:

`loadAdminDashboard`, `loadAdminInbox`, `applyInboxAction`, `adminSearch`, `loadAdminUser`, `loadAdminBusiness`, the people mutations, `listAdminPayments`, `loadAdminPayment`, payment mutations, `listAdminCommissions`, `approveAdminCommissions`, `payAdminCommissions`, `listAdminPlans`, `patchAdminPlan`, `loadAdminTeam`, `applyAdminTeamAction`, `listAdminAudit`, `loadAdminSettings`, `patchAdminSettings`, `adminDeviceRows`, `setAdminDeviceStatus`, `signOutAllAdminDevices`, `logAudit`.

New list helpers (customers, businesses, subscriptions, referrals, export) are added under `lib/admin` and covered by Vitest. They paginate. They do not replace the functions above.
