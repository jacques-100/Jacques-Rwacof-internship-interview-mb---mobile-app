import { useQuery } from '@tanstack/react-query'
import { farmerApi } from '@/api/farmerApi'
import { qk } from '@/api/queryKeys'

/** Farmers for dropdowns (name-sorted, first 100). Inactive farmers can't receive deliveries. */
export function useFarmerOptions() {
  return useQuery({
    queryKey: qk.farmerOptions,
    queryFn: () => farmerApi.list({ size: 100, sortBy: 'fullName', dir: 'asc' }),
    staleTime: 60_000,
  })
}
