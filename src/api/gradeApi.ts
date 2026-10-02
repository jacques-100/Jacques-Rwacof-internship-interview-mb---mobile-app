import { api } from './client'
import type { GradeDef } from '@/lib/types'

export interface GradeInput {
  code: string
  name: string
  description?: string
  sortOrder?: number
  active?: boolean
}

export const gradeApi = {
  list: (activeOnly = false) => api<GradeDef[]>('/grades', { params: { activeOnly: activeOnly || undefined } }),
  create: (input: GradeInput) => api<GradeDef>('/grades', { method: 'POST', body: input }),
  update: (id: number, input: GradeInput) => api<GradeDef>(`/grades/${id}`, { method: 'PUT', body: input }),
}
