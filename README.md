# Gallops — QR Ordering & Restaurant Management SaaS

A complete, multi-tenant restaurant QR-ordering and operations platform built for
**Gallops Restaurant (a unit of Gallops Food Plaza), Mahuva, Gujarat, India**.

Guests scan the QR code on their table, browse the real menu, and order from their
phone. Reception accepts the order, the kitchen works a live queue, and the guest
watches their order move from *placed → confirmed → preparing → ready* in real time
— with the ready notification pushed to the guest's screen and, once configured, to
their phone. Restaurant staff manage menu, tables, staff, analytics and settings in a
dashboard. A platform console onboards and bills other restaurants as tenants.

Everything is INR (₹). Money is stored in **paise** as integers and priced **server-side**.

---

## Contents

| Document | What's in it |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, folder structure, database design, menu-import approach, the 8 build phases |
| [docs/SETUP.md](docs/SETUP.md) | Run it locally from a clean clone (PostgreSQL, env, migrations, seed, menu import) |
| [docs/TESTING.md](docs/TESTING.md) | The acceptance suite, the 20 acceptance tests, manual test script |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment, env matrix, Razorpay / web-push / email setup, backups |
| [docs/MENU-DATA.md](docs/MENU-DATA.md) | Where every menu item came from, and what the owner must verify |
| [docs/WEBSITE.md](docs/WEBSITE.md) | Section-by-section guide to the marketing website, its motion system and design tokens |

---

## Quick start

```bash
# 1. PostgreSQL running locally, then:
cp .env.example .env
#    edit .env → DATABASE_URL, AUTH_SECRET (openssl rand -base64 32)

npm install
npx prisma migrate deploy     # or: npx prisma migrate dev
npm run seed                  # tenant, users, tables, plans + imports the real menu
npm run dev                   # http://localhost:3000
```

Demo accounts (passwords are in the seed and printed by `npm run seed`):

| Role | Email | Password | Lands on |
| --- | --- | --- | --- |
| Owner | `owner@gallopsfoodplaza.in` | `gallops123` | `/dashboard/orders` |
| Manager | `manager@gallopsfoodplaza.in` | `gallops123` | `/dashboard/orders` |
| Receptionist | `reception@gallopsfoodplaza.in` | `gallops123` | `/dashboard/orders` |
| Kitchen | `kitchen@gallopsfoodplaza.in` | `gallops123` | `/dashboard/kitchen` |
| Platform admin | `admin@gallops.app` | `platform123` | `/platform` |
| Second tenant (isolation test) | `owner@spiceroute.in` | `spiceroute123` | `/dashboard/orders` |

**Change every one of these passwords before going live** (`/dashboard/staff` or the DB).

Guest entry points:

| URL | Purpose |
| --- | --- |
| `/r/gallops/menu?table=<qr-token>` | The table QR destination — menu + cart |
| `/r/gallops/order/<tracking-token>` | Live order tracking (link shown after checkout) |
| `/dashboard/tables/sheet` | Printable QR sheet for every table (A4, `window.print()`) |

---

## What's actually implemented

**Guest**
- Table-scanned menu with category jump-nav, search, veg/non-veg and Jain badges, "chef's picks"
- Item sheet with variant groups (e.g. *with/without butter*, *roti type*), quantity and per-item notes
- Cart persisted in `localStorage`, **re-priced by the server** on every change (`POST /api/cart/validate`)
- Checkout: dine-in details, payment method per restaurant config, idempotent order creation
- Live tracking page with status timeline, ETA and the "your order is ready" moment

**Restaurant staff**
- **Reception** `/dashboard/orders` — new orders arrive over Socket.IO with a sound cue, accept / reject / progress / cancel, record cash or card payment, filter by status and table
- **Kitchen** `/dashboard/kitchen` — queue board with elapsed timers, per-order items and notes, one-tap *start → ready*
- **Menu** `/dashboard/menu` — full CRUD, publish/unpublish, sold-out toggle, price in ₹, serving size, dietary flags, **per-item verification status** and source URL, image upload
- **Categories** `/dashboard/categories` — ordering, sections (sub-categories), publish state
- **Tables** `/dashboard/tables` — table CRUD, QR preview, **regenerate token** (old codes stop working), download PNG/SVG, printable sheet
- **Staff** `/dashboard/staff` — invite by email, role assignment, deactivate, role capability matrix
- **Analytics** `/dashboard/analytics` — today/7-day revenue, orders, AOV, top sellers, category mix, hour-of-day heat, table utilisation
- **Settings** `/dashboard/settings` — brand & logo, contact, operations (auto-accept, prep time, cancellation window), taxes & payment methods, notification channels

**Website (marketing)**
- `/` — hero with aurora/grid/particle backdrop, live stats counted from the database,
  scroll-linked "how it works" timeline, an interactive four-role product tour with
  live-feel mockups, bento feature grid with cursor spotlights, a marquee of **real**
  dishes and prices, a tech-stack ticker, the trust & reliability section (with the
  real tenant-isolation snippet), pricing teaser, FAQ, and a gradient-framed CTA
