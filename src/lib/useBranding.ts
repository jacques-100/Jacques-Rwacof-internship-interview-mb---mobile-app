import { useQuery } from '@tanstack/react-query'
import { brandingApi } from '@/api/brandingApi'

export const BRANDING_KEY = ['branding'] as const

/** The organisation's name and logo. Public, so the sign-in page can use it too. */
export function useBranding() {
  const { data } = useQuery({ queryKey: BRANDING_KEY, queryFn: brandingApi.get, staleTime: 5 * 60_000, retry: false })
  return {
    organizationName: data?.organizationName,
    logoUrl: data?.logoVersion != null ? brandingApi.logoUrl(data.logoVersion) : null,
    hasLogo: data?.logoVersion != null,
  }
}
