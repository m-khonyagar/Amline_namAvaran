/**
 * Internationalization (i18n) system for bilingual support.
 */

import translations from './translations.json'

export class I18n {
  constructor() {
    this.currentLanguage = 'en'
    this.translations = translations
    
    // Load saved language preference
    const saved = localStorage.getItem('agent-windsurf-amline-language')
    if (saved && (saved === 'en' || saved === 'fa')) {
      this.currentLanguage = saved
    } else {
      // Auto-detect from browser
      const browserLang = navigator.language.toLowerCase()
      if (browserLang.startsWith('fa') || browserLang.includes('persian')) {
        this.currentLanguage = 'fa'
      }
    }
  }

  setLanguage(language) {
    this.currentLanguage = language
    localStorage.setItem('agent-windsurf-amline-language', language)
    // Trigger page re-render for RTL/LTR changes
    document.documentElement.lang = language
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr'
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: language }))
  }

  getCurrentLanguage() {
    return this.currentLanguage
  }

  t(key, fallback) {
    const keys = key.split('.')
    let value = this.translations[this.currentLanguage]
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return fallback || key
      }
    }
    
    return typeof value === 'string' ? value : fallback || key
  }

  detectLanguage(text) {
    // Simple Persian character detection
    const persianChars = text.match(/[\u0600-\u06FF]/g)
    if (persianChars && persianChars.length > text.length * 0.3) {
      return 'fa'
    }
    return 'en'
  }

  isRTL() {
    return this.currentLanguage === 'fa'
  }
}

export const i18n = new I18n()

// React hook
export function useTranslation() {
  return {
    t: (key, fallback) => i18n.t(key, fallback),
    language: i18n.getCurrentLanguage(),
    setLanguage: (lang) => i18n.setLanguage(lang),
    isRTL: () => i18n.isRTL(),
    detectLanguage: (text) => i18n.detectLanguage(text)
  }
}

// Initialize on load
document.documentElement.lang = i18n.getCurrentLanguage()
document.documentElement.dir = i18n.isRTL() ? 'rtl' : 'ltr'
