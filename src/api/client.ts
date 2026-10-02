import { isNativeApp } from '@/lib/platform'
import type { AuthResponse, FieldError } from '@/lib/types'
import { refreshTokenStore } from './refreshTokenStore'

/** Empty in browsers (the dev server / nginx proxy /api). The Android app sets VITE_API_BASE_URL at build time. */
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const BASE = `${API_ORIGIN}/api/v1`
/** Mobile networks stall rather than fail, so every request has a deadline. */
const REQUEST_TIMEOUT_MS = 20_000

/** The access token lives only in memory (never localStorage), so XSS can't read a persisted token. */
let accessToken: string | null = null
let stationId: number | null = null
let sessionExpiredHandler: (() => void) | null = null
let refreshInFlight: Promise<AuthResponse | null> | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

/** The station every station-scoped request operates on (sent as X-Station-Id). The server re-checks access. */
export function setStationId(id: number | null): void {
  stationId = id
}

export function getStationId(): number | null {
  return stationId
}

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler
}

export class ApiError extends Error {
  status: number
  code: string
  fieldErrors: FieldError[]
  correlationId?: string

  constructor(status: number, code: string, message: string, fieldErrors: FieldError[] = [], correlationId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.correlationId = correlationId
  }
}

type Params = Record<string, string | number | boolean | null | undefined>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Params
  signal?: AbortSignal
  /** Set false for endpoints that must not trigger a refresh-and-retry (login, refresh). */
  retryOnUnauthorized?: boolean
  headers?: Record<string, string>
}

function buildUrl(path: string, params?: Params): string {
  const query = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  const qs = query.toString()
  return `${BASE}${path}${qs ? `?${qs}` : ''}`
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json()
    return new ApiError(res.status, body.code ?? 'ERROR', body.message ?? body.detail ?? res.statusText, body.fieldErrors ?? [], body.correlationId)
  } catch {
    return new ApiError(res.status, 'ERROR', res.status >= 500 ? 'The server had a problem. Please try again.' : res.statusText || 'Request failed')
  }
}

async function send(path: string, opts: RequestOptions): Promise<Response> {
  const native = isNativeApp()
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers }
  if (native) headers['X-Client'] = 'native'
  const isForm = opts.body instanceof FormData   // the browser sets the multipart boundary itself
  if (opts.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  if (stationId !== null) headers['X-Station-Id'] = String(stationId)

  // One controller covers both the caller's own cancellation and the request deadline.
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)
  const onCallerAbort = () => controller.abort()
  opts.signal?.addEventListener('abort', onCallerAbort)

  try {
    return await fetch(buildUrl(path, opts.params), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
      credentials: native ? 'omit' : 'same-origin',
      signal: controller.signal,
    })
  } catch (e) {
    if (timedOut) throw new ApiError(0, 'TIMEOUT', 'The server took too long to respond. Check your connection and try again.')
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.')
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', onCallerAbort)
  }
}

/** Remembers the refresh token a native login/refresh returned. No-op in browsers (they use the cookie). */
export async function persistSession(session: AuthResponse): Promise<void> {
  if (isNativeApp() && session.refreshToken) await refreshTokenStore.set(session.refreshToken)
}

/** Header carrying the stored refresh token for native logout; empty in browsers. */
export async function nativeRefreshHeaders(): Promise<Record<string, string>> {
  if (!isNativeApp()) return {}
  const token = await refreshTokenStore.get()
  return token ? { 'X-Refresh-Token': token } : {}
}

export async function forgetStoredSession(): Promise<void> {
  if (isNativeApp()) await refreshTokenStore.clear()
}

/** True when the last refresh failed because the network was down, not because the session was rejected. */
let refreshFailedOffline = false

/** Exchanges the httpOnly refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      refreshFailedOffline = false
      try {
        const headers = await nativeRefreshHeaders()
        if (isNativeApp() && !headers['X-Refresh-Token']) return null   // never signed in on this device
        const res = await send('/auth/refresh', { method: 'POST', retryOnUnauthorized: false, headers })
        if (!res.ok) {
          // The server rejected the token: the session is really over. A 5xx is not a verdict on the session.
          if (res.status === 401 || res.status === 403) await forgetStoredSession()
          else refreshFailedOffline = true
          return null
        }
        const session = (await res.json()) as AuthResponse
        accessToken = session.accessToken
        await persistSession(session)
        return session
      } catch {
        refreshFailedOffline = true
        return null
      } finally {
        refreshInFlight = null
      }
    })()
  }
  return refreshInFlight
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await send(path, opts)

  if (res.status === 401 && opts.retryOnUnauthorized !== false && accessToken) {
    const session = await refreshSession()
    if (session) {
      res = await send(path, opts)
    } else if (refreshFailedOffline) {
      // Don't sign anyone out just because the signal dropped; they can retry.
      throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.')
    } else {
      accessToken = null
      sessionExpiredHandler?.()
    }
  }

  if (!res.ok) throw await toApiError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Absolute-or-relative URL of an API path, for resources that need no sign-in (such as the logo). */
export function apiUrl(path: string): string {
  return `${BASE}${path}`
}

/** Fetches an image or file that needs the bearer token (a plain <img src> cannot send it). */
export async function fetchBlob(path: string): Promise<Blob> {
  let res = await send(path, {})
  if (res.status === 401 && accessToken) {
    const session = await refreshSession()
    if (session) res = await send(path, {})
  }
  if (!res.ok) throw await toApiError(res)
  return res.blob()
}

/** Downloads an authenticated file (the Authorization header can't be sent by a plain link). */
export async function download(path: string, params: Params, fallbackName: string): Promise<void> {
  let res = await send(path, { params })
  if (res.status === 401 && accessToken) {
    const session = await refreshSession()
    if (session) res = await send(path, { params })
  }
  if (!res.ok) throw await toApiError(res)
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = match?.[1] ?? fallbackName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
