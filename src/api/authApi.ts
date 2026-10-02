import { api, forgetStoredSession, nativeRefreshHeaders, persistSession } from './client'
import type { AuthResponse, User } from '@/lib/types'

export interface ProfileInput {
  fullName: string
  email?: string
  phone?: string
}

export const authApi = {
  login: async (username: string, password: string) => {
    const session = await api<AuthResponse>('/auth/login', { method: 'POST', body: { username, password }, retryOnUnauthorized: false })
    await persistSession(session)
    return session
  },
  logout: async () => {
    try {
      await api<void>('/auth/logout', { method: 'POST', retryOnUnauthorized: false, headers: await nativeRefreshHeaders() })
    } finally {
      await forgetStoredSession()
    }
  },
  me: () => api<User>('/auth/me'),
  updateProfile: (input: ProfileInput) => api<User>('/auth/me', { method: 'PUT', body: input }),
  /** Returns a fresh session: every other device is signed out, this one stays signed in. */
  changePassword: async (currentPassword: string, newPassword: string) => {
    const session = await api<AuthResponse>('/auth/me/password', { method: 'POST', body: { currentPassword, newPassword } })
    await persistSession(session)
    return session
  },
}
