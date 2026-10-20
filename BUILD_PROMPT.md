You are a senior full-stack engineer. Extend my EXISTING codebase — do NOT rewrite it from scratch.

## Existing project (read it first)
Path: `C:\Users\diwak\OneDrive\Desktop\Review QR\reviewqr-saas`
Stack: Next.js 14 (App Router) + TypeScript + Prisma 5 + PostgreSQL + NextAuth + Tailwind/Radix UI + Razorpay + qrcode + nodemailer + WhatsApp (Cloud API + Baileys), deployed on Railway.
Already built: multi-business / location / staff, review page `/r/[slug]`, short QR redirect `/q/[code]` with scan counter, feedback inbox with tags + status, AI questions/review drafts (`lib/ai.ts`), testimonials widget, campaigns, admin panel (pricing, branding, AI, email, WhatsApp, payments, audit log), billing.

Before writing code: read `README.md`, `prisma/schema.prisma`, `lib/qr.ts`, `app/q/[code]/route.ts`, `app/r/[slug]/review-flow.tsx`, `lib/ai.ts`. Then give me a written implementation plan split into phases, list the files you will add/change, and wait for my OK. Implement ONE phase at a time, use Prisma migrations (`prisma migrate dev`, not `db push`), keep all existing features working, and keep existing `/q/[code]` links working forever (already-printed QR codes must never break).

## Business context
I sell physical **NFC + QR products** (PVC cards, acrylic table standees, stickers) to Indian small businesses (restaurants, cafés, salons, clinics, gyms, shops). A customer either SCANS the QR or TAPS their phone on the NFC tag. Both open one fast mobile page of that business with buttons like **"View Menu / Order on WhatsApp"** and **"Give Feedback"**. I earn: one-time hardware price + monthly/yearly software subscription. I also want resellers/agents to sell for me.

The web app becomes my **CMS + operations system**: manage businesses, menus, tap pages, design and print QR/NFC products, program NFC tags, track orders and analytics.

## Phase 0 — Fix the existing foundation FIRST (an audit found these issues)
Security & billing bugs:
- `app/api/billing/razorpay/verify/route.ts`: replay bug — re-posting the same valid signature extends `subscriptionEndsAt` again. Make it idempotent (skip if payment already COMPLETED, unique `providerPaymentId`), verify amount with Razorpay API, and add a **Razorpay webhook route** (`payment.captured`, `subscription.*`) using the existing unused `verifyRazorpayWebhook`. Guard `timingSafeEqual` against length mismatch.
- Billing UI only uses manual UPI/USDT; wire Razorpay checkout into `billing-client.tsx`. Admin has no way to approve a manual payment — add an approve/reject button that calls `activateManually()`; manual activation must extend from the current end date (not reset to now). Use calendar months, not flat 30 days.
- Add a scheduled job (Railway cron or job queue) that runs `/api/billing/reconcile`, marks subscriptions EXPIRED, sends renewal reminders 7/3/1 days before and on expiry.
- Enforce ALL plan limits server-side: QR codes, monthly reviews, AI calls (per-business monthly AI quota + global daily cost cap), campaigns, templates, and future store products/orders. Define entitlements in one place.
- Forgot password is broken: emailed `/reset-password?token=` page and API don't exist. Build it; store only a hashed token with expiry; single use.
- Add email verification (and mobile OTP login, needed for India and the Android app).
- Cross-tenant bug: when creating QR/staff, verify `locationId`/`staffId` belong to the same business.
- Admin bootstrap: remove the default `ChangeMe@123` fallback; `seed-admin` must not reset the admin password on every deploy; never auto-create admin on login.
- Turnstile is effectively off on the public review form — render the widget and require the token when a secret is configured. Move rate limiting to DB/Redis (`rateLimitDb` exists but unused) so it works across instances.
- Add `middleware.ts` protecting `/dashboard` and `/admin`; reduce DB hits in the JWT callback (cache).
- Replace `prisma db push` in `railway.json` with `prisma migrate deploy` and create a baseline migration.
- Move images (logos, covers, branding) out of base64 DB columns into S3/R2 storage with resized variants.
- Customer data privacy (India DPDP Act 2023): add consent checkbox + consent timestamp when collecting name/phone/email, a privacy notice, data export/delete on request.
- Missing indexes: `Review(businessId, createdAt)`, `Review(businessId, rating)`, `Feedback(businessId, status)`, `Payment(providerOrderId)` unique; remove duplicate `QRCode.shortCode` index. Scan counter: dedupe bots/refreshes (same device within 30 min) and store scan events, not just a counter.
- Remove/finish advertised-but-missing features: campaigns sending, public REST API + webhooks (ApiKey model unused) — either build or remove claims from the marketing FAQ.
- Add tests: Vitest for lib/ (payments, limits, rating flow) and Playwright smoke tests for: register → create business → create QR → scan → review → feedback appears in dashboard → upgrade plan.

