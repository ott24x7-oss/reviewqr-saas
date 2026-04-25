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
- API-ready (Razorpay billing + REST endpoints)

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

# 3. Database setup
npm run db:push       # create tables
npm run db:seed       # admin + demo café with ~120 reviews

# 4. Run
npm run dev
```

Open <http://localhost:3000>

**Demo accounts** (after seed):
- Owner: `demo@reviewqr.in` / `Demo@123` → has 120 demo reviews
- Admin: `admin@reviewqr.in` / `ChangeMe@123`
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

5. **Razorpay** (optional — payments):
   ```
   RAZORPAY_KEY_ID=rzp_live_...
   RAZORPAY_KEY_SECRET=...
   RAZORPAY_WEBHOOK_SECRET=...
   ```

6. **WhatsApp Cloud API** (optional — auto-send instead of click-to-chat):
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

Railway runs (configured in `package.json` and `railway.json`):

```bash
npm install
npx prisma generate
npx prisma migrate deploy   # applies migrations
npm run build
npm run start               # binds to $PORT automatically
```

### First-deploy commands

```bash
# In Railway shell or via railway run:
railway run npm run db:deploy        # apply Prisma migrations
railway run npm run seed:admin       # create the super admin
# (or `npm run db:seed` for full demo data)
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
| `npm run db:push` | Push schema to DB (no migration) |
| `npm run db:migrate` | Create + apply a new migration |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:seed` | Seed admin + demo data |
| `npm run seed:admin` | Seed admin only (production-safe) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Drop all + re-migrate (DEV ONLY) |

---

## 🔌 Public REST endpoints

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
| Agency | ₹2,999 | ₹29,999 | Unlimited, white-label, custom domain, API |

Edit pricing in `lib/payments.ts → PLANS`.

---

## 🤝 Contributing

This is a turn-key project — fork it and customise to your needs. Pull requests welcome for bugs.

## 📄 License

MIT — use it, sell it, build a SaaS on top of it.

---

Made with ❤️ for Indian SMBs.
