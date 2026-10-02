import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Filter/sort/page state kept in the URL query string, so a view survives refresh, can be bookmarked
 * and shared, and the back button works. Changing any filter resets to the first page.
 */
export function useSearchState(defaults: Record<string, string> = {}) {
  const [params, setParams] = useSearchParams()

  const get = useCallback((key: string): string => params.get(key) ?? defaults[key] ?? '', [params, defaults])

  const getNumber = useCallback(
    (key: string, fallback: number): number => {
      const n = Number(params.get(key))
      return Number.isFinite(n) && params.get(key) !== null ? n : fallback
    },
    [params],
  )

  const set = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '' || String(value) === (defaults[key] ?? '')) next.delete(key)
            else next.set(key, String(value))
          }
          if (!('page' in patch)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams, defaults],
  )

  const reset = useCallback(() => setParams({}, { replace: true }), [setParams])

  /** Replaces the whole query string at once (used when switching tabs, so old filters don't leak across). */
  const replace = useCallback((next: Record<string, string>) => setParams(new URLSearchParams(next), { replace: true }), [setParams])

  return { get, getNumber, set, reset, replace, params }
}
