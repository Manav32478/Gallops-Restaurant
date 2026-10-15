'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type CartOption = { groupId: string; optionId: string; name: string; priceDeltaMinor: number };
export type CartItem = {
  key: string;
  itemId: string;
  name: string;
  imageUrl: string | null;
  servingSize: string | null;
  basePriceMinor: number;
  quantity: number;
  notes?: string;
  options: CartOption[];
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalMinor: number;
  add: (item: Omit<CartItem, 'key'> & { key?: string }) => void;
  updateQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  hydrateFailed: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}

function lineTotal(item: CartItem) {
  const extras = item.options.reduce((sum, option) => sum + option.priceDeltaMinor, 0);
  return (item.basePriceMinor + extras) * item.quantity;
}

export function CartProvider({
  slug,
  currency = 'INR',
  children,
}: {
  slug: string;
  currency?: string;
  children: React.ReactNode;
}) {
  const storageKey = `gallops:cart:${slug}`;
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrateFailed, setHydrateFailed] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      setHydrateFailed(true);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      setHydrateFailed(true);
    }
  }, [items, storageKey]);

  const add = useCallback((item: Omit<CartItem, 'key'> & { key?: string }) => {
    const key =
      item.key ??
      `${item.itemId}::${item.options.map((o) => o.optionId).sort().join(',')}::${(item.notes ?? '').trim()}`;
    setItems((prev) => {
      const found = prev.find((i) => i.key === key);
      if (found) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(50, i.quantity + item.quantity) } : i));
      }
      return [...prev, { ...item, key }];
    });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(50, quantity) } : i)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalMinor = items.reduce((sum, item) => sum + lineTotal(item), 0);
    return { items, count, subtotalMinor, add, updateQuantity, remove, clear, hydrateFailed };
  }, [items, add, updateQuantity, remove, clear, hydrateFailed]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export { lineTotal };
