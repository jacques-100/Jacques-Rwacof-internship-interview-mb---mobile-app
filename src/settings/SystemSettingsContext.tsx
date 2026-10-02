import { createContext, Fragment, useContext, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '@/api/settingsApi'
import { useAuth } from '@/auth/AuthContext'
import { setCurrencyCode } from '@/lib/format'
import type { SettingDefinition } from '@/lib/types'

interface SystemSettingsState {
  values: Record<string, string>
  definitions: SettingDefinition[]
  currency: string
  organizationName: string
  /** Quick choices offered when rejecting a delivery. */
  rejectionReasons: string[]
  stationDefaults: { timezone: string; dailyCapacityKg: number; maxDeliveryKg: number; lowThresholdKg: number }
  isLoading: boolean
}

const SystemSettingsContext = createContext<SystemSettingsState | null>(null)

/**
 * Loads the system settings (kept in the database, edited on the Settings page) once signed in.
 * Everything that shows money, the organisation name or the rejection reasons reads them from here;
 * the values below are only what is shown for the instant before they arrive.
 */
export function SystemSettingsProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const query = useQuery({ queryKey: ['system-settings'], queryFn: settingsApi.get, enabled: status === 'authenticated', staleTime: 60_000 })

  const value = useMemo<SystemSettingsState>(() => {
    const v = query.data?.values ?? {}
    const num = (key: string, fallback: number) => (v[key] !== undefined && Number.isFinite(Number(v[key])) ? Number(v[key]) : fallback)
    return {
      values: v,
      definitions: query.data?.definitions ?? [],
      currency: v['currency.code'] ?? 'RWF',
      organizationName: v['organization.name'] ?? 'CherryTrack',
      rejectionReasons: (v['delivery.rejection-reasons'] ?? '').split('\n').filter(Boolean),
      stationDefaults: {
        timezone: v['station.default-timezone'] ?? 'Africa/Kigali',
        dailyCapacityKg: num('station.default-daily-capacity-kg', 5000),
        maxDeliveryKg: num('station.default-max-delivery-kg', 500),
        lowThresholdKg: num('station.default-low-threshold-kg', 500),
      },
      isLoading: query.isLoading,
    }
  }, [query.data, query.isLoading])

  // Set synchronously so formatters used while rendering always see the configured currency.
  setCurrencyCode(value.currency)

  // A changed currency must re-render every amount on screen, so the app below remounts when it changes.
  return (
    <SystemSettingsContext.Provider value={value}>
      <Fragment key={value.currency}>{children}</Fragment>
    </SystemSettingsContext.Provider>
  )
}

export function useSystemSettings(): SystemSettingsState {
  const ctx = useContext(SystemSettingsContext)
  if (!ctx) throw new Error('useSystemSettings must be used inside <SystemSettingsProvider>')
  return ctx
}
