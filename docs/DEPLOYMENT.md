# Deployment

## 1. What you're deploying

A **long-running Node.js process** that serves Next.js and Socket.IO from one HTTP server
(`src/server.ts`). That rules out serverless-only hosts for the real-time features:

| Target | Works | Notes |
| --- | --- | --- |
| VPS / VM (Ubuntu + systemd + Nginx/Caddy) | ✅ | recommended, simplest |
| Render / Railway / Fly.io / Heroku | ✅ | keep the instance awake; needs WebSockets enabled |
| Docker (any host, incl. ECS / Cloud Run with concurrency) | ✅ | see Dockerfile sketch below |
| Vercel / Netlify Functions | ⚠️ | pages and APIs work; **Socket.IO does not**. You'd need a separate socket host and the polling fallback |

## 2. Build & run

```bash
npm ci
cp .env.example .env      # then fill it in — see §3
npx prisma migrate deploy
npm run seed              # only the first deploy, or to refresh demo data
npm run build
NODE_ENV=production node --enable-source-maps -r tsx/cjs src/server.ts   # or: npm start
```

`npm start` runs `NODE_ENV=production tsx src/server.ts` on `PORT` (default 3000), bound to
`HOSTNAME` (set `0.0.0.0` behind a proxy). Put it behind a process manager:

```ini
# /etc/systemd/system/gallops.service
[Unit]
Description=Gallops QR ordering
After=network.target postgresql.service

[Service]
WorkingDirectory=/srv/gallops
EnvironmentFile=/srv/gallops/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node -r tsx/cjs src/server.ts
Restart=always
RestartSec=5
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now gallops
journalctl -u gallops -f
```

### Nginx (WebSocket upgrade is mandatory)

```nginx
server {
  listen 443 ssl http2;
  server_name menu.gallopsfoodplaza.in;

  ssl_certificate     /etc/letsencrypt/live/menu.gallopsfoodplaza.in/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/menu.gallopsfoodplaza.in/privkey.pem;

  client_max_body_size 8m;            # logo / dish image uploads

  location /api/socket {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host       $host;
    proxy_read_timeout 75s;
  }

  location /uploads/ { alias /srv/gallops/uploads/; expires 30d; }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### Docker (sketch)

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "-r", "tsx/cjs", "src/server.ts"]
```

Mount `/app/uploads` as a volume (or switch to Cloudinary/S3) and set `DATABASE_URL` at runtime.

## 3. Database (Neon or any PostgreSQL)

The app talks to PostgreSQL through Prisma and expects two variables:

| Variable | What it is | Example |
| --- | --- | --- |
| `DATABASE_URL` | **Pooled** connection used by the running app | `postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |
| `DIRECT_URL` | **Direct** connection used by `prisma migrate` | `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` |

Neon's CLI calls the second one `DATABASE_URL_UNPOOLED`. After `neon env pull`, copy it
into the name the schema looks for:

```bash
grep -v '^DIRECT_URL=' .env > .env.tmp && mv .env.tmp .env
grep '^DATABASE_URL_UNPOOLED=' .env | sed 's/^DATABASE_URL_UNPOOLED=/DIRECT_URL=/' >> .env
```

Older Neon guides also add `&pgbouncer=true` to the pooled URL. Neon no longer requires
it, and it disables prepared statements, so leave it off unless you see
"prepared statement already exists" errors.

Why two: this is a **long-running Node server** (Next.js + Socket.IO in one process),
so it keeps a small, persistent connection pool — the pooled endpoint is the right
choice at runtime, while schema migrations need a session that PgBouncer's transaction
mode cannot provide.

Recommended driver choice for this architecture: **Prisma's default `postgresql`
provider over the pooled endpoint.** The Neon *serverless* HTTP driver
(`@neondatabase/neon`) is designed for per-request serverless/edge functions; on a
persistent server it adds a hop and complicates interactive transactions, so the app
deliberately does not use it. If you later move a route to the Edge runtime, add
`@prisma/adapter-neon` for that route only.

Neon specifics that matter here:
- Keep `connection_limit` modest (the pooler's limit depends on your compute size);
  a single app instance is fine with the default.
- Enable **connection pooling** in the Neon console and use the `-pooler` host.
- Neon scales to zero when idle — the first request after an idle period can take a
  second or two. Raise the minimum compute size if the demo must feel instant.
- Use `neon branches` for a staging copy of the data; `main`/`production` for live.

## 4. Environment variables

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✅ | — | PostgreSQL. Add `?sslmode=require` for managed hosts |
| `AUTH_SECRET` | ✅ | — | `openssl rand -base64 32`. Rotating logs everyone out |
| `NEXT_PUBLIC_APP_URL` | ✅ | `http://localhost:3000` | **Public origin.** Baked into QR codes and tracking links — set before printing QR sheets |
| `PORT` / `HOSTNAME` | ➖ | `3000` / `0.0.0.0` | |
| `COOKIE_SECURE` | ➖ | `true` in production | Set `false` **only** for plain-HTTP demos |
| `UPLOAD_PROVIDER` | ➖ | `local` | `local` or `cloudinary` |
| `UPLOAD_DIR` | ➖ | `./uploads` | relative to CWD; make it a persistent volume |
| `CLOUDINARY_URL` | ➖ | — | required when `UPLOAD_PROVIDER=cloudinary` |
| `RAZORPAY_ENABLED` | ➖ | `false` | `true` only with live/test keys |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | ➖ | — | dashboard → Settings → API keys |
| `RAZORPAY_WEBHOOK_SECRET` | ➖ | — | used to verify `x-razorpay-signature` |
| `WEB_PUSH_ENABLED` / `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | ➖ | off | `npm run vapid` generates keys |
| `SMTP_ENABLED` / `SMTP_URL` / `SMTP_FROM` | ➖ | off | order notifications by email |
| `WHATSAPP_ENABLED` / `WHATSAPP_PROVIDER_URL` / `WHATSAPP_TOKEN` | ➖ | off | business API gateway |
| `SMS_ENABLED` / `SMS_PROVIDER_URL` / `SMS_TOKEN` | ➖ | off | Indian SMS gateway (DLT templates apply) |
| `PLATFORM_BILLING_MODE` | ➖ | `development` | `live` hides the "development mode" banners once a billing provider is wired |

**Never commit `.env`.** `.env.example` documents every key with empty values.

## 5. Enabling the optional integrations

**Razorpay (online payments)**
1. `RAZORPAY_ENABLED=true`, set key id + secret; set `RAZORPAY_WEBHOOK_SECRET` to the secret
   configured in the Razorpay dashboard for the `payment.captured` / `order.paid` events.
2. Point the webhook at `https://<host>/api/payments/razorpay/webhook`.
3. Verify: a payment only turns an order `PAID` after `verify` (signature check) **or** a
   signed webhook. A bad signature returns `401` and the order stays `PENDING`.
