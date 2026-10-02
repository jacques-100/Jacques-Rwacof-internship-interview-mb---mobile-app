import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, getAccessToken, setAccessToken, setSessionExpiredHandler } from './client'

/** Awaits a promise that is expected to reject and returns the ApiError. */
async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (e) {
    return e as ApiError
  }
  throw new Error('Expected the request to fail')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => {
  setAccessToken(null)
  setSessionExpiredHandler(null)
  vi.unstubAllGlobals()
})

describe('api client', () => {
  it('sends the bearer token and builds the query string without empty values', async () => {
    const fetchMock = vi.fn(async () => json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('abc')

    await api('/deliveries', { params: { status: 'PAID', q: '', page: 0, grade: undefined } })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/deliveries?status=PAID&page=0')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc')
  })

  it('turns problem+json responses into ApiError with field errors and correlation id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({ code: 'VALIDATION_FAILED', message: 'Request validation failed.', correlationId: 'c-1', fieldErrors: [{ field: 'weightKg', message: 'too heavy' }] }, 400),
      ),
    )
    const error = await failure(api('/deliveries', { method: 'POST', body: {} }))
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.code).toBe('VALIDATION_FAILED')
    expect(error.fieldErrors).toEqual([{ field: 'weightKg', message: 'too heavy' }])
    expect(error.correlationId).toBe('c-1')
  })

  it('reports an unreachable server as a friendly network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    const error = await failure(api('/deliveries'))
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('NETWORK')
    expect(error.message).toMatch(/cannot reach the server/i)
  })

  it('on 401 refreshes once and retries the original request with the new token', async () => {
    const seen: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const auth = (init?.headers as Record<string, string> | undefined)?.Authorization
        if (url.endsWith('/auth/refresh')) return json({ accessToken: 'fresh', expiresInSeconds: 1800, user: { id: 1 } })
        seen.push(auth ?? '')
        return auth === 'Bearer fresh' ? json({ ok: true }) : json({ code: 'UNAUTHORIZED', message: 'no' }, 401)
      }),
    )
    setAccessToken('expired')

    await expect(api('/dashboard')).resolves.toEqual({ ok: true })
    expect(seen).toEqual(['Bearer expired', 'Bearer fresh'])
    expect(getAccessToken()).toBe('fresh')
  })

  it('shares one refresh between concurrent requests', async () => {
    let refreshes = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith('/auth/refresh')) {
          refreshes++
          await new Promise((r) => setTimeout(r, 10))
          return json({ accessToken: 'fresh', expiresInSeconds: 1800, user: { id: 1 } })
        }
        const auth = (init?.headers as Record<string, string> | undefined)?.Authorization
        return auth === 'Bearer fresh' ? json({ ok: true }) : json({ code: 'UNAUTHORIZED', message: 'no' }, 401)
      }),
    )
    setAccessToken('expired')
    await Promise.all([api('/a'), api('/b'), api('/c')])
    expect(refreshes).toBe(1)
  })

  it('ends the session when the refresh fails', async () => {
    const expired = vi.fn()
    setSessionExpiredHandler(expired)
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).endsWith('/auth/refresh') ? json({ code: 'INVALID_CREDENTIALS', message: 'x' }, 401) : json({ code: 'UNAUTHORIZED', message: 'no' }, 401),
      ),
    )
    setAccessToken('expired')

    const error = await failure(api('/dashboard'))
    expect(error.status).toBe(401)
    expect(expired).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBeNull()
  })

  it('does not try to refresh when login itself returns 401', async () => {
    const fetchMock = vi.fn(async () => json({ code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' }, 401))
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('stale')
    const error = await failure(api('/auth/login', { method: 'POST', body: {}, retryOnUnauthorized: false }))
    expect(error.message).toBe('Invalid username or password.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
    await expect(api('/auth/logout', { method: 'POST' })).resolves.toBeUndefined()
  })
})
