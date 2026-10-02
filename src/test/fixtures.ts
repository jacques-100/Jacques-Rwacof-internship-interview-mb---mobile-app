import type { Capacity, Dashboard, Delivery, Farmer, GradeDef, Role, Settings, Station, User } from '@/lib/types'

export function makeStation(overrides: Partial<Station> = {}): Station {
  return {
    id: 1,
    code: 'NDB',
    name: 'Nduba Coffee Washing Station',
    location: 'Nduba',
    timezone: 'Africa/Kigali',
    dailyCapacityKg: 5000,
    maxDeliveryKg: 500,
    lowThresholdKg: 500,
    active: true,
    assignedUsers: 3,
    createdAt: '2026-09-01T08:00:00Z',
    ...overrides,
  }
}

export function makeGrade(overrides: Partial<GradeDef> = {}): GradeDef {
  return { id: 1, code: 'A', name: 'Grade A', description: 'Premium cherries.', active: true, sortOrder: 1, ...overrides }
}

export const SYSTEM_SETTINGS = {
  values: {
    'organization.name': 'CherryTrack',
    'currency.code': 'RWF',
    'station.default-timezone': 'Africa/Kigali',
    'station.default-daily-capacity-kg': '5000',
    'station.default-max-delivery-kg': '500',
    'station.default-low-threshold-kg': '500',
    'reports.max-range-days': '366',
    'delivery.rejection-reasons': 'Unripe cherries\nExcess moisture and debris',
  },
  definitions: [
    { key: 'organization.name', label: 'Organisation name', description: 'Shown in the sidebar.', type: 'TEXT', group: 'Organisation', defaultValue: 'CherryTrack' },
    { key: 'currency.code', label: 'Currency', description: 'Three-letter code.', type: 'CURRENCY', group: 'Organisation', defaultValue: 'RWF' },
    { key: 'station.default-timezone', label: 'Default time zone', description: 'For new stations.', type: 'TIMEZONE', group: 'New station defaults', defaultValue: 'Africa/Kigali' },
    { key: 'station.default-daily-capacity-kg', label: 'Daily capacity (kg)', description: 'For new stations.', type: 'DECIMAL', group: 'New station defaults', defaultValue: '5000' },
    { key: 'station.default-max-delivery-kg', label: 'Largest single delivery (kg)', description: 'For new stations.', type: 'DECIMAL', group: 'New station defaults', defaultValue: '500' },
    { key: 'station.default-low-threshold-kg', label: 'Low-capacity warning (kg)', description: 'For new stations.', type: 'DECIMAL', group: 'New station defaults', defaultValue: '500' },
    { key: 'reports.max-range-days', label: 'Longest report range (days)', description: 'Limit.', type: 'INTEGER', group: 'Reports', defaultValue: '366' },
    { key: 'delivery.rejection-reasons', label: 'Rejection reasons', description: 'One per line.', type: 'TEXT_LIST', group: 'Deliveries', defaultValue: '' },
  ],
}

export const GRADES: GradeDef[] = [makeGrade(), makeGrade({ id: 2, code: 'B', name: 'Grade B', description: 'Standard cherries.', sortOrder: 2 })]

const CLERK_PERMISSIONS = ['DELIVERY_CREATE', 'DELIVERY_CORRECT_WEIGHT', 'DELIVERY_GRADE', 'DELIVERY_REJECT', 'FARMER_MANAGE']
const SUPERVISOR_PERMISSIONS = [...CLERK_PERMISSIONS, 'DELIVERY_PAY', 'GRADE_MANAGE', 'PRICE_MANAGE', 'CAPACITY_ADJUST', 'REPORT_VIEW', 'AUDIT_VIEW']
export const PERMISSIONS_BY_ROLE: Record<Role, string[]> = {
  CLERK: CLERK_PERMISSIONS,
  SUPERVISOR: SUPERVISOR_PERMISSIONS,
  ADMIN: [...SUPERVISOR_PERMISSIONS, 'STATION_MANAGE', 'USER_MANAGE', 'PERMISSION_MANAGE', 'SETTINGS_MANAGE'],
}

export function makeUser(role: Role = 'CLERK', overrides: Partial<User> = {}): User {
  const names = { ADMIN: 'Administrator', SUPERVISOR: 'Supervisor', CLERK: 'Clerk' } as const
  return {
    id: 1,
    username: role.toLowerCase(),
    fullName: `${role} Tester`,
    role,
    jobRole: { id: 1, name: names[role] },
    active: true,
    createdAt: '2026-10-01T08:00:00Z',
    stations: [{ id: 1, code: 'NDB', name: 'Nduba Coffee Washing Station' }],
    permissions: PERMISSIONS_BY_ROLE[role],
    ...overrides,
  }
}

export function makeDelivery(overrides: Partial<Delivery> = {}): Delivery {
  return {
    id: 42,
    reference: 'DLV-NDB-20261001-00042',
    stationId: 1,
    stationCode: 'NDB',
    deliveryDate: '2026-10-01',
    farmer: { id: 7, fullName: 'Marie Claire Uwimana', phone: '0788123456', cooperativeNumber: 'NDB-1001' },
    weightKg: 350,
    status: 'RECEIVED',
    createdBy: 'clerk',
    createdAt: '2026-10-01T08:21:00Z',
    version: 0,
    allowedActions: ['CORRECT_WEIGHT', 'GRADE', 'REJECT'],
    ...overrides,
  }
}

export function makeFarmer(overrides: Partial<Farmer> = {}): Farmer {
  return {
    id: 7,
    fullName: 'Marie Claire Uwimana',
    phone: '0788123456',
    cooperativeNumber: 'NDB-1001',
    active: true,
    totalDeliveries: 3,
    totalWeightKg: 900,
    totalAmountPaid: 540000,
    createdAt: '2026-09-01T08:00:00Z',
    ...overrides,
  }
}

export function makeCapacity(overrides: Partial<Capacity> = {}): Capacity {
  return {
    stationId: 1,
    date: '2026-10-01',
    dailyLimitKg: 5000,
    acceptedKg: 4650,
    remainingKg: 350,
    utilizationPercent: 93,
    alert: 'LOW',
    totalDeliveries: 27,
    statusCounts: { RECEIVED: 8, GRADED: 11, PAID: 6, REJECTED: 2 },
    rejectedKg: 120,
    averageAcceptedWeightKg: 186,
    totalAmountOwed: 3_900_000,
    totalAmountPaid: 3_240_000,
    ...overrides,
  }
}

export function makeDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  const capacity = overrides.capacity ?? makeCapacity()
  return {
    capacity,
    intakeTrend: [
      { date: '2026-09-29', acceptedKg: 2000 },
      { date: '2026-09-30', acceptedKg: 3100 },
      { date: '2026-10-01', acceptedKg: capacity.acceptedKg },
    ],
    statusDistribution: [
      { status: 'RECEIVED', count: 8 },
      { status: 'GRADED', count: 11 },
      { status: 'PAID', count: 6 },
      { status: 'REJECTED', count: 2 },
    ],
    recentDeliveries: [makeDelivery()],
    ...overrides,
  }
}

export const settings: Settings = {
  stationId: 1,
  stationCode: 'NDB',
  stationName: 'Nduba Coffee Washing Station',
  timezone: 'Africa/Kigali',
  today: '2026-10-01',
  dailyLimitKg: 5000,
  singleDeliveryMaxKg: 500,
  lowThresholdKg: 500,
}

export function page<T>(content: T[]) {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 }
}
