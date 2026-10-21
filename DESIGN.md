# ReviewQR design direction

Three reference demos set the look. Use them for **inspiration only**: they are paid templates ("Buy this template"), so do not copy their code, images, illustrations or copywriting. Recreate the feel with our own components, Tailwind tokens and content.

| Surface | Reference | Feel |
|---|---|---|
| Auth: login, register, forgot/reset password, OTP, invite accept | https://demo.codeandchill.store/flow/ | Dark, calm, glowing glass card |
| Customer store / menu / cart (Phase 1B & 2) | https://demo.codeandchill.store/sola/ | Warm cream, editorial serif, tactile product cards, floating bag |
| Marketing landing page and public pages | https://demo.codeandchill.store/kvist/ | Warm off-white, big grotesque headlines, floating pill nav, pastel tiles |

All three are fully responsive. Design mobile-first at 360px, then 390, 768, 1280.

## Shared foundations

- Define every colour, radius, shadow and font as CSS variables / Tailwind theme tokens, so the business theme system (Phase 1) can override them. No hard-coded hex values in components.
- Fonts through `next/font/google` (all free on Google Fonts): **Bricolage Grotesque** (display), **Geist** or **Inter** (UI/body), **Fraunces** (store serif), **Sora** + **Manrope** (auth). Add **Noto Sans Devanagari** / **Mukta** as the Hindi fallback in every stack. Subset to latin + devanagari, `display: swap`; load only the fonts a route needs.
- Radii: controls 12–14px, cards 20–28px, buttons and chips fully rounded (pill).
- Motion: short (150–300ms) ease-out transitions, subtle scroll reveals, add-to-cart micro animation. Respect `prefers-reduced-motion`. No animation may delay content: the customer tap/store page must still hit LCP < 1.5s on 4G.
- Accessibility: WCAG AA contrast (check gradient text and glass cards), visible focus rings, 44px+ touch targets, labels on every input.

## 1. Auth pages (Flow-inspired)

- Background: near-black navy (`#070B12`) with one or two very soft radial glows (cyan/blue, low opacity) — no images.
- A small glowing orb/logo mark above the card (our ReviewQR mark with a soft cyan glow).
- Centered card, max-width ~400px: translucent surface (white ~4%), 1px border (white ~10%), radius ~24px, `backdrop-filter: blur`, soft cyan outer glow.
- Title in **Sora 800** with a cyan gradient text (`#7CE7FF → #35C8F0`), short friendly subtitle in muted grey-blue.
- Inputs: dark translucent fill, 1px subtle border, radius ~13px, light text, eye toggle on password; focus = cyan border + glow ring.
- Primary button: full width pill with a sky → blue gradient and a soft glow; hover brightens; loading spinner inside.
- Secondary row: "Remember me" checkbox + cyan "Forgot password?" link; divider "or continue with"; outlined dark pill buttons (Google, and phone OTP instead of Apple).
- Footer link: "New here? Create account" in cyan.
- On mobile the card fills the width with 16px gutters; glows scale down.

## 2. Customer store, menu and cart (compact Swiggy-style list)

The live implementation is `components/tap/store-menu.tsx` + the `.store-*` styles in `app/globals.css`. Keep this anatomy; extend it, do not replace it. (The earlier Sola-style card grid is retired.)

- Sticky header: back to the tap page, EN/हिं toggle, business name, one-line subtitle, search field and a "Veg only" switch.
- Sections: "Recommended" (bestsellers) first, then one section per category with an item count; a floating MENU button opens a category list that scrolls to the section.
- Item row (list, not cards): left column has the veg/egg/non-veg food mark, an optional ★ Bestseller tag, the name, price with optional crossed-out MRP and "% off", and a two-line description; right column has a ~124px rounded thumbnail with the ADD button overlapping its bottom edge (ADD becomes a − qty + stepper). Rows without a photo show only the ADD button. Dashed dividers between rows.
- Full-width sticky cart bar at the bottom: "N items added · ₹total" and "View cart". The cart opens as a bottom sheet on phones and a right drawer on desktop, with per-line steppers and notes, total, privacy notice and the Order on WhatsApp button.
- Colours come from the business theme (`--store-*` tokens, CTA = theme button colour); unthemed menus use a green CTA. Food marks stay green / amber / red regardless of theme.
- New store features (variants, add-ons, coupons, delivery options, order status) must fit into this row + sheet pattern: variants/add-ons open a small bottom sheet from ADD, coupons and delivery live in the cart sheet.

## 3. Landing page and public marketing pages (Kvist-inspired)

- Background: warm off-white (`#F2EFE9`), ink (`#1C1B18`), with our brand green used only as an accent (badges, highlights, small icons), not for large surfaces.
- Floating pill navbar: translucent, blurred, rounded, logo left, links centre, account icon + dark pill CTA right ("Start free"). On mobile: logo + CTA + menu button; the menu opens as a full-width rounded sheet.
- Hero: very large **Bricolage Grotesque** headline (36–40px mobile, 64–72px desktop, weight ~650, tight leading), short subcopy, dark pill primary CTA + light secondary, a large product visual (phone mock of the tap page / NFC stand) with gentle reveal animation.
- Sections are full-bleed edge-to-edge bands with alternating warm backgrounds, lots of whitespace, and no boxed card around a whole section.
- Feature / product tiles: pastel backgrounds (sage, blush, sky, sand) with the object centered, small category label above, title + price-like metadata row, "Low stock"-style small pill tags for "Coming soon" / "New".
- A floating bottom pill bar for quick filters/anchors on long pages (e.g. Features · Store · QR+NFC · Pricing) — hidden on very small screens if it covers content.
- Footer: calm, multi-column on desktop, stacked on mobile.

## 4. Owner dashboard and admin

Not in the references. Keep them consistent with the landing palette: warm off-white background, white cards (radius 20px), ink text, dark pill primary buttons, brand green for success/positive states. Bottom navigation on mobile, tables become card lists under 768px. Optional dark mode can reuse the auth palette.

## Done means

- Every page in scope matches the direction above at 360, 390, 768 and 1280px with no horizontal scroll.
- Lighthouse mobile ≥ 90 (performance and accessibility) on the landing page, the customer tap page and the store page.
- Screenshots at those widths are attached to the PR for review.
