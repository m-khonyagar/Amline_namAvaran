'use client'

import dynamic from 'next/dynamic'

/** ویزارد واقعی از admin-ui (فقط وقتی NEXT_PUBLIC_EMBED_ADMIN_WIZARD=1 در بیلد ست شده باشد). */
export const ContractWizardPage = dynamic(
  () =>
    import('../../../../admin-ui/src/features/contract-wizard/ContractWizardPage').then(
      (m) => m.ContractWizardPage
    ),
  { ssr: false, loading: () => <div className="p-8 text-center text-gray-500">بارگذاری ویزارد…</div> }
)
