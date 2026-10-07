import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#142221',
        mint: '#dcefe8',
        sage: '#2d7766',
        coral: '#f17f65',
        canvas: '#f7faf8',
        line: '#e4ece8',
      },
      boxShadow: {
        soft: '0 14px 40px rgba(20, 34, 33, 0.06)',
      },
      fontFamily: {
        sans: ['var(--font-plus-jakarta)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
