# Owner dashboard removals

No owner dashboard files were deleted in this slice.

The compatibility routes now redirect permanently to the owner IA, and the new pages reuse existing feature pages and components where those contain customer data or actions. The redirect and import search did not establish a safe deletion candidate, so legacy code remains available to the new route modules and retained action flows.

Evidence:

- `docs/owner-web/INVENTORY.md` maps all 79 dashboard files tracked at the `release/app-v6` baseline to an IA destination.
- `next.config.mjs` contains the permanent mappings for the old top-level and business-scoped dashboard URLs.
- `tests/e2e/owner-web.spec.ts` checks each configured legacy route redirects and exercises the canonical list and editor screens.
- The canonical screens import existing owner pages for orders, menus, billing, settings, AI, feedback, QR, print, and agent earnings flows. Their components remain required by those imports.

No Prisma models, columns, or stored data were removed or changed.
