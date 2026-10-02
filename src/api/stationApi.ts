import { api } from './client'
import type { Station, StationDetail, StationInput } from '@/lib/types'

export const stationApi = {
  /** Stations the signed-in user can work in (administrators: all, optionally including inactive ones). */
  list: (includeInactive = false) => api<Station[]>('/stations', { params: { includeInactive: includeInactive || undefined } }),
  get: (id: number) => api<StationDetail>(`/stations/${id}`),
  create: (input: StationInput) => api<Station>('/stations', { method: 'POST', body: input }),
  update: (id: number, input: StationInput) => api<Station>(`/stations/${id}`, { method: 'PUT', body: input }),
  assignUsers: (id: number, userIds: number[]) => api<StationDetail>(`/stations/${id}/users`, { method: 'PUT', body: { userIds } }),
}
