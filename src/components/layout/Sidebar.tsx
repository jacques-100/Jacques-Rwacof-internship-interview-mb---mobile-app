import { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { LogOut, MapPin, Moon, Sun, UserCog, X } from 'lucide-react'
import { can } from '@/auth/permissions'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/cn'
import { useSystemSettings } from '@/settings/SystemSettingsContext'
import { useStation } from '@/station/StationContext'
import { useTheme } from '@/theme/ThemeContext'
import { Logo } from './Logo'
import { NAV_GROUPS } from './nav'

interface SidebarProps {
  /** Mobile/tablet drawer state. From `lg` up the sidebar is permanent. */
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const { station } = useStation()
  const { organizationName } = useSystemSettings()
  const { resolved, setPreference } = useTheme()
  const location = useLocation()
  const closeRef = useRef<HTMLButtonElement>(null)

  // Navigating closes the drawer.
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Esc closes the drawer and focus moves into it when it opens.
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // The nav only offers pages the role can use. The backend enforces the same rules independently.
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((item) => !item.capability || can(user, item.capability)) })).filter(
    (g) => g.items.length > 0,
  )

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" aria-hidden="true" onClick={onClose} />}
      <aside
        id="app-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-40 palette-fixed flex w-64 flex-col bg-gradient-to-b from-stone-900 to-stone-950 text-stone-200 transition-transform duration-200 lg:translate-x-0',
          open ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <Logo light subtitle={organizationName} />
          <button
            ref={closeRef}
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="rounded-md p-1.5 text-stone-300 hover:bg-white/10 lg:hidden"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-3">
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.16em] text-stone-500 uppercase">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_var(--color-brand-400)]'
                            : 'text-stone-300 hover:bg-white/5 hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={cn('size-[18px] shrink-0', isActive ? 'text-brand-300' : 'text-stone-400')} aria-hidden="true" />
                          {label}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="mx-3 space-y-0.5 border-t border-white/10 pt-2 lg:hidden">
          <Link to="/profile" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-stone-300 hover:bg-white/5 hover:text-white">
            <UserCog className="size-[18px] text-stone-400" aria-hidden="true" />
            Profile &amp; password
          </Link>
          <button type="button" onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-stone-300 hover:bg-white/5 hover:text-white sm:hidden">
            {resolved === 'dark' ? <Sun className="size-[18px] text-stone-400" aria-hidden="true" /> : <Moon className="size-[18px] text-stone-400" aria-hidden="true" />}
            {resolved === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-stone-300 hover:bg-white/5 hover:text-white">
            <LogOut className="size-[18px] text-stone-400" aria-hidden="true" />
            Sign out
          </button>
        </div>
        <div className="m-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-stone-400 uppercase">
            <MapPin className="size-3" aria-hidden="true" /> Working in
          </p>
          <p className="mt-1 text-sm leading-snug font-medium text-white">{station?.name ?? 'No station'}</p>
          <p className="text-xs text-stone-400">{station ? `${station.code} · ${station.timezone}` : ' '}</p>
        </div>
      </aside>
    </>
  )
}
