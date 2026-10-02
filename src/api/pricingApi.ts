import { api } from './client'
import type { Grade, Price, Prices } from '@/lib/types'

export const pricingApi = {
  list: () => api<Prices>('/prices'),
  create: (grade: Grade, pricePerKg: number, effectiveFrom?: string) =>
    api<Price>('/prices', { method: 'POST', body: { grade, pricePerKg, effectiveFrom: effectiveFrom || undefined } }),
}
