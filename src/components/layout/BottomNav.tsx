import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Menu, Plus, Truck, Users } from 'lucide-react'
import { can } from '@/auth/permissions'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/cn'

const TAB = 'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium'

/**
 * The phone's primary navigation: the four things a clerk does all day, with "New delivery" in the
 * middle, and "More" opening the full menu (prices, reports, audit, profile...). Hidden from `lg` up,
 * where the sidebar is permanent.
 */
export function BottomNav({ onMore, moreOpen }: { onMore: () => void; moreOpen: boolean }) {
  const { user } = useAuth()
  const tab = (to: string, label: string, Icon: typeof Truck, end = false) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => cn(TAB, isActive ? 'text-brand-700' : 'text-stone-600')}
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('size-6', isActive && 'stroke-[2.4]')} aria-hidden="true" />
          {label}
        </>
      )}
    </NavLink>
  )

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {tab('/', 'Dashboard', LayoutDashboard, true)}
      {tab('/deliveries', 'Deliveries', Truck)}
      {can(user, 'createDeliveries') && (
        <NavLink to="/deliveries/new" className={cn(TAB, 'text-brand-700')}>
          <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg ring-4 ring-white">
            <Plus className="size-6" aria-hidden="true" />
          </span>
          Record
        </NavLink>
      )}
      {tab('/farmers', 'Farmers', Users)}
      <button
        type="button"
        onClick={onMore}
        aria-controls="app-sidebar"
        aria-expanded={moreOpen}
        className={cn(TAB, 'text-stone-600')}
      >
        <Menu className="size-6" aria-hidden="true" />
        More
      </button>
    </nav>
  )
}
