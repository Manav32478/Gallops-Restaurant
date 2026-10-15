# Menu data — provenance, coverage and what the owner must verify

**Status: `NEEDS_REVIEW`.** 170 dishes were imported from a **third-party public listing**.
They are reproduced for internal setup only and **must be confirmed against the in-house
menu card before the guest menu is published**.

---

## 1. Sources

| Role | Source | URL | What it gave us |
| --- | --- | --- | --- |
| Primary (requested) | Restaurant Guru — Gallops Restaurant Mahuva | https://restaurant-guru.in/Gallops-Restaurant-Mahuva/menu | Brand, tagline, top-level cuisine sections (Punjabi, South Indian, Chinese, Snacks, Beverages, Desserts) from the **scanned menu-card image** — **no item names or prices** |
| Item data (used) | Zomato — Gallops Restaurant Eateria, Mahuva Locality, online-ordering menu | https://www.zomato.com/mahuva/gallops-restaurant-eateria-mahuva-locality/menu | **170 items with names, ₹ prices and serving sizes**, plus the sub-section structure |
| Cross-check | Swiggy — Gallops Eateria & Restaurant, Mahuva | https://www.swiggy.com/city/mahuva/gallops-eateria-and-restaurant-mahuva-rest933030 | Confirms cuisines, "₹250 for two", 4.3 (277 ratings), popular dishes: Pav Bhaji, Mixed Veg Khichdi, Steamed Rice, Kadai Paneer, FSSAI 10724006000074 |
| Brand | Gallops Food Plaza | https://gallopsfoodplaza.in | Phone +91 98240 06262, email info@gallopsfoodplaza.in |
| Listing | Restaurant Guru (profile) | https://restaurant-guru.in/Gallops-Restaurant-Mahuva | Phone +91 84690 07078; Ground Floor, Shree Mandhata Circle, nr. Dr. Bhutak Clinic, Mahuva, Gujarat; 6AM–11:30PM; ₹200–400 per person |

**Access-control note.** Restaurant Guru's menu page publishes the menu only as scanned
images; OCR of the menu card recovered section headings but no item-level data. Several
aggregator pages were behind bot protection and were **not** bypassed — the Zomato
online-ordering page, which renders its menu publicly, was used instead. If the owner
supplies an official CSV/PDF/photo export, that becomes the authoritative source and
should replace this data (see §4).

## 2. What was imported

| Category | Items |
| --- | --- |
| Thali | 2 (Kathiyawadi Executive ₹344, Punjabi Executive ₹377) |
| Soups & Salads | 13 |
| Starters | 14 |
| Main Course | 56 (Punjabi, Kathiyawadi, dal, vegetables across sub-sections) |
| Breads | 27 |
| Khichdi & Rice | 7 |
| Pizza, Pasta & Sizzlers | 11 |
| Fried Rice & Noodles | 10 |
| Burgers & Sandwiches | 7 |
| Snacks | 10 |
| Beverages | 13 |
| **Total** | **170** |

Representative verified values (₹, from the source): Kathiyawadi Executive Thali 344 ·
Punjabi Executive Thali 377 · soups 187–245 · salads 144 · Paneer Tikka Dry 461 ·
Paneer Chilly Dry/Gravy 498 · Gallops Special Tandoori Platter 546 · Paneer Butter Masala /
Kadai Paneer / Handi Paneer 475 · Kaju Paneer Masala 492 · Paneer Chatpatta 503 ·
dal 288–430 · Bhat/Dal 156 · Kathol 242 · Kaju Gathiya 360 · Tawa Roti 36 · Roti Plain 47 ·
Plain Rotla 86 · Naan 102 · Butter Naan 130 · Stuffed Naan 173 · Cheese/Garlic Naan 216 ·
khichdi 173–266 · pizza 233–311 · pasta/sizzlers 452–552 · Steamed Rice 203 · Veg Pulao 296 ·
Veg Hyderabadi Biryani 331 · Triple Fried Rice 389 · burgers 155–295 · sandwiches 155–280 ·
Vada Pav 46 · Samosa (2 pcs) 92 · Maggi 108–179 · Chole Kulcha 264 · Butter Milk 72 ·
lassi 202–234 · shakes 167–302.

Notes were preserved verbatim where the source had them — e.g. *"Jain not available"* on
Veg Cilantro Soup, Mushroom Tikka and Gallops Special Dhokli.

## 3. Known gaps — do not present these as complete

1. **Prices are online-delivery prices**, not confirmed dine-in prices. Aggregators
   routinely mark up. Expect to adjust; the tax/service model is configured separately in
   Settings → Taxes & payments.
2. **No photographs.** No public source had photos of Gallops dishes. The app serves
   clearly-labelled generated placeholders (`/api/placeholder`) — never a random photo of
   another restaurant's food.
3. **Dietary flags are unset, not guessed.** Veg/vegan/Jain/spice level/allergens were not
   published per item, so they are `null` in the DB and must be set by the owner.
4. **Missing sections.** The printed menu card advertises **South Indian** and **Desserts**,
   but the source's online menu lists neither. They are almost certainly served in-house;
   the owner must add them.
5. **Ratings and "popular" counts were not imported.** Swiggy/Restaurant-Guru ratings are
   third-party data and are not shown as Gallops content. The "chef's picks" flag is
   owner-controlled in the dashboard, not derived from a scraped popularity number.

## 4. Data model for provenance

Every `MenuItem` carries:

| Field | Meaning |
| --- | --- |
| `verificationStatus` | `NEEDS_REVIEW` · `OWNER_VERIFIED` · `SOURCE_VERIFIED` |
| `sourceUrl` | where this row came from |
| `sourceNotes` | caveats copied from the source (e.g. "Jain not available") |
| `priceMinor`, `servingSize` | as published, converted to paise |

The importer (`prisma/menu-import/import-menu.ts`) upserts on
`(restaurantId, category, name)` and **skips any row already marked `OWNER_VERIFIED`** —
so once the owner confirms a dish, re-running `npm run import:menu` can never clobber it.

## 5. Owner verification workflow

1. Sign in as owner → `/dashboard/menu`.
2. Filter **Needs review** (the count is shown on the dashboard).
3. For each dish: confirm the price against the in-house menu card, set serving size,
   tick veg / vegan / Jain, set spice level and allergens, upload a photo (or leave the
   labelled placeholder), add a description if you want one.
4. Mark **Verified**. It drops out of the review filter and becomes import-protected.
5. Publish the category/item when you're ready — unpublished items never reach guests.
6. Add the missing **South Indian** and **Desserts** sections via `/dashboard/categories`
   (or send us an official export and we'll import it as the authoritative source).

## 6. Replacing the data with an official export

1. Export the menu to CSV/JSON with columns: `category`, `section?`, `name`,
   `price_inr`, `serving?`, `veg?`, `description?`.
2. Convert into the shape in `prisma/menu-import/gallops-menu.json` (keep `_meta` — set
   `primarySource` to the owner export and `verificationStatus` to `OWNER_VERIFIED` only
   for rows the owner signed off).
3. `npm run import:menu` — idempotent; owner-verified rows are preserved.
4. Re-run `npm test` to confirm the menu loads and ordering still prices correctly.
