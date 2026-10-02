import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

/** Loads a fresh copy of the client, because the API address is read once, when the module starts. */
async function clientFor(apiBaseUrl: string | undefined) {
  vi.resetModules()
  if (apiBaseUrl !== undefined) vi.stubEnv('VITE_API_BASE_URL', apiBaseUrl)
  return import('./client')
}

describe('API on its own address (www.example.org + api.example.org)', () => {
  it('calls the configured API address and sends the session cookie to it', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const { api } = await clientFor('https://api.example.org/')

    await api('/deliveries', { params: { page: 0 } })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.example.org/api/v1/deliveries?page=0')   // trailing slash tolerated
    expect(init.credentials).toBe('include')
  })

  it('keeps same-origin requests when no API address is configured (dev server, nginx proxy)', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const { api } = await clientFor('')

    await api('/deliveries')

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/deliveries')
    expect(init.credentials).toBe('same-origin')
  })
})