Missing core flows to add in this phase:
- **Owner onboarding wizard** after signup: business search via Google Places (auto-fill + review link) → logo/colors → pick theme → first QR generated → "Order your printed QR/NFC" CTA. Show a progress checklist on the dashboard until setup is complete.
- Owner can invite team members (manager/staff) with roles and permissions.
- Admin: approve payments, refunds (REFUNDED status), GST invoices for every payment (`invoiceUrl`), suspend/edit a business, "login as user" (impersonate, audit logged), support tickets / help chat, notification center.

## Phase 1 — Smart Tap Page (core)
- New public route `/t/[code]` (keep `/q/[code]` redirecting to it). Mobile-first, loads in <1s, works on slow 3G, SSR/edge cached, no heavy JS.
- Page shows business logo, cover, name, open/closed status, and a **button builder** configured from the dashboard: Menu / Order on WhatsApp, Give Feedback, Google Review, WhatsApp chat, Call, Directions (Google Maps), Instagram/Facebook/YouTube, Website, UPI Pay (upi:// deep link + UPI QR), Wi-Fi details, Current offer, Book appointment, Save contact (vCard). Each button: label (Hindi/English), icon, order, enabled toggle, optional schedule.
- It must look and work like a **Linktree-style profile page**: one link per business that opens a branded profile with stacked link buttons. Owner manages links from the dashboard (and app) with drag-and-drop ordering, add/edit/delete, show/hide, and live phone preview. Link types: built-in (Menu, Feedback, WhatsApp, Call, Maps, UPI…), **review platforms** (Google, Trustpilot, Facebook, Justdial, Zomato, Swiggy, TripAdvisor, Practo — any number, each with its own icon), and **custom link** (any URL + title + icon/emoji + optional thumbnail). Optional: highlight/pin a link, "featured" animated button, social icons row, short bio, photo gallery, YouTube embed.
- Super-admin can set default link sets per industry (restaurant, salon, clinic…) so a new business gets a ready page instantly.
- Optional pretty URL `/<slug>` in addition to `/t/<code>`.
- **Theme system (must look premium — this is a selling point):**
  - 15+ beautiful ready themes, each with a live thumbnail: Minimal White, Dark Luxe (black + gold), Glassmorphism, Café Warm (brown/cream), Fresh Green (organic/veg), Neon Night (bars/clubs), Pastel Bakery, Salon Rose, Clinic Clean (blue/white), Royal Indian (maroon + gold, mandala pattern), Gradient Sunset, Bold Brutalist, Nature photo background, Festive (Diwali/Holi/Eid/Christmas — schedulable), Corporate.
  - **Custom theme builder** with live phone preview: upload logo + cover/banner + favicon; background = solid / gradient / image / subtle animated pattern / short video; button style (filled, outline, soft shadow, glass, pill, square, 3D), button colors, corner radius, spacing; fonts (Google Fonts incl. Devanagari: Poppins, Inter, Playfair, Mukta, Noto Sans Devanagari, Hind); text colors; profile image shape (circle/rounded/square); entrance animation for buttons; light/dark auto. "Pick colors from logo" auto-palette. Save as named custom theme, duplicate, reset.
  - Contrast checker so text is always readable; themes must stay fast (CSS variables only, no heavy JS).
  - Super-admin can create/upload new themes and mark some as **premium** (higher plans only).
  - Theme is shared by the Tap page, the WhatsApp store, and the feedback page so the whole experience looks like the business's own brand. Hindi/English/Hinglish language toggle.
- Track source: encode `?src=nfc` in the NFC URL and `?src=qr` in the QR URL so analytics separate taps vs scans. Log every page view and button click (event table, no personal data, hashed IP, user-agent device type).
- If subscription expires: never show a dead link — show a basic page (name + call + directions) and notify the owner to renew.

## Phase 1A — Dynamic QR CMS (build together with Phase 1)
A simple web CMS for dynamic QR codes. Every printed QR/NFC contains a unique, unguessable ID in its URL, so what it opens can be changed any time without reprinting. Reuse the existing `Business` and `QRCode` models (extend them; keep old `/q/[code]` links working). Keep the UI minimal and mobile-friendly (works one-handed on a 360px phone, list views as cards, big tap targets).

1. **Businesses**: create/edit/archive a business with name, contact person, phone, WhatsApp number, email, address/city, logo. Search and filter the list.
2. **QR IDs & assignment**:
   - Generate QR IDs in bulk (e.g. 100 at a time) as unassigned stock, or one at a time for a business. Show/download each as PNG/SVG/PDF.
   - Assign a QR ID to a business (pick from list or scan the printed QR with the phone camera to select it), optionally with a label (Counter, Table 4, Bill, Staff name).
   - Reassign a QR ID to another business, with a confirmation step; keep an assignment history (who, when, from → to) in the audit log.
3. **Landing page per business** (edited in the CMS with live mobile preview): logo, name, short description and these sections, each with show/hide toggle, custom label and order:
   - **View Menu** — link to the WhatsApp store / menu page, an uploaded PDF/image menu, or an external URL.
   - **Give Feedback** — the existing private feedback form (`/r/[slug]` flow).
   - **External review links** — any number: Google, Trustpilot, Zomato, Justdial, Facebook, TripAdvisor, or custom (title + URL).
   Validate all URLs (https only, block `javascript:`/data URLs), save drafts and publish.
4. **QR statuses**: `UNASSIGNED` (in stock, shows a neutral "This QR is not activated yet" page with my contact/"Activate" CTA), `ACTIVE` (opens the business landing page), `DISABLED` (shows a polite "This QR is currently inactive" page, never an error). Actions: activate, deactivate/disable, re-enable, reassign, unassign back to stock. Filter the QR list by status and business; bulk actions.
5. **Public route**: `https://<domain>/q/<qrId>` resolves the QR ID → its business's landing page (render directly or 302 to `/<business-slug>?q=<qrId>` — keep the qrId for analytics). Unknown IDs show a friendly 404 page. Log each scan (timestamp, QR ID, device type, source `qr`/`nfc`, hashed IP) and dedupe repeat scans within 30 minutes.
6. **Security**:
   - QR IDs: cryptographically random, at least 10–12 characters from a URL-safe alphabet without look-alike characters (e.g. `nanoid` custom alphabet, ~60+ bits of entropy), unique index in DB; never sequential or derived from the business name. Rate-limit the public route to stop ID guessing.
   - HTTPS everywhere: redirect all HTTP → HTTPS (301) at the edge/middleware using `x-forwarded-proto`, HSTS header, canonical domain redirect (www → apex or vice versa). Build absolute URLs from the configured `NEXT_PUBLIC_APP_URL`, never from request headers alone.
   - CMS pages and APIs require login; only admins/agents (and the business owner for their own business) can edit; every change is written to the audit log.

## Phase 1B — Lightweight owner onboarding + 3-button customer page (cafés & any small business)
Goal: a café/shop owner goes from sign-up to a live QR in **under 3 minutes**, on a phone. Measure it: add a timer event from signup start → QR activated and show the median in the admin dashboard.

**Owner onboarding (max 4 screens, progress bar, skip anywhere, resume later):**
1. **Sign up** — mobile number + OTP (email optional), business name, category (Café, Restaurant, Salon, Shop, Other). No long forms.
2. **Activate your QR** — enter the QR ID printed on the stand, or tap "Scan" to read it with the phone camera. Show the QR's status before confirming: `UNASSIGNED` → "Activate for <business>?"; `ACTIVE` (another business) → blocked with "Contact support to reassign"; `DISABLED` → "This QR is disabled". Owners without a stand can skip and get a digital QR to download.
3. **Menu** — add items quickly: name, price, optional photo, category, veg/non-veg, available toggle. "Add another" stays on the same screen. Options: import from a photo of the paper menu (AI), or start from a category template (e.g. café: Coffee, Tea, Snacks, Desserts). Edit/reorder/hide items later from the dashboard.
4. **Review & contact links** — WhatsApp number for orders (verify), Google review link (auto-found from business name via Google Places, or paste), JustDial, Zomato, Trustpilot, Facebook or custom links. Then "Go live" → show the live page preview + share link.
After onboarding, the dashboard home shows a checklist of anything skipped.

**QR statuses in the owner's view:** a "My QR codes" list with a clear coloured badge for each — Unassigned (grey), Active (green), Disabled (red) — plus label (Counter/Table 2), scan count and actions: disable/enable, rename label, move to another of the owner's branches. Moving a QR to a different business is an admin/agent action (with audit log); owners request it with one tap.

**Customer page after scan (`/q/<qrId>`) — speed first:**
- Server-rendered, minimal JS, under ~50 KB of critical HTML/CSS, cached at the edge and revalidated when the owner edits; target LCP < 1.5 s on 4G and still usable on slow 3G. No third-party scripts on this page.
- Shows logo, business name, open/closed status and **3 big buttons** (full width, ≥ 56px tall, high contrast): **View Menu**, **Order on WhatsApp**, **Give Feedback**. Review links (Google, JustDial…) appear below as smaller buttons. If an owner hasn't set something up, that button is hidden — never a dead link.
- **Hindi/English toggle** at the top (remember choice in localStorage, default from browser language); all labels, menu UI and the WhatsApp message template are translated; owner can enter item names in either language.
- **View Menu**: categories, search, item cards; **add to cart** with quantity +/−, item notes and an order note; cart persists in localStorage; sticky cart bar with item count and total.
- **Order on WhatsApp**: asks only name (optional) and table no./pickup/delivery address, then opens `https://wa.me/<owner number>?text=...` with a clean summary:
  ```
  New order — <Business name>
  1. Cappuccino × 2 — ₹240
  2. Veg Sandwich × 1 — ₹120  (Note: no onion)
  Total: ₹360
  Table: 4 | Name: Rahul
  Note: Please hurry
  ```
  Use proper URL encoding and line breaks, keep it under WhatsApp's URL length limit (truncate notes if needed), currency formatted in ₹. Also save the order in the DB for the owner's order list. "Order on WhatsApp" from the home page opens the menu if the cart is empty.
- **Give Feedback**: star rating + optional comment + optional name/phone, with a short **privacy notice** shown right above the submit button (what is collected, why, that it goes only to the business owner, how to request deletion; link to privacy policy) and an explicit consent checkbox before any phone/email is stored. Public review links remain visible to everyone (Google policy).
- **Dynamic content, static URL**: the printed QR URL never changes; menu, prices, links, language text and button visibility all come from the database, so owners can update any time without reprinting.

## Phase 2 — WhatsApp Store (catalog + cart + order on WhatsApp)
Every business owner who logs in (website or Android app) gets a **"Create your WhatsApp Store" wizard** with a beautiful, simple, mobile-first UI (step 1 store info & timings → step 2 add products or AI-import → step 3 delivery/payment settings → step 4 pick theme → publish). The owner must be able to run the whole store from the phone.

**Owner side (CMS):**
- Categories and products: name, images (multiple, auto-compressed), description, price, MRP/offer price, unit (kg, plate, piece, ml), variants (size/half-full/colour) with own prices, add-ons (extra cheese), veg/non-veg/egg tag, bestseller/new tags, stock count or simple in-stock toggle, sort order, bulk edit prices, duplicate product.
- Works for any industry: restaurant menu, grocery/kirana, bakery, clothing, salon services (book a slot instead of cart), clinic (appointment request), electronics/repair (enquiry).
- **AI helpers**: import catalog from a photo/PDF of the paper menu or price list, write product descriptions, translate to Hindi, remove/clean product photo background, suggest prices format, generate an Instagram/WhatsApp status poster for any product or offer.
- Store settings: WhatsApp number (verify with OTP), store timings with auto "Closed now — order for later", holiday mode, order types (dine-in with table number, takeaway/pickup, home delivery), delivery area by pincode or km radius, delivery charge rules (flat, free above ₹X, by distance), minimum order value, packing charge, taxes (GST on/off), estimated preparation time.
- Payments: Cash/COD, UPI — show the owner's UPI ID/QR and put a `upi://pay?pa=...&am=<total>` link in the order so the buyer can pay instantly; optional Razorpay online payment for Pro plan.
- Offers: coupon codes, % or flat discount, combo deals, happy-hours pricing, "Buy 2 get 1", first-order discount — shown as banners in the store.
- Store link `/<slug>/store` + its own QR poster + "Share store" for WhatsApp status/Instagram bio; also link to existing WhatsApp Business catalog (`wa.me/c/<number>`) as an option.

**Buyer side (public store):**
- Fast (<1s), app-like: search, category chips, product cards with photos, variant/add-on sheet, floating cart bar with item count and total, cart saved in localStorage, notes per item and per order.
- Checkout asks only: name, mobile, order type (dine-in table no. auto-filled from table QR / pickup / delivery address + Google Maps pin), payment mode, coupon.
- "Place order on WhatsApp" → order is saved in DB with an order number, then opens `https://wa.me/<owner number>?text=<pre-formatted message>` containing order no., items × qty × price, add-ons, subtotal, discount, delivery charge, total, customer name/phone/address/map link, payment mode + UPI pay link, and a link to the order status page. Message must be neatly formatted with line breaks and work in Hindi too.
- Order status page for the buyer (`/o/<id>`): received → accepted → preparing → out for delivery → completed. "Reorder" button for repeat customers.

**Orders & customers (the real value for the owner):**
- Live orders screen in dashboard/app with sound + push notification, accept/reject, status updates (with one-tap WhatsApp message to the buyer with the new status), printable KOT/bill (58mm/80mm thermal printer format), daily sales summary.
- **Customer list (mini-CRM)** built automatically from orders and feedback (with consent checkbox): name, phone, total orders, total spend, last order date, tags (VIP, regular, inactive). Export CSV. Send offer broadcasts via click-to-chat lists or WhatsApp Cloud API templates (Pro plan).
- Loyalty: stamp card / points per order (e.g. 10th coffee free), auto-tracked by phone number.
- Reports: top products, sales by day/hour, average order value, repeat-customer %, orders by source (QR table, NFC, Instagram link, direct).

## Phase 3 — Feedback (make it Google-policy compliant)
Current flow sends 4★+ to Google and hides 1–3★ in a private form. Google's policy prohibits "review gating" (selectively asking only happy customers for public reviews), and AI-written reviews posted by customers can be treated as fake reviews (also see India's IS 19000:2022 online review standard). Change it to:
- Every customer sees BOTH options regardless of rating: "Leave a Google review" and "Tell the owner privately". Low ratings can show the private form first, but the Google link stays visible. Make `ratingThreshold` gating OFF by default and show an admin warning if enabled.
- AI may only help the customer polish THEIR OWN words/answers into a draft they can edit; no auto-generated reviews without customer input, no auto-posting, never offer rewards in exchange for Google reviews (rewards only for private feedback/visits).
- Keep: tags, NPS, inbox status workflow, instant email/WhatsApp alerts on negative feedback, "reply to customer on WhatsApp" button, AI-suggested replies for the owner to respond to Google reviews.

