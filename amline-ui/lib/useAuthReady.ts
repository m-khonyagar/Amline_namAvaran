'use client'

import { useEffect, useState } from 'react'
import { hasAccessToken } from './auth'

/**
 * پس از mount مرورگر مقدار واقعی کوکی بازمی‌گردد؛ قبل از آن `null` تا با SSR اشتباه نشود.
 */
export function useAuthReady(): boolean | null {
  const [authed, setAuthed] = useState<boolean | null>(null)
  useEffect(() => {
    setAuthed(hasAccessToken())
  }, [])
  return authed
}
