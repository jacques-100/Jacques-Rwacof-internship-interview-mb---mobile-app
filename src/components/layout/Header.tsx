import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, LogOut, Menu } from 'lucide-react'
import { dashboardApi } from '@/api/dashboardApi'
import { qk } from '@/api/queryKeys'
import { useAuth } from '@/auth/AuthContext'
import { Avatar } from '@/components/Avatar'
import { ThemeQuickToggle } from '@/theme/ThemeControls'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/format'
import { useStation } from '@/station/StationContext'
import { NotificationsMenu } from './NotificationsMenu'
import { StationSwitcher } from './StationSwitcher'
import { titleForPath } from './nav'

export function Header({ onMenu, menuOpen }: { onMenu: () => void; menuOpen: boolean }) {
  const { user, logout } = useAuth()
  const { station, status } = useStation()
  const { pathname } = useLocation()
  const { data: settings } = useQuery({
    queryKey: qk.settings,
    queryFn: dashboardApi.settings,
    staleTime: 5 * 60_000,
    enabled: status === 'ready',
  })

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-stone-200 bg-white px-3 sm:gap-3 sm:px-6">
      <button
        type="button"
        aria-label="Open navigation"
        aria-controls="app-sidebar"
        aria-expanded={menuOpen}
        onClick={onMenu}
        className="rounded-md p-2 text-stone-700 hover:bg-stone-100 lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-semibold text-stone-900 sm:text-lg">{titleForPath(pathname)}</p>
        <p className="hidden items-center gap-1.5 truncate text-xs text-stone-600 sm:flex">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{settings && station ? `${station.name} · ${formatDate(settings.today)}` : 'CherryTrack'}</span>
        </p>
      </div>

      <StationSwitcher />
      <ThemeQuickToggle className="hidden sm:flex" />
      {status === 'ready' && <NotificationsMenu />}

      <div className="flex items-center gap-1 border-l border-stone-200 pl-2 sm:gap-2 sm:pl-3">
        <Link
          to="/profile"
          aria-label="My profile"
          className="flex items-center gap-2 rounded-md p-1 hover:bg-stone-100"
          title="My profile"
        >
          {user && <Avatar user={user} size="sm" />}
          <span className="hidden text-left leading-tight lg:block">
            <span className="block max-w-40 truncate text-sm font-medium text-stone-900">{user?.fullName}</span>
            <span className="block max-w-40 truncate text-xs text-stone-600">{user?.jobRole.name}</span>
          </span>
        </Link>
        <Button variant="ghost" size="sm" onClick={() => void logout()} aria-label="Log out">
          <LogOut className="size-4" aria-hidden="true" />
          <span className="hidden md:inline">Log out</span>
        </Button>
      </div>
    </header>
  )
}
