/**
 * Tailwind / JS bridge — مقادیر به CSS variables در amline-tokens.css وابسته‌اند.
 * Figma: Amline | Design System
 */
export const amlineThemeTokens = {
  colors: {
    primary: {
      DEFAULT: 'var(--amline-primary)',
      dark: 'var(--amline-primary-hover)',
      light: 'var(--primary-light)',
    },
    brand: {
      warm: 'var(--amline-brand-terracotta)',
      'warm-muted': 'var(--amline-brand-terracotta-muted)',
    },
    accent: {
      DEFAULT: 'var(--amline-accent)',
    },
    surface: {
      DEFAULT: 'var(--amline-surface)',
      elevated: 'var(--amline-surface-elevated)',
      muted: 'var(--amline-surface-muted)',
    },
    success: 'var(--amline-success)',
    warning: 'var(--amline-warning)',
    error: 'var(--amline-error)',
    info: 'var(--amline-info)',
  },
  radius: {
    amline: 'var(--amline-radius-lg)',
    amlineMd: 'var(--amline-radius-md)',
  },
  shadow: {
    amline: 'var(--amline-shadow-md)',
    amlineLg: 'var(--amline-shadow-lg)',
  },
};
