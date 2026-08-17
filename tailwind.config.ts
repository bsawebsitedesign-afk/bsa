import type { Config } from 'tailwindcss';

/**
 * BSA design system - derived from the primary logo.
 *
 * The mark is a hexagonal shield built from glowing nodes joined by edges.
 * That is not decoration, it is the product: members are the nodes, the
 * relationships between them are the edges, and the lattice they form is the
 * protection. Every part of this system descends from it -
 *
 *   - the ground is the logo's near-black plate, with a blue cast
 *   - signal is the logo's electric cyan, resolving into its violet
 *   - geometry is hexagonal: avatars, icon tiles, section markers
 *   - structure is node-and-edge: rules terminate in nodes, grids draw edges
 *
 * Colour is used for signal, never for decoration. Depth comes from a hairline
 * border plus a coloured rim-glow, so text contrast never changes with
 * elevation.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Every value reads a CSS variable defined in globals.css, so the whole
        // tree themes light and dark without a single component changing. The
        // `<alpha-value>` placeholder keeps `bg-surface/70` working.
        void: 'rgb(var(--void) / <alpha-value>)',
        base: 'rgb(var(--base) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
          high: 'rgb(var(--surface-high) / <alpha-value>)',
          inset: 'rgb(var(--surface-inset) / <alpha-value>)',
        },

        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          soft: 'rgb(var(--line-soft) / <alpha-value>)',
          bright: 'rgb(var(--line-bright) / <alpha-value>)',
        },

        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          soft: 'rgb(var(--ink-soft) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',
        },

        /** Text laid over an accent fill. Flips with the theme. */
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',

        cyan: {
          DEFAULT: 'rgb(var(--cyan) / <alpha-value>)',
          bright: 'rgb(var(--cyan-bright) / <alpha-value>)',
          deep: 'rgb(var(--cyan-deep) / <alpha-value>)',
          dark: 'rgb(var(--cyan-dark) / <alpha-value>)',
        },

        violet: {
          DEFAULT: 'rgb(var(--violet) / <alpha-value>)',
          bright: 'rgb(var(--violet-bright) / <alpha-value>)',
          deep: 'rgb(var(--violet-deep) / <alpha-value>)',
          dark: 'rgb(var(--violet-dark) / <alpha-value>)',
        },

        emerald: { DEFAULT: 'rgb(var(--emerald) / <alpha-value>)' },
        amber: { DEFAULT: 'rgb(var(--amber) / <alpha-value>)' },
        rose: { DEFAULT: 'rgb(var(--rose) / <alpha-value>)' },
      },

      fontFamily: {
        display: ['var(--font-display)', 'Archivo', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        'display-xl': ['clamp(2.75rem, 7vw, 5.5rem)', { lineHeight: '0.95', letterSpacing: '-0.035em' }],
        'display-lg': ['clamp(2.25rem, 5vw, 3.75rem)', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
        'display-md': ['clamp(1.75rem, 3.4vw, 2.75rem)', { lineHeight: '1.08', letterSpacing: '-0.022em' }],
        'display-sm': ['clamp(1.375rem, 2.2vw, 1.875rem)', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.7' }],
      },

      boxShadow: {
        // Elevation is a hairline plus depth, never a glow. The shadow is
        // tinted to the ground so it reads on a light page as well as a dark
        // one, rather than a pure-black drop on white.
        panel: '0 1px 2px rgb(var(--shadow) / 0.10), 0 8px 24px -12px rgb(var(--shadow) / 0.30)',
        'panel-lg': '0 2px 4px rgb(var(--shadow) / 0.12), 0 24px 60px -24px rgb(var(--shadow) / 0.42)',
      },

      backgroundImage: {
        // The logo's cyan-into-violet sweep, used on the mark and the one
        // primary action. Both stops are theme variables: on a light ground the
        // sweep deepens so its white label still clears AA across every stop.
        'grad-brand': 'linear-gradient(112deg, rgb(var(--grad-a)) 0%, rgb(var(--grad-b)) 38%, rgb(var(--grad-c)) 100%)',
        'grad-brand-soft': 'linear-gradient(112deg, rgb(var(--grad-b) / 0.16) 0%, rgb(var(--grad-c) / 0.16) 100%)',
        'grad-fade': 'linear-gradient(180deg, rgb(var(--base) / 0) 0%, rgb(var(--base)) 100%)',
      },

      maxWidth: {
        'container-max': '82rem',
        prose: '68ch',
      },

      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '18px',
      },

      spacing: {
        13: '3.25rem',
        18: '4.5rem',
        22: '5.5rem',
      },

      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      keyframes: {
        // A node pulsing on the lattice
        'node-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.35)', opacity: '0.5' },
        },
        // The ring a node throws off when it fires
        'ring-expand': {
          '0%': { transform: 'scale(0.9)', opacity: '0.65' },
          '100%': { transform: 'scale(2.6)', opacity: '0' },
        },
        // A packet running along an edge
        'edge-travel': {
          '0%': { offsetDistance: '0%', opacity: '0' },
          '12%, 88%': { opacity: '1' },
          '100%': { offsetDistance: '100%', opacity: '0' },
        },
        'dash-draw': {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'float-lag': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-18px) rotate(1.5deg)' },
        },
        'glow-breathe': {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.85' },
        },
        'sheen-sweep': {
          '0%': { transform: 'translateX(-120%) skewX(-18deg)' },
          '100%': { transform: 'translateX(320%) skewX(-18deg)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        'spin-slow': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'caret-blink': { '0%, 45%': { opacity: '1' }, '50%, 95%': { opacity: '0' }, '100%': { opacity: '1' } },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-5px)' },
          '40%': { transform: 'translateX(5px)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(3px)' },
        },
        'bar-grow': { '0%': { transform: 'scaleX(0)' }, '100%': { transform: 'scaleX(1)' } },
        'aurora-drift': {
          '0%, 100%': { transform: 'translate3d(-6%, -3%, 0) scale(1.05)' },
          '50%': { transform: 'translate3d(6%, 4%, 0) scale(1.18)' },
        },
      },

      animation: {
        'node-pulse': 'node-pulse 2.6s ease-in-out infinite',
        'ring-expand': 'ring-expand 2.2s ease-out infinite',
        'edge-travel': 'edge-travel 3.2s linear infinite',
        'dash-draw': 'dash-draw 2.4s ease-out forwards',
        marquee: 'marquee 42s linear infinite',
        'marquee-fast': 'marquee 22s linear infinite',
        float: 'float 7s ease-in-out infinite',
        'float-lag': 'float-lag 9s ease-in-out infinite',
        'glow-breathe': 'glow-breathe 4.5s ease-in-out infinite',
        'sheen-sweep': 'sheen-sweep 1.1s ease-out',
        'scan-line': 'scan-line 5s linear infinite',
        'spin-slow': 'spin-slow 22s linear infinite',
        'spin-slower': 'spin-slow 44s linear infinite',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'caret-blink': 'caret-blink 1.15s steps(1,end) infinite',
        shake: 'shake 0.42s ease-in-out',
        'bar-grow': 'bar-grow 1s cubic-bezier(0.16,1,0.3,1) both',
        'aurora-drift': 'aurora-drift 24s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
