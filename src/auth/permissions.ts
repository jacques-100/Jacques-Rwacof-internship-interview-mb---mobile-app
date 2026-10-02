import type { Role, User } from '@/lib/types'

/**
 * UI capabilities, each backed by one permission code that the user's role holds. This only drives what
 * the screens show; the backend enforces every permission independently, so hiding a button is a
 * convenience, never a security control.
 */
const REQUIRES = {
  createDeliveries: 'DELIVERY_CREATE',
  payDelivery: 'DELIVERY_PAY',
  viewPayments: 'DELIVERY_PAY',
  manageFarmers: 'FARMER_MANAGE',
  manageGrades: 'GRADE_MANAGE',
  managePrices: 'PRICE_MANAGE',
  adjustCapacity: 'CAPACITY_ADJUST',
  viewReports: 'REPORT_VIEW',
  viewAudit: 'AUDIT_VIEW',
  manageStations: 'STATION_MANAGE',
  manageUsers: 'USER_MANAGE',
  managePermissions: 'PERMISSION_MANAGE',
  manageSettings: 'SETTINGS_MANAGE',
} as const

export type Capability = keyof typeof REQUIRES

export function can(user: Pick<User, 'permissions'> | null | undefined, capability: Capability): boolean {
  return Boolean(user?.permissions?.includes(REQUIRES[capability]))
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  SUPERVISOR: 'Supervisor',
  CLERK: 'Clerk',
}

/** "DELIVERY_PAY" -> "Delivery pay" for places that only have the code. */
export function humanizePermission(code: string): string {
  const text = code.toLowerCase().replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}
