import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'اَملاین — پلتفرم هوشمند قرارداد',
  description: 'انعقاد، مدیریت و امضای دیجیتال قراردادهای ملکی با اَملاین',
  keywords: ['قرارداد ملکی', 'رهن و اجاره', 'امضای دیجیتال', 'اَملاین'],
  openGraph: {
    title: 'اَملاین',
    description: 'پلتفرم هوشمند قرارداد ملکی',
    locale: 'fa_IR',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
