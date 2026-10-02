import type { DeliveryFilters } from '@/lib/types'
import type { FarmerFilters } from './farmerApi'
import type { AuditFilters } from './auditApi'
import type { ReportType } from '@/lib/types'

// One place for cache keys so mutations can invalidate precisely.
export const qk = {
  dashboard: (date?: string) => ['dashboard', date ?? 'today'] as const,
  capacity: (date?: string) => ['capacity', date ?? 'today'] as const,
  capacityPreview: (date?: string) => ['capacity-preview', date ?? 'today'] as const,
  settings: ['settings'] as const,
  farmers: (filters: FarmerFilters) => ['farmers', 'list', filters] as const,
  farmerOptions: ['farmers', 'options'] as const,
  farmerSummary: ['farmers', 'summary'] as const,
  farmer: (id: number) => ['farmers', 'detail', id] as const,
  deliveries: (filters: DeliveryFilters) => ['deliveries', 'list', filters] as const,
  delivery: (id: number) => ['deliveries', 'detail', id] as const,
  deliveryAudit: (id: number) => ['deliveries', 'audit', id] as const,
  prices: ['prices'] as const,
  grades: (activeOnly: boolean) => ['grades', activeOnly] as const,
  report: (type: ReportType, from?: string, to?: string) => ['reports', type, from, to] as const,
  audit: (filters: AuditFilters) => ['audit', filters] as const,
  users: (filters: object) => ['users', 'list', filters] as const,
  userOptions: ['users', 'options'] as const,
  stations: (includeInactive: boolean) => ['stations', includeInactive] as const,
  roles: ['directory', 'roles'] as const,
  departments: ['directory', 'departments'] as const,
  employments: (filters: object) => ['directory', 'employments', filters] as const,
}

/** Everything that depends on delivery data. Invalidate after any delivery mutation. */
export const deliveryRelated = [['deliveries'], ['dashboard'], ['capacity'], ['capacity-preview'], ['farmers'], ['reports'], ['audit']] as const
