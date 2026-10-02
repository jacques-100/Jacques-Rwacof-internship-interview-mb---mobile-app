import { useEffect } from 'react'
import { useBranding } from './useBranding'

const DEFAULT_ICON = { href: '/favicon.svg', type: 'image/svg+xml' }

/**
 * The browser-tab icon is the company logo when one has been uploaded, and the CherryTrack cherries
 * otherwise. Re-runs whenever the logo is replaced or removed.
 */
export function useFavicon(): void {
  const { logoUrl } = useBranding()
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    if (logoUrl) {
      link.removeAttribute('type')   // PNG, JPEG or WebP: let the browser sniff it
      link.href = logoUrl
    } else {
      link.type = DEFAULT_ICON.type
      link.href = DEFAULT_ICON.href
    }
  }, [logoUrl])
}
