import { useQuery } from '@tanstack/react-query'
import { directoryApi } from '@/api/directoryApi'
import { qk } from '@/api/queryKeys'
import { stationApi } from '@/api/stationApi'
import { userApi } from '@/api/userApi'

/** Lists used to fill dropdowns on the Users & Staff tabs. Cached briefly so tabs share them. */
export function useRoles() {
  return useQuery({ queryKey: qk.roles, queryFn: directoryApi.roles, staleTime: 30_000 })
}

export function useDepartments() {
  return useQuery({ queryKey: qk.departments, queryFn: directoryApi.departments, staleTime: 30_000 })
}

/** Every station, including inactive ones (administrators only reach these pages). */
export function useAllStations() {
  return useQuery({ queryKey: qk.stations(true), queryFn: () => stationApi.list(true), staleTime: 30_000 })
}

/** Active people to pick from (department heads, employees). The first 100 by name. */
export function useUserOptions() {
  return useQuery({
    queryKey: qk.userOptions,
    queryFn: () => userApi.list({ active: true, size: 100, sortBy: 'fullName', dir: 'asc' }),
    staleTime: 30_000,
  })
}
