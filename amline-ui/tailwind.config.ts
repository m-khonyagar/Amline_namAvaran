import type { Config } from 'tailwindcss'
import { amlineThemeTokens } from '@amline/ui-core/theme-tokens.js'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './theme/**/*.{js,ts,jsx,tsx}',
    '../admin-ui/src/features/contract-wizard/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        xs: '380px',
      },
      fontFamily: {
        sans: ['var(--font-vazirmatn)', 'Vazir', 'system-ui', 'sans-serif'],
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
      boxShadow: {
        amline: amlineThemeTokens.shadow.amline,
        'amline-lg': amlineThemeTokens.shadow.amlineLg,
      },
    },
  },
  plugins: [],
}
export default config
