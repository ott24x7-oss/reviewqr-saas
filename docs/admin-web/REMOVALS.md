# Admin web removals (part 1)

Nothing in this list was deleted. Part 2 deletes a file only after a search shows it has no remaining import and its route is no longer the one a screen renders.

Old URLs that moved are permanent redirects in `next.config.mjs`. The page files stay on disk so a redirect target can still import a form from them.

| Path | Why it can go in part 2 | Replaced by |
|---|---|---|
| `app/admin/users/page.tsx` | Redirect `/admin/users` → `/admin/customers`. No other page imports it. | `app/admin/customers/page.tsx` |
| `app/admin/users/[id]/page.tsx` | Redirect `/admin/users/:id` → `/admin/customers/:id`. | `app/admin/customers/[id]/page.tsx` still imports `user-edit.tsx` from this folder. Delete the page only, not the form, until that import moves. |
| `app/admin/pricing/page.tsx` | Redirect `/admin/pricing` → `/admin/plans?tab=copy`. | Plans copy tab renders `pricing-form.tsx`. Keep the form. |
| `app/admin/app/page.tsx` | Redirect `/admin/app` → `/admin/apps`. | `app/admin/apps/page.tsx` imports `app-form.tsx` and `devices.tsx` from this folder. Keep those components. |
| `app/admin/_legacy/overview.tsx` | Copy of the old home page. Not a route. Nothing imports it. | `app/admin/page.tsx` on `loadAdminDashboard`. |
| `app/admin/_legacy/audit.tsx` | Copy of the old audit page. Not a route. Nothing imports it. | `app/admin/audit/page.tsx` on `listAdminAuditPage`. |

These stay until part 2 rebuilds them. The new sidebar still links to the current URL:

`app/admin/production`, `app/admin/production/nfc`, `app/admin/shop`, `app/admin/shop/reports`, `app/admin/qr`, `app/admin/print`, `app/admin/print/paper`, `app/admin/nfc`, `app/admin/shipping`, `app/admin/whatsapp`, `app/admin/email`, `app/admin/ai`, `app/admin/site`, `app/admin/branding`, `app/admin/themes`, `app/admin/presets`, `app/admin/help`, `app/admin/support`, and the cookie routes under `app/api/admin` that those screens post to.

`components/admin/production-board.tsx`, `components/admin/help-manager.tsx`, `components/admin/shop-checkout-settings.tsx`, and `components/admin/shop-credit-form.tsx` are still imported by those screens.

Same-path screens were rebuilt in place, so they are not redirects: `/admin`, `/admin/businesses`, `/admin/payments`, `/admin/plans`, `/admin/referrals`, `/admin/agents`, `/admin/commissions`, `/admin/audit`.