4. In Settings → Payments, tick Razorpay for the restaurant. Cash at counter / pay at table
   keep working either way.

**Web push (guest "order ready" on a locked phone)**
1. `npm run vapid` → put the keys in `.env`, set `WEB_PUSH_ENABLED=true`.
2. The guest is asked to allow notifications on the tracking page; the subscription is stored
   in `PushSubscription`. Denied or unconfigured → the attempt is logged as `SKIPPED`, never claimed as sent.

**Email / SMS / WhatsApp** — set the matching `*_ENABLED=true` plus credentials. Each channel
is independent; unconfigured channels degrade to `SKIPPED` rows in `NotificationLog`.

**Uploads on multiple instances** — set `UPLOAD_PROVIDER=cloudinary` and `CLOUDINARY_URL`
(the `src/lib/upload.ts` interface is the single seam), otherwise uploads land on one
instance's disk and 404 on the others.

## 6. Before go-live checklist

- [ ] `AUTH_SECRET` rotated; every demo password changed; `/dashboard/staff` reviewed
- [ ] `NEXT_PUBLIC_APP_URL` set to the public HTTPS origin
- [ ] `COOKIE_SECURE` left at the production default (HTTPS)
- [ ] `npx prisma migrate deploy` run; automated nightly `pg_dump`
- [ ] Menu reviewed by the owner: prices confirmed, dietary flags set, `Needs review` empty
- [ ] Table QR sheet printed **after** the public URL is final (tokens encode the URL)
- [ ] Razorpay webhook reachable and verified; a live ₹1 payment completed end to end
- [ ] `npm test` and the real-time suite green against the deployed URL
- [ ] 320px pass on a real low-end Android phone over mobile data
- [ ] Backups restorable: `pg_restore` into a scratch DB and boot against it

## 7. Operations

**Backups**
```bash
pg_dump -Fc gallops > gallops-$(date +%F).dump      # nightly, ship off-box
pg_dump -Fc gallops | gzip | aws s3 cp - s3://bucket/gallops/$(date +%F).dump.gz
```
Restore: `createdb gallops_restore && pg_restore -d gallops_restore gallops-*.dump`.
Also back up `uploads/` (or rely on Cloudinary/S3 durability).

**Health & logs** — `GET /api/health` returns DB connectivity and version info; point your
uptime monitor at it. Application logs go to stdout (journald/Docker). Watch for
`[socket] auth error`, payment `502`s, and `FAILED` rows in `NotificationLog`.

**Scaling** — see §8 of [ARCHITECTURE.md](ARCHITECTURE.md): Redis adapter for Socket.IO,
object storage for uploads, PgBouncer for connections, then horizontal replicas.

**Zero-downtime** — `prisma migrate deploy` is backwards-compatible for additive changes;
run it before the new build starts, then restart the process. For destructive schema
changes, schedule a short window.
