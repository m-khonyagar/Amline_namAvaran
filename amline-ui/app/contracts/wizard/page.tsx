'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { hasAccessToken } from '../../../lib/auth'

/** پیش‌فرض: embed روشن؛ فقط وقتی صریحاً `0` باشد (مثلاً در Docker) ویزارد stub می‌شود. */
const embedWizard = process.env.NEXT_PUBLIC_EMBED_ADMIN_WIZARD !== '0'

const ContractWizardPage = dynamic(
  () =>
    embedWizard
      ? import('./WizardEmbed').then((m) => m.ContractWizardPage)
      : import('./WizardStub').then((m) => m.ContractWizardPage),
  {
    ssr: false,
    loading: () => <div className="p-8 text-center text-gray-500">بارگذاری ویزارد…</div>,
  }
)

export default function UserContractWizardRoute() {
  const router = useRouter()

  useEffect(() => {
    if (!hasAccessToken()) {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <ContractWizardPage platform="user" />
    </div>
  )
}
