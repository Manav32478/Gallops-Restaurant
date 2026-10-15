'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Clock, MapPin, Phone, Search, ShoppingBag, Sparkles, UtensilsCrossed, X, BadgeCheck, AlertTriangle, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { DishImage } from './DishImage';
import { ItemSheet, type SheetItem } from './ItemSheet';
import { useCart } from './CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { formatMoney } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export type MenuItemLite = {
  id: string;
  name: string;
  description?: string | null;
  servingSize?: string | null;
  imageUrl?: string | null;
  imageIsPlaceholder?: boolean;
  priceMinor: number;
  isVeg?: boolean | null;
  isVegan?: boolean | null;
  isJain?: boolean | null;
  spiceLevel?: number | null;
  isAvailable: boolean;
  isFeatured: boolean;
  variantGroups: {
    id: string;
    name: string;
    kind: 'VARIANT' | 'ADDON';
    type: 'SINGLE' | 'MULTI';
    required: boolean;
    minSelect: number;
    maxSelect: number;
    options: { id: string; name: string; priceDeltaMinor: number; isDefault: boolean }[];
  }[];
};

export type MenuSection = { id: string; name: string; items: MenuItemLite[] };
export type MenuCategory = { id: string; name: string; items: MenuItemLite[]; sections: MenuSection[] };
export type RestaurantLite = {
  slug: string;
  name: string;
  tagline?: string | null;
  about?: string | null;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  addressLine?: string | null;
  city?: string | null;
  phone?: string | null;
  currency: string;
  operatingHours?: unknown;
  acceptingOrders: boolean;
  languages: string[];
};

