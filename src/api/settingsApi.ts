import { api } from './client'
import type { SystemSettings } from '@/lib/types'

export const settingsApi = {
  get: () => api<SystemSettings>('/system-settings'),
  update: (values: Record<string, string>) => api<SystemSettings>('/system-settings', { method: 'PUT', body: { values } }),
}
