import { api } from './client'
import type { Capacity, CapacityPreview, Dashboard, Settings } from '@/lib/types'

export const dashboardApi = {
  get: (date?: string) => api<Dashboard>('/dashboard', { params: { date } }),
  capacity: (date?: string) => api<Capacity>('/capacity', { params: { date } }),
  capacityPreview: (date?: string) => api<CapacityPreview>('/capacity/preview', { params: { date } }),
  /** Raises or lowers the limit for one date. Needs a reason; recorded in the audit log. */
  adjustCapacity: (date: string, limitKg: number, reason: string) =>
    api<Capacity>('/capacity/limit', { method: 'PUT', params: { date }, body: { limitKg, reason } }),
  settings: () => api<Settings>('/settings'),
}
