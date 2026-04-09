import { amlineThemeTokens } from './theme-tokens.js'

/** Tailwind for Storybook previews only — apps keep their own config. */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', './.storybook/**/*.{ts,tsx}'],
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
    },
  },
  plugins: [],
}
