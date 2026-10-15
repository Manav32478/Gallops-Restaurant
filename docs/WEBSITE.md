# The website — section by section

A guided tour of every public page and every section on it: what it does, what is
animated, where its data comes from, and what is deliberately *not* claimed.

The site is one design system (dark "ink" surfaces, lime accent, Playfair display
type) with motion layered on top. Every effect degrades: with
`prefers-reduced-motion: reduce` the animations stop and the page still reads
perfectly; on touch devices hover-only effects never mount.

Global furniture (rendered on every marketing page by `<SiteEffects />` in
`src/components/marketing/SiteChrome.tsx`):

| Element | File | What it does |
| --- | --- | --- |
| Scroll progress bar | `effects.tsx` → `ScrollProgress` | 2px gradient line across the very top, spring-smoothed to page scroll |
| Film grain | `effects.tsx` → `Noise` | Inline SVG turbulence overlay, `mix-blend-soft-light`, no external asset |
| Cursor glow | `effects.tsx` → `CursorGlow` | Lime radial light that follows the mouse (fine pointers only, disabled on touch) |
| Back to top | `effects.tsx` → `BackToTop` | Fades in after 700px, smooth-scrolls (instant under reduced motion) |

---

## 1. Home — `/` (`src/app/page.tsx`)

A single server component that reads live counts from PostgreSQL, then composes the
sections below. Nothing on this page is a hard-coded marketing number.

### 1.1 Header — `SiteHeader`
Sticky, transparent until you scroll 12px, then it turns into a frosted glass bar.
Nav links use Framer Motion's `layoutId` to slide one shared underline between
sections as you scroll (scroll-spy), and on phones the hamburger opens a blurred
sheet with staggered links and a body-scroll lock. A "Skip to content" link is the
first focusable element for keyboard users.

### 1.2 Hero — `sections/Hero.tsx`
- **Background**: three slowly drifting colour clouds (`Aurora`), a faint technical
  grid with a light sweep crossing it every 14s (`GridBackdrop`), and 26 floating
  dust particles on deterministic paths (`Particles`).
- **Copy**: headline with a lime→emerald gradient line, and a rotating phrase that
  cycles through the audiences the product is built for.
- **Mockup**: the real guest menu in a phone frame that tilts toward your cursor
  (`Tilt`), with two glass cards floating beside it — "scanned at table T04" and
  "order #G118 is ready".
- **Motion**: parallax lift and fade tied to scroll; CTA buttons lean toward the
  cursor (`Magnetic`); a subtle scroll cue pulses at the bottom.

### 1.3 Stats — `sections/Stats.tsx`
Four cards counting up when scrolled into view (`CountUp`), each with a spotlight
that follows the pointer (`Spotlight`). Values are **read from the database at
request time**: published dishes, menu categories, active QR tables, staff roles.
The note underneath says so explicitly.

