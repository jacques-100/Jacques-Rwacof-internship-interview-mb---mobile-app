import { api } from './client'
import type { Department, Employment, EmploymentType, JobRole, Page, PermissionDef, Role } from '@/lib/types'

export interface RoleInput {
  name: string
  description?: string
  accessLevel: Role
  active?: boolean
}

export interface DepartmentInput {
  code: string
  name: string
  description?: string
  headUserId?: number | null
  active?: boolean
}

export interface EmploymentInput {
  userId: number
  departmentId?: number | null
  stationId?: number | null
  jobTitle: string
  employmentType: EmploymentType
  startDate: string
  endDate?: string | null
  notes?: string
}

export interface EmploymentFilters {
  q?: string
  userId?: number | ''
  departmentId?: number | ''
  stationId?: number | ''
  type?: EmploymentType | ''
  status?: string
  page?: number
  size?: number
}

export const directoryApi = {
  permissions: () => api<PermissionDef[]>('/permissions'),
  /** Replaces the permissions a role holds. Takes effect on its holders' next request. */
  updateRolePermissions: (id: number, permissions: string[]) => api<JobRole>(`/roles/${id}/permissions`, { method: 'PUT', body: { permissions } }),
  roles: () => api<JobRole[]>('/roles'),
  createRole: (input: RoleInput) => api<JobRole>('/roles', { method: 'POST', body: input }),
  updateRole: (id: number, input: RoleInput) => api<JobRole>(`/roles/${id}`, { method: 'PUT', body: input }),

  departments: () => api<Department[]>('/departments'),
  createDepartment: (input: DepartmentInput) => api<Department>('/departments', { method: 'POST', body: input }),
  updateDepartment: (id: number, input: DepartmentInput) => api<Department>(`/departments/${id}`, { method: 'PUT', body: input }),

  employments: (filters: EmploymentFilters = {}) => api<Page<Employment>>('/employments', { params: { ...filters } }),
  createEmployment: (input: EmploymentInput) => api<Employment>('/employments', { method: 'POST', body: input }),
  updateEmployment: (id: number, input: EmploymentInput) => api<Employment>(`/employments/${id}`, { method: 'PUT', body: input }),
}
