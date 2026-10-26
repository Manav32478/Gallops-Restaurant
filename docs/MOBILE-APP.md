# Mobile app: install it on a phone (PWA) and build a real APK

Short version:

- **Today, with no app store:** the product is already a **PWA** — installable on any
  Android or iPhone from the browser. It gets a home-screen icon, opens full screen,
  and keeps the menu and tracking page available offline.
- **A true APK** (`.apk` you can sideload or publish to the Play Store) is built with
  **Bubblewrap** on your own machine, and it needs the site on a **permanent HTTPS
  domain**. Everything for that is already in the repo (manifest, icons, TWA config,
  `.well-known/assetlinks.json` route) — see §3.

---

## 1. What is already in the app (PWA)

| File | Purpose |
| --- | --- |
| `public/manifest.webmanifest` | Name, icons, `standalone` display, start URL `/r/gallops/menu`, app shortcuts |
| `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon-*.png` | Generated app icons in the brand palette (ink + lime QR mark) |
| `public/sw.js` | Service worker: app-shell caching, offline fallback, and the web-push handler for "order ready" |
| `src/app/offline/page.tsx` | Offline screen with a retry button |
| `src/components/pwa/PwaInstaller.tsx` | Registers the service worker and shows the native install prompt; on iOS it explains Share → Add to Home Screen instead of showing a dead button |
| `src/app/.well-known/assetlinks.json/route.ts` | Serves Digital Asset Links (needed by a TWA/APK). Reads `ANDROID_PACKAGE_NAME` and `ANDROID_SHA256_CERT` from the environment |

Caching rules in the service worker: **nothing under `/api/` is ever cached** — prices
and order state must always come from the server. Build output, icons and images are
cache-first; page navigations are network-first with an offline fallback.

The service worker only registers in a **secure context** (HTTPS, or `localhost`), and
only in a production build. That is a browser requirement, not a choice.

---

## 2. Install it on your phone right now

### Option A — same Wi-Fi (quickest, no deployment)
Chrome/Edge/Safari will only offer "Install app" over HTTPS. Over plain HTTP on a LAN
IP you can still open the site, just without install/offline. To get HTTPS locally:

```bash
brew install cloudflared                 # one time
cloudflared tunnel --url http://localhost:3000
```
It prints an `https://….trycloudflare.com` URL. Open that on your phone →
Chrome (⋮) → **Install app** → icon on the home screen. On iPhone: **Share → Add to Home Screen**.

(`ngrok http 3000` works the same way if you prefer it.)

### Option B — deploy it, then install (recommended for a lasting demo)
Deploy once (see [DEPLOYMENT.md](DEPLOYMENT.md)) to Render / Railway / Fly / a VPS with
HTTPS, then install from that URL on any phone. Same codebase, no extra work.

---

## 3. Building a real APK (Bubblewrap / Trusted Web Activity)

**Why I can't hand you an APK file:** an APK is compiled from this web app together
with a hard-coded launch URL. Building one requires the Android SDK + Gradle + a
signing keystore (a ~2 GB toolchain download), and — more importantly — the APK would
point at a URL that only exists inside my sandbox, which dies when the session ends.
An APK pointing at a dead URL is worse than no APK, so here is the exact recipe to
build your own in about 10 minutes. It is deterministic, not guesswork.

### 3.1 Prerequisites (on your Mac)

```bash
brew install --cask android-studio      # or: brew install openjdk@17 gradle
brew install node                       # you already have it
```

### 3.2 Deploy the site to HTTPS
Any host works. Note the final domain, e.g. `menu.gallopsfoodplaza.in`.

### 3.3 Point the TWA config at your domain
Edit `twa-manifest.json` in the repo root and replace **every**
`menu.gallopsfoodplaza.in` with your real domain:

```bash
sed -i '' 's|menu.gallopsfoodplaza.in|your-domain.com|g' twa-manifest.json
```

### 3.4 Build

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://your-domain.com/manifest.webmanifest
#   → answer the prompts (package id com.gallops.app, app name Gallops)
#   → it downloads the Android SDK bits the first time (a few minutes)

# generate signing keys + build
bubblewrap build
```

Output: `./app-release-signed.apk` — sideload it with
`adb install app-release-signed.apk`, or upload the `.aab` (`bubblewrap build --aab`)
to the Play Store.

### 3.5 Publish the asset-links fingerprint
Get your signing certificate fingerprint and put it in the app's environment:

```bash
keytool -list -v -keystore android.keystore -alias gallops | grep SHA256
```
Then set, on your server:
```env
ANDROID_PACKAGE_NAME=com.gallops.app
ANDROID_SHA256_CERT=AA:BB:CC:…:FF            # from the command above (Play's fingerprint too, comma separated)
```
`GET /.well-known/assetlinks.json` then serves it, which is what removes the browser
address bar from the installed app. Verify with Google's
[asset links tester](https://developers.google.com/digital-asset-links/tools/generator).

---

## 4. If you want a fully native shell instead

A TWA is the right 95% answer — it is your real app, always current, no duplicated
codebase. If you later need native device features (Bluetooth printers, native
receipt printing, background geofencing), wrap it with Capacitor:

```bash
npm i @capacitor/core @capacitor/android && npx cap init "Gallops" com.gallops.app --web-dir=out
npx cap add android && npx cap open android     # builds in Android Studio
```
That path means maintaining a native project, so only take it when a specific native
feature forces you to.

---

## 5. Demo checklist for showing it on a phone

1. `./scripts/demo.sh` — resets the DB, reseeds (170 dishes, 14 tables, demo orders), starts the server.
2. `cloudflared tunnel --url http://localhost:3000` → open the HTTPS URL on the phone.
3. Install the app from Chrome (⋮ → Install app) so it looks native to the client.
4. Scan a printed table QR (or open `/r/gallops/menu?table=<token>` from
   `/dashboard/tables/sheet`) → order → accept on the reception dashboard → mark ready
   in the kitchen → the phone shows **"Your order is ready"**.
5. Sign in as `owner@gallopsfoodplaza.in / gallops123` on a laptop to run the counter.
