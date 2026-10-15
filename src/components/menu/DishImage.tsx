'use client';
import { useState } from 'react';
import { clsx } from 'clsx';
import { apiPlaceholder } from '@/lib/placeholder-url';

/**
 * Responsive dish image with a graceful placeholder fallback.
 * Uses plain <img> so it works identically in the sandboxed preview and in
 * production, with lazy loading below the fold and an aspect-ratio box that
 * prevents layout shift.
 */
export function DishImage({
  src,
  alt,
  name,
  category,
  className,
  ratio = '16 / 10',
  priority,
  isPlaceholder,
}: {
  src?: string | null;
  alt?: string;
  name: string;
  category?: string;
  className?: string;
  ratio?: string;
  priority?: boolean;
  isPlaceholder?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const source = !src || failed ? apiPlaceholder(name, category) : src;

  return (
    <div className={clsx('relative overflow-hidden bg-ink-850', className)} style={{ aspectRatio: ratio }}>
      <img
        src={source}
        alt={alt ?? name}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/10 to-transparent" />
      {isPlaceholder && (
        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-ink-950/80 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-ivory-400">
          Illustrative
        </span>
      )}
    </div>
  );
}
