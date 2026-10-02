import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/authApi'
import { refreshSession, setAccessToken, setSessionExpiredHandler } from '@/api/client'
import type { AuthResponse, User } from '@/lib/types'

type Status = 'loading' | 'authenticated' | 'anonymous'

interface AuthState {
  user: User | null
  status: Status
  /** True when the session ended because it expired or was revoked (not an explicit logout). */
  expired: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Replaces the signed-in user's details after they edit their profile. */
  updateUser: (user: User) => void
  /** Adopts a freshly issued session (after a password change the old tokens are revoked). */
  applySession: (session: AuthResponse) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [expired, setExpired] = useState(false)

  const clear = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  // Restore the session on page load from the httpOnly refresh cookie.
  useEffect(() => {
    let cancelled = false
    refreshSession().then((session) => {
      if (cancelled) return
      if (session) {
        setUser(session.user)
        setStatus('authenticated')
      } else {
        setStatus('anonymous')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // The API client calls this when a refresh fails mid-session (expired or revoked).
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setExpired(true)
      clear()
    })
    return () => setSessionExpiredHandler(null)
  }, [clear])

  const login = useCallback(async (username: string, password: string) => {
    const session = await authApi.login(username, password)
    setAccessToken(session.accessToken)
    setUser(session.user)
    setExpired(false)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Even if the server is unreachable we still drop the local session.
    }
    setExpired(false)
    clear()
  }, [clear])

  const updateUser = useCallback((next: User) => setUser(next), [])

  const applySession = useCallback((session: AuthResponse) => {
    setAccessToken(session.accessToken)
    setUser(session.user)
  }, [])

  const value = useMemo(
    () => ({ user, status, expired, login, logout, updateUser, applySession }),
    [user, status, expired, login, logout, updateUser, applySession],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
