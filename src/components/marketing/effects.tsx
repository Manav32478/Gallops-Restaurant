'use client';

/**
 * Reusable motion / visual-effect primitives for the marketing site.
 *
 * Rules followed here:
 *  - every effect degrades to a static, perfectly usable state when
 *    `prefers-reduced-motion: reduce` is set;
 *  - nothing depends on the network (no CDNs, no external fonts or images);
 *  - effects are GPU-friendly (transform / opacity only) and skipped entirely
 *    on touch devices where hover effects make no sense.
 */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { clsx } from 'clsx';

/* ------------------------------------------------------------------ helpers */

/** true when the visitor has a fine pointer (mouse/trackpad) */
export function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFine(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return fine;
}

/** Deterministic pseudo-random numbers — identical on server and client, so no hydration mismatch. */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

/* --------------------------------------------------------------- backgrounds */

/** Slow-drifting colour clouds. The signature look of the site. */
export function Aurora({ className, orbs = 3 }: { className?: string; orbs?: number }) {
  const reduced = useReducedMotion();
  const palette = [
    'rgba(163,230,53,0.30)',
    'rgba(52,211,153,0.22)',
    'rgba(103,199,232,0.18)',
    'rgba(249,115,22,0.16)',
  ];
  const random = useMemo(() => seeded(7), []);
  const blobs = useMemo(
    () =>
      Array.from({ length: orbs }, (_, index) => ({
        color: palette[index % palette.length],
        size: 420 + random() * 380,
        top: `${-10 + random() * 60}%`,
        left: `${-5 + random() * 80}%`,
        delay: index * 2.4,
        duration: 22 + random() * 14,
      })),
    [orbs, random],
  );

  return (
    <div aria-hidden className={clsx('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {blobs.map((blob, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full blur-[110px] will-change-transform"
          style={{
            width: blob.size,
            height: blob.size,
            top: blob.top,
            left: blob.left,
            background: `radial-gradient(circle at 30% 30%, ${blob.color}, transparent 68%)`,
          }}
          animate={
            reduced
              ? undefined
              : { x: [0, 60, -40, 0], y: [0, -50, 30, 0], scale: [1, 1.12, 0.94, 1] }
          }
          transition={{ duration: blob.duration, delay: blob.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/** Faint technical grid with a slow light sweep across it. */
export function GridBackdrop({ className, sweep = true }: { className?: string; sweep?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div aria-hidden className={clsx('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="absolute inset-0 bg-grid-faint bg-[size:56px_56px] opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />
      {sweep && (
        <motion.div
          className="absolute -inset-y-20 w-[45%] bg-gradient-to-r from-transparent via-lime-400/[0.07] to-transparent"
          initial={{ x: '-60%' }}
          animate={reduced ? { x: '-60%' } : { x: '260%' }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
        />
      )}
    </div>
  );
}

/** Film grain. Inline SVG turbulence — no external asset. */
export function Noise({ opacity = 0.4 }: { opacity?: number }) {
  const svg =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] mix-blend-soft-light"
      style={{ backgroundImage: svg, opacity }}
    />
  );
}

/** Deterministic floating dust — adds depth behind the hero. */
export function Particles({ count = 22, className }: { count?: number; className?: string }) {
  const reduced = useReducedMotion();
  const random = useMemo(() => seeded(21), []);
  const dots = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: `${random() * 100}%`,
        top: `${random() * 100}%`,
        size: 1 + random() * 2.4,
        delay: random() * 6,
        duration: 8 + random() * 10,
        travel: 18 + random() * 40,
      })),
    [count, random],
  );
  return (
    <div aria-hidden className={clsx('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {dots.map((dot, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full bg-lime-300/50"
          style={{ width: dot.size, height: dot.size, left: dot.left, top: dot.top }}
          animate={reduced ? { opacity: 0.35 } : { y: [0, -dot.travel, 0], opacity: [0, 0.7, 0] }}
          transition={{ duration: dot.duration, delay: dot.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- page furniture */

/** Top-of-page reading progress bar. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 160, damping: 26, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-gradient-to-r from-lime-400 via-emerald-400 to-sky-400"
      style={{ scaleX }}
    />
  );
}

/** Soft cursor-following glow. Desktop pointers only, never on touch. */
export function CursorGlow() {
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const x = useMotionValue(-500);
  const y = useMotionValue(-500);
  const springX = useSpring(x, { stiffness: 120, damping: 22, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 120, damping: 22, mass: 0.4 });
  const background = useMotionTemplate`radial-gradient(420px circle at ${springX}px ${springY}px, rgba(163,230,53,0.10), transparent 68%)`;

  useEffect(() => {
    if (reduced || !fine) return;
    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [fine, reduced, x, y]);

  if (reduced || !fine) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[55] hidden md:block"
      style={{ background }}
    />
  );
}

/** Floating "back to top" control that fades in after the hero. */
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-6 right-5 z-[65] flex h-11 w-11 items-center justify-center rounded-full border border-lime-500/30 bg-ink-900/90 text-lime-400 shadow-lift backdrop-blur transition hover:border-lime-500/60 hover:bg-ink-850 focus-ring"
          aria-label="Back to top"
        >
          <ArrowUp size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------- card effects */

/**
 * Card whose surface follows the cursor with a soft highlight — the "spotlight"
 * effect. Uses motion values, so it never triggers a React re-render on move.
 */
export function Spotlight({
  children,
  className,
  tone = 'lime',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'lime' | 'sky' | 'ember';
  as?: 'div' | 'li' | 'article';
}) {
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const color =
    tone === 'lime' ? 'rgba(163,230,53,0.14)' : tone === 'sky' ? 'rgba(103,199,232,0.14)' : 'rgba(249,115,22,0.14)';
  const border =
    tone === 'lime' ? 'rgba(163,230,53,0.35)' : tone === 'sky' ? 'rgba(103,199,232,0.35)' : 'rgba(249,115,22,0.35)';
  const background = useMotionTemplate`radial-gradient(340px circle at ${mx}px ${my}px, ${color}, transparent 68%)`;
  const borderImage = useMotionTemplate`radial-gradient(340px circle at ${mx}px ${my}px, ${border}, rgba(255,255,255,0.07) 55%)`;

  const Component = motion[Tag] as typeof motion.div;

  return (
    <Component
      ref={ref}
      onPointerMove={(event: React.PointerEvent) => {
        if (reduced) return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        mx.set(event.clientX - rect.left);
        my.set(event.clientY - rect.top);
      }}
      onPointerLeave={() => {
        mx.set(-400);
        my.set(-400);
      }}
      className={clsx('group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02]', className)}
    >
      {fine && !reduced && (
        <>
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background }}
          />
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ padding: 1, maskComposite: 'exclude', WebkitMaskComposite: 'xor', mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)' }}
          >
            <motion.span className="absolute inset-0 rounded-3xl" style={{ background: borderImage }} />
          </motion.span>
        </>
      )}
      <div className="relative">{children}</div>
    </Component>
  );
}

/** Subtle 3D tilt on hover. Disabled for touch and reduced-motion users. */
export function Tilt({
  children,
  className,
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });
  const transform = useMotionTemplate`perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;

  if (reduced || !fine) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={clsx('will-change-transform', className)}
      style={{ transform }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        ry.set(px * max * 2);
        rx.set(-py * max * 2);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Button wrapper that leans toward the cursor. */
export function Magnetic({
  children,
  className,
  strength = 0.28,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const x = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 });
  if (reduced || !fine) return <span className={clsx('inline-block', className)}>{children}</span>;
  return (
    <motion.span
      className={clsx('inline-block', className)}
      style={{ x, y }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
        y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

/** Rotating conic gradient border. */
export function GradientFrame({
  children,
  className,
  rounded = 'rounded-[2rem]',
}: {
  children: ReactNode;
  className?: string;
  rounded?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div className={clsx('relative overflow-hidden p-[1px]', rounded, className)}>
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[220%] w-[220%] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            'conic-gradient(from 0deg, rgba(163,230,53,0) 0deg, rgba(163,230,53,0.65) 60deg, rgba(52,211,153,0.5) 120deg, rgba(163,230,53,0) 200deg, rgba(163,230,53,0) 360deg)',
        }}
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
      <div className={clsx('relative bg-ink-950/95 backdrop-blur-xl', rounded)}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ content */

/** Counts up when scrolled into view. */
export function CountUp({
  value,
  duration = 1.6,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/** Infinite horizontal ticker. Content is rendered twice and shifted by 50%. */
export function Marquee({
  children,
  speed = 42,
  reverse = false,
  className,
  pauseOnHover = true,
}: {
  children: ReactNode;
  speed?: number;
  reverse?: boolean;
  className?: string;
  pauseOnHover?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <div
      className={clsx(
        'group relative flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]',
        className,
      )}
    >
      {/* Two identical halves with a trailing gap make the -50% loop seamless. */}
      <div
        className={clsx('flex w-max shrink-0', pauseOnHover && 'group-hover:[animation-play-state:paused]')}
        style={{
          animation: reduced ? undefined : `marquee ${speed}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        <div className="flex shrink-0 items-stretch gap-4 pr-4">{children}</div>
        <div aria-hidden className="flex shrink-0 items-stretch gap-4 pr-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Word-by-word heading reveal. */
export function RevealText({
  text,
  className,
  delay = 0,
  as: Tag = 'h2',
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}) {
  const reduced = useReducedMotion();
  const words = text.split(' ');
  const Component = motion[Tag] as typeof motion.h2;
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: reduced ? 0 : 0.045, delayChildren: delay } } }}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="inline-block"
          variants={{
            hidden: reduced ? { opacity: 0 } : { opacity: 0, y: '0.5em', filter: 'blur(6px)' },
            show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
          }}
        >
          {word}
          {index < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </Component>
  );
}

/** Cycling word swap with vertical slide. */
export function RotatingWords({ words, className }: { words: string[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % words.length), 2600);
    return () => clearInterval(timer);
  }, [words.length, reduced]);
  return (
    <span className={clsx('relative inline-flex h-[1.15em] overflow-hidden align-bottom', className)}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={reduced ? { opacity: 0 } : { y: '0.9em', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: '-0.9em', opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="whitespace-nowrap"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Pulsing "live" indicator. */
export function LivePill({ label, tone = 'lime' }: { label: string; tone?: 'lime' | 'amber' | 'sky' }) {
  const dot = tone === 'lime' ? 'bg-lime-400' : tone === 'amber' ? 'bg-amber-400' : 'bg-sky-400';
  const text = tone === 'lime' ? 'text-lime-300' : tone === 'amber' ? 'text-amber-300' : 'text-sky-300';
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium backdrop-blur',
        text,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className={clsx('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', dot)} />
        <span className={clsx('relative inline-flex h-2 w-2 rounded-full', dot)} />
      </span>
      {label}
    </span>
  );
}

/** Animated hairline divider used between sections. */
export function Beam({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  return (
    <div className={clsx('relative h-px w-full overflow-hidden bg-white/[0.06]', className)}>
      <motion.div
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-lime-400/70 to-transparent"
        initial={{ x: '-100%' }}
        animate={reduced ? { x: '-100%' } : { x: '300%' }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
      />
    </div>
  );
}

/** Scroll-linked vertical progress line for stepped lists. */
export function ScrollLine({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 75%', 'end 55%'],
  });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });
  return (
    <div ref={ref} className={clsx('absolute left-[15px] top-2 bottom-2 w-px bg-white/[0.08]', className)}>
      <motion.div className="h-full w-full origin-top bg-gradient-to-b from-lime-400 via-emerald-400 to-lime-400/10" style={{ scaleY }} />
    </div>
  );
}

/** Parallax wrapper: content drifts gently against the scroll. */
export function Parallax({
  children,
  distance = 60,
  className,
}: {
  children: ReactNode;
  distance?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/** Tracks which section id is currently in view (for nav highlighting). */
export function useScrollSpy(ids: string[], offset = 140) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const onScroll = () => {
      let current: string | null = null;
      for (const id of ids) {
        const element = document.getElementById(id);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (rect.top <= offset) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [ids, offset]);
  return active;
}
