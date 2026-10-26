# Admin web removals

Part 2 removed the verified page files listed below. Supporting forms and APIs remain where another screen uses them.

Old URLs that moved are permanent redirects in `next.config.mjs`. A redirect target imports retained forms directly; it does not need the old route page module.

| Path | Why it can go in part 2 | Replaced by |
|---|---|---|
| `app/admin/users/page.tsx` | Redirect `/admin/users` → `/admin/customers`. No other page imports it. | `app/admin/customers/page.tsx` |
| `app/admin/users/[id]/page.tsx` | Redirect `/admin/users/:id` → `/admin/customers/:id`. | `app/admin/customers/[id]/page.tsx` still imports `user-edit.tsx` from this folder. Delete the page only, not the form, until that import moves. |
| `app/admin/pricing/page.tsx` | Redirect `/admin/pricing` → `/admin/plans?tab=copy`. | Plans copy tab renders `pricing-form.tsx`. Keep the form. |
| `app/admin/app/page.tsx` | Redirect `/admin/app` → `/admin/apps`. | `app/admin/apps/page.tsx` imports `app-form.tsx` and `devices.tsx` from this folder. Keep those components. |
| `app/admin/_legacy/overview.tsx` | Copy of the old home page. Not a route. Nothing imports it. | `app/admin/page.tsx` on `loadAdminDashboard`. |
| `app/admin/_legacy/audit.tsx` | Copy of the old audit page. Not a route. Nothing imports it. | `app/admin/audit/page.tsx` on `listAdminAuditPage`. |

The merged part 2 routes are now live. `next.config.mjs` permanently redirects the relevant legacy URLs:

`/admin/users`, `/admin/users/:id`, `/admin/pricing`, `/admin/app`, `/admin/production`, `/admin/production/nfc`, `/admin/shop`, `/admin/shop/reports`, `/admin/qr`, `/admin/print`, `/admin/nfc`, `/admin/shipping`, `/admin/branding`, and `/admin/presets`. `/admin/print/paper` and the existing WhatsApp, Email, AI, Website, Tap themes, Help, and Support routes remain available.

## Deleted in part 2 (verified)

| Deleted path | Evidence and replacement |
|---|---|
| `app/admin/users/page.tsx` | `rg` found no import of the page. `/admin/users` permanently redirects to `/admin/customers`; the API routes under `app/api/admin/users` remain. |
| `app/admin/users/[id]/page.tsx` | The page itself had no importer. `/admin/users/:id` permanently redirects to `/admin/customers/:id`. `user-edit.tsx` stays because the customer detail imports it. |
| `app/admin/pricing/page.tsx` | No page import found. `/admin/pricing` permanently redirects to `/admin/plans?tab=copy`; `pricing-form.tsx` remains in use there. |
| `app/admin/app/page.tsx` | No page import found. `/admin/app` permanently redirects to `/admin/apps`; `app-form.tsx` and `devices.tsx` remain in use there and in the device E2E flow. |
| `app/admin/_legacy/overview.tsx` | `rg` found no import or route reference to this non-route file. The live `/admin` page uses `loadAdminDashboard`. |
| `app/admin/_legacy/audit.tsx` | `rg` found no import or route reference to this non-route file. The live `/admin/audit` page uses `listAdminAudit`. |

The removed files were rechecked with `rg` after removal. No Prisma models or data were changed.

`components/admin/production-board.tsx`, `components/admin/help-manager.tsx`, `components/admin/shop-checkout-settings.tsx`, and `components/admin/shop-credit-form.tsx` are still imported by those screens.

Same-path screens were rebuilt in place, so they are not redirects: `/admin`, `/admin/businesses`, `/admin/payments`, `/admin/plans`, `/admin/referrals`, `/admin/agents`, `/admin/commissions`, `/admin/audit`.
