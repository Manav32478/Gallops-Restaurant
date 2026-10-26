# Setup — run Gallops from a clean clone

## 1. Prerequisites

| Tool | Version used | Notes |
| --- | --- | --- |
| Node.js | 20 LTS or newer (tested on 22) | `node -v` |
| PostgreSQL | 14+ (tested on 17) | must be running and reachable |
| npm | 10+ | ships with Node |
| Python | 3.9+ | only to run the acceptance suite (`scripts/smoke-test.py`) |
| `psql` | not required | the test scripts read table tokens from the app's own API, so nothing needs `psql` |

Optional: `openssl` (generate `AUTH_SECRET`), `git`.

## 2. Database

```bash
createdb gallops                 # or: psql -c 'create database gallops'
# connection string goes in .env → DATABASE_URL
```

Any host works (local, Docker, Neon, Supabase, RDS). For managed Postgres use the pooled
connection string for `DATABASE_URL` and add `?sslmode=require` if the provider requires TLS.

### Option B — Neon (hosted PostgreSQL, no local install)

If you would rather not install PostgreSQL at all:

1. Create a free project at **https://neon.tech**.
2. From the project dashboard copy **both** connection strings (Connection details →
   *Pooled connection* and *Direct connection*).
3. Put them in `.env`:
   ```env
   DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
   DIRECT_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
   ```
   `DATABASE_URL` (pooled, host ends in `-pooler`) is what the app uses at runtime;
   `DIRECT_URL` (unpooled) is what `prisma migrate` needs, because DDL cannot run
   through PgBouncer in transaction mode. With a local PostgreSQL just set both to
   the same URL.
4. Skip `createdb` and go straight to `npm run prisma:deploy && npm run seed`.

Or let the Neon CLI write the URLs for you. Run it **on your own machine** (it
authenticates through a browser callback on `127.0.0.1`) and **from the folder that
contains `package.json`** — if you extracted the zip, that is the inner `gallops/`
folder, not the folder the extractor created:

```bash
cd path/to/gallops
pwd
ls package.json prisma/schema.prisma
```

If `ls` prints both files you are in the right place. Then, one command per line
(no trailing comments — the CLI reads them as arguments):

```bash
npm i -g neon@latest
neon login
neon init -y --no-agent-setup --org-id <org> --project-id <project> --branch production --services postgres
test -f .env || cp .env.example .env
neon env pull --file .env
```

`env pull` writes `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct). The
schema expects the direct one as `DIRECT_URL`, so copy it across:

```bash
grep -v '^DIRECT_URL=' .env > .env.tmp && mv .env.tmp .env
grep '^DATABASE_URL_UNPOOLED=' .env | sed 's/^DATABASE_URL_UNPOOLED=/DIRECT_URL=/' >> .env
```

Then continue at step 4 of this document.

Two notes on the CLI:
- `--no-agent-setup` is required on Node 20. The agent-skills step wants Node 22.20+;
  everything else in the CLI works fine on Node 20, so there is no need to upgrade.
- `neon deploy` is idempotent — re-running it against a project that already has
  Postgres prints "No changes" and pulls the same variables.

## 3. Environment

```bash
cp .env.example .env
```

Minimum to boot:

```env
DATABASE_URL="postgresql://postgres@localhost:5432/gallops?schema=public"
AUTH_SECRET="<openssl rand -base64 32>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
UPLOAD_PROVIDER="local"
UPLOAD_DIR="./uploads"
```

`AUTH_SECRET` signs session JWTs — **rotate it in production**, and note that rotating it
logs everyone out. `NEXT_PUBLIC_APP_URL` is what gets encoded into QR codes and tracking
links, so set it to the public origin before printing table QR codes.

Everything else (Razorpay, web push, SMTP, WhatsApp, SMS) is optional and off by default.
See [DEPLOYMENT.md](DEPLOYMENT.md) for the full matrix.

> **Serving over plain HTTP?** Production builds mark the session cookie `Secure`.
> Set `COOKIE_SECURE=false` in `.env` for local/LAN HTTP demos, otherwise the browser
> silently drops the cookie and every dashboard request returns 403.

## 4. Install, migrate, seed

```bash
npm install
npx prisma generate
npm run prisma:deploy          # applies prisma/migrations
npm run seed                   # tenant + users + tables + plans + REAL MENU (170 items)
npm run dev                    # http://localhost:3000
```

`npm run seed` prints the demo accounts and the menu-import summary, e.g.:

```
  menu: 170 items / 11 categories (0 owner-verified rows preserved)
  restaurant: gallops — /r/gallops/menu
  owner      : owner@gallopsfoodplaza.in / gallops123
