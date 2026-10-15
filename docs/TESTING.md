# Testing

There are three layers: static types, an end-to-end HTTP acceptance suite, and a real-time
Socket.IO suite. All three run against a **running server** with a seeded database.

```bash
npm run dev            # or: npm run build && npm start
npm run typecheck      # tsc --noEmit — must be clean
npm test               # 64 HTTP checks      (scripts/smoke-test.py)
node scripts/realtime-test.mjs   # 9 real-time checks
```

Pass both suites against a server started from `npm run seed`; optional flags:
`python3 scripts/smoke-test.py http://localhost:3001`, `node scripts/realtime-test.mjs http://host:3000`.

---

## 1. The 20 acceptance tests (from the brief) and where they're automated

| # | Acceptance test | Automated check | Where |
| --- | --- | --- | --- |
| 1 | Owner signs in | `1. owner signs in` | smoke |
| 2 | Public menu loads with the real (170-item) menu, no auth | `2`, `Gallops menu has imported dishes` | smoke |
| 3 | Scanning a table QR opens that table's menu | `3. valid table token resolves` | smoke |
| 4 | Invalid/expired QR token is handled gracefully | `invalid table token is flagged` | smoke |
| 5 | Guest places an order with variants and notes | `5. guest places an order` | smoke |
| 6 | Totals (subtotal, tax, total) are correct | `6. server computes the correct total` | smoke |
| 7 | Duplicate submission creates one order | `7. idempotency prevents duplicate orders` | smoke |
| 8 | Order appears instantly on reception | `8` (HTTP) + `5. reception receives order:created` (socket) | smoke + realtime |
| 9 | Reception can accept / reject | `9. reception accepts the order` | smoke |
| 10 | Kitchen sees accepted orders and advances them | `12`, `13` | smoke |
| 11 | Roles are enforced (kitchen cannot take payment or skip states) | `10`, `11`, `22` | smoke |
| 12 | Guest tracking page reflects live status | `14` (HTTP) + `6. guest tracking socket receives the READY update` | smoke + realtime |
| 13 | "Order ready" notification fires | `13` + `NotificationLog` row (`channel=IN_APP`/`PUSH`, `SENT` or `SKIPPED` with reason) | smoke + manual |
| 14 | Menu CRUD is reflected in the guest menu immediately | `24`, `25`, `26`, `28` | smoke |
| 15 | Table management + QR regeneration invalidates old codes | `29`, `30`, `31` + manual regenerate check | smoke + manual |
| 16 | Tenant isolation (data + actions) | `18`, `19`, `20`, `21`, `22`, `23` + `8. other tenant received no cross-tenant events` | smoke + realtime |
| 17 | Analytics show today's orders and revenue | `32`, `33` | smoke |
| 18 | All pages render (guest, staff, platform, marketing) | `34` (11 pages), `35` (9 pages), `36` (4 pages) | smoke |
| 19 | Payments never marked paid without verification | `16` (owner-initiated cash) + manual Razorpay checks below | smoke + manual |
| 20 | Works at 320px width | manual matrix below | manual |

---

## 2. Real-time suite (`scripts/realtime-test.mjs`)

1. Staff socket authenticates with the session cookie
2. Socket without credentials is refused
3. Menu loads for the guest · 3b. menu exposes orderable dishes
4. Guest order accepted
5. Reception receives `order:created` in real time
6. Guest tracking socket receives the `READY` update
7. Reception also sees the status change
8. Other tenant received no cross-tenant events

It opens three sockets (reception, a second tenant, and the guest's tracking socket),
places an order over HTTP, walks `PLACED → CONFIRMED → PREPARING → READY`, and asserts
which rooms received what.

---

## 3. Manual test script (10 minutes)

Do this once with two browser windows side by side (one narrow — 375px — for the guest).

**A. Guest ordering (narrow window)**
1. `/r/gallops/menu?table=<token>` → menu renders, category nav sticky, dish cards show ₹ prices.
2. Tap a dish → item sheet opens with variants, quantity stepper, notes box.
3. Add 2–3 dishes → bottom cart bar shows count and **server-computed** total.
4. Checkout → fill name, choose *Cash at counter*, place order → you land on the tracking page.
5. Resize to 320px → no horizontal scroll, buttons remain tappable, text doesn't overlap.

**B. Reception + kitchen (wide window)**
6. `/dashboard/orders` → the new order appears **without refresh**, with a sound cue.
7. Accept → status becomes *Confirmed*; the guest window moves to *Confirmed* at the same moment.
8. Second profile: `kitchen@…` → `/dashboard/kitchen` → *Start* → *Ready*.
9. Guest tracking page flips to **Ready for pickup** and shows the ready notification.
10. Back at reception: record cash payment → *Completed*. `/dashboard/analytics` shows the sale.

**C. Menu & tables**
11. `/dashboard/menu` → edit a price → reload the guest menu → the new price is there.
12. Toggle a dish *Sold out* → it disappears from the guest menu immediately.
13. `/dashboard/tables` → regenerate a QR token → open the **old** link → it's rejected as an
    invalid table; the new one works.
14. `/dashboard/tables/sheet` → print preview shows one clean QR card per table, no app chrome.

**D. Tenant isolation & roles**
15. Sign in as `owner@spiceroute.in` → the Gallops dashboard is inaccessible; only its own tenant.
16. Sign in as `kitchen@…` → Settings, Staff, Analytics-with-payments and the pay button are absent/blocked.
17. Sign in as `admin@gallops.app` → `/platform` lists both tenants; suspend one → its public menu 404s.

**E. Payments (provider not configured — expected behaviour)**
18. Checkout with Razorpay selected → the UI says online payment isn't configured and offers
    cash at counter. **No order is marked PAID.**
19. With test keys (`RAZORPAY_ENABLED=true`): complete a payment → order flips to PAID only after
    signature verification; a tampered signature is rejected and the order stays PENDING.
20. `POST /api/payments/razorpay/webhook` with a bad `x-razorpay-signature` → `401 SIGNATURE_INVALID`.

---

## 4. Responsive matrix

Check these widths on every screen: **320, 375, 414, 768, 1280, 1920**.
Minimum bar: no horizontal scrolling, tap targets ≥ 40px, sticky actions never cover content,
tables/boards scroll rather than overflow, and print styles hide all app chrome.

## 5. Data-integrity checks

```sql
-- no cross-tenant leakage: every order belongs to the restaurant its table belongs to
select count(*) from "Order" o
join "RestaurantTable" t on t.id = o."tableId"
where t."restaurantId" <> o."restaurantId";        -- expect 0

-- money is integral
select count(*) from "Order" where "totalMinor" <> round("totalMinor");   -- expect 0

-- every order has an audit trail
select count(*) from "Order" o
where not exists (select 1 from "OrderEvent" e where e."orderId" = o.id); -- expect 0

-- notifications: nothing silently lost
select channel, status, count(*) from "NotificationLog" group by 1, 2;

-- menu provenance
select "verificationStatus", count(*) from "MenuItem" group by 1;
```

## 6. Continuous integration

```yaml
- run: npm ci
- run: cp .env.example .env && sed -i "s|AUTH_SECRET=.*|AUTH_SECRET=test-secret-0123456789|" .env
- run: npx prisma migrate deploy && npm run seed
- run: npm run typecheck
- run: npm run build
- run: npm start &
- run: npm test
- run: node scripts/realtime-test.mjs
```

The suites need a seeded DB. They create, complete and delete their own data (the menu dish
they create is removed in check 28), and the login throttle is retried automatically.
