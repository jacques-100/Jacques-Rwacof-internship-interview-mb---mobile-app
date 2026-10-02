import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/** Tells the clerk, instead of letting requests fail one by one, when the phone has lost its connection. */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (online) return null
  return (
    <div role="status" className="flex items-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950">
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      You are offline. Nothing can be saved until the connection returns.
    </div>
  )
}
