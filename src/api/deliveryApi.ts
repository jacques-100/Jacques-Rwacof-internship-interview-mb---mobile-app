import { api } from './client'
import type { AuditLog, Delivery, DeliveryFilters, Grade, Page } from '@/lib/types'

export interface CreateDeliveryInput {
  farmerId: number
  deliveryDate: string
  weightKg: number
}

/** The grading form. There is no price or amount field: the server resolves and computes them. */
export interface GradeForm {
  grade: Grade
  moisturePercent?: number
  notes?: string
}

// Note what is *not* here: the client never sends a grade price, an amount or a status.
export const deliveryApi = {
  list: (filters: DeliveryFilters = {}) => api<Page<Delivery>>('/deliveries', { params: { ...filters } }),
  get: (id: number) => api<Delivery>(`/deliveries/${id}`),
  audit: (id: number) => api<AuditLog[]>(`/deliveries/${id}/audit`),
  create: (input: CreateDeliveryInput) => api<Delivery>('/deliveries', { method: 'POST', body: input }),
  correctWeight: (id: number, newWeightKg: number, reason: string) =>
    api<Delivery>(`/deliveries/${id}/weight`, { method: 'PATCH', body: { newWeightKg, reason } }),
  grade: (id: number, form: GradeForm) => api<Delivery>(`/deliveries/${id}/grade`, { method: 'POST', body: form }),
  reject: (id: number, reason: string) => api<Delivery>(`/deliveries/${id}/reject`, { method: 'POST', body: { reason } }),
  pay: (id: number) => api<Delivery>(`/deliveries/${id}/pay`, { method: 'POST' }),
}
