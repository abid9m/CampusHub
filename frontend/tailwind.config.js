/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#182235',
        muted: '#68758a',
        canvas: '#f6f7fb',
        brand: { DEFAULT: '#4659df', dark: '#3547c5', soft: '#eceeff' },
      },
      boxShadow: { card: '0 12px 32px rgba(32, 48, 80, 0.06)' },
    },
  },
  plugins: [],
};
