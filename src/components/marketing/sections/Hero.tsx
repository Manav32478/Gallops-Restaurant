'use client';

import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, BellRing, Clock3, QrCode, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhoneMenuMock } from '@/components/marketing/Mockups';
import { Eyebrow } from '@/components/marketing/primitives';
import {
  Aurora,
  GridBackdrop,
  LivePill,
  Magnetic,
  Particles,
  RotatingWords,
  Tilt,
} from '@/components/marketing/effects';

const AUDIENCES = ['family restaurants', 'highway food plazas', 'multi-outlet groups', 'cloud kitchens'];

export function Hero({ menuHref = '/r/gallops/menu' }: { menuHref?: string }) {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, reduced ? 0 : -40]);
  const fade = useTransform(scrollY, [0, 500], [1, reduced ? 1 : 0.35]);

  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      <Aurora />
      <GridBackdrop />
      <Particles count={26} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink-950" />

      <motion.div
        style={{ y, opacity: fade }}
        className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:py-28"
      >
        {/* ------------------------------------------------------------ copy */}
        <div>
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Eyebrow>
              <Sparkles size={12} /> Live at Gallops Restaurant, Mahuva
            </Eyebrow>
          </motion.div>

          <motion.h1
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 font-display text-[2.4rem] leading-[1.03] tracking-tight text-ivory-50 sm:text-5xl lg:text-[3.6rem]"
          >
            Scan. Order. Track.
            <br />
            <span className="bg-gradient-to-r from-lime-400 via-lime-300 to-emerald-400 bg-clip-text text-transparent">
              Serve without the wait.
            </span>
          </motion.h1>

          <motion.p
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-ivory-300 sm:text-lg"
          >
            Guests scan the code on their table and order from the real menu. Reception sees it the same second, the
            kitchen works a live queue, and the guest is notified the moment the food is ready — built for{' '}
            <RotatingWords words={AUDIENCES} className="text-lime-300" />.
          </motion.p>

          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.26 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Magnetic>
              <Link href={menuHref}>
                <Button size="lg" className="w-full sm:w-auto">
                  Open the live menu <ArrowRight size={17} />
                </Button>
              </Link>
            </Magnetic>
            <Magnetic>
              <Link href="/contact">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Book a demo
                </Button>
              </Link>
            </Magnetic>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <LivePill label="Realtime · Socket.IO" />
            <span className="inline-flex items-center gap-1.5 text-xs text-ivory-400">
              <Clock3 size={13} className="text-lime-400" /> Orders reach the counter in under a second
            </span>
          </motion.div>
        </div>

        {/* ---------------------------------------------------------- mockup */}
        <div className="relative flex justify-center lg:justify-end">
          <Tilt max={6} className="w-full max-w-[420px]">
            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <PhoneMenuMock />
            </motion.div>
          </Tilt>

          {/* floating status cards */}
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: -24, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
            className="absolute -left-2 top-16 hidden items-center gap-2.5 rounded-2xl border border-white/10 bg-ink-850/90 px-3.5 py-2.5 shadow-lift backdrop-blur-xl sm:flex lg:-left-10"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-lime-500/15 text-lime-400">
              <QrCode size={15} />
            </span>
            <span className="text-[11px] leading-tight text-ivory-200">
              Scanned at table <span className="font-semibold text-ivory-50">T04</span>
              <br />
              <span className="text-ivory-500">Menu opened in 0.4s</span>
            </span>
          </motion.div>

          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.7, delay: 1 }}
            className="absolute -right-1 bottom-24 hidden items-center gap-2.5 rounded-2xl border border-lime-500/25 bg-lime-500/[0.08] px-3.5 py-2.5 shadow-lift backdrop-blur-xl sm:flex lg:-right-8"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-lime-500/20 text-lime-300">
              <BellRing size={15} />
            </span>
            <span className="text-[11px] leading-tight text-lime-100">
              Order #G118 is ready
              <br />
              <span className="text-lime-300/70">Guest notified instantly</span>
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* scroll cue */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        <span className="text-[10px] uppercase tracking-[0.3em] text-ivory-500">Scroll</span>
        <motion.span
          className="h-8 w-px bg-gradient-to-b from-lime-400/80 to-transparent"
          animate={reduced ? undefined : { scaleY: [0.3, 1, 0.3], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          style={{ originY: 0 }}
        />
      </motion.div>
    </section>
  );
}
