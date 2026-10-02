import { api } from './client'
import type { Page, Role, User } from '@/lib/types'

export interface CreateUserInput {
  username: string
  fullName: string
  password: string
  jobRoleId: number
  email?: string
  phone?: string
  stationIds?: number[]
}

export interface UpdateUserInput {
  fullName: string
  jobRoleId: number
  email?: string
  phone?: string
}

export interface UserFilters {
  q?: string
  role?: Role | ''
  active?: boolean | ''
  jobRoleId?: number | ''
  stationId?: number | ''
  page?: number
  size?: number
  sortBy?: string
  dir?: 'asc' | 'desc'
}

export const userApi = {
  list: (filters: UserFilters = {}) =>
    api<Page<User>>('/users', { params: { ...filters, active: filters.active === '' ? undefined : filters.active } }),
  create: (input: CreateUserInput) => api<User>('/users', { method: 'POST', body: input }),
  update: (id: number, input: UpdateUserInput) => api<User>(`/users/${id}`, { method: 'PUT', body: input }),
  assignStations: (id: number, stationIds: number[]) => api<User>(`/users/${id}/stations`, { method: 'PUT', body: { stationIds } }),
  setActive: (id: number, active: boolean) => api<User>(`/users/${id}/active`, { method: 'PATCH', body: { active } }),
  resetPassword: (id: number, newPassword: string) =>
    api<void>(`/users/${id}/reset-password`, { method: 'POST', body: { newPassword } }),
}
