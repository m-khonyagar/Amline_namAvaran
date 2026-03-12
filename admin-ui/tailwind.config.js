/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a73e8',
          dark: '#1557b0',
          light: '#4a9ff5',
        },
        secondary: {
          DEFAULT: '#64748b',
          dark: '#475569',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Vazir', 'Tahoma', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