### 1.4 How it works — `sections/HowItWorks.tsx`
A sticky heading on the left, a four-step timeline on the right. A vertical line
fills as you scroll (`ScrollLine`, driven by `useScroll`), each card nudges right on
hover, and every step carries a small technical footnote (e.g. "integer paise · GST
basis points · idempotency key").

### 1.5 Product tour — `sections/Tour.tsx`
Four role tabs — **Guest / Reception / Kitchen / Owner** — with a pill that slides
between them via `layoutId`. Panels cross-fade; the mockups are live-feel:
- Guest: the phone menu **plus** the tracking card, which walks itself through
  placed → confirmed → preparing → ready on a loop and swaps in the "your order is
  ready" banner.
- Reception: the order board with columns and a live "Live" ping.
- Kitchen: order cards with **real ticking elapsed timers** and a progress bar that
  escalates toward the prep target.
- Owner: analytics tiles, revenue bars that grow on view, and best sellers.

Tabs auto-advance every 8 seconds with a progress bar, pause on hover, and respond
to ← / → keys. A footnote states the figures shown are illustrative samples.

### 1.6 Features — `sections/FeatureBento.tsx`
A bento grid of spotlight cards (lift on hover, gradient ring that tracks the
cursor) covering QR management, menu control, server-side money, honest
notifications, roles and isolation, India-readiness, mobile performance and the
relational data model — plus a wide tile showing the printable QR sheet. Ends with
a plain-speaking note about which integrations are switched off until you add keys.

### 1.7 Live menu marquee — `sections/MenuMarquee.tsx`
Two infinite tickers (opposite directions, pause on hover) of **real dishes and real
prices** pulled from the database, each linking into the live menu. Images come
from the app's own placeholder endpoint, which renders labelled SVG art — never a
random photograph of someone else's food.

### 1.8 Built with — `sections/StackMarquee` 
An honest marquee of the actual stack: Next.js, React, TypeScript, PostgreSQL,
Prisma, Socket.IO, Zod, Tailwind, Framer Motion, Razorpay (optional), Web Push.

### 1.9 Trust & reliability — `sections/Security.tsx`
Six guarantee cards (tenant isolation, sessions, payments that can't be faked,
least-privilege roles, audit trail, your own database), the **real source snippet**
showing how the tenant id enters the `WHERE` clause, and the list of things the
acceptance suite proves — with the commands to run them.

### 1.10 FAQ — `components/marketing/Faq.tsx`
Accordion with height animation and a rotating `+`. Answers are the same ones we'd
give on a call, including what is not switched on and what we refuse to fake.

### 1.11 Pricing teaser — `sections/PricingTeaser.tsx`
Plan cards generated from the `Plan` table (name, ₹ price, table/staff/order limits,
feature bullets), Growth highlighted. An amber note states billing is in
**development mode** — no provider is charged, and the console says so.

### 1.12 Closing CTA — `sections/Cta.tsx`
A rotating conic-gradient border (`GradientFrame`) around a two-column card: the
pitch on the left with the restaurant's real address, phone, email and hours; the
demo-request form on the right, which writes a real lead to the database.

### 1.13 Footer — `SiteFooter`
Brand block with address, click-to-call, click-to-email and Instagram; product and
company link columns; and the honest footer line that the Gallops menu data is
imported from public listings and awaiting owner verification.

### 1.14 Structured data
The home page emits `Restaurant` JSON-LD (name, address, phone, cuisine, price
range, INR, menu URL). No aggregate rating is emitted, because no verified rating
exists.

---

## 2. Features — `/features` (`src/app/features/page.tsx`)

Centred `PageHero` with two CTAs, then four alternating blocks — **Guests, Counter,
Kitchen, Owner** — each pairing the copy and a checked capability list with the
matching live-feel mockup (phone + tracking, order board, kitchen timers, analytics
+ QR sheet). Then a **Reliability** panel over an aurora background with six
engineering guarantees in spotlight tiles, and the FAQ.

## 3. Pricing — `/pricing` (`src/app/pricing/page.tsx`)

Hero, three plan cards rendered from the database (limits, feature lists, highlighted
Growth tier), the amber development-mode billing notice, a **comparison matrix**
across Starter / Growth / Pro with ticks and dashes, a CTA, and the FAQ.

## 4. Contact — `/contact` (`src/app/contact/page.tsx`)

Hero, then a column of spotlight contact cards (address, phone, email, service
hours — all read from the restaurant record) with Instagram and website chips, and
the demo-request form in an aurora-lit panel.

## 5. Legal — `/privacy`, `/terms`

Long-form prose in a narrow readable column under a gradient masthead, using the
same header, footer and page effects.

---

## Design tokens

| Token | Value | Used for |
| --- | --- | --- |
| `ink-950 → ink-500` | `#07070A` … `#3C3C4C` | page and card surfaces |
| `ivory-100` | `#F5F1E8` | body text |
| `lime-500` | `#A3E635` | accent, CTAs, prices |
| `font-display` | Playfair Display | headlines |
| `font-sans` | Inter | UI and body copy |

Utilities: `.glass`, `.card-hover`, `.tabular` (tabular numbers for money),
`.thin-scroll`, `.focus-ring`, `.no-scrollbar`, `.safe-bottom`.

## Motion inventory

`Aurora`, `GridBackdrop`, `Particles`, `Noise`, `ScrollProgress`, `CursorGlow`,
`BackToTop`, `Spotlight` (cursor-tracked card highlight + gradient ring), `Tilt`
(3D hover), `Magnetic` (cursor-pulled button), `GradientFrame` (rotating conic
border), `CountUp`, `Marquee`, `RevealText` (word-by-word blur-in),
`RotatingWords`, `LivePill`, `Beam`, `ScrollLine` (scroll-linked fill), `Parallax`,
`useScrollSpy`, plus the shared `Reveal` / `Stagger` / `StaggerItem` scroll reveals.

## Honest-content rules applied to the site

- No invented ratings, "trusted by N restaurants" counts, testimonials or reviews.
- No fabricated discounts or countdown offers; plans show their real database prices.
- Billing states plainly that it is in development mode.
- The menu marquee uses the restaurant's real dishes and real prices, with a note
  that imported data awaits owner verification.
- Marketing mockups use generated illustration for the phone/menu previews; actual
  menu items without an owner-approved photograph are served the labelled
  placeholder, never a stock photo of another restaurant's dish.
- Figures inside the animated mockups are labelled as illustrative samples; every
  number in the stats row is read live from the database.