- `/features`, `/pricing`, `/contact`, `/privacy`, `/terms` in the same design language
- Motion system in `src/components/marketing/effects.tsx` — aurora, cursor glow,
  spotlight cards, 3D tilt, magnetic buttons, count-ups, marquees, scroll-linked
  lines and word-by-word heading reveals. Every effect is skipped for
  `prefers-reduced-motion` and on touch devices.

**Platform (SaaS layer)**
- `/platform` — tenants, plan assignment, suspend/activate, publish/unpublish
- `/platform/subscriptions` — plan catalog (editable) + active subscriptions
- `/platform/analytics` — cross-tenant usage against plan limits, marketing leads with status workflow
- Marketing site (`/`, `/features`, `/pricing`, `/contact`) with a demo-request form that writes real leads

**Real-time & notifications**
- Socket.IO on the same HTTP server (`/api/socket`), rooms per restaurant and per order token
- Order created → reception room; status changed → reception room **and** that guest's order room
- Notification dispatcher writes a `NotificationLog` row for **every** attempt: `SENT`, `SKIPPED` (channel not configured) or `FAILED`. Web push, email, SMS and WhatsApp are pluggable and off until configured — nothing is faked.

**Payments**
- Razorpay order creation + signature verification + webhook. With `RAZORPAY_ENABLED=false`
  the UI clearly says online payment is unavailable and falls back to cash at counter.
  **No order is ever marked PAID without signature or webhook verification.**

---

## Honest limitations (read before demoing to the owner)

1. **Menu data needs owner sign-off.** 170 dishes were imported from a public
   third-party listing; prices are online-delivery prices, not confirmed dine-in
   prices. Every item carries `verificationStatus = NEEDS_REVIEW` and a source URL.
   See [docs/MENU-DATA.md](docs/MENU-DATA.md).
2. **No food photographs.** No public source had photos of Gallops dishes, so the app
   serves clearly-labelled generated placeholders (`/api/placeholder`). Never a random
   photo of someone else's dish.
3. **Dietary/allergen flags are unset** — not invented. Owner sets veg/vegan/Jain/spice/allergens
   per item in the dashboard.
4. **Billing is in development mode.** Plans and subscriptions are real records, but no
   payment provider is charged. `PLATFORM_BILLING_MODE=development` is displayed as such
   in the console.
5. **Notification providers are unconfigured** in this environment. Push/email/SMS/WhatsApp
   attempts are logged as `SKIPPED` with the reason; in-app + socket delivery always works.
6. **Local disk uploads.** `UPLOAD_PROVIDER=local` writes to `./uploads`; swap to
   Cloudinary/S3 for multi-instance hosting.

---

## Tech

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS · Framer Motion ·
Lucide · PostgreSQL + Prisma · Socket.IO · Zod · Razorpay (optional) · jose (JWT sessions) ·
bcryptjs · web-push (optional)

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Custom server (Next + Socket.IO) in watch mode |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Production server (Next + Socket.IO, port 3000) |
| `npm run seed` | Seed tenant, users, tables, plans **and import the real menu** |
| `npm run import:menu` | Re-import `prisma/menu-import/gallops-menu.json` (preserves owner-verified rows) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | End-to-end acceptance suite (`scripts/smoke-test.py`) — 64 checks |
| `node scripts/realtime-test.mjs` | Socket.IO real-time suite — 9 checks |
| `npm run vapid` | Generate VAPID keys for web push |
| `npm run db:reset` | Destructive reset + reseed |

## Security posture

- **Tenant isolation is server-side**: the restaurant id always comes from the caller's
  `Membership` record, never from the request body or a query parameter.
- Role capability checks on every mutating route (`src/lib/auth/rbac.ts`).
- All money computed server-side from DB prices; the client never sends a price.
- Order creation is idempotent via a client-generated `IdempotencyKey`.
- QR codes and tracking links are **capability tokens, not credentials** — they grant
  ordering/tracking only; 12-byte random (`randomToken`), regenerable per table.
- Passwords bcrypt-hashed; sessions are signed JWTs in an http-only, SameSite=Lax cookie
  (Secure by default in production — set `COOKIE_SECURE=false` only for plain-HTTP demos).
- Login is rate limited per IP; uploads are type/size validated; mutations require same-origin.

## Project layout

```
src/
  app/
    (marketing)  /, /features, /pricing, /contact, /privacy, /terms
    r/[slug]/    guest app: menu, item sheet, cart, checkout, order tracking
    dashboard/   staff console (orders, kitchen, menu, categories, tables, staff, analytics, settings)
    platform/    SaaS console (overview, restaurants, plans, usage & leads)
    api/         route handlers (menu, orders, dashboard/*, platform/*, payments, upload, push)
  components/    ui primitives, menu, dashboard, marketing
  lib/           pricing, orders, tenant, auth, realtime, notify, qr, validation, db
  server.ts      Next.js + Socket.IO on one HTTP server
prisma/          schema, migrations, seed, menu-import source data + importer
scripts/         acceptance tests, VAPID generator
docs/            architecture, setup, testing, deployment, menu provenance
```

Licensed for Gallops Restaurant. Menu content belongs to the restaurant; third-party
price data is reproduced for internal use and must be verified before publication.
# Gallops-Restaurant
