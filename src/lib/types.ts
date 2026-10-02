// Mirrors the backend DTOs. Money and weights arrive as JSON numbers.

export type Role = 'ADMIN' | 'SUPERVISOR' | 'CLERK'
export type DeliveryStatus = 'RECEIVED' | 'GRADED' | 'PAID' | 'REJECTED'
/** Code of a grade the station has configured (A, B, AA, ...). */
export type Grade = string
export type DeliveryAction = 'CORRECT_WEIGHT' | 'GRADE' | 'REJECT' | 'PAY'
export type AlertLevel = 'NONE' | 'LOW' | 'FULL'

export interface StationRef {
  id: number
  code: string
  name: string
}

export interface JobRoleRef {
  id: number
  name: string
}

export interface User {
  id: number
  username: string
  fullName: string
  email?: string
  phone?: string
  /** Access level: what the user may do. */
  role: Role
  /** Named position, e.g. "Quality Inspector". */
  jobRole: JobRoleRef
  active: boolean
  createdAt: string
  stations: StationRef[]
  /** What this user's role currently allows (permission codes). */
  permissions: string[]
  /** Changes whenever the profile photo does; absent when the user has none. */
  avatarVersion?: number | null
}

export interface Branding {
  /** Changes with every upload; null when no logo has been set. */
  logoVersion: number | null
  organizationName: string
}

export interface AuthResponse {
  accessToken: string
  expiresInSeconds: number
  user: User
  /** Only sent to the native app, which keeps it in secure storage. Browsers get an httpOnly cookie instead. */
  refreshToken?: string
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface FarmerRef {
  id: number
  fullName: string
  phone: string
  cooperativeNumber: string
}

export interface Farmer {
  id: number
  fullName: string
  phone: string
  cooperativeNumber: string
  active: boolean
  totalDeliveries: number
  totalWeightKg: number
  totalAmountPaid: number
  createdAt: string
}

export interface FarmerDetail {
  farmer: Farmer
  recentDeliveries: Delivery[]
}

export interface FarmerSummary {
  total: number
  active: number
  inactive: number
  deliveriesToday: number
}

export interface FarmerInput {
  fullName: string
  phone: string
  cooperativeNumber: string
  active?: boolean
}

export interface Delivery {
  id: number
  reference: string
  stationId: number
  stationCode: string
  deliveryDate: string
  farmer: FarmerRef
  weightKg: number
  grade?: Grade
  moisturePercent?: number
  gradeNotes?: string
  pricePerKg?: number
  amountOwed?: number
  status: DeliveryStatus
  rejectReason?: string
  createdBy: string
  gradedBy?: string
  paidBy?: string
  rejectedBy?: string
  createdAt: string
  gradedAt?: string
  paidAt?: string
  rejectedAt?: string
  version: number
  allowedActions: DeliveryAction[]
}

export interface DeliveryFilters {
  date?: string
  from?: string
  to?: string
  status?: DeliveryStatus | ''
  grade?: Grade | ''
  farmerId?: number | ''
  minWeight?: number | ''
  maxWeight?: number | ''
  q?: string
  page?: number
  size?: number
  sortBy?: string
  dir?: 'asc' | 'desc'
}

export interface Capacity {
  stationId: number
  date: string
  dailyLimitKg: number
  acceptedKg: number
  remainingKg: number
  utilizationPercent: number
  alert: AlertLevel
  totalDeliveries: number
  statusCounts: Record<DeliveryStatus, number>
  rejectedKg: number
  averageAcceptedWeightKg: number
  totalAmountOwed: number
  totalAmountPaid: number
}

export interface CapacityPreview {
  date: string
  acceptedKg: number
  dailyLimitKg: number
  remainingKg: number
}

export interface Dashboard {
  capacity: Capacity
  intakeTrend: { date: string; acceptedKg: number }[]
  statusDistribution: { status: DeliveryStatus; count: number }[]
  recentDeliveries: Delivery[]
}

export interface Price {
  id: number
  grade: Grade
  pricePerKg: number
  effectiveFrom: string
  createdBy?: string
  createdAt: string
  current: boolean
}

export interface Prices {
  current: Price[]
  history: Price[]
}

export type ReportType =
  | 'DAILY_INTAKE'
  | 'WEEKLY_INTAKE'
  | 'MONTHLY_INTAKE'
  | 'FARMER_DELIVERY'
  | 'GRADE_DISTRIBUTION'
  | 'PAYMENT'
  | 'REJECTED_DELIVERIES'
  | 'CAPACITY_UTILIZATION'

export interface ReportColumn {
  key: string
  label: string
  type: 'text' | 'number' | 'money' | 'percent' | 'date' | 'datetime'
}

export interface Report {
  reportType: ReportType
  from: string
  to: string
  columns: ReportColumn[]
  rows: Record<string, string | number | null>[]
  totals: Record<string, number>
}

export interface AuditLog {
  id: number
  occurredAt: string
  userId?: number
  username: string
  action: string
  entityType: string
  entityId: number
  description: string
  details?: Record<string, unknown>
}

export interface Settings {
  stationId: number
  stationCode: string
  stationName: string
  timezone: string
  today: string
  dailyLimitKg: number
  singleDeliveryMaxKg: number
  lowThresholdKg: number
}

export interface Station {
  id: number
  code: string
  name: string
  location?: string
  timezone: string
  dailyCapacityKg: number
  maxDeliveryKg: number
  lowThresholdKg: number
  active: boolean
  assignedUsers: number
  createdAt: string
}

export interface StationInput {
  code: string
  name: string
  location?: string
  timezone: string
  dailyCapacityKg: number
  maxDeliveryKg: number
  lowThresholdKg: number
  active?: boolean
}

export interface StationDetail {
  station: Station
  users: User[]
}

export interface GradeDef {
  id: number
  code: string
  name: string
  description?: string
  active: boolean
  sortOrder: number
}

export interface JobRole {
  id: number
  name: string
  description?: string
  accessLevel: Role
  systemRole: boolean
  active: boolean
  users: number
  permissions: string[]
  createdAt: string
}

export interface PermissionDef {
  code: string
  group: string
  label: string
  description: string
}

export type SettingType = 'TEXT' | 'CURRENCY' | 'TIMEZONE' | 'DECIMAL' | 'INTEGER' | 'TEXT_LIST'

export interface SettingDefinition {
  key: string
  label: string
  description: string
  type: SettingType
  group: string
  defaultValue: string
}

export interface SystemSettings {
  values: Record<string, string>
  definitions: SettingDefinition[]
}

export interface Department {
  id: number
  code: string
  name: string
  description?: string
  headUserId?: number
  headName?: string
  active: boolean
  currentStaff: number
}

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'SEASONAL' | 'CONTRACT'

export interface Employment {
  id: number
  userId: number
  userName: string
  username: string
  departmentId?: number
  departmentName?: string
  stationId?: number
  stationName?: string
  jobTitle: string
  employmentType: EmploymentType
  startDate: string
  endDate?: string
  status: 'ACTIVE' | 'ENDED' | 'UPCOMING'
  notes?: string
}

export interface FieldError {
  field: string
  message: string
}
