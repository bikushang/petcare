import type { Config } from 'tailwindcss';

/**
 * Brand colours resolve through CSS custom properties so the Appearance
 * settings (primary colour, light/dark theme) can restyle the whole app at
 * runtime. Defaults live in `app/globals.css` under `:root`; the overrides
 * are written by `applySettingsToDocument` in `app/lib/settings.ts`.
 *
 * The `<alpha-value>` placeholder keeps every existing opacity modifier
 * working, e.g. `text-ink/60`, `bg-lilac/40`, `ring-plum/25`.
 */
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        /* Brand — deep violet by default, user-overridable */
        plum: v('--c-plum'), // primary            #4C1D95
        grape: v('--c-grape'), // darker: hover / active / gradients  #3B0764
        lilac: v('--c-lilac'), // light tint (surfaces, badges)       #EDE9FE
        iris: v('--c-iris'), // brighter violet for charts / highlights #7C3AED
        /* Neutrals — purple-tinted */
        ink: v('--c-ink'), //      #1A0D2E
        canvas: v('--c-canvas'), // #FAF9FD
        line: v('--c-line'), //    #E8E3F3
        surface: v('--c-surface'), // card background (white in light mode)
        muted: '#6E6484',
        /* Accent */
        coral: '#f17f65',
      },
      boxShadow: {
        soft: '0 14px 40px rgba(26, 13, 46, 0.06)',
        lift: '0 10px 24px -6px rgb(var(--c-plum) / 0.28)',
        'lift-sm': '0 6px 16px -4px rgb(var(--c-plum) / 0.22)',
      },
      fontFamily: {
        sans: ['var(--font-plus-jakarta)', 'sans-serif'],
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'translateY(-6px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        checkPop: {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.15s ease-out',
        popIn: 'popIn 0.16s cubic-bezier(0.22, 0.61, 0.36, 1)',
        checkPop: 'checkPop 0.2s cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
export default config;