export function MenuClient({
  restaurant,
  categories,
  table,
  tableError,
}: {
  restaurant: RestaurantLite;
  categories: MenuCategory[];
  table: { code: string; label: string | null } | null;
  tableError: string | null;
}) {
  const { items: cartItems, count, subtotalMinor, add } = useCart();
  const { push } = useToast();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string>(categories[0]?.id ?? '');
  const [sheetItem, setSheetItem] = useState<SheetItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const reduced = useReducedMotion();
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { scrollY } = useScroll();
  const heroScale = useTransform(scrollY, [0, 300], [1, 1.12]);
  const heroOpacity = useTransform(scrollY, [0, 220], [1, 0.25]);
  const [loading, setLoading] = useState(false);

  const flatItems = useMemo(() => {
    const all: { item: MenuItemLite; category: MenuCategory }[] = [];
    for (const category of categories) {
      for (const item of category.items) all.push({ item, category });
      for (const section of category.sections) {
        for (const item of section.items) all.push({ item, category });
      }
    }
    return all;
  }, [categories]);

  const featured = useMemo(() => flatItems.map((f) => f.item).filter((item) => item.isFeatured), [flatItems]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const needle = query.trim().toLowerCase();
    return flatItems
      .filter(({ item }) =>
        `${item.name} ${item.description ?? ''}`.toLowerCase().includes(needle),
      )
      .slice(0, 40);
  }, [query, flatItems]);

  // Scroll spy: highlight the chip for the section currently in view.
  useEffect(() => {
    if (query.trim()) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActive(visible.target.id.replace('cat-', ''));
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );
    for (const id of Object.keys(sectionRefs.current)) {
      const node = sectionRefs.current[id];
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [query, categories]);

  function jumpTo(id: string) {
    setActive(id);
    const node = sectionRefs.current[id];
    if (node) {
      const top = node.getBoundingClientRect().top + window.scrollY - 104;
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    }
    const chip = chipRefs.current[id];
    chip?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  }

  function openItem(item: MenuItemLite, categoryName: string) {
    setSheetItem({ ...item, categoryName });
    setSheetOpen(true);
  }

  function quickAdd(item: MenuItemLite) {
    if (!item.isAvailable) {
      push({ tone: 'error', title: 'Sold out', body: `${item.name} is not available right now.` });
      return;
    }
    add({
      itemId: item.id,
      name: item.name,
      imageUrl: item.imageUrl ?? null,
      servingSize: item.servingSize ?? null,
      basePriceMinor: item.priceMinor,
      quantity: 1,
      options: [],
    });
    push({ tone: 'success', title: `${item.name} added`, body: 'Tap the cart bar to review your order.' });
  }

  const hasModifierGroups = (item: MenuItemLite) => item.variantGroups.length > 0;

  return (
    <div className="relative pb-28">
      {/* ------------------------------------------------------------- hero */}
      <header className="relative h-[42vh] min-h-[280px] w-full overflow-hidden">
        <motion.div style={{ scale: reduced ? 1 : heroScale, opacity: heroOpacity }} className="absolute inset-0">
          <img
            src={restaurant.heroImageUrl || '/img/brand/hero.jpg'}
            alt=""
            className="h-full w-full object-cover"
            fetchPriority="high"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/20" />

        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-950/70 px-3 py-1.5 backdrop-blur-md">
            {restaurant.logoUrl ? (
              <img src={restaurant.logoUrl} alt="" className="h-5 w-auto" />
            ) : (
              <UtensilsCrossed size={14} className="text-lime-400" />
            )}
            <span className="text-xs font-medium text-ivory-100">{restaurant.name}</span>
            <BadgeCheck size={13} className="text-lime-400" />
          </div>
          {table ? (
            <span className="rounded-full border border-lime-500/30 bg-lime-500/15 px-3 py-1.5 text-xs font-medium text-lime-300 backdrop-blur-md">
              Table {table.code}
            </span>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-5">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="font-display text-[2rem] leading-tight text-ivory-50">{restaurant.name}</h1>
            {restaurant.tagline && <p className="mt-1 text-sm text-ivory-300">{restaurant.tagline}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ivory-400">
              {restaurant.addressLine && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {restaurant.addressLine}
                  {restaurant.city ? `, ${restaurant.city}` : ''}
                </span>
              )}
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone.replace(/\s/g, '')}`} className="flex items-center gap-1 text-lime-400">
                  <Phone size={11} /> {restaurant.phone}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Clock size={11} /> Open today 6:00 am – 11:30 pm
              </span>
            </div>
          </motion.div>
        </div>
      </header>

      {tableError && (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <p>
            {tableError === 'TABLE_DISABLED'
              ? 'This table code is not currently accepting orders. Please call a server — you can still browse the menu.'
              : 'We could not recognise that table code. Please scan the QR code on your table, or call a server to order.'}
          </p>
        </div>
      )}

      {!restaurant.acceptingOrders && (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-2xl border border-chili/25 bg-chili/10 p-3.5 text-xs text-red-200">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <p>The kitchen is not accepting online orders right now. Please place your order with a server.</p>
        </div>
      )}

      {/* --------------------------------------------------------- search */}
      <div className="sticky top-0 z-40 -mt-px border-b border-white/[0.06] bg-ink-950/85 px-4 py-3 backdrop-blur-xl">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ivory-500" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLoading(true);
              window.setTimeout(() => setLoading(false), 220);
            }}
            placeholder={`Search ${flatItems.length} dishes…`}
            aria-label="Search the menu"
            className="w-full rounded-2xl border border-white/10 bg-ink-850/80 py-2.5 pl-10 pr-9 text-sm text-ivory-100 placeholder:text-ivory-500/70 outline-none transition focus:border-lime-500/50 focus:ring-2 focus:ring-lime-500/15"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ivory-500" aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </div>

        {!query && (
          <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {categories.map((category) => (
              <button
                key={category.id}
                ref={(node) => {
                  chipRefs.current[category.id] = node;
                }}
                onClick={() => jumpTo(category.id)}
                className={clsx(
                  'relative shrink-0 rounded-full px-3.5 py-1.5 text-xs transition-colors',
                  active === category.id ? 'text-ink-950' : 'text-ivory-300 hover:text-ivory-100',
                )}
              >
                {active === category.id && (
                  <motion.span
                    layoutId="chip-active"
                    className="absolute inset-0 rounded-full bg-lime-500"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10 font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------- search results */}
      {query ? (
        <section className="px-4 py-5">
          <p className="mb-3 text-xs uppercase tracking-wide text-ivory-500">
            {loading ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'} for “${query}”`}
          </p>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
              <p className="text-sm text-ivory-300">No dishes match “{query}”.</p>
              <p className="mt-1 text-xs text-ivory-500">Try a shorter search, or browse the categories.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(({ item, category }) => (
                <DishRow
                  key={item.id}
                  item={item}
                  currency={restaurant.currency}
                  onOpen={() => openItem(item, category.name)}
                  onQuickAdd={() => (hasModifierGroups(item) ? openItem(item, category.name) : quickAdd(item))}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* -------------------------------------------------- specials */}
          {featured.length > 0 && (
            <section className="py-6">
              <div className="flex items-center justify-between px-4">
                <h2 className="flex items-center gap-2 font-display text-lg text-ivory-50">
                  <Sparkles size={16} className="text-lime-400" /> House specials
                </h2>
              </div>
              <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
                {featured.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openItem(item, 'House specials')}
                    className="group relative w-[220px] shrink-0 snap-start overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02] text-left"
                  >
                    <DishImage
                      src={item.imageUrl}
                      name={item.name}
                      isPlaceholder={item.imageIsPlaceholder}
                      ratio="4 / 3"
                      className="w-full"
                    />
                    <div className="p-3">
                      <p className="truncate text-sm font-medium text-ivory-100">{item.name}</p>
                      <p className="mt-1 text-sm font-semibold text-lime-400">
                        {formatMoney(item.priceMinor, restaurant.currency)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* -------------------------------------------------- categories */}
          <div className="space-y-10 px-4 pb-6 pt-2">
            {categories.map((category, categoryIndex) => {
              const direct = category.items;
              const sections = category.sections;
              return (
                <section
                  key={category.id}
                  id={`cat-${category.id}`}
                  ref={(node) => {
                    sectionRefs.current[category.id] = node;
                  }}
                  className="scroll-mt-28"
                >
                  <motion.h2
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-2.5 font-display text-xl text-ivory-50"
                  >
                    <span className="h-5 w-[3px] rounded-full bg-lime-500" />
                    {category.name}
                  </motion.h2>
                  <p className="mt-1 pl-[13px] text-[11px] text-ivory-500">
                    {direct.length + sections.reduce((sum, s) => sum + s.items.length, 0)} dishes
                  </p>

                  {direct.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {direct.map((item, index) => (
                        <DishCard
                          key={item.id}
                          item={item}
                          index={Math.min(index, 6)}
                          currency={restaurant.currency}
                          onOpen={() => openItem(item, category.name)}
                          onQuickAdd={() => (hasModifierGroups(item) ? openItem(item, category.name) : quickAdd(item))}
                        />
                      ))}
                    </div>
                  )}

                  {sections.map((section) => (
                    <div key={section.id} className="mt-5">
                      {sections.length > 0 && section.name && (
                        <p className="mb-3 pl-[13px] text-[11px] font-medium uppercase tracking-[0.16em] text-ivory-400">
                          {section.name}
                        </p>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {section.items.map((item, index) => (
                          <DishCard
                            key={item.id}
                            item={item}
                            index={Math.min(index + categoryIndex, 6)}
                            currency={restaurant.currency}
                            onOpen={() => openItem(item, `${category.name} · ${section.name}`)}
                            onQuickAdd={() => (hasModifierGroups(item) ? openItem(item, category.name) : quickAdd(item))}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              );
            })}
          </div>

          <footer className="mx-4 mb-6 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 text-center">
            <p className="font-display text-lg text-ivory-100">{restaurant.name}</p>
            {restaurant.about && <p className="mt-2 text-xs leading-relaxed text-ivory-400">{restaurant.about}</p>}
            <p className="mt-4 text-[11px] leading-relaxed text-ivory-500">
              Menu data is imported from public listings and is being verified by the restaurant. Allergen and dietary
              details appear only once confirmed. Please tell your server about any allergy.
            </p>
          </footer>
        </>
      )}

      {/* ------------------------------------------------------------ cart bar */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 safe-bottom"
          >
            <Link href={`/r/${restaurant.slug}/cart`} className="block">
              <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-lime-500/30 bg-ink-850/95 px-4 py-3 shadow-lift backdrop-blur-xl">
                <span className="flex items-center gap-2.5">
                  <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-lime-500 text-ink-950">
                    <ShoppingBag size={16} />
                    <motion.span
                      key={count}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink-850 bg-ivory-100 px-1 text-[10px] font-bold text-ink-950"
                    >
                      {count}
                    </motion.span>
                  </span>
                  <span className="text-sm text-ivory-200">
                    {count} item{count === 1 ? '' : 's'}
                    <span className="block text-[11px] text-ivory-500">
                      {formatMoney(subtotalMinor, restaurant.currency)} + taxes
                    </span>
                  </span>
                </span>
                <span className="text-sm font-semibold text-lime-400">View cart →</span>
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <ItemSheet
        item={sheetItem}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        currency={restaurant.currency}
        onAdded={(quantity) =>
          push({
            tone: 'success',
            title: `${sheetItem?.name} added`,
            body: `${quantity} × added to your order.`,
          })
        }
      />
    </div>
  );
}

export function DishCard({
  item,
  currency,
  index = 0,
  onOpen,
  onQuickAdd,
}: {
  item: MenuItemLite;
  currency: string;
  index?: number;
  onOpen: () => void;
  onQuickAdd: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.article
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className={clsx(
        'group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02] transition-colors',
        !item.isAvailable && 'opacity-60',
      )}
    >
      <button onClick={onOpen} className="block w-full text-left">
        <DishImage
          src={item.imageUrl}
          name={item.name}
          isPlaceholder={item.imageIsPlaceholder}
          ratio="16 / 10"
          className="w-full"
        />
        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 text-sm font-medium leading-snug text-ivory-100">{item.name}</h3>
            <span className="shrink-0 text-sm font-semibold text-lime-400">
              {formatMoney(item.priceMinor, currency)}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.servingSize && <span className="text-[10px] text-ivory-500">{item.servingSize}</span>}
            {item.isVeg === true && <Badge tone="emerald">Veg</Badge>}
            {item.isVegan === true && <Badge tone="emerald">Vegan</Badge>}
            {item.isJain === true && <Badge tone="amber">Jain</Badge>}
          </div>
          {item.description && (
            <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-ivory-400">{item.description}</p>
          )}
        </div>
      </button>

      <div className="absolute right-2.5 top-2.5">
        {item.isAvailable ? (
          <button
            onClick={onQuickAdd}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-lime-500/40 bg-ink-950/80 text-lime-400 backdrop-blur transition hover:bg-lime-500 hover:text-ink-950 active:scale-90"
            aria-label={`Add ${item.name} to order`}
          >
            <Plus size={16} />
          </button>
        ) : (
          <span className="rounded-full border border-chili/40 bg-ink-950/85 px-2.5 py-1 text-[10px] text-red-300 backdrop-blur">
            Sold out
          </span>
        )}
      </div>
    </motion.article>
  );
}

export function DishRow({
  item,
  currency,
  onOpen,
  onQuickAdd,
}: {
  item: MenuItemLite;
  currency: string;
  onOpen: () => void;
  onQuickAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2.5">
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <DishImage
          src={item.imageUrl}
          name={item.name}
          isPlaceholder={item.imageIsPlaceholder}
          ratio="1 / 1"
          className="h-16 w-16 shrink-0 rounded-xl"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ivory-100">{item.name}</span>
          <span className="mt-0.5 block text-[11px] text-ivory-500">{item.servingSize ?? '—'}</span>
          <span className="mt-1 block text-sm font-semibold text-lime-400">
            {formatMoney(item.priceMinor, currency)}
          </span>
        </span>
      </button>
      {item.isAvailable ? (
        <button
          onClick={onQuickAdd}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-lime-500/40 text-lime-400 transition hover:bg-lime-500 hover:text-ink-950 active:scale-90"
          aria-label={`Add ${item.name}`}
        >
          <Plus size={16} />
        </button>
      ) : (
        <span className="shrink-0 text-[10px] text-red-300">Sold out</span>
      )}
    </div>
  );
}
