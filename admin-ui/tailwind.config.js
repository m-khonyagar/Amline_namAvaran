import { amlineThemeTokens } from '@amline/ui-core/theme-tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '380px',
      },
      fontFamily: {
        sans: ['Vazirmatn', 'Vazir', 'Tahoma', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        'title': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],
      },
      colors: {
        primary: amlineThemeTokens.colors.primary,
        brand: amlineThemeTokens.colors.brand,
        secondary: {
          DEFAULT: '#64748b',
          dark: '#475569',
        },
        accent: amlineThemeTokens.colors.accent,
        surface: amlineThemeTokens.colors.surface,
        success: amlineThemeTokens.colors.success,
        warning: amlineThemeTokens.colors.warning,
        error: amlineThemeTokens.colors.error,
        info: amlineThemeTokens.colors.info,
      },
      borderRadius: {
        amline: amlineThemeTokens.radius.amline,
        'amline-md': amlineThemeTokens.radius.amlineMd,
      },
      boxShadow: {
        amline: amlineThemeTokens.shadow.amline,
        'amline-lg': amlineThemeTokens.shadow.amlineLg,
      },
    },
  },
  plugins: [],
};
