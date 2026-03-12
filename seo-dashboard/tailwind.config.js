/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a73e8',  // Amline Blue
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
        sans: ['Vazirmatn', 'Vazir', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
