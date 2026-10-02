import { api } from './client'
import type { Farmer, FarmerDetail, FarmerInput, FarmerSummary, Page } from '@/lib/types'

export interface FarmerFilters {
  q?: string
  active?: boolean | ''
  page?: number
  size?: number
  sortBy?: string
  dir?: 'asc' | 'desc'
}

export const farmerApi = {
  list: (filters: FarmerFilters = {}) =>
    api<Page<Farmer>>('/farmers', { params: { ...filters, active: filters.active === '' ? undefined : filters.active } }),
  summary: () => api<FarmerSummary>('/farmers/summary'),
  get: (id: number) => api<FarmerDetail>(`/farmers/${id}`),
  create: (input: FarmerInput) => api<Farmer>('/farmers', { method: 'POST', body: input }),
  update: (id: number, input: FarmerInput) => api<Farmer>(`/farmers/${id}`, { method: 'PUT', body: input }),
}
