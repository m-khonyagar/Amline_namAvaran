import { amlineThemeTokens } from '@amline/ui-core/theme-tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Vazir', 'Tahoma', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: amlineThemeTokens.colors.primary,
        brand: amlineThemeTokens.colors.brand,
        accent: amlineThemeTokens.colors.accent,
        surface: amlineThemeTokens.colors.surface,
      },
      borderRadius: {
        amline: amlineThemeTokens.radius.amline,
        'amline-md': amlineThemeTokens.radius.amlineMd,
      },
    },
  },
  plugins: [],
};
