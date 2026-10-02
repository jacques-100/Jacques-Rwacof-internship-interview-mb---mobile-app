import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchBlob } from '@/api/client'

/**
 * A profile photo as an object URL. Photos need the bearer token, which an <img src> cannot send, so the
 * bytes are fetched with it. The version is part of the key, so a new photo replaces the old one at once.
 */
export function useAvatarUrl(userId: number | undefined, version: number | null | undefined): string | null {
  const enabled = userId !== undefined && version != null
  const { data: blob } = useQuery({
    queryKey: ['avatar', userId, version],
    queryFn: () => fetchBlob(`/users/${userId}/avatar`),
    enabled,
    staleTime: Infinity,
    retry: false,
  })
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob || typeof URL.createObjectURL !== 'function') {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])
  return enabled ? url : null
}