## Phase 4 — Print Studio (QR/NFC product designer, print-ready)
- Template library (at least 12, all editable): PVC card CR80 85.6×54 mm (front + back), table tent A6/A5, acrylic standee 4×6 in and 5×7 in, round sticker 50/75 mm, square sticker 60/100 mm, counter poster A4/A3, bill/receipt strip, keychain tag 30×50 mm, door sticker.
- Editor: logo upload, business name, CTA text ("Scan or Tap to order / review", Hindi + English), NFC icon, Google stars graphic, colors/gradients, fonts (incl. Devanagari font like Noto Sans Devanagari / Mukta), background images, 3+ QR styles (dots/rounded/square modules, custom eye shapes, logo in center, gradient) while keeping error correction H and checking minimum contrast and quiet zone so it always scans. Live preview + "scan test" warning if QR is too small (<20 mm).
- Export: **print-ready PDF** (vector QR, 300 DPI images, 3 mm bleed, crop marks, safe-zone guides, exact physical size), PNG 300 DPI, SVG. Print presets:
  - "Single item exact size" (for ID/PVC card printers like Evolis/Zebra/Epson — one card per page, front/back pages).
  - "Sheet imposition" (e.g. 10-up CR80 on A4, 4-up A6 on A4, SRA3 / 12×18 in for print shops) with cut marks.
  - Browser direct print using CSS `@page { size: ... }` with exact mm sizes and "Actual size / 100%" instructions.
