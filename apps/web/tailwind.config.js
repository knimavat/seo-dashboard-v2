/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EDF2F9',
          100: '#D5E8F0',
          200: '#A8D1E3',
          300: '#6BAFD4',
          400: '#2E75B6',
          500: '#1B5A9E',
          600: '#1B2A4A',
          700: '#152240',
          800: '#0F1A33',
          900: '#0A1226',
        },
        health: {
          green: '#2D8B4E',
          yellow: '#D97706',
          red: '#C0392B',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-cabinet)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
    },
  },
  plugins: [],
};
