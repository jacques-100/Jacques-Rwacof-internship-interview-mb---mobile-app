import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { App as CapacitorApp } from '@capacitor/app'
import { isNativeApp } from './platform'

/**
 * The Android back button should step back through the app, close the menu first when it is open,
 * and only leave the app from the dashboard.
 */
export function useAndroidBackButton(menuOpen: boolean, closeMenu: () => void): void {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  useEffect(() => {
    if (!isNativeApp()) return
    const handle = CapacitorApp.addListener('backButton', () => {
      if (menuOpen) closeMenu()
      else if (pathname !== '/') navigate(-1)
      else void CapacitorApp.exitApp()
    })
    return () => {
      void handle.then((h) => h.remove())
    }
  }, [menuOpen, closeMenu, pathname, navigate])
}
