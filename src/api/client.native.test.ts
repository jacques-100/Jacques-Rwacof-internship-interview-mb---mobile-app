import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Pretend to be the Capacitor app, with an in-memory stand-in for the Keystore-backed storage.
const store = vi.hoisted(() => ({ token: null as string | null }))
vi.mock('@/lib/platform', () => ({ isNativeApp: () => true }))
vi.mock('./refreshTokenStore', () => ({
  refreshTokenStore: {
    get: async () => store.token,
    set: async (t: string) => {
      store.token = t
    },
    clear: async () => {
      store.token = null
    },
  },
}))

import { ApiError, api, refreshSession, setAccessToken, setSessionExpiredHandler } from './client'
import { authApi } from './authApi'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
const session = (refreshToken: string) => ({ accessToken: 'access-1', expiresInSeconds: 1800, user: { id: 1 }, refreshToken })

beforeEach(() => {
  store.token = null
})
afterEach(() => {
  setAccessToken(null)
  setSessionExpiredHandler(null)
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('native app session', () => {
  it('identifies itself, omits cookies and keeps the refresh token from login in secure storage', async () => {
    const fetchMock = vi.fn(async () => json(session('refresh-1')))
    vi.stubGlobal('fetch', fetchMock)

    await authApi.login('clerk', 'secret')

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['X-Client']).toBe('native')
    expect(init.credentials).toBe('omit')
    expect(store.token).toBe('refresh-1')
  })

  it('restores the session on launch with the stored token and rotates it', async () => {
    store.token = 'refresh-1'
    const fetchMock = vi.fn(async () => json(session('refresh-2')))
    vi.stubGlobal('fetch', fetchMock)

    const restored = await refreshSession()

    expect(restored?.accessToken).toBe('access-1')
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['X-Refresh-Token']).toBe('refresh-1')
    expect(store.token).toBe('refresh-2')
  })

  it('does not even call the server when nobody has signed in on this device', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await refreshSession()).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forgets the stored token when the server rejects it', async () => {
    store.token = 'revoked'
    vi.stubGlobal('fetch', vi.fn(async () => json({ code: 'INVALID_CREDENTIALS', message: 'Expired' }, 401)))
    expect(await refreshSession()).toBeNull()
    expect(store.token).toBeNull()
  })

  it('keeps the user signed in when a refresh fails only because the network is down', async () => {
    store.token = 'refresh-1'
    setAccessToken('stale')
    const expired = vi.fn()
    setSessionExpiredHandler(expired)
    let call = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      call += 1
      if (call === 1) return json({ code: 'UNAUTHORIZED', message: 'Expired' }, 401)
      throw new TypeError('Failed to fetch')
    }))

    await expect(api('/deliveries')).rejects.toMatchObject({ code: 'NETWORK' })
    expect(expired).not.toHaveBeenCalled()
    expect(store.token).toBe('refresh-1')
  })

  it('logs out with the stored token and then forgets it', async () => {
    store.token = 'refresh-1'
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await authApi.logout()

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['X-Refresh-Token']).toBe('refresh-1')
    expect(store.token).toBeNull()
  })

  it('gives up on a request that stalls instead of waiting forever', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })))
    const pending = api('/deliveries').catch((e: ApiError) => e)
    await vi.advanceTimersByTimeAsync(21_000)
    expect(await pending).toMatchObject({ code: 'TIMEOUT' })
  })
})
