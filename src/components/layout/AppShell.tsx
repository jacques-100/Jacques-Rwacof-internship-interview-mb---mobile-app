import { useCallback, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Building2, ShieldQuestion } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { ErrorState, LoadingState } from '@/components/states'
import { Card } from '@/components/ui/Card'
import { useStation } from '@/station/StationContext'
import { useAndroidBackButton } from '@/lib/useAndroidBackButton'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { OfflineBanner } from './OfflineBanner'
import { Sidebar } from './Sidebar'

/** Pages that don't need a station, so an administrator can set the system up from an empty database. */
const STATION_FREE = ['/stations', '/users', '/profile']

function NoStation() {
  const { user } = useAuth()
  const admin = user?.role === 'ADMIN'
  return (
    <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
      {admin ? <Building2 className="mx-auto size-10 text-brand-600" aria-hidden="true" /> : <ShieldQuestion className="mx-auto size-10 text-amber-700" aria-hidden="true" />}
      <h1 className="mt-3 text-xl">{admin ? 'Register your first station' : 'You are not assigned to a station'}</h1>
      <p className="mt-2 text-sm text-stone-600">
        {admin
          ? 'Deliveries, capacity and staff all belong to a station. Register one, then assign people to it.'
          : 'Your account is not linked to a station yet, so there is nothing to show. Ask an administrator to assign you to one.'}
      </p>
      {admin && (
        <Link to="/stations" className="mt-5 inline-flex h-9 items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">
          Go to Stations
        </Link>
      )}
    </Card>
  )
}

/** Left sidebar + top header + main content. The sidebar is a drawer below `lg`. */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const { status, error, reload } = useStation()
  const { pathname } = useLocation()
  useAndroidBackButton(menuOpen, closeMenu)

  const stationFree = STATION_FREE.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  let content
  if (stationFree || status === 'ready') content = <Outlet />
  else if (status === 'loading') content = <LoadingState label="Loading your stations..." />
  else if (status === 'error') content = <Card><ErrorState error={error} onRetry={reload} title="Could not load your stations" /></Card>
  else content = <NoStation />

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="sr-only z-50 rounded-md bg-white px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to main content
      </a>
      <Sidebar open={menuOpen} onClose={closeMenu} />
      <div className="lg:pl-64">
        <Header onMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />
        <OfflineBanner />
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-[96rem] px-3 py-5 pb-28 sm:px-6 sm:py-6 lg:pb-6">
          {content}
        </main>
      </div>
      <BottomNav onMore={() => setMenuOpen(true)} moreOpen={menuOpen} />
    </div>
  )
}
