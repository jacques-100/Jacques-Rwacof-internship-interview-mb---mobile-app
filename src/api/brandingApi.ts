import { api, apiUrl } from './client'
import type { Branding, User } from '@/lib/types'

function form(file: File): FormData {
  const data = new FormData()
  data.append('file', file)
  return data
}

export const brandingApi = {
  /** Public: also used on the sign-in page. */
  get: () => api<Branding>('/branding'),
  uploadLogo: (file: File) => api<Branding>('/branding/logo', { method: 'PUT', body: form(file) }),
  removeLogo: () => api<Branding>('/branding/logo', { method: 'DELETE' }),
  /** The version in the query string makes a replaced logo show immediately instead of a cached one. */
  logoUrl: (version: number) => `${apiUrl('/branding/logo')}?v=${version}`,

  uploadAvatar: (file: File) => api<User>('/auth/me/avatar', { method: 'PUT', body: form(file) }),
  removeAvatar: () => api<User>('/auth/me/avatar', { method: 'DELETE' }),
}