- **Bulk generation**: generate N blank codes (unassigned stock) or one design for all tables of a business (Table 1…N each with its own code/label), download as one multi-page PDF or ZIP.
- Use server-side PDF generation (e.g. `pdf-lib` or `@react-pdf/renderer`) and `qr-code-styling`-like logic on the server for consistent output.

## Phase 5 — NFC tag management & stock activation
- Each physical unit = a `Device` record: shortCode, type (card/standee/sticker/keychain), NFC chip UID, chip type (NTAG213/215/216), status (in stock / assigned / active / disabled / lost), batch id, assigned business + location + table/staff.
- **Claim flow**: I pre-print blank stock in bulk; at the shop, I (or an agent) scan the code → "Activate" → choose/create the business → instantly live. Re-assign or disable a lost tag without reprinting.
- **NFC writer page** in admin using the Web NFC API (Chrome on Android): write the URL (`https://<domain>/t/<code>?src=nfc`), read back to verify, record UID, show instructions to lock the tag (or use NFC Tools app on iPhone). Bulk mode: write the next code in the queue on each tap.

## Phase 6 — E-commerce store + shipping (Shiprocket / Delhivery)
Customers buy my products themselves from the website AND the Android app (same backend, same cart, same orders).

**Customer journey (self-serve):**
1. Sign up with mobile OTP (or Google) → "Add your business": search the business by name using the **Google Places API** → auto-fill name, address, phone, place_id, and auto-build the Google review link (`https://search.google.com/local/writereview?placeid=<place_id>`). Manual link paste as fallback. Logo upload, WhatsApp number, menu link.
2. Tap page + QR are generated instantly in the customer panel (free preview with watermark) — customer can see and test it before paying.
3. Customer picks a product, customises the design in Print Studio (Phase 4) → order → pay → I print, write NFC, ship → customer gets tracking on WhatsApp/app.