```

### Useful variants

| Command | When |
| --- | --- |
| `npm run db:seed` | fallback for `npm run seed` — runs the seed through the Prisma CLI, which loads `.env` itself |
| `npx prisma migrate dev` | you changed `schema.prisma` — creates a migration |
| `npm run db:reset` | destructive: drop, re-migrate, re-seed |
| `npm run import:menu` | re-import the menu JSON after editing it (safe, idempotent) |
| `npx prisma studio` | browse/edit data in a GUI |
| `npm run vapid` | generate VAPID keys for web push |

### `error: Environment variable not found: DATABASE_URL`

That message comes from `npm run seed` (or `npm run import:menu`) when the standalone
script cannot see `.env` — the app itself is unaffected, because `src/server.ts` loads
`.env` through Next. Two ways through it:

```bash
npm run db:seed
```

runs the same seed via the Prisma CLI, which loads `.env` itself and hands the
variables to the script. Or check that `.env` really contains `DATABASE_URL`:

```bash
grep -n '^DATABASE_URL' .env | sed 's#//[^@]*@#//***@#'
```

If it is missing entirely, re-pull it from Neon:

```bash
neon env pull --file .env -e DATABASE_URL -e DATABASE_URL_UNPOOLED
```

## 5. Try the real workflow (5 minutes)

1. **Guest** — open `/dashboard/tables/sheet`, sign in as the owner, and either print the
   sheet or copy a table link. Or grab a token straight from the DB:
   ```bash
   psql -d gallops -tAc "select code, \"qrToken\" from \"RestaurantTable\" limit 5;"
   ```
   then open `http://localhost:3000/r/gallops/menu?table=<qr-token>` **in a phone-sized window**.
2. Add dishes, open an item to choose variants, check out as *Cash at counter*.
3. **Reception** — sign in as `owner@gallopsfoodplaza.in` at `/dashboard/orders`. The order
   appears **without a refresh** (Socket.IO). Accept it.
4. **Kitchen** — in a second browser/profile sign in as `kitchen@gallopsfoodplaza.in`
   → `/dashboard/kitchen`. Start, then mark ready.
5. **Guest** — the tracking page flips to *Ready for pickup* live, with the "order ready"
   notification.
6. **Reception** — record the cash payment and complete the order. Check `/dashboard/analytics`.

## 6. First things to change before showing the owner

1. `/dashboard/settings` — brand, phone, address, hours, tax %, payment methods.
2. `/dashboard/menu` — filter **Needs review**, confirm prices against the in-house menu,
   set dietary flags, upload photos, mark items **Verified**.
3. `/dashboard/tables` — rename tables to match the floor plan, then print the QR sheet.
4. `/dashboard/staff` — replace the demo accounts and passwords.
5. `AUTH_SECRET` and every demo password.

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `403 You do not have access to this restaurant` right after login | Cookie not sent — set `COOKIE_SECURE=false` when on HTTP, or use HTTPS |
| Dashboard API returns HTML | The route file isn't named `route.ts` inside its own folder |
| `P1001 can't reach database` | Postgres not running / wrong `DATABASE_URL` |
| Orders don't arrive live | Confirm the Socket.IO handshake succeeds (`/api/socket`); the app falls back to polling |
| Uploads 404 after restart | `UPLOAD_DIR` is relative to the process CWD — run from the project root |
| Prices look 100× off | They're paise. Use `formatMoney()` / divide by 100 for display only |
| `429 RATE_LIMITED` on login | Login throttling; wait the stated seconds (tests retry automatically) |
| Out of memory on a small box | Cap the heap: `NODE_OPTIONS="--max-old-space-size=900"`, or run the production build (`npm run build && npm start`) instead of `npm run dev` |
