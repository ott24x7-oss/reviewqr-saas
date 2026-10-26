# Owner dashboard inventory

Baseline: local release/app-v6, inspected before UI changes. The dashboard route group contains 79 tracked files. This map keeps all current owner and agent actions reachable while regrouping the owner navigation.

## Destination routes

| IA destination | Canonical route |
|---|---|
| Home | /dashboard |
| Sell · Orders | /dashboard/sell/orders |
| Sell · Menu & products | /dashboard/sell/menu |
| Sell · Customers | /dashboard/sell/customers |
| Sell · Offers & campaigns | /dashboard/sell/campaigns |
| Reputation · Reviews | /dashboard/reputation/reviews |
| Reputation · Feedback | /dashboard/reputation/feedback |
| Reputation · AI replies | /dashboard/reputation/ai-replies |
| Page & QR · My page | /dashboard/page |
| Page & QR · QR codes & NFC | /dashboard/page/qr |
| Page & QR · Print & order stands | /dashboard/page/print |
| Insights · Analytics | /dashboard/insights |
| Account · Plan & billing | /dashboard/account/plan |
| Account · Refer & earn | /dashboard/account/refer |
| Account · Settings | /dashboard/account/settings |
| Account · Help | /dashboard/account/help |
| Agent group | /dashboard/agent/* |

## Existing pages and components

Each source path below is mapped once. “Merge” means its current feature becomes a tab, panel, or action in the listed IA destination; the underlying owner data and task remain available.

| Existing source | New place in the IA | Decision and evidence |
|---|---|---|
| app/(dashboard)/layout.tsx | Shared owner shell | Restyle shell and provide grouped navigation, business switcher, search, notifications, theme control, and mobile drawer. |
| app/(dashboard)/dashboard/page.tsx | Home | Retain current dashboard data and onboarding destinations in the new stepper, today strip, to-do list, growth panel, and account-finish card. |
| app/(dashboard)/dashboard/orders/page.tsx | Sell · Orders | Current orders query and status handling stay on the Orders screen. |
| app/(dashboard)/dashboard/orders/orders-board.tsx | Sell · Orders | Merge board presentation and KOT/bill actions into the Orders view and detail drawer. |
| app/(dashboard)/dashboard/businesses/page.tsx | Account · Settings · Businesses | Merge existing business list into the shell switcher and Settings business section; current list links prove this is the business-selection task. |
| app/(dashboard)/dashboard/businesses/new/page.tsx | Home · Setup stepper; Account · Settings · Business details | Merge new-business creation into the setup step and preserve the same creation flow. |
| app/(dashboard)/dashboard/businesses/[id]/page.tsx | Page & QR · My page | Merge business overview links into the My page tabs; its links already lead to the page, QR, menu, store, staff, and print editors. |
| app/(dashboard)/dashboard/businesses/[id]/business-actions.tsx | Page & QR · My page | Merge current business-level actions into the business header actions. |
| app/(dashboard)/dashboard/businesses/[id]/edit/page.tsx | Account · Settings · Business details | Merge the existing profile route into Settings. |
| app/(dashboard)/dashboard/businesses/[id]/edit/edit-form.tsx | Account · Settings · Business details | Keep the current business form and save action in the Settings form section. |
| app/(dashboard)/dashboard/businesses/[id]/locations/page.tsx | Account · Settings · Locations | Merge the location screen into the Settings business section. |
| app/(dashboard)/dashboard/businesses/[id]/locations/locations-client.tsx | Account · Settings · Locations | Keep location editing in that Settings section. |
| app/(dashboard)/dashboard/businesses/[id]/menu/page.tsx | Sell · Menu & products | Merge the per-business menu editor into the shared menu screen, with the business switcher supplying context. |
| app/(dashboard)/dashboard/businesses/[id]/menu/menu-editor.tsx | Sell · Menu & products | Keep existing menu editing controls in the combined catalog. |
| app/(dashboard)/dashboard/businesses/[id]/menu/menu-entry.tsx | Sell · Menu & products | Keep item and category editing in the catalog. |
| app/(dashboard)/dashboard/businesses/[id]/offers/page.tsx | Sell · Offers & campaigns | Merge the per-business offer editor into the campaigns screen; the page already uses the plan gate. |
| app/(dashboard)/dashboard/businesses/[id]/offers/offers-editor.tsx | Sell · Offers & campaigns | Keep the existing offer fields and saving behavior in the merged screen. |
| app/(dashboard)/dashboard/campaigns/page.tsx | Sell · Offers & campaigns | Merge existing campaign list and send-state into the combined screen; sending remains gated by CAMPAIGN_SEND_ENABLED. |
| app/(dashboard)/dashboard/businesses/[id]/store/page.tsx | Account · Settings · Store hours & UPI | Merge per-business store settings into the Settings section; the page already applies the plan gate. |
| app/(dashboard)/dashboard/businesses/[id]/store/store-form.tsx | Account · Settings · Store hours & UPI | Keep the current settings fields and save behavior. |
| app/(dashboard)/dashboard/businesses/[id]/staff/page.tsx | Account · Settings · Team & staff | Merge the staff screen into Settings. |
| app/(dashboard)/dashboard/businesses/[id]/staff/staff-client.tsx | Account · Settings · Team & staff | Keep current staff management actions. |
| app/(dashboard)/dashboard/businesses/[id]/tap/page.tsx | Page & QR · My page · Buttons tab | Merge the existing tap-page buttons editor into the My page tabs. |
| app/(dashboard)/dashboard/businesses/[id]/tap/tap-editor.tsx | Page & QR · My page · Buttons tab | Keep current button editing and ordering controls. |
| app/(dashboard)/dashboard/businesses/[id]/theme/page.tsx | Page & QR · My page · Theme tab | Merge the theme route into the My page tabs. |
| app/(dashboard)/dashboard/businesses/[id]/theme/theme-editor.tsx | Page & QR · My page · Theme tab | Keep the theme editor and its current save flow. |
| app/(dashboard)/dashboard/businesses/[id]/testimonials/page.tsx | Page & QR · My page · Testimonials tab | Merge the testimonial route into My page; the business overview already links to it. |
| app/(dashboard)/dashboard/businesses/[id]/testimonials/testimonials-client.tsx | Page & QR · My page · Testimonials tab | Keep testimonial management in that tab. |
| app/(dashboard)/dashboard/businesses/[id]/review-templates/page.tsx | Reputation · Reviews · Reply templates | Merge the template route into Reviews; the screen is linked from its business context. |
| app/(dashboard)/dashboard/businesses/[id]/review-templates/templates-client.tsx | Reputation · Reviews · Reply templates | Keep reply-template editing in that view. |
| app/(dashboard)/dashboard/businesses/[id]/ai/page.tsx | Reputation · AI replies | Merge business-specific AI settings into the AI replies screen. |
| app/(dashboard)/dashboard/businesses/[id]/ai/ai-client.tsx | Reputation · AI replies | Keep the existing per-business AI controls. |
| app/(dashboard)/dashboard/ai/page.tsx | Reputation · AI replies | Merge the cross-business AI page with the per-business AI controls. |
| app/(dashboard)/dashboard/reviews/page.tsx | Reputation · Reviews | Keep the existing rating and business filters in the Reviews screen. |
| app/(dashboard)/dashboard/feedback/page.tsx | Reputation · Feedback | Keep the current feedback inbox and reply actions. |
| app/(dashboard)/dashboard/feedback/feedback-filter.tsx | Reputation · Feedback | Merge current feedback filters into the inbox toolbar. |
| app/(dashboard)/dashboard/feedback/feedback-item.tsx | Reputation · Feedback · Detail drawer | Merge current feedback detail and reply controls into the shared detail drawer. |
| app/(dashboard)/dashboard/customers/page.tsx | Sell · Customers | Keep current customer records, export, and list task. |
| app/(dashboard)/dashboard/customers/customer-tags.tsx | Sell · Customers | Merge tag actions into the customer list/detail drawer. |
| app/(dashboard)/dashboard/analytics/page.tsx | Insights · Analytics | Keep existing analytics data and reports in the Analytics screen. |
| app/(dashboard)/dashboard/qr-codes/page.tsx | Page & QR · QR codes & NFC | Merge the QR board and tag activation entry point into the QR screen. |
| app/(dashboard)/dashboard/qr-codes/qr-board.tsx | Page & QR · QR codes & NFC | Keep current code rows and scan/device actions in the QR list. |
| app/(dashboard)/dashboard/qr-codes/[code]/page.tsx | Page & QR · QR codes & NFC · Code detail drawer | Merge QR detail and download actions into the drawer. |
| app/(dashboard)/dashboard/qr-codes/[code]/poster-actions.tsx | Page & QR · QR codes & NFC · Code detail drawer | Keep poster download and share actions in QR detail. |
| app/(dashboard)/dashboard/businesses/[id]/qr/page.tsx | Page & QR · QR codes & NFC | Merge per-business QR creation into the QR screen. |
| app/(dashboard)/dashboard/businesses/[id]/qr/qr-create-client.tsx | Page & QR · QR codes & NFC | Keep the QR creation form in that screen. |
| app/(dashboard)/dashboard/activate/page.tsx | Page & QR · QR codes & NFC · NFC activation | Merge tag activation into the QR screen. |
| app/(dashboard)/dashboard/activate/activate-form.tsx | Page & QR · QR codes & NFC · NFC activation | Keep the current activation form and submission. |
| app/(dashboard)/dashboard/businesses/[id]/print/page.tsx | Page & QR · Print & order stands | Merge business QR print assets into the print screen. |
| app/(dashboard)/dashboard/print/paper/page.tsx | Page & QR · Print & order stands | Keep the existing print-ready paper view. |
| app/(dashboard)/dashboard/shop/page.tsx | Page & QR · Print & order stands · Shop | Merge the hardware catalog into the print and stands screen. |
| app/(dashboard)/dashboard/shop/[slug]/page.tsx | Page & QR · Print & order stands · Product detail | Keep product detail and checkout entry. |
| app/(dashboard)/dashboard/shop/cart/page.tsx | Page & QR · Print & order stands · Cart | Keep the cart and checkout. |
| app/(dashboard)/dashboard/shop/orders/page.tsx | Page & QR · Print & order stands · Orders | Keep hardware order history. |
| app/(dashboard)/dashboard/shop/orders/[id]/page.tsx | Page & QR · Print & order stands · Order detail | Keep order proof, tracking, and reprint actions. |
| app/(dashboard)/dashboard/shop/commission/page.tsx | Account · Refer & earn | Merge hardware referral commissions into the earnings view; the source queries shop commission records. |
| app/(dashboard)/dashboard/billing/page.tsx | Account · Plan & billing | Keep current plan, usage, invoices, and payment actions. |
| app/(dashboard)/dashboard/billing/billing-client.tsx | Account · Plan & billing | Keep the existing client billing interactions. |
| app/(dashboard)/dashboard/refer/page.tsx | Account · Refer & earn | Keep the current referral link and sharing actions. |
| app/(dashboard)/dashboard/settings/page.tsx | Account · Settings | Keep profile, notifications, language, and weekly-report settings. |
| app/(dashboard)/dashboard/settings/settings-form.tsx | Account · Settings | Keep the current settings form and save flow. |
| app/(dashboard)/dashboard/settings/account-privacy.tsx | Account · Settings · Privacy | Keep privacy controls in Settings. |
| app/(dashboard)/dashboard/help/page.tsx | Account · Help | Keep help content and support destinations. |
| app/(dashboard)/dashboard/notifications/page.tsx | Shared shell · Notifications drawer | Merge notification list into the shell bell; retain a direct destination for all notifications. |
| app/(dashboard)/dashboard/onboarding/page.tsx | Home · Setup stepper | Merge onboarding entry into the Home stepper. |
| app/(dashboard)/dashboard/onboarding/wizard.tsx | Home · Setup stepper · Business details | Keep the existing business creation/editing flow behind the setup step. |
| app/(dashboard)/dashboard/agent/layout.tsx | Agent group shell | Restyle within the shared kit while retaining the existing role guard. |
| app/(dashboard)/dashboard/agent/page.tsx | Agent group · Home | Restyle only; preserve the existing agent dashboard data and logic. |
| app/(dashboard)/dashboard/agent/agent-tabs.tsx | Agent group navigation | Restyle the existing Agent navigation and retain destinations. |
| app/(dashboard)/dashboard/agent/agent-tools.tsx | Agent group · Home actions | Restyle only; keep existing share and onboarding actions. |
| app/(dashboard)/dashboard/agent/earnings/page.tsx | Agent group · Earnings | Restyle only; preserve current earnings query and calculations. |
| app/(dashboard)/dashboard/agent/payouts/page.tsx | Agent group · Payouts | Restyle only; preserve statement and payout logic. |
| app/(dashboard)/dashboard/agent/team/page.tsx | Agent group · Team | Restyle only; preserve team query and permissions. |
| app/(dashboard)/dashboard/agent/team/team-panel.tsx | Agent group · Team | Restyle only; preserve member actions and share controls. |
| app/(dashboard)/dashboard/agent/team/[memberId]/page.tsx | Agent group · Team · Member detail | Restyle only; preserve detail and access checks. |
| app/(dashboard)/dashboard/agent/profile/page.tsx | Agent group · Profile | Restyle only; preserve profile data. |
| app/(dashboard)/dashboard/agent/profile/profile-form.tsx | Agent group · Profile | Restyle only; preserve the profile save flow. |
| app/(dashboard)/dashboard/agent/how/page.tsx | Agent group · How earnings work | Restyle only; retain the explanation screen. |
| app/(dashboard)/dashboard/agent/how/how-copy.tsx | Agent group · How earnings work | Keep existing Hindi and English copy. |

## Removal candidates

No removal is planned in the inventory slice. The old routes remain the compatibility surface until permanent redirects and Playwright coverage are in place. Any later removal must be listed in docs/owner-web/REMOVALS.md with import and route-search evidence.
