/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#18181b',
        muted: '#71717a',
        canvas: '#f4f4f5',
        brand: { DEFAULT: '#4f46e5', dark: '#4338ca', soft: '#eef2ff' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(24, 24, 27, 0.04), 0 10px 28px rgba(24, 24, 27, 0.04)',
        float: '0 20px 60px rgba(24, 24, 27, 0.12)',
      },
    },
  },
  plugins: [],
};
