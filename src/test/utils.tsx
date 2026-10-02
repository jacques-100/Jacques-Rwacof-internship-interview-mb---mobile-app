import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { setAccessToken } from '@/api/client'
import { AuthProvider } from '@/auth/AuthContext'
import { StationProvider } from '@/station/StationContext'
import { SystemSettingsProvider } from '@/settings/SystemSettingsContext'
import { ToastProvider } from '@/components/ui/Toast'
import type { Role } from '@/lib/types'
import { GRADES, SYSTEM_SETTINGS, makeDashboard, makeStation, makeUser, settings } from './fixtures'

export interface RecordedCall {
  method: string
  path: string
  body?: unknown
}

type Handler = (call: RecordedCall & { query: URLSearchParams }) => unknown | Promise<unknown>

/**
 * Replaces fetch with an in-memory router. Keys are "METHOD /path" (no query string).
 * Unmatched requests fail the test loudly instead of silently hanging.
 */
export function mockApi(handlers: Record<string, Handler>) {
  const calls: RecordedCall[] = []
  const table: Record<string, Handler> = {
    'GET /api/v1/settings': () => settings,
    'GET /api/v1/stations': () => [makeStation()],
    'GET /api/v1/grades': () => GRADES,
    'GET /api/v1/system-settings': () => SYSTEM_SETTINGS,
    'GET /api/v1/branding': () => ({ logoVersion: null, organizationName: 'CherryTrack' }),
    'GET /api/v1/dashboard': () => makeDashboard(),
    ...handlers,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost')
      const method = (init?.method ?? 'GET').toUpperCase()
      const body =
        init?.body instanceof FormData
          ? Object.fromEntries([...init.body.entries()].map(([k, v]) => [k, v instanceof File ? v.name : v]))
          : init?.body
            ? JSON.parse(String(init.body))
            : undefined
      calls.push({ method, path: url.pathname, body })
      const handler = table[`${method} ${url.pathname}`]
      if (!handler) {
        return new Response(JSON.stringify({ code: 'NOT_MOCKED', message: `No mock for ${method} ${url.pathname}` }), { status: 599 })
      }
      const result = (await handler({ method, path: url.pathname, body, query: url.searchParams })) as { status?: number; body?: unknown } | undefined
      const isEnvelope = result !== undefined && result !== null && typeof result === 'object' && typeof (result as { status?: unknown }).status === 'number'
      const status = isEnvelope ? (result.status ?? 200) : 200
      const payload = isEnvelope ? result.body : result
      if (status === 204) return new Response(null, { status })
      return new Response(JSON.stringify(payload ?? {}), { status, headers: { 'Content-Type': 'application/json' } })
    }),
  )
  return { calls, find: (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path) }
}

export function sessionFor(role: Role) {
  return { accessToken: `token-${role}`, expiresInSeconds: 1800, user: makeUser(role) }
}

/** Logged-in handlers: the silent refresh on page load succeeds for this role. */
export function asRole(role: Role): Record<string, Handler> {
  return { 'POST /api/v1/auth/refresh': () => sessionFor(role) }
}

/** Anonymous visitor: the silent refresh fails. */
export const anonymous: Record<string, Handler> = {
  'POST /api/v1/auth/refresh': () => ({ status: 401, body: { code: 'INVALID_CREDENTIALS', message: 'Session expired. Please sign in again.' } }),
}

export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  setAccessToken(null)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <ToastProvider>
          <AuthProvider>
            <SystemSettingsProvider>
              <StationProvider>{ui}</StationProvider>
            </SystemSettingsProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