**Catalog & pricing:**
- Products with variants and SKUs: e.g. "QR Standee (QR only)", "NFC + QR Combo (card + standee)", "Table pack ×5 / ×10", stickers, keychains. Fields: images, description, cost price, MRP, sale price, HSN code, GST %, weight & dimensions (for shipping), stock, min order qty.
- **Plans** (software): 1 month, 6 months, 1 year, plus a limited "Founder / Lifetime" plan (fair-use limits, capped quantity). Products can be sold as bundles: hardware + plan (e.g. Combo + 1 year). Plan entitlements per tier (number of tap pages, menu items, AI credits, analytics, custom domain).
- Cart, coupons/discount codes, referral codes, GST-inclusive pricing, GSTIN input for B2B invoice, multiple shipping addresses, pincode serviceability + delivery-date estimate on the product page.
- Payments: Razorpay (UPI, cards, netbanking) for one-time orders; Razorpay Subscriptions for recurring plans; renewal reminders 7/3/1 days before expiry on WhatsApp + email + push. Prepaid only for custom-printed products (COD disabled by default, or partial-COD with an advance, configurable).

**Order pipeline (admin "Production board", Kanban):**
`Paid → Design proof sent → Customer approved (or changes requested with comments) → Printing → NFC written & verified → Packed → Pickup scheduled → Shipped → Delivered` (+ `Cancelled`, `RTO`, `Reprint`). Each step logs who/when; customer sees the same timeline. Bulk actions: print all approved designs as one imposed PDF, write NFC in queue, generate labels for many orders.

