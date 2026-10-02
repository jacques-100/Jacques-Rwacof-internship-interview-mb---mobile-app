import {
  BarChart3, Banknote, Building2, ClipboardCheck, Gauge, LayoutDashboard, ScrollText, Settings, Tags, Truck, UserCog, Users,
  type LucideIcon,
} from 'lucide-react'
import type { Capability } from '@/auth/permissions'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Item is hidden for roles without this capability. */
  capability?: Capability
  end?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * The sidebar follows the order work actually happens at the station: know the farmer, open the
 * day's intake, receive deliveries, grade them, pay for them. Setup and reporting come after.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Intake workflow',
    items: [
      { to: '/farmers', label: 'Farmers', icon: Users },
      { to: '/daily-intake', label: 'Daily Intake', icon: Gauge },
      { to: '/deliveries', label: 'Deliveries', icon: Truck },
      { to: '/grading', label: 'Grading', icon: ClipboardCheck },
      { to: '/payments', label: 'Payments', icon: Banknote, capability: 'viewPayments' },
    ],
  },
  {
    label: 'Configuration',
    items: [{ to: '/prices', label: 'Prices & Grades', icon: Tags }],
  },
  {
    label: 'Insight',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3, capability: 'viewReports' },
      { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText, capability: 'viewAudit' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/stations', label: 'Stations', icon: Building2, capability: 'manageStations' },
      { to: '/users', label: 'Users & Staff', icon: UserCog, capability: 'manageUsers' },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

/** Title for the header, derived from the current path. */
export function titleForPath(pathname: string): string {
  if (pathname === '/profile') return 'My Profile'
  if (pathname === '/deliveries/new') return 'New Delivery'
  if (/^\/deliveries\/\d+/.test(pathname)) return 'Delivery Details'
  if (/^\/farmers\/\d+/.test(pathname)) return 'Farmer Details'
  const match = [...NAV_ITEMS].sort((a, b) => b.to.length - a.to.length).find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
  return match?.label ?? 'CherryTrack'
}
