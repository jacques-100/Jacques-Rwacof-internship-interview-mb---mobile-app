import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { setStationId } from '@/api/client'
import { stationApi } from '@/api/stationApi'
import { qk } from '@/api/queryKeys'
import { useAuth } from '@/auth/AuthContext'
import type { Station } from '@/lib/types'

type Status = 'loading' | 'ready' | 'none' | 'error'

interface StationState {
  /** Stations the signed-in user can work in. */
  stations: Station[]
  /** The station every page currently operates on. */
  station: Station | null
  status: Status
  error: unknown
  select: (id: number) => void
  reload: () => void
}

const StationContext = createContext<StationState | null>(null)

function storageKey(userId: number | undefined): string {
  return `ct.station.${userId ?? 'anon'}`
}

function readStored(userId: number | undefined): number | null {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    return raw ? Number(raw) : null
  } catch {
    return null
  }
}

/**
 * Holds the station the user is working in. The choice is remembered per user, validated against the
 * stations the server says the user may use, and sent on every request as X-Station-Id. The backend
 * re-checks access on each call, so this is a convenience, never a security boundary.
 */
export function StationProvider({ children }: { children: ReactNode }) {
  const { user, status: authStatus } = useAuth()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const query = useQuery({
    queryKey: qk.stations(false),
    queryFn: () => stationApi.list(false),
    enabled: authStatus === 'authenticated',
  })

  const stations = useMemo(() => query.data ?? [], [query.data])
  const preferred = selectedId ?? readStored(user?.id)
  const station = stations.find((s) => s.id === preferred) ?? stations[0] ?? null

  // Set synchronously (not in an effect) so child queries always start with the right header.
  setStationId(authStatus === 'authenticated' ? (station?.id ?? null) : null)

  const select = useCallback(
    (id: number) => {
      setStationId(id)
      setSelectedId(id)
      try {
        window.localStorage.setItem(storageKey(user?.id), String(id))
      } catch {
        // storage can be unavailable (private mode); the choice then lasts for this session only
      }
      // Everything cached belongs to the previous station. Keep only the station list itself.
      void queryClient.resetQueries({ predicate: (q) => q.queryKey[0] !== 'stations' })
    },
    [queryClient, user?.id],
  )

  const reload = useCallback(() => void query.refetch(), [query])

  const status: Status =
    authStatus !== 'authenticated' ? 'loading' : query.isLoading ? 'loading' : query.error ? 'error' : stations.length === 0 ? 'none' : 'ready'

  const value = useMemo<StationState>(
    () => ({ stations, station, status, error: query.error, select, reload }),
    [stations, station, status, query.error, select, reload],
  )
  return <StationContext.Provider value={value}>{children}</StationContext.Provider>
}

export function useStation(): StationState {
  const ctx = useContext(StationContext)
  if (!ctx) throw new Error('useStation must be used inside <StationProvider>')
  return ctx
}