**Shipping integration (provider-agnostic):**
- Create a `ShippingProvider` interface with adapters: **Shiprocket** (first) and **Delhivery** (second). Methods: `checkServiceability(pincode, weight)`, `getRates`, `createShipment`, `assignCourier/AWB`, `generateLabel`, `schedulePickup`, `trackShipment`, `cancelShipment`, and a webhook endpoint for status updates (verify signature/token).
- Store credentials encrypted in admin settings (reuse `lib/crypto.ts`), token caching/refresh, pickup address management, packaging presets (weight/dimensions per product).
- Automatic customer notifications on each status (WhatsApp + email + app push) with tracking link. Handle NDR (failed delivery) and RTO.
- GST tax invoice PDF (my GSTIN, HSN/SAC, CGST/SGST vs IGST by state), credit notes for refunds; refund/return policy page (custom printed items are non-returnable except damage/misprint → free reprint).

**Reseller/agent role**: agent dashboard, onboard businesses, activate stock assigned to them, place orders on behalf of customers, commission % per sale and renewal, payout report.

**Super-admin**: all businesses, orders, devices, stock batches, revenue, MRR, renewals due, churn, top agents, inventory alerts (low NFC chips / blank cards).

## Phase 7 — Android app (Google Play)
- Build with **Expo (React Native) + TypeScript**, sharing types/zod schemas and an API client with the web app (monorepo: `apps/web`, `apps/mobile`, `packages/shared`). Do NOT duplicate business logic in the app — the app only calls the backend API.
- App features: OTP login, add business (Places search), live tap-page preview + QR, Print Studio (simplified) + design approval, product store, cart, checkout (Razorpay React Native SDK), order tracking timeline, plans & renewal, feedback inbox, live WhatsApp/menu orders, analytics, **push notifications** (Expo Notifications / FCM) for new feedback, new orders, shipping updates, plan expiry. Hindi + English.
- Owner-side NFC writer inside the app (react-native-nfc-manager) so agents can write/verify tags in the field.
- Play Store readiness: app icon/splash, package name, signed AAB via EAS Build, privacy policy URL, Data Safety form answers, account deletion flow (in-app + web URL, required by Google), target the latest required Android API level. Note for me: digital subscriptions sold inside an Android app normally must use Google Play Billing (or India's user-choice billing); physical products can use Razorpay. Implement plans so they can be bought on the website and simply *shown/managed* in the app, and keep the billing layer switchable. Tell me what the current Play policy requires before implementing.

## Architecture changes required (do these before Phase 6 and 7)
- Versioned REST API `/api/v1/*` used by BOTH web and app (OpenAPI spec generated from zod). Mobile auth: OTP login → short-lived access token (JWT) + refresh token stored in secure storage; keep NextAuth cookies for the web.
- Roles: SUPER_ADMIN, ADMIN/OPERATIONS, AGENT, OWNER, STAFF.
- Background job queue (BullMQ + Redis) for: PDF generation, AI calls, shipment creation, webhook processing, notifications, renewal reminders, scheduled reports. Idempotent webhook handlers (Razorpay, Shiprocket, Delhivery).
- File storage on S3-compatible storage (Cloudflare R2) for logos, product images, print PDFs — not the local disk (Railway disk is ephemeral).
- Postgres with proper indexes, Prisma migrations, daily DB backups; Sentry for errors; structured logs (pino); uptime monitoring on `/t/*` (if tap pages go down, every printed product stops working — treat them as the most critical, cacheable path, consider serving them via CDN/edge cache).
- Feature flags + plan entitlements checked server-side.

## Payments — use my own UPI gateway (YouPI), not Razorpay
I run my own self-hosted UPI gateway: https://github.com/gxurav1710/YouPI-PG (payment-api `POST /api/v1/payments` with `Idempotency-Key`, `GET /api/v1/payments/{id}`, hosted `checkoutUrl` / `youpi.js` modal, HMAC-SHA256 signed webhooks `X-Gateway-Signature`, `X-Gateway-Delivery-Id`, `X-Gateway-Timestamp`). It confirms payments by matching bank SMS/email credit alerts to a static UPI VPA by exact amount + time window.
- Build a `PaymentProvider` interface (`createPayment`, `getStatus`, `verifyWebhook`, `refund?`) with a **YouPI adapter as the default**; keep the manual UPI flow (`lib/manual-payments.ts`) as fallback and leave Razorpay code behind a disabled flag. Replace every "Razorpay" reference in Phases 0, 6 and 7 with this provider.
- Webhook route: read raw body, verify HMAC with `timingSafeEqual` (length-checked), reject timestamps older than 5 minutes, store `X-Gateway-Delivery-Id` + `paymentId` and ignore duplicates, then re-fetch `GET /payments/{id}` and check amount + orderId match our invoice before activating the plan/order in ONE DB transaction; store the UTR. Return-page polling as a fallback.
- Create payments only from our server (never expose the call to the browser) and rate-limit per user, because YouPI payment creation has no merchant secret and only one live payment per VPA at a time — show a clear "another payment is in progress, please wait" state and a queue position.
- No UPI AutoPay in YouPI: renewals = a new invoice each period + WhatsApp/email reminders with a pay link. Refunds are manual (admin marks refunded + records UTR of the refund).
- Admin reconciliation screen: unmatched/late payments, manual match to an order by UTR, export for accounting; GST invoice for every confirmed payment.

## Phase 8 — Analytics & customer-delight features
- Owner dashboard: taps vs scans, views, button clicks, menu views, top items, WhatsApp orders, feedback trend, rating distribution, busiest hours heatmap, per-table and per-staff stats; weekly WhatsApp/email summary report; PDF monthly report.
- Engagement features (each toggleable per business): offers/coupon banner, spin-the-wheel or scratch card **for private feedback only**, digital loyalty stamp card (Nth visit free), "Call waiter / Need bill" button for tables, opt-in customer contact capture (with consent checkbox) for WhatsApp campaigns, birthday offers, festival templates (Diwali, Holi, Eid, Christmas) for posters and tap page, Google Business Profile post ideas generated by AI, staff leaderboard, event/booking page, digital visiting card (vCard + NFC card) as a separate product.
- Public testimonial widget (already exists) — show approved private/Google feedback on the business website.

- **Google Business Profile integration** (OAuth, owner connects their profile): pull real Google reviews into the dashboard, reply from the dashboard with AI-suggested replies, alert on new 1–2★ Google reviews, track rating and review count growth over time, post updates/offers to the profile.
- **Appointment booking** module for salons, clinics, gyms, tutors: services with duration and price, staff calendars, slots, booking confirmation and reminder on WhatsApp, no-show tracking.
- **Referral program**: owner refers another business → both get 1 month free; agents/resellers get commission.
- **Growth score**: one simple 0–100 score on the dashboard (reviews, rating, response rate, orders, repeat customers) with "do these 3 things this week" tips — makes the owner feel progress and keeps them subscribed.
- Help center: short Hindi video tutorials inside the dashboard, WhatsApp support button, in-app announcements.

## Non-functional requirements
- **Everything must be fully mobile responsive** (most owners will use only a phone): design mobile-first at 360px width, then tablet and desktop. No horizontal page scroll; tables become card lists on mobile; bottom navigation for owner dashboard AND admin panel; touch targets ≥ 44px; sticky action buttons; forms in single column; modals become bottom sheets on mobile; test every page at 360, 390, 768, 1280px with Playwright screenshots. Fix existing fixed `grid-cols-3` layouts (e.g. `dashboard/businesses/page.tsx`, `businesses/[id]/edit/edit-form.tsx`, `review-templates/templates-client.tsx`).
- Accessible (WCAG AA contrast, labels), Hindi + English i18n, PWA for the owner dashboard (install, push notifications, offline shell).
- Security: role-based access (SUPER_ADMIN, AGENT, OWNER, STAFF), zod validation, rate limits, Turnstile on public forms, sanitize all user content, SSRF-safe image fetching, audit log for admin actions.
- WhatsApp: prefer the official WhatsApp Cloud API for notifications; keep Baileys only as an optional fallback (it is unofficial and the number can be banned).
- Performance: tap page and menu page Lighthouse ≥ 90 on mobile; images optimized (next/image, WebP).
- Seed script with a demo café (menu, devices, feedback, orders) so I can demo to customers.
- Update README with setup, env vars, and a "how to print / how to write NFC" guide.
- After each phase: run `npm run build` and lint, fix errors, and summarise what changed and how to test it.
