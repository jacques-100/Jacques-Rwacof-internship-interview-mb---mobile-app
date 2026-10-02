import { api, download } from './client'
import type { Report, ReportType } from '@/lib/types'

export const reportApi = {
  run: (type: ReportType, from?: string, to?: string) => api<Report>('/reports', { params: { type, from, to } }),
  exportCsv: (type: ReportType, from?: string, to?: string) =>
    download('/reports/export', { type, from, to }, `cherrytrack-${type.toLowerCase()}.csv`),
}
