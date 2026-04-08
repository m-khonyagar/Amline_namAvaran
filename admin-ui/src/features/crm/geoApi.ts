import { apiClient } from '@/lib/api'
import { apiV1 } from '@/lib/apiPaths'

export interface ProvinceDto {
  id: string
  name_fa: string
  sort_order: number
  created_at: string
}

export interface CityDto {
  id: string
  province_id: string
  name_fa: string
  created_at: string
}

export async function fetchProvinces(): Promise<ProvinceDto[]> {
  const { data } = await apiClient.get<ProvinceDto[]>(apiV1('geo/provinces'))
  return Array.isArray(data) ? data : []
}

export async function fetchCities(provinceId: string): Promise<CityDto[]> {
  if (!provinceId) return []
  const { data } = await apiClient.get<CityDto[]>(
    apiV1(`geo/provinces/${encodeURIComponent(provinceId)}/cities`)
  )
  return Array.isArray(data) ? data : []
}
