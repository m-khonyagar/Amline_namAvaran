import { createContext, useContext, useMemo, type ReactNode } from 'react'

type Dict = Record<string, string>

const FA: Dict = {
  'common.loading': 'در حال بارگذاری…',
  'common.error': 'خطا',
  'forbidden.title': 'دسترسی ندارید',
  'users.title': 'کاربران',
  'contracts.title': 'قراردادها',
  'crm.title': 'CRM',
}

type Ctx = { t: (key: string) => string; locale: 'fa' }

const I18nContext = createContext<Ctx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const value = useMemo<Ctx>(
    () => ({
      locale: 'fa',
      t: (key: string) => FA[key] ?? key,
    }),
    []
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): Ctx {
  const c = useContext(I18nContext)
  if (!c) return { t: (k) => k, locale: 'fa' }
  return c
}
