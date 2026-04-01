/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Vazirmatn', 'sans-serif'] },
      colors: {
        brand: { DEFAULT: '#1d4ed8', light: '#3b82f6', dark: '#1e3a8a' },
      },
    },
  },
  plugins: [],
}
