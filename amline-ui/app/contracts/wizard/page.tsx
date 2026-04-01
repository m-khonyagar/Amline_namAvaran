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
  { ssr: false, loading: () => <div className="p-8 text-center text-gray-500">بارگذاری ویزارد…</div> }
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
