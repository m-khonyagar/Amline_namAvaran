import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Vazirmatn } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-vazirmatn',
})

export const metadata: Metadata = {
  title: 'اَملاین — پنل کاربر',
  description: 'قرارداد، نیازمندی، بازار و کیف پول',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className={vazirmatn.variable}>
      <body
        className={`${vazirmatn.className} min-h-screen bg-[var(--amline-bg)] text-[var(--amline-fg)] antialiased transition-colors`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
