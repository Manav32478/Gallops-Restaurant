import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07070A',
          900: '#0B0B0F',
          850: '#111116',
          800: '#16161D',
          750: '#1C1C25',
          700: '#23232E',
          600: '#2E2E3B',
          500: '#3C3C4C',
        },
        ivory: {
          DEFAULT: '#F5F1E8',
          50: '#FBF9F4',
          100: '#F5F1E8',
          200: '#E6E0D2',
          300: '#CFC7B6',
          400: '#A9A294',
          500: '#837D72',
        },
        lime: {
          DEFAULT: '#A3E635',
          400: '#BEF264',
          500: '#A3E635',
          600: '#84CC16',
        },
        emerald: {
          400: '#34D399',
          500: '#10B981',
        },
        ember: '#F97316',
        chili: '#EF4444',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(163,230,53,0.22), 0 8px 40px -12px rgba(163,230,53,0.35)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -24px rgba(0,0,0,0.9)',
        lift: '0 30px 60px -30px rgba(0,0,0,0.95)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
        'radial-glow':
          'radial-gradient(60% 60% at 50% 40%, rgba(163,230,53,0.14) 0%, rgba(163,230,53,0) 70%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '80%, 100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.5s ease both',
        shimmer: 'shimmer 1.8s infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.24,0,0.38,1) infinite',
        float: 'float 6s ease-in-out infinite',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.22,1,0.36,1) both',
        marquee: 'marquee 28s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
