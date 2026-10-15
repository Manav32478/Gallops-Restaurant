# Gallops — Architecture, data model, menu import & build phases

This is the design document for the platform in `/home/user/gallops`. Everything
described here is implemented; where a decision was made *against* something, the
reason is recorded so it isn't re-litigated later.

---

## 1. Requirements that shaped the design

| Requirement | Consequence in the design |
| --- | --- |
| Guest orders from a phone at the table | Mobile-first guest app under `/r/[slug]/…`; no install, no account, no app store |
| Kitchen and reception must see orders instantly | Socket.IO rooms; a custom Node server (serverless can't hold the socket) |
| Guest must know when food is ready | Order-scoped socket room + notification dispatcher with a durable log |
| Must serve *other* restaurants later | Restaurant is a first-class tenant; every table except `User`/`Plan`/`AppSetting` carries `restaurantId` |
| Real menu, prices in ₹, no invented data | Menu JSON with per-item `sourceUrl` + `verificationStatus`; importer preserves owner-verified rows |
| Money must never be trusted from the client | Prices stored as integer paise; all totals computed in `src/lib/pricing.ts` |
| Payments optional, never faked | Razorpay behind `RAZORPAY_ENABLED`; unconfigured channels log `SKIPPED` |
| 320px phones | Every layout tested down to 320px; sticky bottom cart bar instead of a sidebar cart |
| Don't break access controls while scraping | Blocked sources were not bypassed; an alternative public source was used (documented) |

---

## 2. High-level architecture

```
                       ┌───────────────────────────┐
   guest phone ───────▶│  Next.js App Router (RSC) │
   (QR scan)           │  /r/[slug]/menu …         │
                       └────────────┬──────────────┘
   staff browser ─────▶ dashboard   │   platform console
                       └────────────┼──────────────┘
                                    │
                       ┌────────────▼──────────────┐
                       │  Route handlers /api/*    │  Zod validation
                       │  tenant guard + RBAC      │  server-side pricing
                       └────────────┬──────────────┘
                                    │
        ┌───────────────────────────┼────────────────────────────┐
        ▼                           ▼                            ▼
 ┌──────────────┐          ┌─────────────────┐          ┌────────────────┐
 │ PostgreSQL   │          │ Socket.IO rooms │          │ Notification   │
 │ (Prisma)     │          │ restaurant:<id> │          │ dispatcher     │
 │              │          │ order:<token>   │          │ (push/email/   │
 │              │          │                 │          │  sms/whatsapp) │
 └──────────────┘          └─────────────────┘          └────────────────┘
```

**One process, two protocols.** `src/server.ts` creates the HTTP server, hands
non-socket requests to Next, and attaches Socket.IO at `/api/socket`. This is why
deployment targets a long-running Node host (see [DEPLOYMENT.md](DEPLOYMENT.md)).

**Why a custom server instead of `next start`:** Socket.IO needs a persistent
connection and a shared in-process emitter. API routes broadcast through a module-level
handle (`src/lib/realtime.ts` `setIO`/`getIO`). Multi-instance deployments swap that for
the Redis adapter — the emit API stays the same.

### Request lifecycle for a state change

1. `POST /api/orders` → Zod schema → resolve restaurant by **slug** → resolve table by
   **QR token scoped to that restaurant** → load items **filtered by tenant + published + available**
   → price server-side → idempotency upsert → create order + items + modifiers + event
   → `emitOrderCreated` → return `{ order, trackingToken }`.
2. `PATCH /api/dashboard/[slug]/orders/[id]` → tenant guard → capability check
   (`orders.update` **or** `kitchen.update`) → transition map (role-aware) → optimistic
   concurrency `updateMany({ where: { status: previous } })` → `OrderEvent` row →
   `emitOrderUpdated` → notification dispatch on `READY`.

---

## 3. Folder structure

```
gallops/
├── prisma/
│   ├── schema.prisma                 # 30 models, 13 enums — see §4
│   ├── migrations/                   # 3 SQL migrations, committed
│   ├── seed.ts                       # tenant, users, tables, plans + menu import
│   └── menu-import/
│       ├── gallops-menu.json         # 170 items, provenance + verification metadata
│       └── import-menu.ts            # idempotent upsert importer
├── src/
│   ├── server.ts                     # Next + Socket.IO, socket auth, graceful shutdown
│   ├── app/
│   │   ├── layout.tsx  globals.css  page.tsx  not-found.tsx
│   │   ├── (marketing)/             # features, pricing, contact, privacy, terms
│   │   ├── login/ register/         # session auth pages
│   │   ├── r/[slug]/                # GUEST: menu, item/[itemId], cart, checkout, order/[token]
│   │   ├── dashboard/               # STAFF: orders, kitchen, menu, categories, tables,
│   │   │   │                        #        staff, analytics, settings, tables/sheet (print)
│   │   ├── platform/                # SAAS: overview, restaurants, subscriptions, analytics
│   │   └── api/                     # route handlers (each in its own route.ts)
│   ├── components/
│   │   ├── ui/                      # Button, Input, Sheet, Modal, Badge, Skeleton, Reveal…
│   │   ├── menu/                    # MenuClient, ItemSheet, CartBar, CheckoutClient…
│   │   ├── dashboard/               # DashboardShell + one client per screen
│   │   └── marketing/               # SiteChrome, Mockups, Faq, DemoForm
│   └── lib/
│       ├── prisma.ts  money.ts  pricing.ts  orders.ts  idempotency.ts
│       ├── tenant.ts  auth/{session,token,password,rbac}.ts
│       ├── realtime.ts  notify.ts  audit.ts  qr.ts  upload.ts  validation.ts
├── scripts/
│   ├── smoke-test.py                # 64-check end-to-end acceptance suite
│   ├── realtime-test.mjs            # 9-check Socket.IO suite
│   └── generate-vapid.ts
├── public/                          # brand assets, manifest, icons, placeholder art
├── uploads/                         # local object storage (gitignored in production)
└── docs/                            # this file + setup, testing, deployment, menu data
```

**Conventions**
- A directory under `app/api/**` exports its handlers from `route.ts` — a file named
  `validate.ts` next to it is *not* routed (bit us once).
- Every API response is `{ ok: true, data }` or `{ ok: false, error: { code, message } }`
  (`src/lib/api.ts`).
- Server Components fetch through the same typed helpers the API routes use; client
  components only ever mutate through `/api/**`.
- Money crosses the wire as **integers** (`priceMinor`, `totalMinor`) and is formatted
  at the edge by `formatMoney()`.

---

## 4. Database design

PostgreSQL, Prisma schema in `prisma/schema.prisma` (30 models, 13 enums).

### Tenancy

```
User ──< Membership >── Restaurant                  (role: OWNER|MANAGER|RECEPTIONIST|KITCHEN)
                            │
                            ├──< RestaurantTable    (qrToken, status)
                            ├──< MenuCategory ──< MenuItem ──< VariantGroup ──< VariantOption
                            │                          └──< ItemImage
                            ├──< Order ──< OrderItem ──< OrderItemModifier
                            │        ├──< OrderEvent
                            │        ├──< Payment
                            │        └──< NotificationLog
                            ├──< Coupon, Feedback, InventoryTransaction, PushSubscription
                            ├──< AuditLog
                            └──< Subscription >── Plan
```

`Restaurant` is the isolation boundary. **Every** tenant-owned model carries
`restaurantId`, and every tenant-scoped query includes it in the `WHERE` clause —
the tenant id is resolved from the caller's `Membership`, never from the request body.
Cross-tenant reads return 403, cross-tenant writes 403/404 (proven by tests 18–20).

### Money

All amounts are **integer paise** (`priceMinor`, `subtotalMinor`, `taxMinor`,
`totalMinor`, `amountMinor`) with `currency` on the order. Tax and service charge are
stored as **basis points** (`taxBp` 500 = 5%) to avoid float drift. Rounding happens once,
in `src/lib/pricing.ts`, using `Math.round`.

### Key models

| Model | Purpose | Notable fields |
| --- | --- | --- |
| `Restaurant` | tenant + public brand | `slug`, `isPublished`, `isActive`, `status`, `taxBp`, `serviceChargeBp`, `minOrderMinor`, `paymentMethods[]`, `notificationSettings` (JSON), `operatingHours` (JSON) |
| `Membership` | user ↔ restaurant + role | unique `(userId, restaurantId)` |
| `RestaurantTable` | physical table + QR identity | `code`, `qrToken` (unique, 12-byte random), `status`, `seats` |
| `MenuCategory` / `MenuItem` | menu tree | categories have `sortOrder`, `isPublished`; items nest in a category *or* a `section` |
| `MenuItem` | dish | `priceMinor`, `servingSize`, `isVeg`, `isVegan`, `isJain`, `spiceLevel`, `allergens[]`, `isAvailable`, `isPublished`, `isFeatured`, **`verificationStatus`**, **`sourceUrl`**, **`sourceNotes`** |
| `VariantGroup` / `VariantOption` | modifiers | `kind` (SINGLE/QUANTITY), `type` (e.g. portion / add-on), `priceDeltaMinor`, `isDefault` |
| `Order` | the transaction | `code` (human, e.g. `G104`), `trackingToken` (secret), `status`, `paymentMethod`, `paymentStatus`, `readyNotifiedAt`, `idempotencyKey` (unique), snapshot fields |
| `OrderItem` / `OrderItemModifier` | what was ordered | name + price are **snapshotted** so history survives menu edits |
| `OrderEvent` | audit of status changes | `fromStatus`, `toStatus`, `actorLabel` |
| `Payment` | provider records | `provider`, `providerRef`, `status`, `raw` |
| `NotificationLog` | every notification attempt | `channel`, `status` (`SENT`/`SKIPPED`/`FAILED`), `reason` |
| `Plan` / `Subscription` | SaaS billing | `maxTables`, `maxStaff`, `maxOrdersPerMonth`, `features[]`, `isPublic` |
| `Lead` | marketing demo requests | `status` workflow, `restaurantName`, `city` |
| `AuditLog` | privileged mutations | actor, action, entity, metadata |
| `AppSetting` | platform-level key/value | feature flags without a redeploy |

### Status machines

```
Order:   PLACED ─▶ CONFIRMED ─▶ PREPARING ─▶ READY ─▶ COMPLETED
           │           │            │          │
           └──▶ REJECTED / CANCELLED ◀─────────┘

Kitchen role may only:  CONFIRMED ─▶ PREPARING ─▶ READY
Payment:  PENDING ─▶ PAID | FAILED | REFUNDED
```

Transitions live in one place (`TRANSITIONS`, `KITCHEN_TRANSITIONS` in `src/lib/orders.ts`)
and are enforced with optimistic concurrency: `updateMany({ where: { status: previousStatus } })`
— if two staff click at once, the loser gets `409 CONFLICT` and the UI refreshes.

### Indexes

Hot paths are indexed: `Order(restaurantId, status, createdAt)`, `Order(trackingToken)`,
`Order(restaurantId, idempotencyKey)` unique, `MenuItem(restaurantId, categoryId, isPublished)`,
`RestaurantTable(restaurantId, code)` unique, `RestaurantTable(qrToken)` unique,
`Membership(userId, restaurantId)` unique, `OrderEvent(orderId, createdAt)`.

---

## 5. Menu import approach

**Problem.** The requested source (`restaurant-guru.in/…/menu`) publishes the menu card as
**scanned images**. OCR of the card recovered the brand, tagline and cuisine sections
(Punjabi, South Indian, Chinese, Snacks, Beverages, Desserts) — but **no item names or prices**.
Other aggregator pages were behind bot protection, and bypassing those controls was out of scope.

**Solution.** Use a source that *publicly renders* the menu with names and prices: Zomato's
online-ordering page for the same outlet. 170 items across 11 categories, including the
sub-section structure, were extracted and written to `prisma/menu-import/gallops-menu.json`
with full provenance:

```json
{
  "_meta": { "primarySource": {...}, "itemSource": {...}, "crossCheckSource": {...},
             "verificationStatus": "NEEDS_REVIEW", "flags": [...] },
  "categories": [ { "name": "Main Course", "sections": [ { "name": "Punjabi",
                    "items": [ { "name": "Kadai Paneer", "price": 475, "serving": "Serves 1",
                                 "isVeg": true, "verificationStatus": "NEEDS_REVIEW",
                                 "sourceUrl": "https://www.zomato.com/…" } ] } ] } ]
}
```

**Importer rules** (`prisma/menu-import/import-menu.ts`, run by `npm run import:menu`):
1. **Idempotent upsert** keyed on `(restaurantId, category, name)` — re-running never duplicates.
2. **Never overwrite owner-verified data.** Items whose `verificationStatus` is
   `OWNER_VERIFIED` are skipped and counted in the run summary.
3. **No invention.** Prices, serving sizes and names come from the source only. Dietary
   flags stay `null`/unset unless the source published them; images are never attached.
4. **Every row keeps its `sourceUrl`** so the owner can click through and check.
5. Prices are converted ₹ → paise once, at import.

**Owner workflow after import:** open `/dashboard/menu`, filter by *Needs review*, confirm
or correct the price, set dietary/allergen flags, upload a photo, mark **Verified** → the
importer will then preserve that row forever.

**Known gaps** (recorded in `_meta.flags` and surfaced in the dashboard): prices are
online-delivery prices; desserts and South Indian items are missing from the source's
online menu although the printed card advertises them; no photographs exist publicly.

---

## 6. Build phases

| # | Phase | Delivered |
| --- | --- | --- |
| 1 | **Foundation** | Next 15 + TS strict + Tailwind + Prisma schema (30 models) + migrations + seed + money/pricing core + design system (Button, Input, Sheet, Badge, Skeleton, Reveal) + `server.ts` |
| 2 | **Menu** | Category/section/item CRUD, variant groups, availability & publish flags, image upload, **menu import with provenance + verification**, public menu API + guest menu UI (search, jump-nav, filters, 320px) |
| 3 | **QR & cart** | Table model + 12-byte `qrToken`, SVG/PNG QR rendering, printable A4 sheet, token invalidation on regenerate, client cart + **server-side re-pricing** (`/api/cart/validate`), checkout, **idempotent** order creation, tracking token |
| 4 | **Real-time orders** | Socket.IO rooms + auth middleware, reception board, kitchen display, role-aware transition map, optimistic concurrency, live guest tracking timeline, ETA |
| 5 | **Notifications** | Notification dispatcher + `NotificationLog` for every attempt, web-push subscribe/send (VAPID), sound + in-app, email/SMS/WhatsApp adapters that **log SKIPPED** when unconfigured, "order ready" dispatch |
| 6 | **Admin (restaurant)** | Categories, tables (+QR management), staff & roles with a capability matrix, coupons, analytics (revenue, AOV, top sellers, hour heat, table utilisation), settings (brand, contact, operations, taxes, payments, notification channels) |
| 7 | **SaaS / tenant isolation** | Platform console: tenants, plans, subscriptions, usage vs limits, leads; tenant guard + RBAC hardened and **proven by tests**; marketing site + register flow that provisions a new tenant |
| 8 | **Testing & deployment** | 64-check HTTP acceptance suite + 9-check real-time suite, typecheck, production build, setup/testing/deployment docs, env matrix, ops runbook |

---

## 7. Cross-cutting decisions

**Server-side pricing.** The client sends `{ itemId, quantity, optionIds }`. The server
loads live prices, applies modifier deltas, subtotal → discount → taxable base → tax →
service charge → total, in integer paise. `POST /api/cart/validate` returns the authoritative
totals the cart displays, so a tampered client can only make itself look wrong.

**Idempotency.** The cart generates one key per checkout attempt. `Order.idempotencyKey` is
uniquely indexed; a replay returns the original order with `deduped: true` (test 7).

**QR tokens are not credentials.** A table token grants *ordering for that table*; a tracking
token grants *viewing that one order*. Neither grants staff access, and both are regenerable.
Tracking tokens are 28+ chars of URL-safe randomness, never sequential.

**Optimistic UI with server truth.** Clients render instantly, then reconcile with the server
response; a `409` triggers a refresh rather than a silent failure.

**Graceful degradation.** Socket disconnect → the client polls the tracking endpoint. Payment
provider down → checkout falls back to pay-at-counter with a clear message. Channel unconfigured
→ notification logged as skipped, never claimed as sent.

**Accessibility & 320px.** Focus rings, `aria-label`s on icon buttons, keyboard-operable sheets,
`prefers-reduced-motion` respected by the Reveal wrappers, and every screen laid out for
320px widths with a sticky bottom action bar on the guest app.

---

## 8. Scaling path (when Gallops onboards more restaurants)

1. **Redis adapter for Socket.IO** (`@socket.io/redis-adapter`) — no application changes.
2. **Object storage**: `UPLOAD_PROVIDER=cloudinary` + `CLOUDINARY_URL`, or S3 behind the same
   `src/lib/upload.ts` interface; serve images through a CDN.
3. **Read replicas / connection pooling** via PgBouncer; Prisma already centralises access.
4. **Background jobs** (notification retries, nightly analytics rollups) behind a small queue.
5. **Per-tenant limits** enforced from `Plan` (`maxTables`, `maxStaff`, `maxOrdersPerMonth`)
   — already displayed in the platform console and enforced at create-time.
6. **Horizontal scale**: the app is stateless apart from the socket layer and the upload dir,
   both of which have the swap-ins above.
