import { api } from './client'
import type { AuditLog, Page } from '@/lib/types'

export interface AuditFilters {
  from?: string
  to?: string
  userId?: number | ''
  action?: string
  entityType?: string
  stationId?: number | ''
  page?: number
  size?: number
}

export const auditApi = {
  list: (filters: AuditFilters = {}) => api<Page<AuditLog>>('/audit-logs', { params: { ...filters } }),
}
