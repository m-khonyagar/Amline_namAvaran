'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { hasAccessToken } from '../../../lib/auth'

const ContractWizardPage = dynamic(
  () =>
    import('../../../../admin-ui/src/features/contract-wizard/ContractWizardPage').then(
      (m) => m.ContractWizardPage
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="amline-body text-center">بارگذاری ویزارد…</p>
      </div>
    ),
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
    <div className="min-h-screen bg-[var(--amline-bg)] px-3 py-4 sm:px-4">
      <ContractWizardPage platform="user" />
    </div>
  )
}
