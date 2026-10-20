# ReviewQR

> Turn happy customers into Google reviews — and fix bad experiences privately.
> A production-ready review-management SaaS built for Indian SMBs.

![tech](https://img.shields.io/badge/Next.js-14-black) ![tech](https://img.shields.io/badge/TypeScript-5-blue) ![tech](https://img.shields.io/badge/Prisma-5-2D3748) ![tech](https://img.shields.io/badge/PostgreSQL-15-336791)

---

## ✨ What's inside

**Customer-facing flow**
- Mobile-first review page (`/r/[slug]`) with smart star → Google redirect
- 4★+ ratings auto-redirect to Google review URL
- 1–3★ ratings flow into a private feedback form (with tags + NPS)
- Per-location and per-staff review URLs (`?l=branch&s=arjun`)
- Short QR codes (`/q/[code]`) for printable posters

**Business dashboard** (mobile responsive, bottom-nav on mobile)
- Real-time analytics (avg rating, distribution, redirect rate)
- Feedback inbox with status workflow (new / in progress / resolved)
- Negative-feedback alerts via email **and** WhatsApp
- QR code generator with print-ready posters
- Multi-business / multi-location / multi-staff
- Smart feedback tags (service, price, staff, quality…)
- CSV export, monthly PDF reports
- WhatsApp click-to-chat templates + Cloud API
- Public testimonial widget (`<script>` snippet)
- White-label (Agency plan): logo, colors, custom domain
- YouPI checkout, with manual UPI as the fallback. Razorpay stays off unless enabled.

**Production-ready**
- NextAuth credential auth, bcrypt-hashed passwords
- Zod validation on every input
- DOMPurify sanitization + spam/duplicate detection
- Rate limiting (in-memory + DB) + Cloudflare Turnstile
- CSRF-safe forms, role-based access control
- Health check endpoint for Railway
- Mailer relay support (PHP relay or direct SMTP)

---

## 🚀 Quick start (local)

```bash
# 1. Install
npm install

# 2. Copy env file
cp .env.example .env
# Edit DATABASE_URL, NEXTAUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

# 3. Database setup. Use migrations. Do not use `prisma db push`.
npm run db:migrate    # prisma migrate dev — creates and applies migrations locally
npm run db:seed       # demo café. Set ADMIN_EMAIL and ADMIN_PASSWORD first.

# 4. Run
npm run dev
```

Open <http://localhost:3000>

**Demo accounts** (after seed):
- Owner: `demo@reviewqr.in` / `Demo@123` → has 120 demo reviews
- Admin: the email and password you set in `ADMIN_EMAIL` and `ADMIN_PASSWORD`. There is no default password. Seeding again does not change it.
- Public review page: <http://localhost:3000/r/demo-cafe>

---

## 🚂 Deploy to Railway

### One-time setup

1. **Create a Railway project**
   ```bash
   railway init
   ```

2. **Add a PostgreSQL plugin** to the project (Railway → New → Database → Postgres). Railway auto-injects `DATABASE_URL`.

3. **Set environment variables** (Railway dashboard → Variables):
   ```
   NEXTAUTH_SECRET=...generate with: openssl rand -base64 32
   NEXTAUTH_URL=https://your-app.up.railway.app
   NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_PASSWORD=YourStrongP@ss!
   ```

4. **Email** — choose ONE of these patterns:

   **A) PHP relay (recommended on Railway — bypasses outbound SMTP block):**
   ```
   MAILER_RELAY_URL=https://your-host.com/mailer/send.php
   MAILER_SECRET=your-shared-secret
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=you@gmail.com
   SMTP_PASS=app-password-no-spaces
   SMTP_FROM=ReviewQR <noreply@yourdomain.com>
   ```
   Drop `mailer-php/send.php` (from `wa-Invoice-bot-main`) on a normal PHP host.

   **B) Direct SMTP (won't work on Railway because outbound 25/465/587 are blocked):**
   ```
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_USER=resend
   SMTP_PASS=re_...
   ```

5. **YouPI** (UPI checkout) and a cron secret:
   ```
   YOUPI_BASE_URL=https://pay.yourdomain.com
   YOUPI_MERCHANT_ID=...
   YOUPI_WEBHOOK_SECRET=...
   CRON_SECRET=...
   SELLER_GSTIN=...
   PAYMENTS_RAZORPAY_ENABLED=false
   ```
   Point a daily Railway cron `POST` at `/api/billing/reconcile` with header `x-cron-secret`. The secret is compared with `timingSafeEqual` and must match `CRON_SECRET`. Manual UPI/USDT stays as the fallback. Razorpay checkout is not shown. This repo does not create the cron service.

6. **Object storage** (optional, Cloudflare R2 or any S3-compatible bucket). Leave these blank and uploads stay as resized data URLs.
   ```
   S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
   S3_BUCKET=reviewqr
   S3_ACCESS_KEY_ID=...
   S3_SECRET_ACCESS_KEY=...
   S3_PUBLIC_BASE_URL=https://files.yourdomain.com
   S3_REGION=auto
   ```
   `S3_PUBLIC_BASE_URL` must be `https`. Move existing data URLs yourself when you are ready. It is not part of deploy:
   ```bash
   npx tsx scripts/migrate-images.ts --dry-run
   npx tsx scripts/migrate-images.ts
   ```

7. **Razorpay** (optional, off unless `PAYMENTS_RAZORPAY_ENABLED=true`):
   ```
   RAZORPAY_KEY_ID=rzp_live_...
   RAZORPAY_KEY_SECRET=...
   RAZORPAY_WEBHOOK_SECRET=...
   ```

8. **WhatsApp Cloud API** (optional — auto-send instead of click-to-chat):
   ```
   WHATSAPP_API_URL=https://graph.facebook.com/v20.0
   WHATSAPP_API_TOKEN=EAAxxxxxxx
   WHATSAPP_PHONE_ID=1234567890
   ```

### Deploy

```bash
git push     # if connected to GitHub
# OR
railway up   # CLI deploy
```

Railway's pre-deploy command (`railway.json`) is `npx prisma migrate deploy`. It does not run `db push` and it does not reset the admin password.

### Existing database that was created with `db push`

Do not execute the baseline migration against that database. Mark the history as already applied, once:

```bash
railway run npx prisma migrate resolve --applied 20260426000000_baseline
railway run npx prisma migrate resolve --applied 20260427000000_platform_branding
```

Skip a name that is already recorded in `_prisma_migrations`. After that, `migrate deploy` only applies new migrations.

### First-deploy commands

```bash
# Fresh database: pre-deploy already applies migrations.
# Create the super admin once. Later runs leave the password alone.
railway run npm run seed:admin
```

### Custom domain (white-label)

1. Settings → Generate domain (or add custom)
2. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to the new URL
3. For agency white-label: each agency client adds a `CNAME` to the Railway app domain.

---

## 📁 Project structure

```
.
├── app/
│   ├── (auth)/           Login, register, forgot-password
│   ├── (dashboard)/      Authenticated dashboard pages
│   ├── api/              REST endpoints (auth, businesses, reviews, billing, widget)
│   ├── r/[slug]/         Public review page (the core customer flow)
│   ├── q/[code]/         Short URL → QR code redirect
│   └── page.tsx          Marketing landing page
├── components/
│   ├── marketing/        Hero, features, pricing, testimonials, FAQ
│   ├── dashboard/        Shell, sidebar, mobile bottom-nav
│   └── ui/               Shadcn-style primitives (button, card, input...)
├── lib/
│   ├── auth.ts           NextAuth config + helpers
│   ├── db.ts             Prisma client singleton
│   ├── email.ts          PHP-relay + nodemailer fallback
│   ├── whatsapp.ts       Cloud API + click-to-chat
│   ├── payments.ts       Razorpay + UPI
│   ├── notify.ts         Negative-feedback alerts (email + WA + in-app)
│   ├── validations.ts    Zod schemas
│   ├── rate-limit.ts     In-memory + DB-backed limiter
│   ├── sanitize.ts       DOMPurify + duplicate detection
│   └── qr.ts             SVG/PNG generator
├── prisma/
│   ├── schema.prisma     20+ tables (users, businesses, reviews, feedback...)
│   ├── seed.ts           Full demo data
│   └── seed-admin.ts     Admin-only seed
├── public/
│   ├── widget.js         Public testimonial widget (drop-in <script>)
│   └── favicon.svg
└── railway.json
```

---

## 🛠 Useful commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:migrate` | `prisma migrate dev` — create and apply a migration locally |
| `npm run db:deploy` | `prisma migrate deploy` — apply pending migrations |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright owner smoke test. Needs `DATABASE_URL`, a migrated database, and `npx playwright install chromium`. |
| `npm run db:seed` | Seed demo data. Creates an admin only if that email is missing. |
| `npm run seed:admin` | Create the admin once. Does not reset the password. |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Drop all + re-migrate (DEV ONLY) |

---

## 🔌 Public endpoints

There is no partner API. These routes are the customer and widget pages:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/public/reviews` | Submit a review (rate-limited, sanitized) |
| `GET  /api/widget/[slug]` | JSON for the public testimonial widget |
| `GET  /api/qr/[code]/image` | QR code SVG/PNG |
| `GET  /q/[code]` | Short-URL redirect to review page |
| `GET  /r/[slug]` | Public review page (HTML) |

Authenticated endpoints under `/api/businesses`, `/api/feedback`, `/api/billing`, `/api/export`.

---

## 🔒 Security checklist

- [x] Passwords bcrypt-hashed (cost 12)
- [x] Zod validation on every input
- [x] DOMPurify sanitization on user-submitted text
- [x] Rate limiting on auth, register, public review submission
- [x] Cloudflare Turnstile support (set `TURNSTILE_SECRET_KEY`)
- [x] Spam/duplicate review detection
- [x] CSRF-safe forms (NextAuth handles this)
- [x] Role-based access control (`USER`, `ADMIN`, `AGENCY`, `STAFF`)
- [x] Razorpay signature verification on webhooks + checkout return
- [x] Security headers (`X-Frame-Options`, `X-Content-Type-Options`, etc.)
- [x] Public review pages are `noindex` (no review-page SEO leakage)

---

## 💸 Pricing tiers

| Plan | Monthly | Yearly | Limits |
| --- | --- | --- | --- |
| Free | ₹0 | ₹0 | 1 business, 50 reviews/mo |
| Starter | ₹499 | ₹4,999 | 1 business, unlimited QR, WhatsApp |
| Growth ⭐ | ₹999 | ₹9,999 | 5 businesses, 25 locations, branding |
| Agency | ₹2,999 | ₹29,999 | Unlimited, white-label, custom domain |

Edit pricing in `lib/payments.ts → PLANS`.

---

## 🤝 Contributing

This is a turn-key project — fork it and customise to your needs. Pull requests welcome for bugs.

## 📄 License

MIT — use it, sell it, build a SaaS on top of it.

---

Made with ❤️ for Indian SMBs.
